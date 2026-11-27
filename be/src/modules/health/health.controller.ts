import { Controller, Get } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { HskCollectionsService } from '../../database/hsk-collections.service';
import { MediaService } from '../media/media.service';

const MONGO_STATES: Record<number, string> = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

@Controller('health')
export class HealthController {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly hskCollections: HskCollectionsService,
    private readonly mediaService: MediaService,
  ) {}

  @Get()
  async check() {
    let collections: string[] = [];
    let hskDatabases: Record<string, string[]> = {};

    if (this.connection.readyState === 1 && this.connection.db) {
      const [list, perLevel] = await Promise.all([
        this.connection.db.listCollections().toArray(),
        this.hskCollections.listHskDatabaseCollections(),
      ]);
      collections = list.map((c) => c.name).sort();
      hskDatabases = perLevel;
    }

    const mediaStorage = await this.mediaService.getStatus(false);

    return {
      status: 'ok',
      service: 'HSK (QUEST) 3.0 API',
      mongodb: MONGO_STATES[this.connection.readyState] || 'unknown',
      database: this.connection.name || 'HSK',
      collections,
      hskDatabases,
      mediaStorage,
      timestamp: new Date().toISOString(),
    };
  }
}
