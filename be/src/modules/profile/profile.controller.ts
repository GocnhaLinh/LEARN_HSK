import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { AddXpDto, ToggleMissionDto, UpdateProfileDto } from './profile.dto';
import { ProfileService } from './profile.service';

@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  getProfile() {
    return this.profileService.getOrCreate();
  }

  @Patch()
  updateProfile(@Body() dto: UpdateProfileDto) {
    return this.profileService.update(dto);
  }

  @Post('checkin')
  dailyCheckin() {
    return this.profileService.dailyCheckin();
  }

  @Post('xp')
  addXp(@Body() dto: AddXpDto) {
    return this.profileService.addXp(dto.amount);
  }

  @Post('review')
  recordReview(@Body() body: { xpAmount?: number; markMission4?: boolean }) {
    return this.profileService.recordReview(body?.xpAmount || 0, !!body?.markMission4);
  }

  @Post('written')
  recordWritten(@Body() body: { xpAmount?: number }) {
    return this.profileService.recordWritten(body?.xpAmount ?? 10);
  }

  @Patch('missions/:key')
  toggleMission(@Param('key') key: string, @Body() dto: ToggleMissionDto) {
    return this.profileService.toggleMission(key, dto?.done);
  }
}
