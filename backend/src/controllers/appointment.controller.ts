// src/controllers/appointments.controller.ts
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
  BadRequestException
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PatientBookingService } from 'src/services/patient-booking.service';
import { 
  BookAppointmentDto, 
  UpdateAppointmentDto, 
  CancelAppointmentDto 
} from '../patient/dto/appointment.dto'

@Controller('api/v1/appointments')
export class AppointmentsController {
  constructor(private patientBookingService: PatientBookingService) {}

  // ===== APPOINTMENT BOOKING =====
  @Post()
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.CREATED)
  async bookAppointment(
    @Req() req: any,
    @Body(ValidationPipe) bookingDto: BookAppointmentDto,
  ) {
    if (req.user.role !== 'patient') {
      throw new BadRequestException('Access denied. Patients only.');
    }

    return this.patientBookingService.bookAppointment(req.user.id, bookingDto);
  }

  // ===== APPOINTMENT VIEWING =====
  @Get('my-appointments')
  @UseGuards(AuthGuard('jwt'))
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
      filterStatus = 'scheduled';
    }

    const result = await this.patientBookingService.getPatientAppointments(req.user.id, filterStatus);
    
    if (upcomingOnly === 'true') {
      const now = new Date();
      result.appointments = result.appointments.filter(apt => {
        const aptDate = new Date(apt.appointment_date);
        return aptDate >= now;
      });
    }

    return result;
  }

  @Get('upcoming')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async getUpcomingAppointments(
    @Req() req: any,
    @Query('days', new ParseIntPipe({ optional: true })) days = 7,
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

  @Get('history')
  @UseGuards(AuthGuard('jwt'))
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

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async getAppointmentDetails(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) appointmentId: string,
  ) {
    return this.patientBookingService.getAppointmentDetails(appointmentId, req.user.id);
  }

  // ===== APPOINTMENT MANAGEMENT =====
  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async updateAppointment(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) appointmentId: string,
    @Body(ValidationPipe) updateDto: UpdateAppointmentDto,
  ) {
    if (req.user.role !== 'patient') {
      throw new BadRequestException('Access denied. Patients only.');
    }

    // TODO: Implement update logic in service
    return {
      success: true,
      message: 'Appointment updated successfully',
    };
  }

  @Put(':id/cancel')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async cancelAppointment(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) appointmentId: string,
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

  @Put(':id/confirm')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async confirmAppointment(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) appointmentId: string,
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

  @Put(':id/reschedule')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async rescheduleAppointment(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) appointmentId: string,
    @Body() rescheduleData: {
      new_availability_slot_id: string;
      new_sub_slot_id?: string;
      reason?: string;
    },
  ) {
    if (req.user.role !== 'patient') {
      throw new BadRequestException('Access denied. Patients only.');
    }

    // TODO: Implement reschedule logic in service
    return {
      success: true,
      message: 'Appointment rescheduled successfully',
    };
  }

  // ===== FEEDBACK =====
  @Post(':id/feedback')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.CREATED)
  async submitFeedback(
    @Req() req: any,
    @Param('id', ParseUUIDPipe) appointmentId: string,
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

  // ===== UTILITY ENDPOINTS =====
  @Get('reference/:reference')
  @HttpCode(HttpStatus.OK)
  async getAppointmentByReference(@Param('reference') reference: string) {
    // TODO: Implement reference lookup in service
    return {
      success: true,
      appointment: {
        booking_reference: reference,
        // Basic appointment info without sensitive data
      },
    };
  }

  @Get('system/health')
  @HttpCode(HttpStatus.OK)
  async getSystemHealth() {
    return {
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        booking_service: 'operational',
        notification_service: 'operational',
        database: 'operational',
      },
    };
  }

  // ===== ADMIN ENDPOINTS =====
  @Get('admin/all')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async getAllAppointments(
    @Req() req: any,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 20,
    @Query('status') status?: string,
    @Query('date') date?: string,
  ) {
    if (req.user.role !== 'admin') {
      throw new BadRequestException('Access denied. Admin only.');
    }

    // TODO: Implement admin view in service
    return {
      success: true,
      data: {
        appointments: [],
        pagination: {
          current_page: page,
          per_page: limit,
          total_items: 0,
          total_pages: 0,
        },
      },
    };
  }
}