import { Injectable, BadRequestException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Patient } from '../entities/patient.entity';
import { Doctor } from '../entities/doctor.entity';
import { VerificationToken } from '../entities/verification-token.entity';
import { OnboardingStatus } from '../entities/onboarding-status.entity';
import { PatientProfile } from '../entities/patient-profile.entity';
import { EmailService } from '../email/email.service';

interface RegisterDto {
  email: string;
  name: string;
  role: 'doctor' | 'patient';
  phone_number?: string;
}

interface VerifyOtpDto {
  email: string;
  otp: string;
  type: 'email' | 'phone';
}

interface ResendOtpDto {
  email: string;
  type: 'email' | 'phone';
}

interface LoginDto {
  email: string;
  otp: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Patient)
    private patientRepository: Repository<Patient>,
    @InjectRepository(Doctor)
    private doctorRepository: Repository<Doctor>,
    @InjectRepository(VerificationToken)
    private verificationTokenRepository: Repository<VerificationToken>,
    @InjectRepository(OnboardingStatus)
    private onboardingStatusRepository: Repository<OnboardingStatus>,
    @InjectRepository(PatientProfile)
    private patientProfileRepository: Repository<PatientProfile>,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  // Register new user
  async register(registerDto: RegisterDto) {
    const { email, name, role, phone_number } = registerDto;

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    // Create user
    const user = this.userRepository.create({
      email,
      name,
      role,
    });

    const savedUser = await this.userRepository.save(user);

    // Create role-specific entity
    if (role === 'patient') {
      const patient = this.patientRepository.create({
        userId: savedUser.id,
        user: savedUser,
      });
      const savedPatient = await this.patientRepository.save(patient);

      // Create patient profile
      const patientProfile = this.patientProfileRepository.create({
      patient: savedPatient,                  // assign entity, not id
     phone_number: phone_number ?? '',       // fallback if undefined/null
     email_verified: false,
     phone_verified: false,
     });
await this.patientProfileRepository.save(patientProfile);


      // Create onboarding status
      const onboardingStatus = this.onboardingStatusRepository.create({
        patientId: savedPatient.userId,
        patient: savedPatient,
        current_step: 0,
        completed_steps: [],
      });
      await this.onboardingStatusRepository.save(onboardingStatus);
    } else if (role === 'doctor') {
      const doctor = this.doctorRepository.create({
        userId: savedUser.id,
        user: savedUser,
        specialization: '', // Will be filled later
      });
      await this.doctorRepository.save(doctor);
    }

    // Send OTP
    await this.sendOtp(savedUser.email, 'email');

    return {
      success: true,
      message: 'Registration successful. Please verify your email with the OTP sent.',
      user: {
        id: savedUser.id,
        email: savedUser.email,
        name: savedUser.name,
        role: savedUser.role,
      },
    };
  }

  // Send OTP
  async sendOtp(email: string, type: 'email' | 'phone') {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Set expiration (10 minutes)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    // Delete any existing tokens for this user
    await this.verificationTokenRepository.delete({
      user: { id: user.id },
      type,
    });

    // Save new token to database
    const verificationToken = this.verificationTokenRepository.create({
      user,
      token: otp,
      type,
      expires_at: expiresAt,
    });

    await this.verificationTokenRepository.save(verificationToken);

    // Send OTP based on type
    if (type === 'email') {
      await this.sendEmailOtp(user.email, user.name, otp);
    }
    // Add SMS functionality later for phone verification

    return {
      success: true,
      message: `OTP sent to your ${type} successfully`,
    };
  }

  // Send OTP via email
  private async sendEmailOtp(email: string, name: string, otp: string) {
    const subject = 'Your Verification Code - Healthcare App';
    const text = `
Hello ${name},

Your verification code is: ${otp}

This code will expire in 10 minutes.

If you didn't request this code, please ignore this email.

Best regards,
Healthcare App Team
    `;

    await this.emailService.sendMail(email, subject, text);
  }

  // Verify OTP
  async verifyOtp(verifyOtpDto: VerifyOtpDto) {
    const { email, otp, type } = verifyOtpDto;

    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Find valid token
    const verificationToken = await this.verificationTokenRepository
      .createQueryBuilder('vt')
      .where('vt.user_id = :userId', { userId: user.id })
      .andWhere('vt.token = :token', { token: otp })
      .andWhere('vt.type = :type', { type })
      .andWhere('vt.is_used = false')
      .andWhere('vt.expires_at > :now', { now: new Date() })
      .getOne();

    if (!verificationToken) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    // Mark token as used
    verificationToken.is_used = true;
    await this.verificationTokenRepository.save(verificationToken);

    // Update verification status for patients
    if (user.role === 'patient') {
      const patientProfile = await this.patientProfileRepository.findOne({
        where: { patientId: user.id }
      });

      if (patientProfile) {
        if (type === 'email') {
          patientProfile.email_verified = true;
        } else if (type === 'phone') {
          patientProfile.phone_verified = true;
        }
        await this.patientProfileRepository.save(patientProfile);

        // Update onboarding step
        const onboardingStatus = await this.onboardingStatusRepository.findOne({
          where: { patientId: user.id }
        });

        if (onboardingStatus && !onboardingStatus.completed_steps.includes('verification')) {
          onboardingStatus.completed_steps.push('verification');
          onboardingStatus.current_step = Math.max(onboardingStatus.current_step, 1);
          await this.onboardingStatusRepository.save(onboardingStatus);
        }
      }
    }

    // Generate JWT token after successful verification
    const payload = { 
      sub: user.id, 
      email: user.email, 
      role: user.role 
    };
    
    const access_token = this.jwtService.sign(payload);

    return {
      success: true,
      message: 'OTP verified successfully',
      access_token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  // Resend OTP
  async resendOtp(resendOtpDto: ResendOtpDto) {
    const { email, type } = resendOtpDto;

    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check rate limiting (max 3 OTPs per 15 minutes)
    const fifteenMinutesAgo = new Date();
    fifteenMinutesAgo.setMinutes(fifteenMinutesAgo.getMinutes() - 15);

    const recentTokensCount = await this.verificationTokenRepository
      .createQueryBuilder('vt')
      .where('vt.user_id = :userId', { userId: user.id })
      .andWhere('vt.type = :type', { type })
      .andWhere('vt.created_at > :fifteenMinutesAgo', { fifteenMinutesAgo })
      .getCount();

    if (recentTokensCount >= 3) {
      throw new BadRequestException('Too many OTP requests. Please try again after 15 minutes.');
    }

    return await this.sendOtp(email, type);
  }

  // Login with OTP
  async loginWithOtp(loginDto: LoginDto) {
    const { email, otp } = loginDto;

    return this.verifyOtp({
      email,
      otp,
      type: 'email',
    });
  }

  // Google login (updated to work with session-based approach)
  async googleLogin(googleUser: any, role: string) {
    const { email, firstName, lastName } = googleUser;

    let user = await this.userRepository.findOne({ 
      where: { email },
      relations: ['patient', 'doctor']
    });

    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      // Create new user
      user = this.userRepository.create({
        email,
        name: `${firstName} ${lastName}`,
        role,
      });
      user = await this.userRepository.save(user);

      // Create role-specific entity
      if (role === 'patient') {
        const patient = this.patientRepository.create({
          userId: user.id,
          user,
        });
        const savedPatient = await this.patientRepository.save(patient);

        // Create patient profile (email verified by Google)
        const patientProfile = this.patientProfileRepository.create({
          patientId: savedPatient.userId,
          patient: savedPatient,
          email_verified: true,
          phone_verified: false,
        });
        await this.patientProfileRepository.save(patientProfile);

        // Create onboarding status
        const onboardingStatus = this.onboardingStatusRepository.create({
          patientId: savedPatient.userId,
          patient: savedPatient,
          current_step: 1,
          completed_steps: ['verification'],
        });
        await this.onboardingStatusRepository.save(onboardingStatus);
      } else if (role === 'doctor') {
        const doctor = this.doctorRepository.create({
          userId: user.id,
          user,
          specialization: '',
        });
        await this.doctorRepository.save(doctor);
      }
    }

    return { user, isNewUser };
  }

  // Get all users (for testing)
  async getAllUsers() {
    const users = await this.userRepository.find({
      relations: ['patient', 'doctor'],
    });

    return {
      success: true,
      users: users.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        created_at: user.created_at,
      })),
    };
  }

  // Validate user for JWT strategy
  async validateUser(payload: any): Promise<any> {
    const user = await this.userRepository.findOne({ 
      where: { id: payload.sub },
      relations: ['patient', 'doctor']
    });
    
    if (user) {
      return user;
    }
    return null;
  }

  async getAllDoctors() {
  const doctors = await this.userRepository.find({
    where: { role: 'doctor' },
    relations: ['doctor'],
  });

  return {
    success: true,
    count: doctors.length,
    doctors: doctors.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      specialization: user.doctor?.specialization || 'Not specified',
      created_at: user.created_at,
    })),
  };
}

// Get all patients
async getAllPatients() {
  const patients = await this.userRepository.find({
    where: { role: 'patient' },
    relations: ['patient'],
  });

  return {
    success: true,
    count: patients.length,
    patients: patients.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      created_at: user.created_at,
    })),
  };
}

// Get doctor by ID
async getDoctorById(id: string) {
  const user = await this.userRepository.findOne({
    where: { id, role: 'doctor' },
    relations: ['doctor'],
  });

  if (!user) {
    throw new NotFoundException('Doctor not found');
  }

  return {
    success: true,
    doctor: {
      id: user.id,
      name: user.name,
      email: user.email,
      specialization: user.doctor?.specialization || 'Not specified',
      created_at: user.created_at,
    },
  };
}

// Get patient by ID  
async getPatientById(id: string) {
  const user = await this.userRepository.findOne({
    where: { id, role: 'patient' },
    relations: ['patient'],
  });

  if (!user) {
    throw new NotFoundException('Patient not found');
  }

  return {
    success: true,
    patient: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      created_at: user.created_at,
    },
  };
}
}
