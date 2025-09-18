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
import { DoctorAvailabilitySlot } from './doctor-availability.entity';
import { Appointment } from './appointment.entity';

export type SubSlotStatus = 'available' | 'full' | 'inactive';

@Entity('appointment_sub_slots')
export class AppointmentSubSlot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => DoctorAvailabilitySlot, (avail) => avail.subSlots, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'availability_slot_id' })
  availabilitySlot: DoctorAvailabilitySlot;

  @Column({ type: 'time' })
  start_time: string;

  @Column({ type: 'time' })
  end_time: string;

  // Usually 1 (we enforce one patient per sub-slot), but keep field for future flexibility
  @Column({ type: 'int', default: 1 })
  max_capacity: number;

  // How many bookings currently in this sub-slot (0 or 1 given current rules)
  @Column({ type: 'int', default: 0 })
  current_bookings: number;

  // quick status helper to mark full/available/inactive
  @Column({
    type: 'enum',
    enum: ['available', 'full', 'inactive'],
    default: 'available',
  })
  status: SubSlotStatus;

  @OneToMany(() => Appointment, (apt) => apt.subSlot)
  appointments: Appointment[];

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
