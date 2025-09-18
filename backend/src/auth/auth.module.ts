// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleStrategy } from './strategies/google.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RoleGuard } from './guards/role.guard';

// Add the new services
import { DoctorAvailabilityService } from '../services/doctor-availability.service';
import { PatientBookingService } from '../services/patient-booking.service';

import { User } from '../entities/user.entity';
import { Doctor } from '../entities/doctor.entity';
import { Patient } from '../entities/patient.entity';
// Add new entities
import { DoctorAvailabilitySlot } from '../entities/doctor-availability.entity';
import { AppointmentSubSlot } from '../entities/appointment-sub-slot.entity';
import { Appointment } from '../entities/appointment.entity';
import { VerificationToken } from '../entities/verification-token.entity';
import { OnboardingStatus } from '../entities/onboarding-status.entity';
import { PatientProfile } from '../entities/patient-profile.entity';
import { EmailService } from 'src/email/email.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User, 
      Doctor, 
      Patient, 
      DoctorAvailabilitySlot,
      AppointmentSubSlot,
      Appointment,
      VerificationToken,
      OnboardingStatus,
      PatientProfile
    ]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: '7d', // Extended to 7 days for better UX
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService, 
    GoogleStrategy, 
    JwtStrategy, 
    RoleGuard,
    DoctorAvailabilityService,
    PatientBookingService,
    EmailService
  ],
  exports: [
    AuthService, 
    RoleGuard, 
    DoctorAvailabilityService,
    PatientBookingService
  ],
})
export class AuthModule {}