import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ProfileDocument = HydratedDocument<Profile>;

export interface MissionsDone {
  m1: boolean;
  m2: boolean;
  m3: boolean;
  m4: boolean;
}

@Schema({ timestamps: true, collection: 'profiles' })
export class Profile {
  @Prop({ required: true, unique: true, default: 'default' })
  profileKey: string;

  @Prop({ enum: ['zine', 'diary'], default: 'zine' })
  theme: 'zine' | 'diary';

  @Prop({ min: 1, max: 6, default: 5 })
  focusLevel: number;

  @Prop({ default: 0 })
  xp: number;

  @Prop({ default: 0 })
  streak: number;

  @Prop({ type: String, default: null })
  lastCheckinISO: string | null;

  @Prop({ min: 5, max: 100, default: 15 })
  dailyTarget: number;

  @Prop({ default: 0 })
  todayReviews: number;

  @Prop({ default: 0 })
  writtenCountToday: number;

  @Prop({ type: [Number], default: () => [0, 0, 0, 0, 0, 0, 0] })
  weeklyLog: number[];

  @Prop({
    type: {
      m1: { type: Boolean, default: false },
      m2: { type: Boolean, default: false },
      m3: { type: Boolean, default: false },
      m4: { type: Boolean, default: false },
    },
    default: () => ({ m1: false, m2: false, m3: false, m4: false }),
    _id: false,
  })
  missionsDone: MissionsDone;
}

export const ProfileSchema = SchemaFactory.createForClass(Profile);
