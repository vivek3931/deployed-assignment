//src/controllers/patient-booking.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  BadRequestException,
  ParseUUIDPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  IsOptional,
  IsEnum,
  IsString,
} from 'class-validator';
import { PatientBookingService } from 'src/services/patient-booking.service';
import { BookAppointmentDto } from 'src/patient/dto/appointment.dto';

class CancelAppointmentDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

class RescheduleAppointmentDto {
  @IsString()
  new_availability_slot_id: string;

  @IsOptional()
  @IsString()
  preferred_time?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

@Controller('patients')
@UseGuards(AuthGuard('jwt'))
export class PatientsController {
  constructor(private patientBookingService: PatientBookingService) {}

  // ===== DOCTOR DISCOVERY =====

  @Get('doctors')
  @HttpCode(HttpStatus.OK)
  async getAllDoctors(
    @Query('specialization') specialization?: string,
    @Query('experience_years') experience_years?: string,
    @Query('consultation_fee_max') consultation_fee_max?: string,
    @Query('consultation_type') consultation_type?: string,
    @Query('location') location?: string,
    @Query('search') search?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
  ) {
    const filters = {
      specialization,
      experience_years: experience_years ? parseInt(experience_years, 10) : undefined,
      consultation_fee_max: consultation_fee_max ? parseInt(consultation_fee_max, 10) : undefined,
      consultation_type,
      location,
      search,
    };
    return this.patientBookingService.getAllDoctors(filters, page, limit);
  }

  @Get('doctors/:doctorId/available-slots')
  @HttpCode(HttpStatus.OK)
  async getDoctorAvailableSlots(
    @Param('doctorId', ParseUUIDPipe) doctorId: string,
    @Query('date') date: string,
  ) {
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new BadRequestException('Date is required in YYYY-MM-DD format');
    }
    return this.patientBookingService.getDoctorAvailableSlots(doctorId, date);
  }

  @Get('doctors/:doctorId/profile')
  @HttpCode(HttpStatus.OK)
  async getDoctorProfile(@Param('doctorId', ParseUUIDPipe) doctorId: string) {
    const doctors = await this.patientBookingService.getAllDoctors({}, 1, 1);
    const doctor = doctors.data.doctors.find(d => d.id === doctorId);
    if (!doctor) {
      throw new BadRequestException('Doctor not found');
    }
    return {
      success: true,
      doctor,
    };
  }

  // ===== APPOINTMENT BOOKING =====

  @Post('appointments')
  @HttpCode(HttpStatus.CREATED)
  async bookAppointment(
    @Req() req: any,
    @Body(ValidationPipe) bookAppointmentDto: BookAppointmentDto,
  ) {
    if (req.user.role !== 'patient') {
      throw new BadRequestException('Access denied. Patients only.');
    }
    return this.patientBookingService.bookAppointment(req.user.id, bookAppointmentDto);
  }

  // ===== APPOINTMENT MANAGEMENT =====

  @Get('appointments')
  @HttpCode(HttpStatus.OK)
  async getMyAppointments(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('upcoming_only') upcomingOnly?: string,
  ) {
    if (req.user.role !== 'patient') {
      throw new BadRequestException('Access denied. Patients only.');
    }

    let filterStatus = status;
    if (upcomingOnly === 'true') {
      filterStatus = 'scheduled'; // Only get scheduled appointments for upcoming
    }

    const result = await this.patientBookingService.getPatientAppointments(req.user.id, filterStatus);
    
    // If upcoming_only is true, further filter by date
    if (upcomingOnly === 'true') {
      const now = new Date();
      result.appointments = result.appointments.filter(apt => {
        const aptDate = new Date(apt.appointment_date);
        return aptDate >= now;
      });
    }

    return result;
  }

  @Get('appointments/:appointmentId')
  @HttpCode(HttpStatus.OK)
  async getAppointmentDetails(
    @Req() req: any,
    @Param('appointmentId', ParseUUIDPipe) appointmentId: string,
  ) {
    if (req.user.role !== 'patient') {
      throw new BadRequestException('Access denied. Patients only.');
    }
    return this.patientBookingService.getAppointmentDetails(appointmentId, req.user.id);
  }

  @Put('appointments/:appointmentId/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelAppointment(
    @Req() req: any,
    @Param('appointmentId', ParseUUIDPipe) appointmentId: string,
    @Body(ValidationPipe) cancelDto: CancelAppointmentDto,
  ) {
    if (req.user.role !== 'patient') {
      throw new BadRequestException('Access denied. Patients only.');
    }
    return this.patientBookingService.cancelPatientAppointment(
      req.user.id, 
      appointmentId, 
      cancelDto.reason
    );
  }

  @Put('appointments/:appointmentId/confirm')
  @HttpCode(HttpStatus.OK)
  async confirmAppointment(
    @Req() req: any,
    @Param('appointmentId', ParseUUIDPipe) appointmentId: string,
  ) {
    if (req.user.role !== 'patient') {
      throw new BadRequestException('Access denied. Patients only.');
    }

    // TODO: Implement confirmation logic in service
    return {
      success: true,
      message: 'Appointment confirmed successfully',
    };
  }

  @Put('appointments/:appointmentId/reschedule')
  @HttpCode(HttpStatus.OK)
  async rescheduleAppointment(
    @Req() req: any,
    @Param('appointmentId', ParseUUIDPipe) appointmentId: string,
    @Body(ValidationPipe) rescheduleDto: RescheduleAppointmentDto,
  ) {
    if (req.user.role !== 'patient') {
      throw new BadRequestException('Access denied. Patients only.');
    }

    // TODO: Implement rescheduling logic in service
    // This would involve:
    // 1. Cancel the current appointment
    // 2. Book a new appointment with the new slot
    // 3. Link them as rescheduled
    
    return {
      success: true,
      message: 'Appointment rescheduled successfully',
    };
  }

