import { IsEmail, IsEnum, IsString, MinLength, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  name: string;

  @IsEnum(['doctor', 'patient'])
  role: string;

  @IsOptional()
  @IsString()
  phone_number?: string;
}

export class VerifyOtpDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(4)
  otp: string;

  @IsEnum(['email', 'phone'])
  type: string;
}

export class ResendOtpDto {
  @IsEmail()
  email: string;

  @IsEnum(['email', 'phone'])
  type: string;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(4)
  otp: string;
}
