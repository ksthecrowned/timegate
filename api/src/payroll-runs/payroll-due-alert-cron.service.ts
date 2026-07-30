import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class PayrollDueAlertCronService {
  private readonly logger = new Logger(PayrollDueAlertCronService.name);

  constructor(private readonly notifications: NotificationsService) {}

  /** Hourly sweep; actual send is gated at 08:00 local company time. */
  @Cron(CronExpression.EVERY_HOUR)
  async sendPayrollDueAlerts() {
    try {
      await this.notifications.notifyPayrollDueAlerts();
    } catch (err) {
      this.logger.error(
        `Payroll due alert job failed: ${err instanceof Error ? err.message : err}`,
      );
    }
  }
}
