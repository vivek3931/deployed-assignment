// src/patient/patient.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Patient } from '../entities/patient.entity';
import { PatientProfile } from '../entities/patient-profile.entity';
import { OnboardingStatus } from '../entities/onboarding-status.entity';
import { VerificationToken } from '../entities/verification-token.entity';
import { User } from '../entities/user.entity';
import { PatientOnboardingController } from './patient-onboarding.controller';
import { PatientOnboardingService } from './patient-onboarding.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Patient,
      PatientProfile,
      OnboardingStatus,
      VerificationToken,
      User
    ])
  ],
  controllers: [PatientOnboardingController],
  providers: [PatientOnboardingService],
  exports: [PatientOnboardingService]
})
export class PatientModule {}