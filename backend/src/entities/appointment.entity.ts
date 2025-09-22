// src/entities/appointment.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  BeforeInsert,
} from 'typeorm';
import { Doctor } from './doctor.entity';
import { Patient } from './patient.entity';
import { DoctorAvailabilitySlot } from './doctor-availability.entity';
import { AppointmentSubSlot } from './appointment-sub-slot.entity';

@Entity('appointments')
export class Appointment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 10 })
  booking_reference: string;

  // EXPLICIT FOREIGN KEY COLUMNS (CRITICAL FIX)
  @Column({ type: 'uuid' })
  patient_id: string;

  @Column({ type: 'uuid' })
  doctor_id: string;

  @Column({ type: 'uuid' })
  availability_slot_id: string;

  @Column({ type: 'uuid', nullable: true })
  sub_slot_id: string;

  // Relations
  @ManyToOne(() => Patient, { nullable: false })
  @JoinColumn({ name: 'patient_id' })
  patient: Patient;

  @ManyToOne(() => Doctor, { nullable: false })
  @JoinColumn({ name: 'doctor_id' })
  doctor: Doctor;

  @ManyToOne(() => DoctorAvailabilitySlot, { nullable: false })
  @JoinColumn({ name: 'availability_slot_id' })
  availabilitySlot: DoctorAvailabilitySlot;

  @ManyToOne(() => AppointmentSubSlot, { nullable: true })
  @JoinColumn({ name: 'sub_slot_id' })
  subSlot: AppointmentSubSlot;

  // Appointment Details
  @Column({ type: 'date' })
  appointment_date: Date;

  @Column({ type: 'time' })
  appointment_time: string;

  @Column({ type: 'time', nullable: true })
  appointment_end_time: string;

  @Column({ type: 'time', nullable: true })
  estimated_time: string;

  @Column({ type: 'integer', default: 30 })
  duration: number;

  // Status and Type
  @Column({
    type: 'enum',
    enum: ['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show', 'rescheduled'],
    default: 'scheduled',
  })
  status: string;

  @Column({
    type: 'enum',
    enum: ['in_person', 'video_call', 'phone_call'],
    default: 'in_person',
  })
  consultation_type: string;

  @Column({
    type: 'enum',
    enum: ['wave', 'stream'],
    default: 'stream',
  })
  booking_type: string;

  // Queue and Priority
  @Column({ type: 'integer', nullable: true })
  queue_position: number;

  @Column({ type: 'integer', nullable: true, default: 1 })
  priority: number;

  // Appointment Information
  @Column({ type: 'text', nullable: true })
  appointment_reason: string;

  @Column({ type: 'text', nullable: true })
  symptoms: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'text', nullable: true })
  diagnosis: string;

  @Column({ type: 'text', nullable: true })
  prescription: string;

  @Column({ type: 'text', nullable: true })
  follow_up_instructions: string;

  // Financial
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  consultation_fee: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  paid_amount: number;

  @Column({
    type: 'enum',
    enum: ['pending', 'paid', 'refunded', 'failed'],
    default: 'pending',
  })
  payment_status: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  payment_method: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  payment_transaction_id: string;

  // Cancellation Details
  @Column({ type: 'varchar', length: 50, nullable: true })
  cancelled_by: string;

  @Column({ type: 'timestamp', nullable: true })
  cancelled_at: Date;

  @Column({ type: 'text', nullable: true })
  cancellation_reason: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  refund_amount: number;

  // Reminder and Notification
  @Column({ type: 'boolean', default: false })
  reminder_sent: boolean;

  @Column({ type: 'timestamp', nullable: true })
  reminder_sent_at: Date;

  @Column({ type: 'boolean', default: false })
  confirmation_sent: boolean;

  @Column({ type: 'timestamp', nullable: true })
  confirmed_at: Date;

  // Rating and Feedback
  @Column({ type: 'integer', nullable: true, comment: 'Rating from 1-5' })
  rating: number;

  @Column({ type: 'text', nullable: true })
  patient_feedback: string;

  @Column({ type: 'text', nullable: true })
  doctor_feedback: string;

  // Timestamps
  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  checked_in_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  started_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  completed_at: Date;

  // Generate booking reference before insert
  @BeforeInsert()
  generateBookingReference() {
    if (!this.booking_reference) {
      // Generate a 9-character booking reference (APT + 6 random chars)
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let reference = 'APT';
      for (let i = 0; i < 6; i++) {
        reference += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      this.booking_reference = reference;
    }
  }
}