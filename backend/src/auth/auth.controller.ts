// src/auth/auth.controller.ts (Session-based approach)
import { Controller, Get, Query, Req, Res, UseGuards, Session } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';

@Controller('api/v1/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // Step 1: Store role in session and initiate Google auth
  @Get('google')
  async initiateGoogleAuth(
    @Req() req: Request,
    @Res() res: Response,
    @Query('role') role: 'doctor' | 'patient',
    @Session() session: Record<string, any>,
  ) {
    if (!role || !['doctor', 'patient'].includes(role)) {
      return res.status(400).send('Invalid role');
    }

    // Store role in session
    session.role = role;
    
    // Redirect to Google OAuth
    return res.redirect('/api/v1/auth/google/redirect');
  }

  // Step 2: Trigger Google OAuth
  @Get('google/redirect')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect() {
    return { message: 'Redirecting to Google OAuth...' };
  }

  // Step 3: Callback after Google login
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(@Req() req, @Res() res: Response) {
    try {
      const result = await this.authService.googleLogin(req.user);
      return res.json(result);
    } catch (error) {
      console.error('Google auth callback error:', error);
      return res.status(500).json({ error: 'Authentication failed' });
    }
  }

  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  getProfile(@Req() req) {
    return req.user;
  }
}