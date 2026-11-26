import { Global, Module } from '@nestjs/common';
import { HskCollectionsService } from './hsk-collections.service';

@Global()
@Module({
  providers: [HskCollectionsService],
  exports: [HskCollectionsService],
})
export class DatabaseModule {}
