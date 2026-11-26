import { Controller, Get } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

const MONGO_STATES: Record<number, string> = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

@Controller('health')
export class HealthController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Get()
  async check() {
    let collections: string[] = [];
    if (this.connection.readyState === 1 && this.connection.db) {
      const list = await this.connection.db.listCollections().toArray();
      collections = list.map((c) => c.name).sort();
    }
    return {
      status: 'ok',
      service: 'HSK (QUEST) 3.0 API',
      mongodb: MONGO_STATES[this.connection.readyState] || 'unknown',
      database: this.connection.name || 'HSK',
      collections,
      timestamp: new Date().toISOString(),
    };
  }
}
