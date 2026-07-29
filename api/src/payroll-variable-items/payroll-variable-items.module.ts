import { Module } from '@nestjs/common';
import { PayrollVariableItemsService } from './payroll-variable-items.service';
import { PayrollVariableItemsController } from './payroll-variable-items.controller';

@Module({
  controllers: [PayrollVariableItemsController],
  providers: [PayrollVariableItemsService],
  exports: [PayrollVariableItemsService],
})
export class PayrollVariableItemsModule {}
