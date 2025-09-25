import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
callbackURL:
  process.env.NODE_ENV === 'production'
    ? 'https://deployed-assignment.onrender.com/api/v1/auth/google/callback'
    : 'http://localhost:3000/api/v1/auth/google/callback',
      scope: ['email', 'profile'],
      // Remove passReqToCallback if you don't need the request object
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    // Add null check for profile to prevent the error
    if (!profile) {
      return done(new Error('Profile not received from Google'), false);
    }

    // Add safety checks for nested properties
    const { name, emails, photos } = profile;
    
    if (!emails || emails.length === 0) {
      return done(new Error('No email received from Google'), false);
    }

    const user = {
      email: emails[0].value,
      firstName: name?.givenName || '',
      lastName: name?.familyName || '',
      picture: photos?.[0]?.value || '',
      accessToken,
    };
    
    done(null, user);
  }
}