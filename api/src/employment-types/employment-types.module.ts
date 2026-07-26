import { Module } from '@nestjs/common'
import { EmploymentTypesController } from './employment-types.controller'
import { EmploymentTypesService } from './employment-types.service'

@Module({
  controllers: [EmploymentTypesController],
  providers: [EmploymentTypesService],
  exports: [EmploymentTypesService],
})
export class EmploymentTypesModule {}
