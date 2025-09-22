// src/entities/doctor.entity.ts
import {
  Entity,
  OneToOne,
  OneToMany,
  JoinColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryColumn,
  Generated,
} from 'typeorm';
import { User } from './user.entity';
import { DoctorAvailabilitySlot } from './doctor-availability.entity';

@Entity('doctors')
export class Doctor {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  @Generated('uuid')
  userId: string;

  @OneToOne(() => User, (user) => user.doctor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => DoctorAvailabilitySlot, (slot) => slot.doctor)
  availabilitySlots: DoctorAvailabilitySlot[];

  @Column({ length: 100, nullable: true })
  specialization: string;

  @Column({ type: 'int', nullable: true })
  experience_years: number;

  @Column({ type: 'text', nullable: true })
  education: string;

  @Column({ type: 'text', nullable: true })
  bio: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  consultation_fee: number;

  @Column({ type: 'text', nullable: true })
  clinic_address: string;

  @Column({ length: 255, nullable: true })
  profile_image: string;

  @Column({ type: 'boolean', default: true })
  is_accepting_patients: boolean;

  @Column({ type: 'enum', enum: ['wave', 'stream'], default: 'stream' })
  default_schedule_type: 'wave' | 'stream';

  @Column({ type: 'int', nullable: true })
  default_slot_duration: number;

  @Column({ type: 'int', default: 30 })
  advance_booking_days: number;

  @Column({ type: 'int', default: 120 })
  same_day_booking_cutoff: number;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
