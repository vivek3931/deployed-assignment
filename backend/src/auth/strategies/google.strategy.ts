// src/auth/strategies/google.strategy.ts (Session-based approach)
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: 'http://localhost:3000/api/v1/auth/google/callback',
      scope: ['profile', 'email'],
      passReqToCallback: true,
    });
  }

  async validate(
    req: any,
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    // Get role from session
    const role = req.session?.role;
    
    console.log('Debug - Session:', req.session);
    console.log('Debug - Role from session:', role);

    if (!role || (role !== 'doctor' && role !== 'patient')) {
      throw new UnauthorizedException('Invalid or missing role in session');
    }

    // Clear the role from session after use
    delete req.session.role;

    const user = {
      email: profile.emails[0].value,
      name: profile.displayName,
      role: role,
      googleId: profile.id,
      accessToken,
      refreshToken,
    };

    return done(null, user);
  }
}