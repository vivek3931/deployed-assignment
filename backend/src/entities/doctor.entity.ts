// src/entities/doctor.entity.ts
import { 
  Entity, 
  OneToOne, 
  JoinColumn, 
  Column, 
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn
} from 'typeorm';
import { User } from './user.entity';

@Entity('doctors')
export class Doctor {
  @PrimaryColumn({ name: 'user_id' })
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

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
