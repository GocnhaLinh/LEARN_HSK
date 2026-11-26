import { Module } from '@nestjs/common';
import { ProfileModule } from '../profile/profile.module';
import { VocabController } from './vocab.controller';
import { VocabService } from './vocab.service';

@Module({
  imports: [ProfileModule],
  controllers: [VocabController],
  providers: [VocabService],
  exports: [VocabService],
})
export class VocabModule {}
