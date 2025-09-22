import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, Not, In } from 'typeorm';
import { Doctor } from '../entities/doctor.entity';
import { DoctorAvailabilitySlot } from '../entities/doctor-availability.entity';
import { AppointmentSubSlot } from '../entities/appointment-sub-slot.entity';
import { Appointment } from '../entities/appointment.entity';

interface CreateAvailabilitySlotDto {
  date?: string;
  start_time: string;
  end_time: string;
  schedule_type: 'wave' | 'stream';
  sub_slot_duration?: number;
  consultation_type?: 'in_person' | 'video_call' | 'phone_call' | 'hybrid';
  notes?: string;
  // Recurring fields
  is_recurring?: boolean;
  end_date?: string;
  weekdays?: string[];
}

interface UpdateDoctorProfileDto {
  specialization?: string;
  experience_years?: number;
  education?: string;
  bio?: string;
  consultation_fee?: number;
  clinic_address?: string;
  default_schedule_type?: 'wave' | 'stream';
  default_slot_duration?: number;
  advance_booking_days?: number;
  same_day_booking_cutoff?: number;
  is_accepting_patients?: boolean;
}

interface CancelAppointmentDto {
  reason?: string;
  cancellation_type: 'doctor' | 'system';
  refund_amount?: number;
}

@Injectable()
export class DoctorAvailabilityService {
  constructor(
    @InjectRepository(Doctor)
    private doctorRepository: Repository<Doctor>,
    @InjectRepository(DoctorAvailabilitySlot)
    private availabilitySlotRepository: Repository<DoctorAvailabilitySlot>,
    @InjectRepository(AppointmentSubSlot)
    private subSlotRepository: Repository<AppointmentSubSlot>,
    @InjectRepository(Appointment)
    private appointmentRepository: Repository<Appointment>,
  ) {}

  // ==============================
  // SLOT CREATION
  // ==============================
  async createAvailabilitySlot(
    doctorId: string,
    createSlotDto: CreateAvailabilitySlotDto,
  ) {
    const doctor = await this.doctorRepository.findOne({
      where: { userId: doctorId },
    });
    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    if (createSlotDto.is_recurring && createSlotDto.weekdays && createSlotDto.end_date) {
      return this.createRecurringSlots(doctor, createSlotDto);
    }

    if (!createSlotDto.date) {
      throw new BadRequestException(
        'Date is required for a single availability slot.',
      );
    }

    return this.createSingleSlot(doctor, createSlotDto);
  }

  private async createSingleSlot(
    doctor: Doctor,
    createSlotDto: CreateAvailabilitySlotDto,
  ) {
    const { date, start_time, end_time, schedule_type } = createSlotDto;
    const slotDate = new Date(date!);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (slotDate < today) {
      throw new BadRequestException('Cannot create availability for past dates');
    }

    if (start_time >= end_time) {
      throw new BadRequestException('Start time must be before end time');
    }

    await this.checkForOverlappingSlots(
      doctor.userId,
      slotDate,
      start_time,
      end_time,
    );

    const slotDuration = createSlotDto.sub_slot_duration || 30;
    const capacity = 1; // always 1 patient per sub-slot
    const totalCapacity = this.calculateTotalCapacity(
      start_time,
      end_time,
      slotDuration,
    );

    const availabilitySlot = this.availabilitySlotRepository.create({
      doctor,
      date: slotDate,
      start_time,
      end_time,
      schedule_type,
      sub_slot_duration: slotDuration,
      capacity_per_sub_slot: capacity,
      total_capacity: totalCapacity,
      consultation_type: createSlotDto.consultation_type || 'in_person',
      notes: createSlotDto.notes,
    });

    const savedSlot = await this.availabilitySlotRepository.save(availabilitySlot);

    await this.createSubSlots(savedSlot);

    return {
      success: true,
      message: 'Availability slot created successfully',
      slot: {
        id: savedSlot.id,
        date: savedSlot.date.toISOString().split('T')[0],
        start_time: savedSlot.start_time,
        end_time: savedSlot.end_time,
        schedule_type: savedSlot.schedule_type,
        total_capacity: savedSlot.total_capacity,
        sub_slot_duration: savedSlot.sub_slot_duration,
        capacity_per_sub_slot: savedSlot.capacity_per_sub_slot,
      },
    };
  }

