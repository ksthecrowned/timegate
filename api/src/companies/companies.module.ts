import { Module } from '@nestjs/common';
import { SaasModule } from '../saas/saas.module';
import { CloudflareR2Service } from '../storage/cloudflare-r2.service';
import { CompaniesController } from './companies.controller';
import { CompaniesService } from './companies.service';

@Module({
  imports: [SaasModule],
  controllers: [CompaniesController],
  providers: [CompaniesService, CloudflareR2Service],
  exports: [CompaniesService],
})
export class CompaniesModule {}
