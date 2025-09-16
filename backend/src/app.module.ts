import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

// Import modules
import { AuthModule } from './auth/auth.module';
import { EmailModule } from './email/email.module';

// Import all entities
import { User } from './entities/user.entity';
import { Patient } from './entities/patient.entity';
import { Doctor } from './entities/doctor.entity';
import { PatientProfile } from './entities/patient-profile.entity';
import { VerificationToken } from './entities/verification-token.entity';
import { OnboardingStatus } from './entities/onboarding-status.entity';
import { Appointment } from './entities/appointment.entity';
import { Availability } from './entities/availability.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    TypeOrmModule.forRoot({
      type: 'postgres', // or your preferred database
      host: process.env.DATABASE_HOST || 'localhost',
      port: Number(process.env.DATABASE_PORT) || 5432,
      username: process.env.DATABASE_USERNAME || 'postgres',
      password: process.env.DATABASE_PASSWORD || 'password',
      database: process.env.DATABASE_NAME || 'healthcare_app',
      entities: [
        User,
        Patient,
        Doctor,
        PatientProfile,
        VerificationToken,
        OnboardingStatus,
        Appointment,
        Availability,
      ],
      synchronize: process.env.NODE_ENV !== 'production',
      logging: process.env.NODE_ENV === 'development',
    }),
    AuthModule,
    EmailModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}