// src/entities/patient-profile.entity.ts
import { Entity, PrimaryColumn, Column, OneToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Patient } from './patient.entity';

@Entity('patient_profiles')
export class PatientProfile {
  @PrimaryColumn({ name: 'patient_id' })
  patientId: string;

  @OneToOne(() => Patient, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patient_id' })
  patient: Patient;

  @Column({ length: 15, nullable: true })
  phone_number: string;

  @Column({ type: 'boolean', default: false })
  phone_verified: boolean;

  @Column({ type: 'boolean', default: false })
  email_verified: boolean;

  @Column({ length: 255, nullable: true })
  profile_image: string;

  @Column({ type: 'enum', enum: ['metric', 'imperial'], default: 'metric' })
  preferred_units: string;

  @Column({ type: 'boolean', default: true })
  notification_enabled: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}