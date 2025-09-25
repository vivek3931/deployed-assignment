    import { Module } from '@nestjs/common';
    import { ConfigModule, ConfigService } from '@nestjs/config';
    import { TypeOrmModule } from '@nestjs/typeorm';
    import { AppController } from './app.controller';
    import { AppService } from './app.service';
    import { AuthModule } from './auth/auth.module';
    import { DoctorsModule } from './doctors/doctors.module';
   import { PatientBookingModule } from './patient/patient-booking.module';

    // Import your entities here
    import { User } from './entities/user.entity';
    import { Doctor } from './entities/doctor.entity';
    import { Patient } from './entities/patient.entity';
    import { Appointment } from './entities/appointment.entity';
    import { Availability } from './entities/availability.entity';
    import { DoctorAvailabilitySlot } from './entities/doctor-availability.entity'; 
    import { AppointmentSubSlot } from './entities/appointment-sub-slot.entity';  
import { PatientProfile } from './entities/patient-profile.entity';

    const dotenv = require('dotenv');
    dotenv.config();

    @Module({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          useFactory: (configService: ConfigService) => {
            const dbName = configService.get<string>('DATABASE_NAME');
            console.log('--- Database Connection Info ---');
            console.log('Database Name:', dbName);
            console.log('--------------------------------');

            return {
              type: 'postgres',
              host: configService.get<string>('DATABASE_HOST'),
              port: configService.get<number>('DATABASE_PORT'),
              username: configService.get<string>('DATABASE_USERNAME'),
              password: configService.get<string>('DATABASE_PASSWORD'),
              database: dbName,
              entities: [
                User, 
                Doctor, 
                Patient, 
                PatientProfile,
                Appointment, 
                Availability,
                DoctorAvailabilitySlot, 
                AppointmentSubSlot 
              ],
              synchronize: false,
            };
          },
          inject: [ConfigService],
        }),
        AuthModule,
        DoctorsModule,
        PatientBookingModule,
      ],
      controllers: [AppController],
      providers: [AppService],
    })
    export class AppModule {}
