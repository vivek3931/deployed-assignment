// src/entities/patient.entity.ts
import {
  Entity,
  OneToOne,
  JoinColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('patients')
export class Patient {
  @PrimaryColumn({ name: 'user_id' })
  userId: string; // The type should match your User entity's primary key type (uuid)

  @OneToOne(() => User, (user) => user.patient, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'date', nullable: true })
  date_of_birth: Date;

  @Column({ type: 'enum', enum: ['male', 'female', 'other'], nullable: true })
  gender: string;

  @Column({ length: 15, nullable: true })
  blood_group: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ length: 15, nullable: true })
  emergency_contact: string;

  @Column({ type: 'text', nullable: true })
  medical_history: string;

  @Column({ type: 'text', nullable: true })
  allergies: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}