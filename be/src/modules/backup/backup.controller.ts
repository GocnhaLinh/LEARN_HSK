import { Body, Controller, Get, Post } from '@nestjs/common';
import { ImportBackupDto } from './backup.dto';
import { BackupService } from './backup.service';

@Controller('backup')
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  @Get('export')
  exportData() {
    return this.backupService.exportData();
  }

  @Post('import')
  importData(@Body() dto: ImportBackupDto) {
    return this.backupService.importData(dto);
  }
}
