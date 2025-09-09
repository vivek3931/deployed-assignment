// src/entities/user.entity.ts
import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn, 
  UpdateDateColumn,
  OneToOne
} from 'typeorm';
import { Doctor } from './doctor.entity';
import { Patient } from './patient.entity'; // <-- Import the Patient entity

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  name: string;

  @Column({ default: 'google' })
  provider: string;

  @Column({ type: 'enum', enum: ['doctor', 'patient'] })
  role: string;

  // This defines the inverse side for the Doctor relationship
  @OneToOne(() => Doctor, doctor => doctor.user)
  doctor: Doctor;

  // This defines the inverse side for the Patient relationship
  @OneToOne(() => Patient, patient => patient.user)
  patient: Patient;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}