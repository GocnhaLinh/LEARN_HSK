import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Handwriting, HandwritingSchema } from '../../schemas/handwriting.schema';
import { ProfileModule } from '../profile/profile.module';
import { HandwritingController } from './handwriting.controller';
import { HandwritingService } from './handwriting.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Handwriting.name, schema: HandwritingSchema }]),
    ProfileModule,
  ],
  controllers: [HandwritingController],
  providers: [HandwritingService],
})
export class HandwritingModule {}
