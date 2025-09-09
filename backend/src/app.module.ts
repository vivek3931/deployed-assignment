// src/app.module.ts
// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module'; // Import AuthModule

// Import your entities here
import { User } from './entities/user.entity';
import { Doctor } from './entities/doctor.entity';
import { Patient } from './entities/patient.entity';
import { Appointment } from './entities/appointment.entity';
import { Availability } from './entities/availability.entity';

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
          entities: [User, Doctor, Patient, Appointment, Availability],
          synchronize: true,
        };
      },
      inject: [ConfigService],
    }),
    AuthModule, // Add AuthModule to imports
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}