import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Doctor } from './doctor.entity';
import { AppointmentSubSlot } from './appointment-sub-slot.entity';

export type ScheduleType = 'wave' | 'stream';
export type ConsultationType = 'in_person' | 'video_call' | 'phone_call' | 'hybrid';

@Entity('doctor_availability_slots')
export class DoctorAvailabilitySlot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Doctor, (doctor) => doctor.availabilitySlots, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doctor_id' })
  doctor: Doctor;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'time' })
  start_time: string;

  @Column({ type: 'time' })
  end_time: string;

  // Duration of each sub-slot (minutes), e.g., 30
  @Column({ type: 'int', default: 30 })
  sub_slot_duration: number;

  // Number of patients allowed per sub-slot (we set default 1)
  @Column({ type: 'int', default: 1 })
  capacity_per_sub_slot: number;

  // Number of sub-slots (calculated when creating slot)
  @Column({ type: 'int', nullable: true })
  total_capacity: number;

  // How many bookings currently exist (sum of bookings across sub-slots)
  @Column({ type: 'int', default: 0 })
  current_bookings: number;

  // active flag (doctor can soft-disable a slot)
  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({
    type: 'enum',
    enum: ['wave', 'stream'],
    default: 'stream',
  })
  schedule_type: ScheduleType;

  @Column({
    type: 'enum',
    enum: ['in_person', 'video_call', 'phone_call', 'hybrid'],
    default: 'in_person',
  })
  consultation_type: ConsultationType;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @OneToMany(() => AppointmentSubSlot, (sub) => sub.availabilitySlot, {
    cascade: ['insert', 'update'],
  })
  subSlots: AppointmentSubSlot[];

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
