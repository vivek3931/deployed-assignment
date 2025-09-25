import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { User } from './entities/user.entity';
import { Doctor } from './entities/doctor.entity';
import { Patient } from './entities/patient.entity';
import { PatientProfile } from './entities/patient-profile.entity';
import { Appointment } from './entities/appointment.entity';
import { Availability } from './entities/availability.entity';
import { DoctorAvailabilitySlot } from './entities/doctor-availability.entity';
import { AppointmentSubSlot } from './entities/appointment-sub-slot.entity';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL, // Use Render external DB URL
  ssl: {
    rejectUnauthorized: false, // important for Render
  },
  entities: [
    User,
    Doctor,
    Patient,
    PatientProfile,
    Appointment,
    Availability,
    DoctorAvailabilitySlot,
    AppointmentSubSlot,
  ],
  migrations: ['src/migrations/*.ts'],
  synchronize: false, // NEVER use synchronize in production
});
