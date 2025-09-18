import { Injectable, BadRequestException, NotFoundException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, QueryRunner } from 'typeorm';
import { Doctor } from '../entities/doctor.entity';
import { Patient } from '../entities/patient.entity';
import { DoctorAvailabilitySlot } from '../entities/doctor-availability.entity';
import { AppointmentSubSlot } from '../entities/appointment-sub-slot.entity';
import { Appointment } from '../entities/appointment.entity';
import { User } from '../entities/user.entity';
import { BookAppointmentDto } from '../patient/dto/appointment.dto';

interface DoctorFilters {
    specialization?: string;
    experience_years?: number;
    consultation_fee_max?: number;
    consultation_type?: string;
    location?: string;
    search?: string;
}

@Injectable()
export class PatientBookingService {
    constructor(
        @InjectRepository(Doctor)
        private doctorRepository: Repository<Doctor>,
        @InjectRepository(Patient)
        private patientRepository: Repository<Patient>,
        @InjectRepository(DoctorAvailabilitySlot)
        private availabilitySlotRepository: Repository<DoctorAvailabilitySlot>,
        @InjectRepository(AppointmentSubSlot)
        private subSlotRepository: Repository<AppointmentSubSlot>,
        @InjectRepository(Appointment)
        private appointmentRepository: Repository<Appointment>,
        @InjectRepository(User)
        private userRepository: Repository<User>,
    ) {}
     

    // In your PatientBookingService, add this at the start of bookAppointment:

    // ==============================
    // DOCTOR DISCOVERY & LISTING
    // ==============================
    async getAllDoctors(filters: DoctorFilters = {}, page = 1, limit = 10) {
        const queryBuilder = this.doctorRepository
            .createQueryBuilder('doctor')
            .leftJoinAndSelect('doctor.user', 'user')
            .where('doctor.is_accepting_patients = :accepting', { accepting: true });

        if (filters.specialization) {
            queryBuilder.andWhere('LOWER(doctor.specialization) LIKE LOWER(:specialization)', {
                specialization: `%${filters.specialization}%`,
            });
        }

        if (filters.experience_years) {
            queryBuilder.andWhere('doctor.experience_years >= :experience', {
                experience: filters.experience_years,
            });
        }

        if (filters.consultation_fee_max) {
            queryBuilder.andWhere('doctor.consultation_fee <= :maxFee', {
                maxFee: filters.consultation_fee_max,
            });
        }

        if (filters.search) {
            queryBuilder.andWhere(
                '(LOWER(user.name) LIKE LOWER(:search) OR LOWER(doctor.specialization) LIKE LOWER(:search))',
                { search: `%${filters.search}%` }
            );
        }

        const skip = (page - 1) * limit;
        queryBuilder.skip(skip).take(limit);
        queryBuilder.orderBy('doctor.experience_years', 'DESC');

        const [doctors, total] = await queryBuilder.getManyAndCount();

        return {
            success: true,
            data: {
                doctors: doctors.map(doctor => ({
                    id: doctor.userId,
                    name: doctor.user.name,
                    email: doctor.user.email,
                    specialization: doctor.specialization,
                    experience_years: doctor.experience_years,
                    education: doctor.education,
                    bio: doctor.bio,
                    consultation_fee: doctor.consultation_fee,
                    clinic_address: doctor.clinic_address,
                    profile_image: doctor.profile_image,
                    is_accepting_patients: doctor.is_accepting_patients,
                    default_schedule_type: doctor.default_schedule_type,
                })),
                pagination: {
                    current_page: page,
                    per_page: limit,
                    total_items: total,
                    total_pages: Math.ceil(total / limit),
                },
            },
        };
    }

