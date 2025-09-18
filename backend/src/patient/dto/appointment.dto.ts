import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID
} from 'class-validator';

export class BookAppointmentDto {
  @IsUUID()
  doctorId: string;

  @IsUUID()
  availabilitySlotId: string;

  @IsOptional()
  @IsString()
  preferred_time?: string;

  @IsOptional()
  @IsString()
  appointment_reason?: string;

  @IsOptional()
  @IsString()
  symptoms?: string;

  @IsOptional()
  @IsEnum(['in_person', 'video_call', 'phone_call'])
  consultation_type?: 'in_person' | 'video_call' | 'phone_call';
}

export class UpdateAppointmentDto {
  @IsOptional()
  @IsString()
  appointment_reason?: string;

  @IsOptional()
  @IsString()
  symptoms?: string;

  @IsOptional()
  @IsEnum(['in_person', 'video_call', 'phone_call'])
  consultation_type?: 'in_person' | 'video_call' | 'phone_call';
}

export class CancelAppointmentDto {
  @IsOptional()
  @IsString()
  reason?: string;

  @IsEnum(['patient', 'doctor', 'system'])
  cancellation_type: 'patient' | 'doctor' | 'system';
}