  private async createRecurringSlots(
    doctor: Doctor,
    createSlotDto: CreateAvailabilitySlotDto,
  ) {
    const { weekdays, end_date } = createSlotDto;
    if (!weekdays || weekdays.length === 0 || !end_date) {
      throw new BadRequestException(
        'Weekdays and end_date are required for recurring schedules.',
      );
    }

    const startDate = new Date(createSlotDto.date || new Date());
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(end_date);
    endDate.setHours(0, 0, 0, 0);

    const normalizedWeekdays = weekdays.map(
      w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(),
    );

    const createdSlots: any[] = [];
    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const currentDayName = currentDate.toLocaleDateString('en-US', {
        weekday: 'long',
      });

      if (normalizedWeekdays.includes(currentDayName)) {
        const slotDtoCopy: CreateAvailabilitySlotDto = {
          ...createSlotDto,
          date: currentDate.toISOString().split('T')[0],
        };
        delete (slotDtoCopy as any).is_recurring;
        delete (slotDtoCopy as any).end_date;
        delete (slotDtoCopy as any).weekdays;

        try {
          const res = await this.createSingleSlot(doctor, slotDtoCopy);
          if (res && res.success) {
            createdSlots.push(res.slot);
          }
        } catch (err) {
          console.warn(
            `Failed to create slot for ${currentDate.toISOString().split('T')[0]}: ${err.message}`,
          );
        }
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    if (createdSlots.length === 0) {
      throw new ConflictException(
        'No recurring slots were created. Check your inputs.',
      );
    }

    return {
      success: true,
      message: `Successfully created ${createdSlots.length} recurring slots.`,
      slots: createdSlots,
    };
  }

  private async checkForOverlappingSlots(
    doctorId: string,
    date: Date,
    startTime: string,
    endTime: string,
  ) {
    const existingSlots = await this.availabilitySlotRepository.find({
      where: { doctor: { userId: doctorId }, date },
    });

    const hasOverlap = existingSlots.some(
      slot =>
        (startTime >= slot.start_time && startTime < slot.end_time) ||
        (endTime > slot.start_time && endTime <= slot.end_time) ||
        (startTime <= slot.start_time && endTime >= slot.end_time),
    );

    if (hasOverlap) {
      throw new ConflictException('Time slot overlaps with existing availability');
    }
  }

  private calculateTotalCapacity(
    startTime: string,
    endTime: string,
    slotDuration: number,
  ): number {
    const startMinutes = this.timeToMinutes(startTime);
    const endMinutes = this.timeToMinutes(endTime);
    return Math.floor((endMinutes - startMinutes) / slotDuration);
  }

  private async createSubSlots(availabilitySlot: DoctorAvailabilitySlot) {
    const { start_time, end_time, sub_slot_duration } = availabilitySlot;
    const startMinutes = this.timeToMinutes(start_time);
    const endMinutes = this.timeToMinutes(end_time);
    const duration = sub_slot_duration || 30;
    const capacity = 1;

    const subSlots: AppointmentSubSlot[] = [];
    for (
      let currentMinutes = startMinutes;
      currentMinutes < endMinutes;
      currentMinutes += duration
    ) {
      const subSlotEndMinutes = Math.min(currentMinutes + duration, endMinutes);
      const subSlot = this.subSlotRepository.create({
        availabilitySlot,
        start_time: this.minutesToTime(currentMinutes),
        end_time: this.minutesToTime(subSlotEndMinutes),
        max_capacity: capacity,
      });
      subSlots.push(subSlot);
    }
    await this.subSlotRepository.save(subSlots);
  }

  // ==============================
  // SLOT MANAGEMENT (CORRECTED)
  // ==============================
  async updateAvailabilitySlot(
    doctorId: string,
    slotId: string,
    updateData: Partial<CreateAvailabilitySlotDto>,
  ) {
    const slot = await this.availabilitySlotRepository.findOne({
      where: { id: slotId, doctor: { userId: doctorId } },
      relations: ['subSlots'],
    });

    if (!slot) {
      throw new NotFoundException('Availability slot not found');
    }

    // Check appointments separately
    const appointmentsInSlot = await this.appointmentRepository.find({
      where: { availabilitySlot: { id: slotId } },
      relations: ['subSlot'],
    });

    if (appointmentsInSlot.length > 0) {
      const allowedFields = ['notes', 'consultation_type'];
      const hasDisallowedChanges = Object.keys(updateData).some(
        key => !allowedFields.includes(key)
      );
      
      if (hasDisallowedChanges) {
        throw new BadRequestException(
          'Cannot modify time or capacity of slots with existing appointments'
        );
      }
    }

    if (updateData.start_time && updateData.end_time) {
      if (updateData.start_time >= updateData.end_time) {
        throw new BadRequestException('Start time must be before end time');
      }
    }

    if (updateData.start_time || updateData.end_time) {
      const startTime = updateData.start_time || slot.start_time;
      const endTime = updateData.end_time || slot.end_time;
      
      const existingSlots = await this.availabilitySlotRepository.find({
        where: { 
          doctor: { userId: doctorId }, 
          date: slot.date,
          id: Not(slotId)
        },
      });

      const hasOverlap = existingSlots.some(
        existingSlot =>
          (startTime >= existingSlot.start_time && startTime < existingSlot.end_time) ||
          (endTime > existingSlot.start_time && endTime <= existingSlot.end_time) ||
          (startTime <= existingSlot.start_time && endTime >= existingSlot.end_time),
      );

      if (hasOverlap) {
        throw new ConflictException('Updated time slot overlaps with existing availability');
      }
    }

    Object.assign(slot, updateData);

    if (updateData.start_time || updateData.end_time || updateData.sub_slot_duration) {
      slot.total_capacity = this.calculateTotalCapacity(
        slot.start_time,
        slot.end_time,
        slot.sub_slot_duration || 30,
      );
    }

    const savedSlot = await this.availabilitySlotRepository.save(slot);

    if (updateData.start_time || updateData.end_time || updateData.sub_slot_duration) {
      const appointmentSubSlotIds = appointmentsInSlot?.map(apt => apt.subSlot?.id).filter(Boolean) || [];
      
      if (appointmentSubSlotIds.length > 0) {
        await this.subSlotRepository.delete({
          availabilitySlot: { id: slotId },
          id: Not(In(appointmentSubSlotIds))
        });
      } else {
        await this.subSlotRepository.delete({
          availabilitySlot: { id: slotId }
        });
      }
      
      await this.createSubSlots(savedSlot);
    }

    return {
      success: true,
      message: 'Availability slot updated successfully',
      slot: savedSlot,
    };
  }

  async deleteAvailabilitySlot(doctorId: string, slotId: string) {
    const slot = await this.availabilitySlotRepository.findOne({
      where: { id: slotId, doctor: { userId: doctorId } },
      relations: ['subSlots'],
    });

    if (!slot) {
      throw new NotFoundException('Availability slot not found');
    }

    // Check appointments separately
    const appointmentsInSlot = await this.appointmentRepository.find({
      where: { availabilitySlot: { id: slotId } },
    });

    if (appointmentsInSlot.length > 0) {
      const activeAppointments = appointmentsInSlot.filter(
        apt => apt.status !== 'cancelled'
      );
      
      if (activeAppointments.length > 0) {
        throw new BadRequestException(
          'Cannot delete availability slot with active appointments. Cancel appointments first.'
        );
      }
    }

    if (slot.subSlots && slot.subSlots.length > 0) {
      await this.subSlotRepository.remove(slot.subSlots);
    }

    await this.availabilitySlotRepository.remove(slot);

    return {
      success: true,
      message: 'Availability slot deleted successfully',
    };
  }

  // ==============================
  // DOCTOR PROFILE
  // ==============================
  async getDoctorProfile(doctorId: string) {
    const doctor = await this.doctorRepository.findOne({
      where: { userId: doctorId },
    });
    if (!doctor) throw new NotFoundException('Doctor not found');

    return {
      success: true,
      doctor,
    };
  }

  async updateDoctorProfile(doctorId: string, updateDto: UpdateDoctorProfileDto) {
    const doctor = await this.doctorRepository.findOne({
      where: { userId: doctorId },
    });
    if (!doctor) throw new NotFoundException('Doctor not found');

    Object.assign(doctor, updateDto);
    const updatedDoctor = await this.doctorRepository.save(doctor);

    return {
      success: true,
      message: 'Profile updated successfully',
      doctor: updatedDoctor,
    };
  }

  // ==============================
  // AVAILABILITY & APPOINTMENTS
  // ==============================
  async getDoctorAvailability(doctorId: string, date?: string) {
    const whereClause: any = {
      doctor: { userId: doctorId },
      is_active: true,
    };
    if (date) {
      whereClause.date = new Date(date);
    } else {
      whereClause.date = MoreThan(new Date());
    }

    const slots = await this.availabilitySlotRepository.find({
      where: whereClause,
      relations: ['subSlots'],
      order: { date: 'ASC', start_time: 'ASC' },
    });

    return {
      success: true,
      slots,
    };
  }

  async getDoctorAppointments(doctorId: string, date?: string, status?: string) {
    const whereClause: any = { doctor: { userId: doctorId } };
    if (date) whereClause.appointment_date = new Date(date);
    if (status) whereClause.status = status;

    const appointments = await this.appointmentRepository.find({
      where: whereClause,
      relations: ['patient', 'patient.user', 'availabilitySlot', 'subSlot'],
      order: { appointment_date: 'ASC', appointment_time: 'ASC' },
    });

    return { success: true, appointments };
  }

  async updateAppointmentStatus(
    doctorId: string,
    appointmentId: string,
    status: string,
    notes?: string,
  ) {
    const appointment = await this.appointmentRepository.findOne({
      where: { id: appointmentId, doctor: { userId: doctorId } },
      relations: ['patient', 'patient.user'],
    });
    if (!appointment) throw new NotFoundException('Appointment not found');

    appointment.status = status;
    if (notes) appointment.notes = notes;

    const saved = await this.appointmentRepository.save(appointment);
    return { success: true, appointment: saved };
  }

  async cancelAppointment(
    doctorId: string,
    appointmentId: string,
    cancelDto: CancelAppointmentDto,
  ) {
    const appointment = await this.appointmentRepository.findOne({
      where: { id: appointmentId, doctor: { userId: doctorId } },
      relations: ['subSlot', 'availabilitySlot'],
    });
    if (!appointment) throw new NotFoundException('Appointment not found');

    appointment.status = 'cancelled';
    appointment.notes = `Cancelled by doctor. Reason: ${cancelDto.reason || 'No reason provided'}`;
    const saved = await this.appointmentRepository.save(appointment);

    if (appointment.subSlot) {
      appointment.subSlot.current_bookings = Math.max(
        0,
        appointment.subSlot.current_bookings - 1,
      );
      await this.subSlotRepository.save(appointment.subSlot);
    }
    appointment.availabilitySlot.current_bookings = Math.max(
      0,
      appointment.availabilitySlot.current_bookings - 1,
    );
    await this.availabilitySlotRepository.save(appointment.availabilitySlot);

    return { success: true, appointment: saved };
  }

  // ==============================
  // UTILS
  // ==============================
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }
  
  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins
      .toString()
      .padStart(2, '0')}:00`;
  }
}