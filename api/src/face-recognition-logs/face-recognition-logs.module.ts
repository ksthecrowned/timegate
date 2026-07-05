import { Module } from '@nestjs/common';
import { FaceRecognitionLogsController } from './face-recognition-logs.controller';
import { FaceRecognitionLogsService } from './face-recognition-logs.service';
import { CloudflareR2Service } from '../storage/cloudflare-r2.service';

@Module({
  controllers: [FaceRecognitionLogsController],
  providers: [FaceRecognitionLogsService, CloudflareR2Service],
  exports: [FaceRecognitionLogsService],
})
export class FaceRecognitionLogsModule {}
