// src/patient/patient-onboarding.controller.ts
import { Controller, Get, Post, Put, Body, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PatientOnboardingService } from './patient-onboarding.service';
import { CompleteProfileDto, PreferencesDto, VerifyTokenDto } from './dto/onboarding.dto';

@Controller('api/v1/patient/onboarding')
@UseGuards(AuthGuard('jwt'))
export class PatientOnboardingController {
  constructor(private onboardingService: PatientOnboardingService) {}

  @Get('status')
  async getOnboardingStatus(@Req() req) {
    return this.onboardingService.getOnboardingStatus(req.user.sub);
  }

  @Put('profile')
  async completeProfile(@Req() req, @Body() profileData: CompleteProfileDto) {
    return this.onboardingService.completeProfile(req.user.sub, profileData);
  }

  @Post('verify/send')
  async sendVerificationToken(@Req() req, @Body('type') type: 'email' | 'phone') {
    return this.onboardingService.sendVerificationToken(req.user.sub, type);
  }

  @Post('verify')
  async verifyToken(@Req() req, @Body() verifyData: VerifyTokenDto) {
    return this.onboardingService.verifyToken(req.user.sub, verifyData);
  }


  @Put('preferences')
  async setPreferences(@Req() req, @Body() preferences: PreferencesDto) {
    return this.onboardingService.setPreferences(req.user.sub, preferences);
  }

  @Post('complete')
  async completeWalkthrough(@Req() req) {
    return this.onboardingService.completeWalkthrough(req.user.sub);
  }
}