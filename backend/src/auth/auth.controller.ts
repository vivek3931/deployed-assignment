import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Query, 
  Req, 
  Res, 
  UseGuards, 
  Param,
  Session,
  HttpCode,
  HttpStatus 
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';

@Controller('api/v1/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // Register endpoint
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: any) {
    return this.authService.register(registerDto);
  }

  // Send OTP endpoint
  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  async sendOtp(@Body() body: { email: string; type: 'email' | 'phone' }) {
    return this.authService.sendOtp(body.email, body.type);
  }

  // Verify OTP endpoint
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() verifyOtpDto: any) {
    return this.authService.verifyOtp(verifyOtpDto);
  }

  // Resend OTP endpoint
  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  async resendOtp(@Body() resendOtpDto: any) {
    return this.authService.resendOtp(resendOtpDto);
  }

  // Login with OTP endpoint
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async loginWithOtp(@Body() loginDto: any) {
    return this.authService.loginWithOtp(loginDto);
  }

  // Google OAuth - Step 1: Store role and redirect
  @Get('google')
  async initiateGoogleAuth(
    @Req() req: Request,
    @Res() res: Response,
    @Query('role') role: 'doctor' | 'patient',
    @Session() session: Record<string, any>,
  ) {
    if (!role || !['doctor', 'patient'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role parameter' });
    }

    // Store role in session
    session.role = role;
    
    // Redirect to Google OAuth
    return res.redirect('/api/v1/auth/google/redirect');
  }

  // Google OAuth - Step 2: Trigger Google OAuth
  @Get('google/redirect')
  @UseGuards(AuthGuard('google'))
  async googleAuthRedirect() {
    // This will redirect to Google
    return { message: 'Redirecting to Google OAuth...' };
  }

  // Google OAuth - Step 3: Handle callback
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(
    @Req() req: any, 
    @Res() res: Response,
    @Session() session: Record<string, any>
  ) {
    try {
      const role = session.role;
      
      if (!role) {
        return res.status(400).json({ error: 'Role information missing' });
      }

      const { user, isNewUser } = await this.authService.googleLogin(req.user, role);

      // Generate JWT token
      const payload = { 
        sub: user.id, 
        email: user.email, 
        role: user.role 
      };
      
      const access_token = this.authService['jwtService'].sign(payload);

      return res.json({
        success: true,
        message: 'Google authentication successful',
        access_token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        isNewUser,
      });
    } catch (error) {
      console.error('Google auth callback error:', error);
      return res.status(500).json({ 
        error: 'Authentication failed',
        details: error.message 
      });
    }
  }

  // Get all users (for testing)
  @Get('users')
  async getAllUsers() {
    return this.authService.getAllUsers();
  }

  // Get profile (protected route)
  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  getProfile(@Req() req: any) {
    return {
      success: true,
      user: req.user,
    };
  }

  @Get('doctors')
async getAllDoctors() {
  return this.authService.getAllDoctors();
}

// Get all patients  
@Get('patients')
async getAllPatients() {
  return this.authService.getAllPatients();
}

// Get doctor by ID
@Get('doctors/:id')
async getDoctorById(@Param('id') id: string) {
  return this.authService.getDoctorById(id);
}

// Get patient by ID
@Get('patients/:id')
async getPatientById(@Param('id') id: string) {
  return this.authService.getPatientById(id);
}
}