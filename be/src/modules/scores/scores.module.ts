import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScoreRecord, ScoreRecordSchema } from '../../schemas/score.schema';
import { ScoresController } from './scores.controller';
import { ScoresService } from './scores.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: ScoreRecord.name, schema: ScoreRecordSchema }])],
  controllers: [ScoresController],
  providers: [ScoresService],
  exports: [ScoresService],
})
export class ScoresModule {}
