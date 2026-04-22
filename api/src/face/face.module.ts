import { Module } from '@nestjs/common';
import { FaceController } from './face.controller';
import { FaceEmbeddingService } from './face-embedding.service';
import { CloudflareR2Service } from '../storage/cloudflare-r2.service';

@Module({
  controllers: [FaceController],
  providers: [FaceEmbeddingService, CloudflareR2Service],
  exports: [FaceEmbeddingService],
})
export class FaceModule {}
