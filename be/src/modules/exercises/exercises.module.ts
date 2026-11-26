import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScoreRecord, ScoreRecordSchema } from '../../schemas/score.schema';
import { ProfileModule } from '../profile/profile.module';
import { ExercisesController } from './exercises.controller';
import { ExercisesService } from './exercises.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: ScoreRecord.name, schema: ScoreRecordSchema }]),
    ProfileModule,
  ],
  controllers: [ExercisesController],
  providers: [ExercisesService],
})
export class ExercisesModule {}