  // ===== APPOINTMENT HISTORY AND ANALYTICS =====

  @Get('appointments/history')
  @HttpCode(HttpStatus.OK)
  async getAppointmentHistory(
    @Req() req: any,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
    @Query('status') status?: string,
  ) {
    if (req.user.role !== 'patient') {
      throw new BadRequestException('Access denied. Patients only.');
    }

    // Get all appointments and then paginate
    const allAppointments = await this.patientBookingService.getPatientAppointments(req.user.id, status);
    
    // Simple pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedAppointments = allAppointments.appointments.slice(startIndex, endIndex);

    return {
      success: true,
      data: {
        appointments: paginatedAppointments,
        pagination: {
          current_page: page,
          per_page: limit,
          total_items: allAppointments.appointments.length,
          total_pages: Math.ceil(allAppointments.appointments.length / limit),
        },
      },
    };
  }

  @Get('appointments/upcoming')
  @HttpCode(HttpStatus.OK)
  async getUpcomingAppointments(
    @Req() req: any,
    @Query('days', new ParseIntPipe({ optional: true })) days = 30,
  ) {
    if (req.user.role !== 'patient') {
      throw new BadRequestException('Access denied. Patients only.');
    }

    const appointments = await this.patientBookingService.getPatientAppointments(req.user.id);
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + days);

    const upcoming = appointments.appointments.filter(apt => {
      const aptDate = new Date(apt.appointment_date);
      return aptDate >= now && aptDate <= futureDate && 
             (apt.status === 'scheduled' || apt.status === 'confirmed');
    });

    return {
      success: true,
      appointments: upcoming,
    };
  }

  @Get('dashboard/stats')
  @HttpCode(HttpStatus.OK)
  async getDashboardStats(@Req() req: any) {
    if (req.user.role !== 'patient') {
      throw new BadRequestException('Access denied. Patients only.');
    }

    const allAppointments = await this.patientBookingService.getPatientAppointments(req.user.id);
    const now = new Date();

    const upcoming = allAppointments.appointments.filter(apt => {
      const aptDate = new Date(apt.appointment_date);
      return aptDate >= now && (apt.status === 'scheduled' || apt.status === 'confirmed');
    });

    const completed = allAppointments.appointments.filter(apt => apt.status === 'completed');
    const cancelled = allAppointments.appointments.filter(apt => apt.status === 'cancelled');
    
    const thisMonthSpending = completed
      .filter(apt => {
        const aptDate = new Date(apt.appointment_date);
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        return aptDate.getMonth() === currentMonth && aptDate.getFullYear() === currentYear;
      })
      .reduce((sum, apt) => sum + (apt.consultation_fee || 0), 0);

    return {
      success: true,
      stats: {
        upcoming_appointments: upcoming.length,
        completed_appointments: completed.length,
        cancelled_appointments: cancelled.length,
        total_appointments: allAppointments.appointments.length,
        this_month_spending: thisMonthSpending,
        favorite_doctors: this.getFavoriteDoctors(allAppointments.appointments),
      },
    };
  }

  // ===== UTILITY METHODS =====

  private getFavoriteDoctors(appointments: any[]) {
    const doctorCounts = appointments.reduce((acc, apt) => {
      const doctorName = apt.doctor_name;
      acc[doctorName] = (acc[doctorName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(doctorCounts)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 3)
      .map(([name, count]) => ({ name, visit_count: count }));
  }

  // ===== FEEDBACK AND RATINGS =====

  @Post('appointments/:appointmentId/feedback')
  @HttpCode(HttpStatus.CREATED)
  async submitFeedback(
    @Req() req: any,
    @Param('appointmentId', ParseUUIDPipe) appointmentId: string,
    @Body() feedbackData: {
      rating: number;
      comment?: string;
      would_recommend: boolean;
    },
  ) {
    if (req.user.role !== 'patient') {
      throw new BadRequestException('Access denied. Patients only.');
    }

    // TODO: Implement feedback system in service
    return {
      success: true,
      message: 'Feedback submitted successfully',
      feedback: {
        appointment_id: appointmentId,
        rating: feedbackData.rating,
        comment: feedbackData.comment,
        would_recommend: feedbackData.would_recommend,
      },
    };
  }

  // ===== NOTIFICATIONS AND REMINDERS =====

  @Get('notifications')
  @HttpCode(HttpStatus.OK)
  async getNotifications(@Req() req: any) {
    if (req.user.role !== 'patient') {
      throw new BadRequestException('Access denied. Patients only.');
    }

    // TODO: Implement notification system
    return {
      success: true,
      notifications: [
        {
          id: 1,
          type: 'appointment_reminder',
          title: 'Appointment Reminder',
          message: 'You have an appointment tomorrow at 10:00 AM',
          read: false,
          created_at: new Date(),
        },
      ],
    };
  }

  @Put('notifications/:notificationId/read')
  @HttpCode(HttpStatus.OK)
  async markNotificationAsRead(
    @Req() req: any,
    @Param('notificationId', ParseIntPipe) notificationId: number,
  ) {
    if (req.user.role !== 'patient') {
      throw new BadRequestException('Access denied. Patients only.');
    }

    // TODO: Implement notification read status update
    return {
      success: true,
      message: 'Notification marked as read',
    };
  }
}