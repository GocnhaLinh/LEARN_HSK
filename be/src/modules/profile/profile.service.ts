import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MissionsDone, Profile, ProfileDocument } from '../../schemas/profile.schema';
import { UpdateProfileDto } from './profile.dto';

function getTodayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

@Injectable()
export class ProfileService {
  constructor(
    @InjectModel(Profile.name) private readonly profileModel: Model<ProfileDocument>,
  ) {}

  async getOrCreate(): Promise<ProfileDocument> {
    let profile = await this.profileModel.findOne({ profileKey: 'default' }).exec();
    if (!profile) {
      profile = await this.profileModel.create({
        profileKey: 'default',
        theme: 'zine',
        focusLevel: 5,
        xp: 0,
        streak: 0,
        lastCheckinISO: null,
        dailyTarget: 15,
        todayReviews: 0,
        writtenCountToday: 0,
        weeklyLog: [0, 0, 0, 0, 0, 0, 0],
        missionsDone: { m1: false, m2: false, m3: false, m4: false },
      });
    }
    return profile;
  }

  async update(dto: UpdateProfileDto): Promise<ProfileDocument> {
    const profile = await this.getOrCreate();
    if (dto.theme !== undefined) profile.theme = dto.theme;
    if (dto.focusLevel !== undefined) profile.focusLevel = dto.focusLevel;
    if (dto.dailyTarget !== undefined) {
      profile.dailyTarget = Math.max(5, Math.min(100, dto.dailyTarget));
    }
    return profile.save();
  }

  async dailyCheckin(): Promise<{ profile: ProfileDocument; alreadyCheckedIn: boolean }> {
    const profile = await this.getOrCreate();
    const today = getTodayISO();
    if (profile.lastCheckinISO === today) {
      return { profile, alreadyCheckedIn: true };
    }
    profile.lastCheckinISO = today;
    profile.streak += 1;
    profile.xp += 15;
    await profile.save();
    return { profile, alreadyCheckedIn: false };
  }

  async addXp(amount: number): Promise<ProfileDocument> {
    const profile = await this.getOrCreate();
    profile.xp += amount;
    return profile.save();
  }

  async recordReview(xpAmount = 0, markMission4 = false): Promise<ProfileDocument> {
    const profile = await this.getOrCreate();
    profile.todayReviews += 1;
    const weekly =
      Array.isArray(profile.weeklyLog) && profile.weeklyLog.length === 7
        ? [...profile.weeklyLog]
        : [0, 0, 0, 0, 0, 0, 0];
    weekly[6] = profile.todayReviews;
    profile.weeklyLog = weekly;

    if (profile.todayReviews >= 5) {
      profile.missionsDone = { ...profile.missionsDone, m1: true };
    }
    if (markMission4) {
      profile.missionsDone = { ...profile.missionsDone, m4: true };
    }
    if (xpAmount > 0) {
      profile.xp += xpAmount;
    }
    profile.markModified('weeklyLog');
    profile.markModified('missionsDone');
    return profile.save();
  }

  async recordWritten(xpAmount = 10): Promise<ProfileDocument> {
    const profile = await this.getOrCreate();
    profile.writtenCountToday += 1;
    if (profile.writtenCountToday >= 5) {
      profile.missionsDone = { ...profile.missionsDone, m3: true };
      profile.markModified('missionsDone');
    }
    if (xpAmount > 0) {
      profile.xp += xpAmount;
    }
    return profile.save();
  }

  async toggleMission(key: string, done?: boolean): Promise<{ profile: ProfileDocument; completedNow: boolean }> {
    const validKeys: (keyof MissionsDone)[] = ['m1', 'm2', 'm3', 'm4'];
    if (!validKeys.includes(key as keyof MissionsDone)) {
      throw new BadRequestException(`Invalid mission key: ${key}`);
    }
    const missionKey = key as keyof MissionsDone;
    const profile = await this.getOrCreate();
    const prev = !!profile.missionsDone?.[missionKey];
    const next = done !== undefined ? done : !prev;
    profile.missionsDone = { ...profile.missionsDone, [missionKey]: next };
    profile.markModified('missionsDone');

    const completedNow = !prev && next;
    if (completedNow) {
      profile.xp += 15;
    }
    await profile.save();
    return { profile, completedNow };
  }
}
