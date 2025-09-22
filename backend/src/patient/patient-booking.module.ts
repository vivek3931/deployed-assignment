import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PatientBookingService } from 'src/services/patient-booking.service';
import { PatientsController } from 'src/controllers/patient-booking.controller';
import { Doctor } from '../entities/doctor.entity';
import { Patient } from '../entities/patient.entity';
import { DoctorAvailabilitySlot } from '../entities/doctor-availability.entity';
import { AppointmentSubSlot } from '../entities/appointment-sub-slot.entity';
import { Appointment } from '../entities/appointment.entity';
import { User } from '../entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Doctor,
      Patient,
      DoctorAvailabilitySlot,
      AppointmentSubSlot,
      Appointment,
      User,
    ]),
  ],
  controllers: [PatientsController],
  providers: [PatientBookingService],
  exports: [PatientBookingService, TypeOrmModule],
})
export class PatientBookingModule {}