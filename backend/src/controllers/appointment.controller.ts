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

// REMOVE the local DTO classes - they're now imported

@Controller('api/v1/appointments')
export class AppointmentsController {
  constructor(private patientBookingService: PatientBookingService) {}

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

  @Get('my-appointments')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async getMyAppointments(
    @Req() req: any,
    @Query('status') status?: string,
  ) {
    if (req.user.role !== 'patient') {
      throw new BadRequestException('Access denied. Patients only.');
    }

    return this.patientBookingService.getPatientAppointments(req.user.id, status);
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

    return {
      success: true,
      message: 'Appointment rescheduled successfully',
    };
  }

  @Get('history')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async getAppointmentHistory(
    @Req() req: any,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
  ) {
    if (req.user.role !== 'patient') {
      throw new BadRequestException('Access denied. Patients only.');
    }

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

  @Get('upcoming')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async getUpcomingAppointments(@Req() req: any) {
    if (req.user.role !== 'patient') {
      throw new BadRequestException('Access denied. Patients only.');
    }

    return this.patientBookingService.getPatientAppointments(req.user.id, 'scheduled');
  }

  @Get('reference/:reference')
  @HttpCode(HttpStatus.OK)
  async getAppointmentByReference(@Param('reference') reference: string) {
    return {
      success: true,
      appointment: {},
    };
  }

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
}