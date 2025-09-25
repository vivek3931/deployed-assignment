import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { DoctorsModule } from './doctors/doctors.module';
import { PatientBookingModule } from './patient/patient-booking.module';

// Entities
import { User } from './entities/user.entity';
import { Doctor } from './entities/doctor.entity';
import { Patient } from './entities/patient.entity';
import { PatientProfile } from './entities/patient-profile.entity';
import { Appointment } from './entities/appointment.entity';
import { Availability } from './entities/availability.entity';
import { DoctorAvailabilitySlot } from './entities/doctor-availability.entity';
import { AppointmentSubSlot } from './entities/appointment-sub-slot.entity';

@Module({
  imports: [
    // Load environment variables from Render
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // TypeORM setup using DATABASE_URL from Render
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const dbUrl = configService.get<string>('DATABASE_URL');
        console.log('--- Connecting to Database ---');
        console.log('DATABASE_URL:', dbUrl ? '[REDACTED]' : 'Not Found');
        console.log('--------------------------------');

        return {
          type: 'postgres',
          url: dbUrl,
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
          synchronize: false, // keep false in production
        };
      },
      inject: [ConfigService],
    }),

    AuthModule,
    DoctorsModule,
    PatientBookingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
