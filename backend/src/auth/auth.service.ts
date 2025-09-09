// src/auth/auth.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { User } from '../entities/user.entity';
import { Doctor } from '../entities/doctor.entity';
import { Patient } from '../entities/patient.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Doctor)
    private doctorRepository: Repository<Doctor>,
    @InjectRepository(Patient)
    private patientRepository: Repository<Patient>,
    private jwtService: JwtService,
  ) {}

  async googleLogin(googleUser: any) {
    const { email, name, role } = googleUser;
    
    // Check if user already exists
    let user = await this.userRepository.findOne({ 
      where: { email },
      relations: ['doctor', 'patient']
    });

    if (!user) {
      // Create new user
      user = this.userRepository.create({
        email,
        name,
        provider: 'google',
        role,
      });
      
      user = await this.userRepository.save(user);

      // Create role-specific profile
      if (role === 'doctor') {
        const doctor = this.doctorRepository.create({
          userId: user.id,
          license_number: '', // Will be filled later
          specialization: '', // Will be filled later
          user: user,
        });
        await this.doctorRepository.save(doctor);
      } else if (role === 'patient') {
        const patient = this.patientRepository.create({
          userId: user.id,
          user: user,
        });
        await this.patientRepository.save(patient);
      }
    }

    // Generate JWT token
    const payload = { 
      email: user.email, 
      sub: user.id, 
      role: user.role,
      name: user.name 
    };
    
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async validateUser(email: string): Promise<User | null> {
    return this.userRepository.findOne({ 
      where: { email },
      relations: ['doctor', 'patient']
    });
  }
}