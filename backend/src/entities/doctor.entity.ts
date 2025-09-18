// src/entities/doctor.entity.ts
import {
   Entity,
   OneToOne,
   OneToMany,
   JoinColumn,
   Column,
   PrimaryColumn,
   CreateDateColumn,
   UpdateDateColumn
} from 'typeorm';
import { User } from './user.entity';
import { Appointment } from './appointment.entity';
import { DoctorAvailabilitySlot } from './doctor-availability.entity';

@Entity('doctors')
export class Doctor {
  @PrimaryColumn({ type: 'uuid', name: 'user_id' })  // FIXED: Added type: 'uuid'
  userId: string;

  @OneToOne(() => User, (user) => user.doctor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ length: 90 })
  specialization: string;

  @Column({ type: 'int', nullable: true })
  experience_years: number;

  @Column({ type: 'text', nullable: true })
  education: string;

  @Column({ type: 'text', nullable: true })
  bio: string;

  @Column({ length: 255, nullable: true })
  profile_image: string;

  // ===== SCHEDULING PREFERENCES (DOCTOR DEFAULTS) =====
  
  @Column({
    type: 'enum',
    enum: ['wave', 'stream'],
    default: 'stream',
    comment: 'Default scheduling type for new slots'
  })
  default_schedule_type: 'wave' | 'stream';

  @Column({
    type: 'int',
    default: 15,
    comment: 'Default duration per patient in minutes'
  })
  default_slot_duration: number;

  @Column({
    type: 'int',
    default: 1,
    comment: 'Default patients per sub-slot (for wave scheduling)'
  })
  default_capacity_per_subslot: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    comment: 'Consultation fee'
  })
  consultation_fee: number;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Clinic address or consultation location'
  })
  clinic_address: string;

  @Column({
    type: 'boolean',
    default: true,
    comment: 'Whether doctor is accepting new appointments'
  })
  is_accepting_patients: boolean;

  @Column({
    type: 'int',
    default: 30,
    comment: 'How many days in advance patients can book'
  })
  advance_booking_days: number;

  @Column({
    type: 'int', 
    default: 120,
    comment: 'Minimum minutes before appointment for same-day booking'
  })
  same_day_booking_cutoff: number;

  // ===== RELATIONSHIPS =====

  @OneToMany(() => Appointment, (appointment) => appointment.doctor)
  appointments: Appointment[];

  @OneToMany(() => DoctorAvailabilitySlot, (slot) => slot.doctor)
  availabilitySlots: DoctorAvailabilitySlot[];

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}