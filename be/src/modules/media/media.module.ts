import { Global, Module } from '@nestjs/common';
import { MediaOptimizerService } from './media-optimizer.service';
import { MediaService } from './media.service';

@Global()
@Module({
  providers: [MediaOptimizerService, MediaService],
  exports: [MediaService, MediaOptimizerService],
})
export class MediaModule {}
