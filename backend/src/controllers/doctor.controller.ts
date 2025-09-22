import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  ParseUUIDPipe,
  ParseIntPipe,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  IsOptional,
  IsEnum,
  IsString,
  IsNumber,
  IsBoolean,
  IsArray,
  IsDateString,
  Min,
} from 'class-validator';
import { DoctorAvailabilityService } from 'src/services/doctor-availability.service';
import { PatientBookingService } from 'src/services/patient-booking.service';

// DTOs for validation
class CreateAvailabilitySlotDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsString()
  start_time: string;

  @IsString()
  end_time: string;

  @IsEnum(['wave', 'stream'])
  schedule_type: 'wave' | 'stream';

  @IsOptional()
  @IsNumber()
  @Min(1)
  sub_slot_duration?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  capacity_per_sub_slot?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  total_capacity?: number;

  @IsOptional()
  @IsEnum(['in_person', 'video_call', 'phone_call', 'hybrid'])
  consultation_type?: 'in_person' | 'video_call' | 'phone_call' | 'hybrid';

  @IsOptional()
  @IsString()
  notes?: string;

  // Recurring fields
  @IsOptional()
  @IsBoolean()
  is_recurring?: boolean;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  weekdays?: string[];
}

class UpdateDoctorProfileDto {
  @IsOptional()
  @IsString()
  specialization?: string;

  @IsOptional()
  @IsNumber()
  experience_years?: number;

  @IsOptional()
  @IsString()
  education?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsNumber()
  consultation_fee?: number;

  @IsOptional()
  @IsString()
  clinic_address?: string;

  @IsOptional()
  @IsEnum(['wave', 'stream'])
  default_schedule_type?: 'wave' | 'stream';

  @IsOptional()
  @IsNumber()
  @Min(1)
  default_slot_duration?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  advance_booking_days?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  same_day_booking_cutoff?: number;

  @IsOptional()
  @IsBoolean()
  is_accepting_patients?: boolean;
}

class CancelAppointmentDto {
  @IsOptional()
  @IsString()
  reason?: string;

  @IsEnum(['doctor', 'system'])
  cancellation_type: 'doctor' | 'system';

  @IsOptional()
  @IsNumber()
  refund_amount?: number;
}

@Controller('doctors')
export class DoctorsController {
  constructor(
    private doctorAvailabilityService: DoctorAvailabilityService,
    private patientBookingService: PatientBookingService,
  ) {}

  // ===== PUBLIC ENDPOINTS (For Patients) =====

  @Get()
  @HttpCode(HttpStatus.OK)
  async getAllDoctors(
    @Query('specialization') specialization?: string,
    @Query('experience_years') experience_years?: number,
    @Query('consultation_fee_max') consultation_fee_max?: number,
    @Query('consultation_type') consultation_type?: string,
    @Query('search') search?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
  ) {
    const filters = {
      specialization,
      experience_years,
      consultation_fee_max,
      consultation_type,
      search,
    };
    return this.patientBookingService.getAllDoctors(filters, page, limit);
  }