    // ==============================
    // DOCTOR AVAILABILITY CHECKING
    // ==============================
    async getDoctorAvailableSlots(doctorId: string, date: string) {
        const doctor = await this.doctorRepository.findOne({
            where: { userId: doctorId },
            relations: ['user'],
        });

        if (!doctor) {
            throw new NotFoundException('Doctor not found');
        }

        const slotDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (slotDate < today) {
            throw new BadRequestException('Cannot view slots for past dates');
        }

        const maxAdvanceDate = new Date();
        maxAdvanceDate.setDate(maxAdvanceDate.getDate() + (doctor.advance_booking_days || 30));

        if (slotDate > maxAdvanceDate) {
            throw new BadRequestException(`Bookings only available ${doctor.advance_booking_days || 30} days in advance`);
        }

        const availabilitySlots = await this.availabilitySlotRepository.find({
            where: {
                doctor: { userId: doctorId },
                date: slotDate,
                is_active: true,
            },
            relations: ['subSlots'],
            order: { start_time: 'ASC' },
        });

        const slotsData = await Promise.all(
            availabilitySlots.map(async (slot) => {
                const availableCapacity = (slot.total_capacity || 0) - (slot.current_bookings || 0);

                if (slot.schedule_type === 'wave') {
                    const availableSubSlots = slot.subSlots
                        ?.filter(subSlot => (subSlot.current_bookings || 0) < (subSlot.max_capacity || 1))
                        .map(subSlot => ({
                            id: subSlot.id,
                            start_time: subSlot.start_time,
                            end_time: subSlot.end_time,
                            available_spots: (subSlot.max_capacity || 1) - (subSlot.current_bookings || 0),
                            max_capacity: subSlot.max_capacity,
                        })) || [];

                    return {
                        id: slot.id,
                        start_time: slot.start_time,
                        end_time: slot.end_time,
                        schedule_type: 'wave',
                        sub_slot_duration: slot.sub_slot_duration,
                        capacity_per_sub_slot: slot.capacity_per_sub_slot,
                        consultation_type: slot.consultation_type,
                        available_sub_slots: availableSubSlots,
                        has_availability: availableSubSlots.length > 0,
                        total_available_spots: availableSubSlots.reduce((sum, s) => sum + (s.available_spots || 0), 0),
                    };
                } else {
                    const nextAvailableSlots = this.calculateStreamAvailableSlots(slot);

                    return {
                        id: slot.id,
                        start_time: slot.start_time,
                        end_time: slot.end_time,
                        schedule_type: 'stream',
                        sub_slot_duration: slot.sub_slot_duration,
                        consultation_type: slot.consultation_type,
                        available_spots: availableCapacity,
                        total_capacity: slot.total_capacity,
                        next_available_slots: nextAvailableSlots,
                        has_availability: availableCapacity > 0,
                    };
                }
            })
        );

        return {
            success: true,
            doctor: {
                id: doctor.userId,
                name: doctor.user.name,
                specialization: doctor.specialization,
                consultation_fee: doctor.consultation_fee,
                clinic_address: doctor.clinic_address,
            },
            date: date,
            slots: slotsData.filter(slot => slot.has_availability),
        };
    }

