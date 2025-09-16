// src/patient/patient-onboarding.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Patient } from '../entities/patient.entity';
import { PatientProfile } from '../entities/patient-profile.entity';
import { OnboardingStatus } from '../entities/onboarding-status.entity';
import { VerificationToken } from '../entities/verification-token.entity';
import { User } from '../entities/user.entity';
import { CompleteProfileDto, MedicalHistoryDto, PreferencesDto, VerifyTokenDto } from './dto/onboarding.dto';

@Injectable()
export class PatientOnboardingService {
  constructor(
    @InjectRepository(Patient)
    private patientRepository: Repository<Patient>,
    @InjectRepository(PatientProfile)
    private profileRepository: Repository<PatientProfile>,
    @InjectRepository(OnboardingStatus)
    private onboardingRepository: Repository<OnboardingStatus>,
    @InjectRepository(VerificationToken)
    private tokenRepository: Repository<VerificationToken>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async getOnboardingStatus(userId: string) {
    const patient = await this.patientRepository.findOne({
      where: { userId },
      relations: ['user']
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    let onboarding = await this.onboardingRepository.findOne({
      where: { patientId: patient.userId }
    });

    if (!onboarding) {
      // Create initial onboarding status
      onboarding = this.onboardingRepository.create({
        patientId: patient.userId,
        current_step: 0,
        completed_steps: []
      });
      await this.onboardingRepository.save(onboarding);
    }

    return {
      ...onboarding,
      total_steps: 4,
      completion_percentage: Math.round((onboarding.current_step / 4) * 100)
    };
  }

  async completeProfile(userId: string, profileData: CompleteProfileDto) {
    const patient = await this.patientRepository.findOne({
      where: { userId },
      relations: ['user']
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    // Update patient basic info
    if (profileData.date_of_birth) {
      patient.date_of_birth = new Date(profileData.date_of_birth);
    }
    if (profileData.gender) {
      patient.gender = profileData.gender;
    }
    if (profileData.address) {
      patient.address = profileData.address;
    }
    if (profileData.emergency_contact) {
      patient.emergency_contact = profileData.emergency_contact;
    }

    await this.patientRepository.save(patient);

    // Update user name if provided
    if (profileData.name) {
      await this.userRepository.update(userId, { name: profileData.name });
    }

    // Create or update profile
    let profile = await this.profileRepository.findOne({
      where: { patientId: userId }
    });

    if (!profile) {
      profile = this.profileRepository.create({
        patientId: userId,
        phone_number: profileData.phone_number
      });
    } else {
      if (profileData.phone_number) {
        profile.phone_number = profileData.phone_number;
        profile.phone_verified = false; // Reset verification if phone changed
      }
    }

    await this.profileRepository.save(profile);

    // Update onboarding status
    await this.updateOnboardingStep(userId, 1, 'profile_completed');

    return { message: 'Profile completed successfully' };
  }

  async sendVerificationToken(userId: string, type: 'email' | 'phone') {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const profile = await this.profileRepository.findOne({
      where: { patientId: userId }
    });

    // Generate 6-digit token
    const token = Math.floor(100000 + Math.random() * 900000).toString();

    // Set expiry to 10 minutes from now
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    // Save verification token
    const verificationToken = this.tokenRepository.create({
      user,
      token,
      type,
      expires_at: expiresAt
    });

    await this.tokenRepository.save(verificationToken);

    // In a real app, you would send the token via email/SMS here
    console.log(`Verification token for ${type}: ${token}`);

    return {
      message: `Verification token sent to your ${type}`,
      // In development, return the token for testing
      ...(process.env.NODE_ENV === 'development' && { token })
    };
  }

  async verifyToken(userId: string, verifyData: VerifyTokenDto) {
    const token = await this.tokenRepository.findOne({
      where: {
        user: { id: userId },
        token: verifyData.token,
        type: verifyData.type,
        is_used: false
      },
      relations: ['user']
    });

    if (!token) {
      throw new BadRequestException('Invalid or expired token');
    }

    if (token.expires_at < new Date()) {
      throw new BadRequestException('Token has expired');
    }

    // Mark token as used
    token.is_used = true;
    await this.tokenRepository.save(token);

    // Update profile verification status
    const profile = await this.profileRepository.findOne({
      where: { patientId: userId }
    });

    if (profile) {
      if (verifyData.type === 'email') {
        profile.email_verified = true;
      } else if (verifyData.type === 'phone') {
        profile.phone_verified = true;
      }
      await this.profileRepository.save(profile);
    }

    return { message: `${verifyData.type} verified successfully` };
  }

  async completeMedicalHistory(userId: string, medicalData: MedicalHistoryDto) {
    let profile = await this.profileRepository.findOne({
      where: { patientId: userId }
    });

    if (!profile) {
      profile = this.profileRepository.create({ patientId: userId });
    }
    await this.profileRepository.save(profile);
    await this.updateOnboardingStep(userId, 2, 'medical_history_completed');

    return { message: 'Medical history completed successfully' };
  }

  async setPreferences(userId: string, preferences: PreferencesDto) {
    let profile = await this.profileRepository.findOne({
      where: { patientId: userId }
    });

    if (!profile) {
      profile = this.profileRepository.create({ patientId: userId });
    }

    if (preferences.preferred_units) {
      profile.preferred_units = preferences.preferred_units;
    }
   
    if (preferences.notification_enabled !== undefined) {
      profile.notification_enabled = preferences.notification_enabled;
    }
    

    await this.profileRepository.save(profile);
    await this.updateOnboardingStep(userId, 3, 'preferences_set');

    return { message: 'Preferences set successfully' };
  }

  async completeWalkthrough(userId: string) {
    await this.updateOnboardingStep(userId, 4, 'walkthrough_completed');
    return { message: 'Onboarding completed successfully!' };
  }

  private async updateOnboardingStep(userId: string, step: number, completedStepName: string) {
    let onboarding = await this.onboardingRepository.findOne({
      where: { patientId: userId }
    });

    if (!onboarding) {
      onboarding = this.onboardingRepository.create({
        patientId: userId,
        current_step: 0,
        completed_steps: []
      });
    }

    // Update current step if it's higher
    if (step > onboarding.current_step) {
      onboarding.current_step = step;
    }

    // Add completed step if not already present
    const completedSteps = onboarding.completed_steps || [];
    if (!completedSteps.includes(completedStepName)) {
      completedSteps.push(completedStepName);
      onboarding.completed_steps = completedSteps;
    }

    // Update boolean flags
    if (completedStepName === 'profile_completed') {
      onboarding.profile_completed = true;
    } else if (completedStepName === 'walkthrough_completed'){
      onboarding.walkthrough_completed = true;
    }

    await this.onboardingRepository.save(onboarding);
  }
}