  @Get(':id/available-slots')
  @HttpCode(HttpStatus.OK)
  async getDoctorAvailableSlots(
    @Param('id', ParseUUIDPipe) doctorId: string,
    @Query('date') date: string,
  ) {
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BadRequestException('Date is required in YYYY-MM-DD format');
    }
    return this.patientBookingService.getDoctorAvailableSlots(doctorId, date);
  }

  @Get(':id/profile')
  @HttpCode(HttpStatus.OK)
  async getDoctorProfile(@Param('id', ParseUUIDPipe) doctorId: string) {
    return this.doctorAvailabilityService.getDoctorProfile(doctorId);
  }

  // ===== PROTECTED ENDPOINTS (For Doctors Only) =====

  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async getMyProfile(@Req() req: any) {
    if (req.user.role !== 'doctor') {
      throw new BadRequestException('Access denied. Doctors only.');
    }
    return this.doctorAvailabilityService.getDoctorProfile(req.user.id);
  }

  @Put('profile')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @Req() req: any,
    @Body(ValidationPipe) updateDto: UpdateDoctorProfileDto,
  ) {
    if (req.user.role !== 'doctor') {
      throw new BadRequestException('Access denied. Doctors only.');
    }
    return this.doctorAvailabilityService.updateDoctorProfile(req.user.id, updateDto);
  }

  @Post('availability-slots')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.CREATED)
  async createAvailabilitySlot(
    @Req() req: any,
    @Body(ValidationPipe) createSlotDto: CreateAvailabilitySlotDto,
  ) {
    if (req.user.role !== 'doctor') {
      throw new BadRequestException('Access denied. Doctors only.');
    }

    // Validate recurring fields if is_recurring is true
    if (createSlotDto.is_recurring) {
      if (!createSlotDto.weekdays || createSlotDto.weekdays.length === 0) {
        throw new BadRequestException('Weekdays are required for recurring schedules');
      }
      if (!createSlotDto.end_date) {
        throw new BadRequestException('End date is required for recurring schedules');
      }
    } else {
      if (!createSlotDto.date) {
        throw new BadRequestException('Date is required for single availability slot');
      }
    }

    return this.doctorAvailabilityService.createAvailabilitySlot(req.user.id, createSlotDto);
  }

  @Get('availability-slots')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async getMyAvailabilitySlots(
    @Req() req: any,
    @Query('date') date?: string,
  ) {
    if (req.user.role !== 'doctor') {
      throw new BadRequestException('Access denied. Doctors only.');
    }
    return this.doctorAvailabilityService.getDoctorAvailability(req.user.id, date);
  }

  @Put('availability-slots/:slotId')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async updateAvailabilitySlot(
    @Req() req: any,
    @Param('slotId', ParseUUIDPipe) slotId: string,
    @Body() updateData: Partial<CreateAvailabilitySlotDto>,
  ) {
    if (req.user.role !== 'doctor') {
      throw new BadRequestException('Access denied. Doctors only.');
    }
    return this.doctorAvailabilityService.updateAvailabilitySlot(req.user.id, slotId, updateData);
  }

  @Delete('availability-slots/:slotId')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async deleteAvailabilitySlot(
    @Req() req: any,
    @Param('slotId', ParseUUIDPipe) slotId: string,
  ) {
    if (req.user.role !== 'doctor') {
      throw new BadRequestException('Access denied. Doctors only.');
    }
    return this.doctorAvailabilityService.deleteAvailabilitySlot(req.user.id, slotId);
  }

  // ===== APPOINTMENT MANAGEMENT =====

  @Get('appointments')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async getMyAppointments(
    @Req() req: any,
    @Query('date') date?: string,
    @Query('status') status?: string,
  ) {
    if (req.user.role !== 'doctor') {
      throw new BadRequestException('Access denied. Doctors only.');
    }
    return this.doctorAvailabilityService.getDoctorAppointments(req.user.id, date, status);
  }

  @Get('appointments/:appointmentId')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async getAppointmentDetails(
    @Req() req: any,
    @Param('appointmentId', ParseUUIDPipe) appointmentId: string,
  ) {
    if (req.user.role !== 'doctor') {
      throw new BadRequestException('Access denied. Doctors only.');
    }
    return this.patientBookingService.getAppointmentDetails(appointmentId, req.user.id);
  }

  @Put('appointments/:appointmentId/status')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async updateAppointmentStatus(
    @Req() req: any,
    @Param('appointmentId', ParseUUIDPipe) appointmentId: string,
    @Body() body: { 
      status: 'scheduled' | 'confirmed' | 'completed' | 'no_show' | 'rescheduled';
      notes?: string;
    },
  ) {
    if (req.user.role !== 'doctor') {
      throw new BadRequestException('Access denied. Doctors only.');
    }
    return this.doctorAvailabilityService.updateAppointmentStatus(
      req.user.id, 
      appointmentId, 
      body.status, 
      body.notes
    );
  }

  @Put('appointments/:appointmentId/cancel')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async cancelAppointment(
    @Req() req: any,
    @Param('appointmentId', ParseUUIDPipe) appointmentId: string,
    @Body(ValidationPipe) cancelDto: CancelAppointmentDto,
  ) {
    if (req.user.role !== 'doctor') {
      throw new BadRequestException('Access denied. Doctors only.');
    }
    return this.doctorAvailabilityService.cancelAppointment(
      req.user.id, 
      appointmentId, 
      cancelDto
    );
  }

  @Put('appointments/:appointmentId/complete')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async completeAppointment(
    @Req() req: any,
    @Param('appointmentId', ParseUUIDPipe) appointmentId: string,
    @Body() body: { notes?: string; prescription?: string; follow_up?: string },
  ) {
    if (req.user.role !== 'doctor') {
      throw new BadRequestException('Access denied. Doctors only.');
    }
    
    const notes = [
      body.notes,
      body.prescription ? `Prescription: ${body.prescription}` : null,
      body.follow_up ? `Follow-up: ${body.follow_up}` : null,
    ].filter(Boolean).join('; ');

    return this.doctorAvailabilityService.updateAppointmentStatus(
      req.user.id, 
      appointmentId, 
      'completed',
      notes
    );
  }

  @Put('appointments/:appointmentId/no-show')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async markNoShow(
    @Req() req: any,
    @Param('appointmentId', ParseUUIDPipe) appointmentId: string,
    @Body() body: { notes?: string },
  ) {
    if (req.user.role !== 'doctor') {
      throw new BadRequestException('Access denied. Doctors only.');
    }
    return this.doctorAvailabilityService.updateAppointmentStatus(
      req.user.id, 
      appointmentId, 
      'no_show',
      body.notes
    );
  }

  // ===== DASHBOARD AND ANALYTICS =====

  @Get('dashboard/stats')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async getDashboardStats(@Req() req: any) {
    if (req.user.role !== 'doctor') {
      throw new BadRequestException('Access denied. Doctors only.');
    }

    const today = new Date().toISOString().split('T')[0];
    const todayAppointments = await this.doctorAvailabilityService.getDoctorAppointments(
      req.user.id, 
      today
    );

    const upcomingAppointments = await this.doctorAvailabilityService.getDoctorAppointments(
      req.user.id
    );

    return {
      success: true,
      stats: {
        today_appointments: todayAppointments.appointments.length,
        upcoming_appointments: upcomingAppointments.appointments.filter(apt => 
          apt.status === 'scheduled' || apt.status === 'confirmed'
        ).length,
        total_patients: new Set(upcomingAppointments.appointments.map(apt => apt.patient.userId)).size,
        this_month_earnings: upcomingAppointments.appointments
          .filter(apt => apt.status === 'completed')
          .reduce((sum, apt) => sum + (apt.consultation_fee || 0), 0),
      },
    };
  }

  @Get('dashboard/today')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async getTodaySchedule(@Req() req: any) {
    if (req.user.role !== 'doctor') {
      throw new BadRequestException('Access denied. Doctors only.');
    }

    const today = new Date().toISOString().split('T')[0];
    return this.doctorAvailabilityService.getDoctorAppointments(req.user.id, today);
  }

  @Get('dashboard/upcoming')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async getUpcomingAppointments(
    @Req() req: any,
    @Query('days', new ParseIntPipe({ optional: true })) days = 7,
  ) {
    if (req.user.role !== 'doctor') {
      throw new BadRequestException('Access denied. Doctors only.');
    }

    const appointments = await this.doctorAvailabilityService.getDoctorAppointments(req.user.id);
    const upcoming = appointments.appointments.filter(apt => {
      const aptDate = new Date(apt.appointment_date);
      const now = new Date();
      const daysDiff = Math.ceil((aptDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysDiff <= days && daysDiff >= 0 && 
             (apt.status === 'scheduled' || apt.status === 'confirmed');
    });

    return {
      success: true,
      appointments: upcoming,
    };
  }
}