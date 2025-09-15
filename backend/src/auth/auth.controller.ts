// src/auth/auth.controller.ts
import { Controller, Get, Query, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { AuthService } from './auth.service';

@Controller('api/v1/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(
    @Query('role') role: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    // Validate role parameter
    if (!role || !['doctor', 'patient'].includes(role)) {
      return res.status(400).json({ 
        error: 'Invalid or missing role parameter. Use ?role=doctor or ?role=patient' 
      });
    }

    // Store role in session/state for callback
    req.session = req.session || {};
    req.session.role = role;
    
    // The guard will redirect to Google OAuth
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect(@Req() req: any, @Res() res: Response) {
    try {
      // Get role from session or query
      const role = req.session?.role || req.query.state;
      
      if (!role) {
        return res.status(400).json({ 
          error: 'Role information missing' 
        });
      }

      // Add role to user object
      req.user.role = role;
      
      // Process login
      const result = await this.authService.googleLogin(req.user);
      
      // Return JWT token and user info
      return res.json({
        message: 'Authentication successful',
        ...result,
      });
      
    } catch (error) {
      console.error('OAuth callback error:', error);
      return res.status(500).json({ 
        error: 'Authentication failed',
        details: error.message 
      });
    }
  }

  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  getProfile(@Req() req: any) {
    return {
      message: 'Profile retrieved successfully',
      user: req.user,
    };
  }
}