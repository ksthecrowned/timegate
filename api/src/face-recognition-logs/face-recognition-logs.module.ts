import { Module } from '@nestjs/common';
import { FaceRecognitionLogsController } from './face-recognition-logs.controller';
import { FaceRecognitionLogsService } from './face-recognition-logs.service';

@Module({
  controllers: [FaceRecognitionLogsController],
  providers: [FaceRecognitionLogsService],
  exports: [FaceRecognitionLogsService],
})
export class FaceRecognitionLogsModule {}