    // ==============================
    // APPOINTMENT BOOKING (MAIN FUNCTIONALITY)
    // ==============================
    async bookAppointment(patientId: string, bookingDto: BookAppointmentDto) {
    console.log('=== DEBUG START ===');
    console.log('Patient ID:', patientId);
    console.log('Booking DTO:', bookingDto);

    // Validate patient exists
    const patient = await this.patientRepository.findOne({
        where: { userId: patientId },
        relations: ['user'],
    });

    console.log('Patient found:', !!patient);
    console.log('Patient user found:', !!patient?.user);
    console.log('Patient user name:', patient?.user?.name);

    if (!patient) {
        throw new NotFoundException('Patient not found');
    }

    // Validate availability slot exists and is active
    const availabilitySlot = await this.availabilitySlotRepository.findOne({
        where: { id: bookingDto.availabilitySlotId },
        relations: ['doctor', 'doctor.user', 'subSlots'],
    });

    console.log('Availability slot found:', !!availabilitySlot);
    console.log('Availability slot doctor found:', !!availabilitySlot?.doctor);
    console.log('Availability slot doctor user found:', !!availabilitySlot?.doctor?.user);
    console.log('Doctor user name:', availabilitySlot?.doctor?.user?.name);

    if (!availabilitySlot) {
        console.error('CRITICAL: Availability slot not found with ID:', bookingDto.availabilitySlotId);
        throw new NotFoundException('Availability slot not found');
    }

    if (!availabilitySlot.doctor) {
        console.error('CRITICAL: Doctor relation missing on availability slot');
        throw new NotFoundException('Doctor not found for this availability slot');
    }

    if (!availabilitySlot.doctor.user) {
        console.error('CRITICAL: User relation missing on doctor');
        throw new NotFoundException('Doctor user information not found');
    }

    if (!availabilitySlot.is_active) {
        throw new NotFoundException('Availability slot is inactive');
    }

    // Validate booking time window (same-day cutoff etc.)
    await this.validateBookingTimeWindow(availabilitySlot);

    // Quick capacity check before attempting transaction
    if ((availabilitySlot.current_bookings || 0) >= (availabilitySlot.total_capacity || 0)) {
        throw new ConflictException('This availability is fully booked. Choose another slot.');
    }

    const slotDuration = availabilitySlot.sub_slot_duration || 30;
    let queuePosition: number | null = null;

    console.log('=== STARTING TRANSACTION ===');
    // Create transaction for atomic booking
    const queryRunner: QueryRunner = this.appointmentRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
        console.log('=== INSIDE TRANSACTION ===');

        let selectedSubSlot: AppointmentSubSlot | null = null;
        let assignedTime: string;
        let assignedEndTime: string;

        // CRITICAL FIX: Re-load availability with ALL required relations including doctor.user
        const availRepo = queryRunner.manager.getRepository(DoctorAvailabilitySlot);
        const lockedAvailability = await availRepo.findOne({
            where: { id: availabilitySlot.id },
            relations: ['subSlots', 'doctor', 'doctor.user'], // FIXED: Added doctor.user relation
        });

        console.log('=== LOCKED AVAILABILITY LOADED ===');
        console.log('Locked availability found:', !!lockedAvailability);
        console.log('Locked availability doctor found:', !!lockedAvailability?.doctor);
        console.log('Locked availability doctor user found:', !!lockedAvailability?.doctor?.user);
        console.log('Locked doctor user name:', lockedAvailability?.doctor?.user?.name);

        if (!lockedAvailability) {
            throw new NotFoundException('Availability slot not found during booking.');
        }

        if (!lockedAvailability.doctor) {
            throw new NotFoundException('Doctor not found during booking.');
        }

        if (!lockedAvailability.doctor.user) {
            throw new NotFoundException('Doctor user information not found during booking.');
        }

        // Re-check capacity under transaction lock
        if ((lockedAvailability.current_bookings || 0) >= (lockedAvailability.total_capacity || 0)) {
            throw new ConflictException('This availability is fully booked. Choose another slot.');
        }

        console.log('=== PROCESSING SCHEDULE TYPE ===');
        console.log('Schedule type:', lockedAvailability.schedule_type);

        if (lockedAvailability.schedule_type === 'wave') {
            console.log('=== WAVE SCHEDULING ===');
            // WAVE SCHEDULING: Pick specific sub-slot
            const subSlotRepo = queryRunner.manager.getRepository(AppointmentSubSlot);

            if (bookingDto.preferred_time) {
                console.log('Looking for preferred time:', bookingDto.preferred_time);
                // Try preferred time first
                const preferredSubSlot = await subSlotRepo.createQueryBuilder('s')
                    .setLock('pessimistic_write')
                    .where('s.availabilitySlot = :availId', { availId: lockedAvailability.id })
                    .andWhere('s.start_time = :start', { start: bookingDto.preferred_time })
                    .getOne();

                if (!preferredSubSlot) {
                    throw new BadRequestException(`Preferred sub-slot ${bookingDto.preferred_time} not found.`);
                }

                if ((preferredSubSlot.current_bookings || 0) >= (preferredSubSlot.max_capacity || 1)) {
                    throw new ConflictException(`Preferred time ${bookingDto.preferred_time} is already fully booked.`);
                }

                selectedSubSlot = preferredSubSlot;
                console.log('Selected preferred sub-slot:', selectedSubSlot.id);
            } else {
                console.log('Finding first available sub-slot');
                // Find first available sub-slot
                const availableSubSlot = await subSlotRepo.createQueryBuilder('s')
                    .setLock('pessimistic_write')
                    .where('s.availabilitySlot = :availId', { availId: lockedAvailability.id })
                    .andWhere('COALESCE(s.current_bookings, 0) < COALESCE(s.max_capacity, 1)')
                    .orderBy('s.start_time', 'ASC')
                    .getOne();

                if (!availableSubSlot) {
                    throw new ConflictException('No available sub-slots found for wave scheduling.');
                }

                selectedSubSlot = availableSubSlot;
                console.log('Selected available sub-slot:', selectedSubSlot.id);
            }

            // Assign time from selected sub-slot
            assignedTime = selectedSubSlot.start_time;
            assignedEndTime = selectedSubSlot.end_time;

            console.log('Wave assigned time:', assignedTime, 'to', assignedEndTime);

            // Update sub-slot booking count
            selectedSubSlot.current_bookings = (selectedSubSlot.current_bookings || 0) + 1;
            if (selectedSubSlot.current_bookings >= (selectedSubSlot.max_capacity || 1)) {
                selectedSubSlot.status = 'full';
            }
            await subSlotRepo.save(selectedSubSlot);
            console.log('Sub-slot updated, current bookings:', selectedSubSlot.current_bookings);

        } else {
            console.log('=== STREAM SCHEDULING ===');
            // STREAM SCHEDULING: Sequential time assignment
            const currentBookings = lockedAvailability.current_bookings || 0;
            queuePosition = currentBookings + 1;

            const startMinutes = this.timeToMinutes(lockedAvailability.start_time);
            const assignedStartMinutes = startMinutes + (currentBookings * slotDuration);
            const assignedEndMinutes = assignedStartMinutes + slotDuration;
            const slotEndMinutes = this.timeToMinutes(lockedAvailability.end_time);

            console.log('Stream calculation:');
            console.log('- Current bookings:', currentBookings);
            console.log('- Queue position:', queuePosition);
            console.log('- Start minutes:', startMinutes);
            console.log('- Assigned start minutes:', assignedStartMinutes);
            console.log('- Assigned end minutes:', assignedEndMinutes);
            console.log('- Slot end minutes:', slotEndMinutes);

            if (assignedEndMinutes > slotEndMinutes) {
                throw new ConflictException('No more time slots available in this session.');
            }

            assignedTime = this.minutesToTime(assignedStartMinutes);
            assignedEndTime = this.minutesToTime(assignedEndMinutes);

            console.log('Stream assigned time:', assignedTime, 'to', assignedEndTime);

            // Validate preferred time if provided
            if (bookingDto.preferred_time && bookingDto.preferred_time !== assignedTime) {
                throw new ConflictException(`Preferred time ${bookingDto.preferred_time} is not available. Assigned time is ${assignedTime}`);
            }
        }

        console.log('=== CREATING APPOINTMENT ===');
        console.log('Patient:', !!patient);
        console.log('Doctor:', !!lockedAvailability.doctor);
        console.log('Doctor User:', !!lockedAvailability.doctor.user);

        // Create appointment record
        const appointmentRepo = queryRunner.manager.getRepository(Appointment);
        const newAppointment = appointmentRepo.create({
            patient,
            doctor: lockedAvailability.doctor,
            availabilitySlot: lockedAvailability,
            subSlot: selectedSubSlot || null,
            appointment_date: lockedAvailability.date,
            appointment_time: assignedTime,
            appointment_end_time: assignedEndTime,
            duration: slotDuration,
            status: 'scheduled',
            consultation_type: bookingDto.consultation_type || lockedAvailability.consultation_type,
            booking_type: lockedAvailability.schedule_type,
            queue_position: queuePosition,
            estimated_time: assignedTime,
            appointment_reason: bookingDto.appointment_reason || null,
            symptoms: bookingDto.symptoms || null,
            consultation_fee: lockedAvailability.doctor.consultation_fee || null,
        } as Partial<Appointment>);

        console.log('Appointment created, saving...');
        const savedAppointment = await appointmentRepo.save(newAppointment);
        console.log('Appointment saved with ID:', savedAppointment.id);
        console.log('Appointment booking reference:', savedAppointment.booking_reference);

        // Update availability booking count
        lockedAvailability.current_bookings = (lockedAvailability.current_bookings || 0) + 1;
        await availRepo.save(lockedAvailability);
        console.log('Availability updated, current bookings:', lockedAvailability.current_bookings);

        console.log('=== COMMITTING TRANSACTION ===');
        // Commit transaction
        await queryRunner.commitTransaction();
        console.log('Transaction committed successfully');

        console.log('=== CREATING RESPONSE ===');
        console.log('Doctor name for response:', lockedAvailability.doctor.user.name);

        // Return success response
        const response = {
            success: true,
            message: 'Appointment booked successfully',
            appointment: {
                id: savedAppointment.id,
                booking_reference: savedAppointment.booking_reference,
                doctor_name: lockedAvailability.doctor.user.name, // This should now work
                doctor_specialization: lockedAvailability.doctor.specialization,
                appointment_date: savedAppointment.appointment_date,
                appointment_time: savedAppointment.appointment_time,
                appointment_end_time: savedAppointment.appointment_end_time,
                estimated_time: savedAppointment.estimated_time,
                duration: savedAppointment.duration,
                consultation_type: savedAppointment.consultation_type,
                consultation_fee: savedAppointment.consultation_fee,
                status: savedAppointment.status,
                booking_type: savedAppointment.booking_type,
                queue_position: savedAppointment.queue_position,
                clinic_address: lockedAvailability.doctor.clinic_address,
            },
        };

        console.log('=== RESPONSE CREATED SUCCESSFULLY ===');
        return response;

    } catch (error) {
        console.error('=== TRANSACTION ERROR ===');
        console.error('Error type:', error.constructor.name);
        console.error('Error message:', error.message);
        console.error('Full error:', error);

        // Rollback transaction on error
        try {
            await queryRunner.rollbackTransaction();
            console.log('Transaction rolled back successfully');
        } catch (rollbackError) {
            console.error('Rollback failed:', rollbackError.message);
        }

        // Re-throw known exceptions
        if (error instanceof BadRequestException || 
            error instanceof ConflictException || 
            error instanceof NotFoundException) {
            throw error;
        }

        // Wrap unknown errors
        console.error('Throwing internal server error');
        throw new InternalServerErrorException(error.message || 'Failed to book appointment');
    } finally {
        console.log('=== RELEASING QUERY RUNNER ===');
        await queryRunner.release();
        console.log('Query runner released');
    }
}

    // ==============================
    // PATIENT APPOINTMENT MANAGEMENT
    // ==============================
    async getPatientAppointments(patientId: string, status?: string) {
        const whereClause: any = {
            patient: { userId: patientId },
        };

        if (status) {
            whereClause.status = status;
        }

        const appointments = await this.appointmentRepository.find({
            where: whereClause,
            relations: ['doctor', 'doctor.user', 'availabilitySlot'],
            order: { appointment_date: 'DESC', appointment_time: 'DESC' },
        });

        return {
            success: true,
            appointments: appointments.map(apt => ({
                id: apt.id,
                booking_reference: apt.booking_reference,
                doctor_name: apt.doctor.user.name,
                doctor_specialization: apt.doctor.specialization,
                appointment_date: apt.appointment_date,
                appointment_time: apt.appointment_time,
                appointment_end_time: apt.appointment_end_time,
                estimated_time: apt.estimated_time,
                duration: apt.duration,
                status: apt.status,
                consultation_type: apt.consultation_type,
                consultation_fee: apt.consultation_fee,
                booking_type: apt.booking_type,
                queue_position: apt.queue_position,
                clinic_address: apt.doctor.clinic_address,
                appointment_reason: apt.appointment_reason,
                created_at: apt.created_at,
                can_cancel: this.canCancelAppointment(apt),
                can_reschedule: this.canRescheduleAppointment(apt),
            })),
        };
    }

    async getAppointmentDetails(appointmentId: string, userId: string) {
        const appointment = await this.appointmentRepository.findOne({
            where: { id: appointmentId },
            relations: ['patient', 'patient.user', 'doctor', 'doctor.user', 'availabilitySlot', 'subSlot'],
        });

        if (!appointment) {
            throw new NotFoundException('Appointment not found');
        }

        // Check access permissions
        if (appointment.patient.userId !== userId && appointment.doctor.userId !== userId) {
            throw new BadRequestException('Access denied');
        }

        return {
            success: true,
            appointment: {
                id: appointment.id,
                booking_reference: appointment.booking_reference,
                patient_name: appointment.patient.user.name,
                patient_email: appointment.patient.user.email,
                doctor_name: appointment.doctor.user.name,
                doctor_specialization: appointment.doctor.specialization,
                doctor_email: appointment.doctor.user.email,
                appointment_date: appointment.appointment_date,
                appointment_time: appointment.appointment_time,
                appointment_end_time: appointment.appointment_end_time,
                estimated_time: appointment.estimated_time,
                duration: appointment.duration,
                status: appointment.status,
                consultation_type: appointment.consultation_type,
                consultation_fee: appointment.consultation_fee,
                booking_type: appointment.booking_type,
                queue_position: appointment.queue_position,
                clinic_address: appointment.doctor.clinic_address,
                appointment_reason: appointment.appointment_reason,
                symptoms: appointment.symptoms,
                notes: appointment.notes,
                created_at: appointment.created_at,
                updated_at: appointment.updated_at,
                can_cancel: this.canCancelAppointment(appointment),
                can_reschedule: this.canRescheduleAppointment(appointment),
            },
        };
    }

    async cancelPatientAppointment(patientId: string, appointmentId: string, reason?: string) {
        const appointment = await this.appointmentRepository.findOne({
            where: { 
                id: appointmentId,
                patient: { userId: patientId }
            },
            relations: ['doctor', 'doctor.user', 'availabilitySlot', 'subSlot']
        });

        if (!appointment) {
            throw new NotFoundException('Appointment not found or you do not have permission to cancel it');
        }

        if (!this.canCancelAppointment(appointment)) {
            throw new BadRequestException('Appointment cannot be cancelled at this time');
        }

        // Update appointment status
        appointment.status = 'cancelled';
        appointment.notes = `Cancelled by patient. Reason: ${reason || 'No reason provided'}`;
        appointment.cancelled_by = 'patient';
        appointment.cancelled_at = new Date();

        const savedAppointment = await this.appointmentRepository.save(appointment);

        // Free up sub-slot capacity if exists
        if (appointment.subSlot) {
            appointment.subSlot.current_bookings = Math.max(0, (appointment.subSlot.current_bookings || 0) - 1);
            if (appointment.subSlot.current_bookings < (appointment.subSlot.max_capacity || 1)) {
                appointment.subSlot.status = 'available';
            }
            await this.subSlotRepository.save(appointment.subSlot);
        }

        // Free up main availability slot capacity
        const availabilitySlot = appointment.availabilitySlot;
        availabilitySlot.current_bookings = Math.max(0, (availabilitySlot.current_bookings || 0) - 1);
        await this.availabilitySlotRepository.save(availabilitySlot);

        return {
            success: true,
            message: 'Appointment cancelled successfully',
            appointment: {
                id: savedAppointment.id,
                booking_reference: savedAppointment.booking_reference,
                status: savedAppointment.status,
                cancellation_reason: reason,
            },
        };
    }

    // ==============================
    // HELPER METHODS
    // ==============================
    private calculateStreamAvailableSlots(slot: DoctorAvailabilitySlot): Array<{start_time: string, end_time: string, position: number}> {
        const slotDuration = slot.sub_slot_duration || 30;
        const startMinutes = this.timeToMinutes(slot.start_time);
        const endMinutes = this.timeToMinutes(slot.end_time);
        const currentBookings = slot.current_bookings || 0;

        const maxSlots = Math.floor((endMinutes - startMinutes) / slotDuration);
        const availableSlots: Array<{start_time: string, end_time: string, position: number}> = [];

        // Show next few available time slots (up to 3)
        for (let i = currentBookings; i < Math.min(currentBookings + 3, maxSlots); i++) {
            const slotStartMinutes = startMinutes + (i * slotDuration);
            const slotEndMinutes = slotStartMinutes + slotDuration;

            if (slotEndMinutes <= endMinutes) {
                availableSlots.push({
                    start_time: this.minutesToTime(slotStartMinutes),
                    end_time: this.minutesToTime(slotEndMinutes),
                    position: i + 1,
                });
            }
        }

        return availableSlots;
    }

    private async validateBookingTimeWindow(availabilitySlot: DoctorAvailabilitySlot) {
        const now = new Date();
        const slotDate = new Date(availabilitySlot.date);
        const slotStartTime = this.timeToMinutes(availabilitySlot.start_time);
        const cutoffMinutes = availabilitySlot.doctor.same_day_booking_cutoff || 120;

        const slotDateTime = new Date(slotDate);
        slotDateTime.setHours(Math.floor(slotStartTime / 60), slotStartTime % 60, 0, 0);
        const cutoffDateTime = new Date(slotDateTime.getTime() - (cutoffMinutes * 60 * 1000));

        if (now > cutoffDateTime && slotDate.toDateString() === now.toDateString()) {
            throw new BadRequestException(`Same-day booking cutoff time has passed. Booking must be made at least ${cutoffMinutes} minutes before the appointment.`);
        }
    }

    private canCancelAppointment(appointment: Appointment): boolean {
        if (appointment.status === 'cancelled' || appointment.status === 'completed') {
            return false;
        }

        const appointmentDateTime = new Date(appointment.appointment_date);
        const [hours, minutes] = appointment.appointment_time.split(':').map(Number);
        appointmentDateTime.setHours(hours, minutes, 0, 0);

        const now = new Date();
        const timeDiffHours = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

        return timeDiffHours > 2; // Can cancel up to 2 hours before
    }

    private canRescheduleAppointment(appointment: Appointment): boolean {
        if (appointment.status === 'cancelled' || appointment.status === 'completed') {
            return false;
        }

        const appointmentDateTime = new Date(appointment.appointment_date);
        const [hours, minutes] = appointment.appointment_time.split(':').map(Number);
        appointmentDateTime.setHours(hours, minutes, 0, 0);

        const now = new Date();
        const timeDiffHours = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

        return timeDiffHours > 4; // Can reschedule up to 4 hours before
    }

    // Utility time conversion methods
    private timeToMinutes(time: string): number {
        const [hours, mins] = time.split(':').map(Number);
        return hours * 60 + mins;
    }

    private minutesToTime(minutes: number): string {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:00`;
    }
}