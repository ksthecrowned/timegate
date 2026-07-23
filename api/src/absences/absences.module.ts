import { Module } from '@nestjs/common';
import { AttendanceModule } from '../attendance/attendance.module';
import { AbsencesController } from './absences.controller';
import { AbsencesService } from './absences.service';

@Module({
  imports: [AttendanceModule],
  controllers: [AbsencesController],
  providers: [AbsencesService],
  exports: [AbsencesService],
})
export class AbsencesModule {}
