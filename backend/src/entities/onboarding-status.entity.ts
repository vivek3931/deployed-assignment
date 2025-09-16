// src/entities/onboarding-status.entity.ts
import { Entity, PrimaryColumn, Column, OneToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Patient } from './patient.entity';

@Entity('onboarding_status')
export class OnboardingStatus {
  @PrimaryColumn({ name: 'patient_id' })
  patientId: string;

  @OneToOne(() => Patient, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patient_id' })
  patient: Patient;

  @Column({ type: 'boolean', default: false })
  profile_completed: boolean;

  @Column({ type: 'boolean', default: false })
  preferences_set: boolean;

  @Column({ type: 'boolean', default: false })
  walkthrough_completed: boolean;

  @Column({ type: 'int', default: 0 })
  current_step: number; // 0-4 (0=start, 4=completed)

  @Column({ type: 'json', nullable: true })
  completed_steps: string[]; // Array of completed step names

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
