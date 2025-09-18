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
import { Patient } from './patient.entity';
import { Doctor } from './doctor.entity';

@Entity('appointments')
export class Appointment {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Patient)
    @JoinColumn({ name: 'patient_id' })
    patient: Patient;

    @ManyToOne(() => Doctor, (doctor) => doctor.appointments)
    @JoinColumn({ name: 'doctor_id' })
    doctor: Doctor;

    // Link to the doctor's availability slot
    @ManyToOne(() => DoctorAvailabilitySlot, { nullable: false })
    @JoinColumn({ name: 'availability_slot_id' })
    availabilitySlot: DoctorAvailabilitySlot;

    // For wave scheduling - link to specific sub-slot
    @ManyToOne(() => AppointmentSubSlot, (subSlot) => subSlot.appointments, {
        nullable: true,
    })
    @JoinColumn({ name: 'sub_slot_id' })
    subSlot: AppointmentSubSlot | null;

    @Column({ type: 'date' })
    appointment_date: Date;

    @Column({
        type: 'time',
        comment: 'Actual/estimated appointment start time',
    })
    appointment_time: string;

    @Column({
        type: 'time',
        nullable: true,
        comment: 'Appointment end time (calculated)',
    })
    appointment_end_time: string | null;

    @Column({ type: 'int' })
    duration: number; // in minutes

    @Column({
        type: 'enum',
        enum: [
            'scheduled',
            'confirmed',
            'completed',
            'cancelled',
            'no_show',
            'rescheduled',
        ],
    })
    status: string;

    @Column({
        type: 'enum',
        enum: ['in_person', 'video_call', 'phone_call'],
    })
    consultation_type: string;

    @Column({ type: 'text', nullable: true })
    symptoms: string | null;

    @Column({ type: 'text', nullable: true })
    notes: string | null;

    // ===== SCHEDULING SPECIFIC FIELDS =====

    @Column({
        type: 'enum',
        enum: ['wave', 'stream'],
        comment: 'How this appointment was scheduled',
    })
    booking_type: 'wave' | 'stream';

    @Column({
        type: 'int',
        nullable: true,
        comment: 'Queue position for stream scheduling (1, 2, 3...)',
    })
    queue_position: number | null;

    @Column({
        type: 'time',
        nullable: true,
        comment: 'Estimated time for stream appointments',
    })
    estimated_time: string | null;

    @Column({
        type: 'decimal',
        precision: 10,
        scale: 2,
        nullable: true,
        comment: 'Consultation fee at time of booking',
    })
    consultation_fee: number | null;

    @Column({
        type: 'varchar',
        length: 10,
        unique: true,
        comment: 'Short booking reference for patient (e.g., APT001)',
    })
    booking_reference: string;

    @Column({
        type: 'text',
        nullable: true,
        comment: 'Reason for appointment',
    })
    appointment_reason: string | null;

    @Column({
        type: 'boolean',
        default: false,
        comment: 'Whether patient has confirmed attendance',
    })
    patient_confirmed: boolean;

    // ===== CANCELLATION AND RESCHEDULING FIELDS =====

    @Column({
        type: 'text',
        nullable: true,
        comment: 'Reason for cancellation if applicable',
    })
    cancellation_reason: string | null;

    @Column({
        type: 'enum',
        enum: ['patient', 'doctor', 'system'],
        nullable: true,
        comment: 'Who cancelled the appointment',
    })
    cancelled_by: 'patient' | 'doctor' | 'system' | null;

    @Column({
        type: 'timestamp',
        nullable: true,
        comment: 'When the appointment was cancelled',
    })
    cancelled_at: Date | null;

    @Column({
        type: 'uuid',
        nullable: true,
        comment: 'Reference to original appointment if this is rescheduled',
    })
    original_appointment_id: string | null;

    @Column({
        type: 'uuid',
        nullable: true,
        comment: 'Reference to new appointment if this was rescheduled',
    })
    rescheduled_to_appointment_id: string | null;

    // ===== FEEDBACK AND RATING FIELDS =====

    @Column({
        type: 'int',
        nullable: true,
        comment: 'Patient rating (1-5 stars)',
    })
    patient_rating: number | null;

    @Column({
        type: 'text',
        nullable: true,
        comment: 'Patient feedback comment',
    })
    patient_feedback: string | null;

    @Column({
        type: 'boolean',
        nullable: true,
        comment: 'Whether patient would recommend this doctor',
    })
    patient_would_recommend: boolean | null;

    // ===== PRESCRIPTION AND FOLLOW-UP FIELDS =====

    @Column({
        type: 'text',
        nullable: true,
        comment: 'Prescription details',
    })
    prescription: string | null;

    @Column({
        type: 'text',
        nullable: true,
        comment: 'Follow-up instructions',
    })
    follow_up_instructions: string | null;

    @Column({
        type: 'date',
        nullable: true,
        comment: 'Recommended follow-up date',
    })
    follow_up_date: Date | null;

    // ===== NOTIFICATION AND REMINDER FIELDS =====

    @Column({
        type: 'boolean',
        default: false,
        comment: 'Whether 24h reminder was sent',
    })
    reminder_24h_sent: boolean;

    @Column({
        type: 'boolean',
        default: false,
        comment: 'Whether 2h reminder was sent',
    })
    reminder_2h_sent: boolean;

    @Column({
        type: 'timestamp',
        nullable: true,
        comment: 'When patient was last notified',
    })
    last_notification_sent: Date | null;

    // Auto-generate booking reference
    @BeforeInsert()
    generateBookingReference() {
        if (!this.booking_reference) {
            // Generate format: APT + 6 random characters
            const randomString = Math.random()
                .toString(36)
                .substring(2, 8)
                .toUpperCase();
            this.booking_reference = `APT${randomString}`;
        }
    }

    @CreateDateColumn({ type: 'timestamp' })
    created_at: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updated_at: Date;

    // ===== UTILITY METHODS =====

    // Check if appointment can be cancelled
    canBeCancelled(): boolean {
        if (this.status === 'cancelled' || this.status === 'completed') {
            return false;
        }

        // Allow cancellation up to 2 hours before appointment
        const appointmentDateTime = new Date(this.appointment_date);
        const [hours, minutes] = this.appointment_time.split(':').map(Number);
        appointmentDateTime.setHours(hours, minutes, 0, 0);
        
        const now = new Date();
        const timeDiffHours = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
        
        return timeDiffHours > 2;
    }

    // Check if appointment can be rescheduled
    canBeRescheduled(): boolean {
        if (this.status === 'cancelled' || this.status === 'completed') {
            return false;
        }

        // Allow rescheduling up to 4 hours before appointment
        const appointmentDateTime = new Date(this.appointment_date);
        const [hours, minutes] = this.appointment_time.split(':').map(Number);
        appointmentDateTime.setHours(hours, minutes, 0, 0);
        
        const now = new Date();
        const timeDiffHours = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
        
        return timeDiffHours > 4;
    }

    // Check if appointment needs reminder
    needsReminder(type: '24h' | '2h'): boolean {
        const appointmentDateTime = new Date(this.appointment_date);
        const [hours, minutes] = this.appointment_time.split(':').map(Number);
        appointmentDateTime.setHours(hours, minutes, 0, 0);
        
        const now = new Date();
        const timeDiffHours = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
        
        if (type === '24h') {
            return timeDiffHours <= 24 && timeDiffHours > 23 && !this.reminder_24h_sent;
        } else {
            return timeDiffHours <= 2 && timeDiffHours > 1 && !this.reminder_2h_sent;
        }
    }

    // Get appointment status display text
    getStatusDisplayText(): string {
        const statusTexts = {
            'scheduled': 'Scheduled',
            'confirmed': 'Confirmed',
            'completed': 'Completed',
            'cancelled': 'Cancelled',
            'no_show': 'No Show',
            'rescheduled': 'Rescheduled',
        };
        return statusTexts[this.status as keyof typeof statusTexts] || 'Unknown';
    }

    // Calculate total appointment duration including waiting time
    getTotalDurationWithWaiting(): number {
        if (this.booking_type === 'stream' && this.queue_position) {
            // Add estimated waiting time for stream appointments
            const waitingTime = (this.queue_position - 1) * this.duration;
            return this.duration + waitingTime;
        }
        return this.duration;
    }
}