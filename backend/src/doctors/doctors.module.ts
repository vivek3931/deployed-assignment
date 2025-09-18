// src/doctors/doctors.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DoctorsController } from 'src/controllers/doctor.controller';
import { DoctorAvailabilityService } from '../services/doctor-availability.service';
import { PatientBookingService } from '../services/patient-booking.service';
import { Doctor } from '../entities/doctor.entity';
import { DoctorAvailabilitySlot } from '../entities/doctor-availability.entity';
import { AppointmentSubSlot } from '../entities/appointment-sub-slot.entity';
import { Appointment } from '../entities/appointment.entity';
import { Patient } from '../entities/patient.entity'; // <-- Add this import
import { User } from '../entities/user.entity'; // <-- Add this import

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Doctor,
      DoctorAvailabilitySlot,
      AppointmentSubSlot,
      Appointment,
      Patient, // <-- Add this line
      User // <-- Add this line
    ]),
  ],
  controllers: [DoctorsController],
  providers: [
    DoctorAvailabilityService,
    PatientBookingService,
  ],
  exports: [
    DoctorAvailabilityService,
    PatientBookingService,
  ]
})
export class DoctorsModule {}