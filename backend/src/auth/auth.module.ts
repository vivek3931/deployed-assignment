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

import { User } from '../entities/user.entity';
import { Doctor } from '../entities/doctor.entity';
import { Patient } from '../entities/patient.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Doctor, Patient]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: '24h', // Token expires in 24 hours
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, GoogleStrategy, JwtStrategy, RoleGuard],
  exports: [AuthService, RoleGuard],
})
export class AuthModule {}