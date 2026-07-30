import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class PayrollDueAlertCronService {
  private readonly logger = new Logger(PayrollDueAlertCronService.name);

  constructor(private readonly notifications: NotificationsService) {}

  /** Daily payroll due-soon and overdue alerts for company admins. */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
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
