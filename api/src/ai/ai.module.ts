import { Module } from '@nestjs/common';
import { DashboardModule } from '../dashboard/dashboard.module';
import { KiosksModule } from '../kiosks/kiosks.module';
import { LateRecordsModule } from '../late-records/late-records.module';
import { ManagerModule } from '../manager/manager.module';
import { SearchModule } from '../search/search.module';
import { AiCopilotController } from './ai-copilot.controller';
import { AiCopilotService } from './ai-copilot.service';
import { AiQuotaService } from './ai-quota.service';
import { AiToolRegistry } from './ai-tool.registry';
import { CloudflareAiService } from './cloudflare-ai.service';

@Module({
  imports: [ManagerModule, DashboardModule, SearchModule, LateRecordsModule, KiosksModule],
  controllers: [AiCopilotController],
  providers: [AiCopilotService, AiQuotaService, AiToolRegistry, CloudflareAiService],
  exports: [AiQuotaService],
})
export class AiModule {}
