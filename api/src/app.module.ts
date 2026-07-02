import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { EmployeesModule } from './employees/employees.module';
import { PrismaModule } from './prisma/prisma.module';
import { FaceModule } from './face/face.module';
import { BranchesModule } from './branches/branches.module';
import { KiosksModule } from './kiosks/kiosks.module';
import { FaceRecognitionLogsModule } from './face-recognition-logs/face-recognition-logs.module';
import { AttendanceModule } from './attendance/attendance.module';
import { WorkSchedulesModule } from './work-schedules/work-schedules.module';
import { WorkDaysModule } from './work-days/work-days.module';
import { HolidaysModule } from './holidays/holidays.module';
import { LeavesModule } from './leaves/leaves.module';
import { TimesheetsModule } from './timesheets/timesheets.module';
import { LateRecordsModule } from './late-records/late-records.module';
import { AbsencesModule } from './absences/absences.module';
import { SalariesModule } from './salaries/salaries.module';
import { PayrollRunsModule } from './payroll-runs/payroll-runs.module';
import { AdminSaasModule } from './admin-saas/admin-saas.module';
import { SaasModule } from './saas/saas.module';
import { EmployeePortalModule } from './employee-portal/employee-portal.module';
import { ShiftLocationsModule } from './shift-locations/shift-locations.module';
import { ShiftAssignmentsModule } from './shift-assignments/shift-assignments.module';
import { DepartmentsModule } from './departments/departments.module';
import { DesignationsModule } from './designations/designations.module';
import { LeaveTypesModule } from './leave-types/leave-types.module';
import { CountriesModule } from './countries/countries.module';
import { CitiesModule } from './cities/cities.module';
import { CompaniesModule } from './companies/companies.module';
import { PlanningModule } from './planning/planning.module';
import { SearchModule } from './search/search.module';
import { ShiftSwapsModule } from './shift-swaps/shift-swaps.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { NotificationsModule } from './notifications/notifications.module';
import { DevicesModule } from './devices/devices.module';
import { TrustedDevicesModule } from './trusted-devices/trusted-devices.module';
import { ManagerModule } from './manager/manager.module';
import { PunchClaimsModule } from './punch-claims/punch-claims.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    BranchesModule,
    KiosksModule,
    FaceRecognitionLogsModule,
    EmployeesModule,
    FaceModule,
    AttendanceModule,
    WorkSchedulesModule,
    WorkDaysModule,
    HolidaysModule,
    LeavesModule,
    TimesheetsModule,
    LateRecordsModule,
    AbsencesModule,
    SalariesModule,
    PayrollRunsModule,
    AdminSaasModule,
    SaasModule,
    EmployeePortalModule,
    ShiftLocationsModule,
    ShiftAssignmentsModule,
    DepartmentsModule,
    DesignationsModule,
    LeaveTypesModule,
    CountriesModule,
    CitiesModule,
    CompaniesModule,
    PlanningModule,
    SearchModule,
    ShiftSwapsModule,
    DashboardModule,
    NotificationsModule,
    DevicesModule,
    TrustedDevicesModule,
    ManagerModule,
    PunchClaimsModule,
  ],
})
export class AppModule {}
