// src/sms/sms.service.ts
import { Injectable } from '@nestjs/common';
import Twilio from 'twilio';

@Injectable()
export class SmsService {
  private client: Twilio.Twilio;

  constructor() {
    this.client = Twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
  }

  async sendSms(to: string, message: string) {
    return this.client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to,
    });
  }
}
