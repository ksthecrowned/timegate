import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { EmployeesModule } from './employees/employees.module';
import { AttendanceModule } from './attendance/attendance.module';
import { DevicesModule } from './devices/devices.module';
import { LogsModule } from './logs/logs.module';
import { SitesModule } from './sites/sites.module';
import { PrismaModule } from './prisma/prisma.module';
import { FaceModule } from './face/face.module';
import { WorkSchedulesModule } from './work-schedules/work-schedules.module';
import { LeavesModule } from './leaves/leaves.module';
import { WorkSessionsModule } from './work-sessions/work-sessions.module';
import { AdminDataModule } from './admin-data/admin-data.module';
import { WorkDaysModule } from './work-days/work-days.module';
import { HolidaysModule } from './holidays/holidays.module';
import { AbsencesModule } from './absences/absences.module';
import { LateRecordsModule } from './late-records/late-records.module';
import { SalariesModule } from './salaries/salaries.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    SitesModule,
    EmployeesModule,
    DevicesModule,
    AttendanceModule,
    LogsModule,
    FaceModule,
    WorkSchedulesModule,
    LeavesModule,
    WorkSessionsModule,
    AdminDataModule,
    WorkDaysModule,
    HolidaysModule,
    AbsencesModule,
    LateRecordsModule,
    SalariesModule,
  ],
})
export class AppModule {}
