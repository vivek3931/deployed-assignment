// src/patient/dto/onboarding.dto.ts
import { IsString, IsOptional, IsPhoneNumber, IsEnum, IsBoolean, IsArray } from 'class-validator';

export class CompleteProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone_number?: string;

  @IsOptional()
  @IsString()
  date_of_birth?: string;

  @IsOptional()
  @IsEnum(['male', 'female', 'other'])
  gender?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  emergency_contact?: string;
}

export class MedicalHistoryDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  medical_conditions?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergies?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  medications?: string[];
}

export class PreferencesDto {
  @IsOptional()
  @IsEnum(['metric', 'imperial'])
  preferred_units?: string;

  @IsOptional()
  @IsEnum(['english', 'hindi', 'marathi'])
  preferred_language?: string;

  @IsOptional()
  @IsBoolean()
  notification_enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  marketing_consent?: boolean;
}

export class VerifyTokenDto {
  @IsString()
  token: string;

  @IsEnum(['email', 'phone'])
  type: string;
}