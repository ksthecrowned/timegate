-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "DocStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'LEFT');

-- CreateEnum
CREATE TYPE "CheckinLogType" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'HALF_DAY', 'ON_LEAVE', 'WORK_FROM_HOME');

-- CreateEnum
CREATE TYPE "KioskStatus" AS ENUM ('ONLINE', 'OFFLINE');

-- CreateEnum
CREATE TYPE "LeaveApplicationStatus" AS ENUM ('OPEN', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SalaryComponentType" AS ENUM ('EARNING', 'DEDUCTION');

-- CreateEnum
CREATE TYPE "PaymentEntryType" AS ENUM ('PAY', 'RECEIVE', 'INTERNAL_TRANSFER');

-- CreateEnum
CREATE TYPE "TimeGateUserRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'MANAGER');

-- CreateEnum
CREATE TYPE "TimeGateAttendanceEventType" AS ENUM ('CHECK_IN', 'CHECK_OUT', 'BREAK_START', 'BREAK_END');

-- CreateEnum
CREATE TYPE "TimeGateAttendanceEventSource" AS ENUM ('KIOSK_ONLINE', 'KIOSK_OFFLINE_SYNC', 'MANUAL');

-- CreateEnum
CREATE TYPE "TimeGateAttendanceEventStatus" AS ENUM ('ACCEPTED', 'REJECTED', 'REVIEW_REQUIRED');

-- CreateTable
CREATE TABLE "tabCompany" (
    "id" VARCHAR(140) NOT NULL,
    "creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified" TIMESTAMP(3) NOT NULL,
    "owner" VARCHAR(140),
    "docstatus" "DocStatus" NOT NULL DEFAULT 'DRAFT',
    "company_name" VARCHAR(140),
    "sku" VARCHAR(140),
    "abbr" VARCHAR(140),
    "time_zone" VARCHAR(140),
    "default_payroll_payable_account" VARCHAR(140),

    CONSTRAINT "tabCompany_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tabBranch" (
    "id" VARCHAR(140) NOT NULL,
    "creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified" TIMESTAMP(3) NOT NULL,
    "docstatus" "DocStatus" NOT NULL DEFAULT 'DRAFT',
    "branch" VARCHAR(140) NOT NULL,
    "company" VARCHAR(140) NOT NULL,
    "address" TEXT,
    "time_zone" VARCHAR(140) NOT NULL DEFAULT 'UTC',

    CONSTRAINT "tabBranch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tabDepartment" (
    "id" VARCHAR(140) NOT NULL,
    "creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified" TIMESTAMP(3) NOT NULL,
    "docstatus" "DocStatus" NOT NULL DEFAULT 'DRAFT',
    "department_name" VARCHAR(140) NOT NULL,
    "company" VARCHAR(140) NOT NULL,

    CONSTRAINT "tabDepartment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tabDesignation" (
    "id" VARCHAR(140) NOT NULL,
    "creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified" TIMESTAMP(3) NOT NULL,
    "docstatus" "DocStatus" NOT NULL DEFAULT 'DRAFT',
    "designation_name" VARCHAR(140) NOT NULL,

    CONSTRAINT "tabDesignation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tabEmployment Type" (
    "id" VARCHAR(140) NOT NULL,
    "employee_type_name" VARCHAR(140) NOT NULL,

    CONSTRAINT "tabEmployment Type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tabEmployee" (
    "id" VARCHAR(140) NOT NULL,
    "creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified" TIMESTAMP(3) NOT NULL,
    "owner" VARCHAR(140),
    "docstatus" "DocStatus" NOT NULL DEFAULT 'DRAFT',
    "employee_name" VARCHAR(140) NOT NULL,
    "first_name" VARCHAR(140),
    "last_name" VARCHAR(140),
    "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "gender" VARCHAR(140),
    "date_of_birth" DATE,
    "date_of_joining" DATE,
    "company" VARCHAR(140) NOT NULL,
    "branch" VARCHAR(140),
    "department" VARCHAR(140),
    "designation" VARCHAR(140),
    "employment_type" VARCHAR(140),
    "user_id" VARCHAR(140),
    "default_shift" VARCHAR(140),
    "cell_number" VARCHAR(140),
    "personal_email" VARCHAR(140),
    "salary_currency" VARCHAR(140),
    "ctc" DECIMAL(21,9),
    "face_enrollment_photo" TEXT,
    "face_enrolled_at" TIMESTAMP(3),
    "face_embedding" JSONB,

    CONSTRAINT "tabEmployee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tabTimeGate Kiosk" (
    "id" VARCHAR(140) NOT NULL,
    "creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified" TIMESTAMP(3) NOT NULL,
    "docstatus" "DocStatus" NOT NULL DEFAULT 'DRAFT',
    "kiosk_name" VARCHAR(140) NOT NULL,
    "company" VARCHAR(140) NOT NULL,
    "branch" VARCHAR(140) NOT NULL,
    "shift_location" VARCHAR(140),
    "status" "KioskStatus" NOT NULL DEFAULT 'OFFLINE',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_seen_at" TIMESTAMP(3),
    "device_api_key" VARCHAR(140),
    "device_token" TEXT,

    CONSTRAINT "tabTimeGate Kiosk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tabFace Recognition Log" (
    "id" VARCHAR(140) NOT NULL,
    "creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified" TIMESTAMP(3) NOT NULL,
    "docstatus" "DocStatus" NOT NULL DEFAULT 'DRAFT',
    "kiosk" VARCHAR(140) NOT NULL,
    "branch" VARCHAR(140),
    "company" VARCHAR(140),
    "employee" VARCHAR(140),
    "employee_name" VARCHAR(140),
    "success" BOOLEAN NOT NULL DEFAULT false,
    "confidence" DECIMAL(21,9),
    "message" TEXT,
    "employee_checkin" VARCHAR(140),
    "photo" TEXT,
    "idempotency_key" VARCHAR(140),
    "is_offline_sync" BOOLEAN NOT NULL DEFAULT false,
    "captured_at" TIMESTAMP(3),

    CONSTRAINT "tabFace Recognition Log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tabEmployee Checkin" (
    "id" VARCHAR(140) NOT NULL,
    "creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified" TIMESTAMP(3) NOT NULL,
    "docstatus" "DocStatus" NOT NULL DEFAULT 'DRAFT',
    "employee" VARCHAR(140) NOT NULL,
    "employee_name" VARCHAR(140),
    "log_type" "CheckinLogType" NOT NULL,
    "time" TIMESTAMP(3) NOT NULL,
    "device_id" VARCHAR(140),
    "shift" VARCHAR(140),
    "attendance" VARCHAR(140),
    "latitude" DECIMAL(21,7),
    "longitude" DECIMAL(21,7),
    "offshift" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "tabEmployee Checkin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tabAttendance" (
    "id" VARCHAR(140) NOT NULL,
    "creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified" TIMESTAMP(3) NOT NULL,
    "docstatus" "DocStatus" NOT NULL DEFAULT 'DRAFT',
    "employee" VARCHAR(140) NOT NULL,
    "employee_name" VARCHAR(140),
    "attendance_date" DATE NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "company" VARCHAR(140),
    "shift" VARCHAR(140),
    "leave_type" VARCHAR(140),

    CONSTRAINT "tabAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tabShift Type" (
    "id" VARCHAR(140) NOT NULL,
    "creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified" TIMESTAMP(3) NOT NULL,
    "docstatus" "DocStatus" NOT NULL DEFAULT 'DRAFT',
    "start_time" TIME,
    "end_time" TIME,

    CONSTRAINT "tabShift Type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tabShift Location" (
    "id" VARCHAR(140) NOT NULL,
    "creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified" TIMESTAMP(3) NOT NULL,
    "docstatus" "DocStatus" NOT NULL DEFAULT 'DRAFT',
    "location_name" VARCHAR(140) NOT NULL,
    "checkin_radius" INTEGER,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "branch" VARCHAR(140),
    "is_kiosk_location" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "tabShift Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tabShift Assignment" (
    "id" VARCHAR(140) NOT NULL,
    "creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified" TIMESTAMP(3) NOT NULL,
    "docstatus" "DocStatus" NOT NULL DEFAULT 'DRAFT',
    "employee" VARCHAR(140) NOT NULL,
    "shift_type" VARCHAR(140) NOT NULL,
    "shift_location" VARCHAR(140),
    "company" VARCHAR(140),
    "start_date" DATE,
    "end_date" DATE,

    CONSTRAINT "tabShift Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tabHoliday List" (
    "id" VARCHAR(140) NOT NULL,
    "creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified" TIMESTAMP(3) NOT NULL,
    "docstatus" "DocStatus" NOT NULL DEFAULT 'DRAFT',
    "holiday_list_name" VARCHAR(140) NOT NULL,

    CONSTRAINT "tabHoliday List_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tabHoliday" (
    "id" VARCHAR(140) NOT NULL,
    "creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "idx" INTEGER NOT NULL DEFAULT 0,
    "parent" VARCHAR(140) NOT NULL,
    "holiday_date" DATE,
    "description" VARCHAR(140),

    CONSTRAINT "tabHoliday_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tabLeave Type" (
    "id" VARCHAR(140) NOT NULL,
    "creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified" TIMESTAMP(3) NOT NULL,
    "docstatus" "DocStatus" NOT NULL DEFAULT 'DRAFT',
    "leave_type_name" VARCHAR(140) NOT NULL,
    "is_lwp" BOOLEAN NOT NULL DEFAULT false,
    "is_carry_forward" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "tabLeave Type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tabLeave Application" (
    "id" VARCHAR(140) NOT NULL,
    "creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified" TIMESTAMP(3) NOT NULL,
    "docstatus" "DocStatus" NOT NULL DEFAULT 'DRAFT',
    "employee" VARCHAR(140) NOT NULL,
    "leave_type" VARCHAR(140) NOT NULL,
    "company" VARCHAR(140),
    "from_date" DATE,
    "to_date" DATE,
    "status" "LeaveApplicationStatus" NOT NULL DEFAULT 'OPEN',

    CONSTRAINT "tabLeave Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tabTimesheet" (
    "id" VARCHAR(140) NOT NULL,
    "creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified" TIMESTAMP(3) NOT NULL,
    "docstatus" "DocStatus" NOT NULL DEFAULT 'DRAFT',
    "employee" VARCHAR(140) NOT NULL,

    CONSTRAINT "tabTimesheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tabTimesheet Detail" (
    "id" VARCHAR(140) NOT NULL,
    "creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "idx" INTEGER NOT NULL DEFAULT 0,
    "parent" VARCHAR(140) NOT NULL,
    "hours" DECIMAL(21,9),

    CONSTRAINT "tabTimesheet Detail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tabSalary Slip" (
    "id" VARCHAR(140) NOT NULL,
    "creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified" TIMESTAMP(3) NOT NULL,
    "docstatus" "DocStatus" NOT NULL DEFAULT 'DRAFT',
    "employee" VARCHAR(140) NOT NULL,
    "company" VARCHAR(140),
    "start_date" DATE,
    "end_date" DATE,
    "gross_pay" DECIMAL(21,9),
    "net_pay" DECIMAL(21,9),

    CONSTRAINT "tabSalary Slip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tabUser" (
    "id" VARCHAR(140) NOT NULL,
    "creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified" TIMESTAMP(3) NOT NULL,
    "docstatus" "DocStatus" NOT NULL DEFAULT 'DRAFT',
    "email" VARCHAR(140) NOT NULL,
    "first_name" VARCHAR(140),
    "last_name" VARCHAR(140),
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "language" VARCHAR(140),
    "password_hash" VARCHAR(255) NOT NULL,
    "timegate_role" "TimeGateUserRole",
    "company" VARCHAR(140),

    CONSTRAINT "tabUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tabRole" (
    "id" VARCHAR(140) NOT NULL,
    "role_name" VARCHAR(140) NOT NULL,

    CONSTRAINT "tabRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tabHas Role" (
    "id" VARCHAR(140) NOT NULL,
    "creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "idx" INTEGER NOT NULL DEFAULT 0,
    "parent" VARCHAR(140) NOT NULL,
    "role" VARCHAR(140) NOT NULL,

    CONSTRAINT "tabHas Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tabUser Permission" (
    "id" VARCHAR(140) NOT NULL,
    "creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified" TIMESTAMP(3) NOT NULL,
    "docstatus" "DocStatus" NOT NULL DEFAULT 'DRAFT',
    "user" VARCHAR(140) NOT NULL,
    "allow" VARCHAR(140),
    "for_value" VARCHAR(140),

    CONSTRAINT "tabUser Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tabNotification Log" (
    "id" VARCHAR(140) NOT NULL,
    "creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified" TIMESTAMP(3) NOT NULL,
    "docstatus" "DocStatus" NOT NULL DEFAULT 'DRAFT',
    "for_user" VARCHAR(140),
    "subject" VARCHAR(140),
    "read" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "tabNotification Log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timegate_subscription" (
    "id" VARCHAR(140) NOT NULL,
    "company" VARCHAR(140) NOT NULL,
    "plan" VARCHAR(140) NOT NULL,
    "maxEmployees" INTEGER NOT NULL,
    "max_devices" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "timegate_subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timegate_activation_key" (
    "id" VARCHAR(140) NOT NULL,
    "company" VARCHAR(140) NOT NULL,
    "keyHash" VARCHAR(140) NOT NULL,
    "plan" VARCHAR(140) NOT NULL,
    "maxEmployees" INTEGER NOT NULL,
    "max_devices" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "timegate_activation_key_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timegate_system_settings" (
    "id" VARCHAR(140) NOT NULL,
    "company" VARCHAR(140) NOT NULL,
    "minConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0.75,
    "lateThreshold" INTEGER NOT NULL DEFAULT 10,
    "very_late_threshold" INTEGER NOT NULL DEFAULT 30,

    CONSTRAINT "timegate_system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timegate_user_branch" (
    "id" VARCHAR(140) NOT NULL,
    "user" VARCHAR(140) NOT NULL,
    "branch" VARCHAR(140) NOT NULL,

    CONSTRAINT "timegate_user_branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timegate_attendance_event" (
    "id" VARCHAR(140) NOT NULL,
    "creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified" TIMESTAMP(3) NOT NULL,
    "docstatus" "DocStatus" NOT NULL DEFAULT 'DRAFT',
    "company" VARCHAR(140) NOT NULL,
    "branch" VARCHAR(140) NOT NULL,
    "kiosk" VARCHAR(140) NOT NULL,
    "employee" VARCHAR(140),
    "source" "TimeGateAttendanceEventSource" NOT NULL DEFAULT 'KIOSK_ONLINE',
    "type" "TimeGateAttendanceEventType" NOT NULL,
    "status" "TimeGateAttendanceEventStatus" NOT NULL DEFAULT 'ACCEPTED',
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confidence" DECIMAL(21,9),
    "verification_ref" VARCHAR(140),
    "idempotency_key" VARCHAR(140),
    "reject_reason" TEXT,
    "meta" JSONB,

    CONSTRAINT "timegate_attendance_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timegate_audit_log" (
    "id" VARCHAR(140) NOT NULL,
    "user" VARCHAR(140),
    "company" VARCHAR(140) NOT NULL,
    "action" VARCHAR(140) NOT NULL,
    "entity" VARCHAR(140) NOT NULL,
    "entity_id" VARCHAR(140) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "timegate_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tabCompany_sku_key" ON "tabCompany"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "tabEmployee_user_id_key" ON "tabEmployee"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "tabTimeGate Kiosk_kiosk_name_key" ON "tabTimeGate Kiosk"("kiosk_name");

-- CreateIndex
CREATE UNIQUE INDEX "tabTimeGate Kiosk_branch_key" ON "tabTimeGate Kiosk"("branch");

-- CreateIndex
CREATE UNIQUE INDEX "tabTimeGate Kiosk_device_api_key_key" ON "tabTimeGate Kiosk"("device_api_key");

-- CreateIndex
CREATE UNIQUE INDEX "tabFace Recognition Log_employee_checkin_key" ON "tabFace Recognition Log"("employee_checkin");

-- CreateIndex
CREATE INDEX "tabFace Recognition Log_idempotency_key_kiosk_idx" ON "tabFace Recognition Log"("idempotency_key", "kiosk");

-- CreateIndex
CREATE INDEX "tabEmployee Checkin_employee_time_idx" ON "tabEmployee Checkin"("employee", "time");

-- CreateIndex
CREATE INDEX "tabAttendance_employee_attendance_date_idx" ON "tabAttendance"("employee", "attendance_date");

-- CreateIndex
CREATE UNIQUE INDEX "tabShift Location_location_name_key" ON "tabShift Location"("location_name");

-- CreateIndex
CREATE UNIQUE INDEX "tabUser_email_company_key" ON "tabUser"("email", "company");

-- CreateIndex
CREATE UNIQUE INDEX "tabRole_role_name_key" ON "tabRole"("role_name");

-- CreateIndex
CREATE INDEX "timegate_subscription_company_createdAt_idx" ON "timegate_subscription"("company", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "timegate_activation_key_keyHash_key" ON "timegate_activation_key"("keyHash");

-- CreateIndex
CREATE INDEX "timegate_activation_key_company_expiresAt_idx" ON "timegate_activation_key"("company", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "timegate_system_settings_company_key" ON "timegate_system_settings"("company");

-- CreateIndex
CREATE UNIQUE INDEX "timegate_user_branch_user_branch_key" ON "timegate_user_branch"("user", "branch");

-- CreateIndex
CREATE INDEX "timegate_attendance_event_company_occurredAt_idx" ON "timegate_attendance_event"("company", "occurredAt");

-- CreateIndex
CREATE INDEX "timegate_attendance_event_employee_occurredAt_idx" ON "timegate_attendance_event"("employee", "occurredAt");

-- CreateIndex
CREATE INDEX "timegate_attendance_event_kiosk_occurredAt_idx" ON "timegate_attendance_event"("kiosk", "occurredAt");

-- CreateIndex
CREATE INDEX "timegate_attendance_event_branch_occurredAt_idx" ON "timegate_attendance_event"("branch", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "timegate_attendance_event_company_idempotency_key_key" ON "timegate_attendance_event"("company", "idempotency_key");

-- CreateIndex
CREATE INDEX "timegate_audit_log_company_createdAt_idx" ON "timegate_audit_log"("company", "createdAt");

-- CreateIndex
CREATE INDEX "timegate_audit_log_entity_entity_id_idx" ON "timegate_audit_log"("entity", "entity_id");

-- AddForeignKey
ALTER TABLE "tabBranch" ADD CONSTRAINT "tabBranch_company_fkey" FOREIGN KEY ("company") REFERENCES "tabCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tabDepartment" ADD CONSTRAINT "tabDepartment_company_fkey" FOREIGN KEY ("company") REFERENCES "tabCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tabEmployee" ADD CONSTRAINT "tabEmployee_company_fkey" FOREIGN KEY ("company") REFERENCES "tabCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tabEmployee" ADD CONSTRAINT "tabEmployee_branch_fkey" FOREIGN KEY ("branch") REFERENCES "tabBranch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tabEmployee" ADD CONSTRAINT "tabEmployee_department_fkey" FOREIGN KEY ("department") REFERENCES "tabDepartment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tabEmployee" ADD CONSTRAINT "tabEmployee_designation_fkey" FOREIGN KEY ("designation") REFERENCES "tabDesignation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tabEmployee" ADD CONSTRAINT "tabEmployee_employment_type_fkey" FOREIGN KEY ("employment_type") REFERENCES "tabEmployment Type"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tabEmployee" ADD CONSTRAINT "tabEmployee_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "tabUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tabEmployee" ADD CONSTRAINT "tabEmployee_default_shift_fkey" FOREIGN KEY ("default_shift") REFERENCES "tabShift Type"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tabTimeGate Kiosk" ADD CONSTRAINT "tabTimeGate Kiosk_company_fkey" FOREIGN KEY ("company") REFERENCES "tabCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tabTimeGate Kiosk" ADD CONSTRAINT "tabTimeGate Kiosk_branch_fkey" FOREIGN KEY ("branch") REFERENCES "tabBranch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tabTimeGate Kiosk" ADD CONSTRAINT "tabTimeGate Kiosk_shift_location_fkey" FOREIGN KEY ("shift_location") REFERENCES "tabShift Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tabFace Recognition Log" ADD CONSTRAINT "tabFace Recognition Log_kiosk_fkey" FOREIGN KEY ("kiosk") REFERENCES "tabTimeGate Kiosk"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tabFace Recognition Log" ADD CONSTRAINT "tabFace Recognition Log_branch_fkey" FOREIGN KEY ("branch") REFERENCES "tabBranch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tabFace Recognition Log" ADD CONSTRAINT "tabFace Recognition Log_employee_fkey" FOREIGN KEY ("employee") REFERENCES "tabEmployee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tabFace Recognition Log" ADD CONSTRAINT "tabFace Recognition Log_employee_checkin_fkey" FOREIGN KEY ("employee_checkin") REFERENCES "tabEmployee Checkin"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tabEmployee Checkin" ADD CONSTRAINT "tabEmployee Checkin_employee_fkey" FOREIGN KEY ("employee") REFERENCES "tabEmployee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tabEmployee Checkin" ADD CONSTRAINT "tabEmployee Checkin_shift_fkey" FOREIGN KEY ("shift") REFERENCES "tabShift Type"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tabEmployee Checkin" ADD CONSTRAINT "tabEmployee Checkin_attendance_fkey" FOREIGN KEY ("attendance") REFERENCES "tabAttendance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tabAttendance" ADD CONSTRAINT "tabAttendance_employee_fkey" FOREIGN KEY ("employee") REFERENCES "tabEmployee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tabAttendance" ADD CONSTRAINT "tabAttendance_shift_fkey" FOREIGN KEY ("shift") REFERENCES "tabShift Type"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tabAttendance" ADD CONSTRAINT "tabAttendance_leave_type_fkey" FOREIGN KEY ("leave_type") REFERENCES "tabLeave Type"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tabShift Location" ADD CONSTRAINT "tabShift Location_branch_fkey" FOREIGN KEY ("branch") REFERENCES "tabBranch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tabShift Assignment" ADD CONSTRAINT "tabShift Assignment_employee_fkey" FOREIGN KEY ("employee") REFERENCES "tabEmployee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tabShift Assignment" ADD CONSTRAINT "tabShift Assignment_shift_type_fkey" FOREIGN KEY ("shift_type") REFERENCES "tabShift Type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tabShift Assignment" ADD CONSTRAINT "tabShift Assignment_shift_location_fkey" FOREIGN KEY ("shift_location") REFERENCES "tabShift Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tabHoliday" ADD CONSTRAINT "tabHoliday_parent_fkey" FOREIGN KEY ("parent") REFERENCES "tabHoliday List"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tabLeave Application" ADD CONSTRAINT "tabLeave Application_employee_fkey" FOREIGN KEY ("employee") REFERENCES "tabEmployee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tabLeave Application" ADD CONSTRAINT "tabLeave Application_leave_type_fkey" FOREIGN KEY ("leave_type") REFERENCES "tabLeave Type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tabTimesheet" ADD CONSTRAINT "tabTimesheet_employee_fkey" FOREIGN KEY ("employee") REFERENCES "tabEmployee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tabTimesheet Detail" ADD CONSTRAINT "tabTimesheet Detail_parent_fkey" FOREIGN KEY ("parent") REFERENCES "tabTimesheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tabSalary Slip" ADD CONSTRAINT "tabSalary Slip_employee_fkey" FOREIGN KEY ("employee") REFERENCES "tabEmployee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tabUser" ADD CONSTRAINT "tabUser_company_fkey" FOREIGN KEY ("company") REFERENCES "tabCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tabHas Role" ADD CONSTRAINT "tabHas Role_parent_fkey" FOREIGN KEY ("parent") REFERENCES "tabUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tabHas Role" ADD CONSTRAINT "tabHas Role_role_fkey" FOREIGN KEY ("role") REFERENCES "tabRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tabUser Permission" ADD CONSTRAINT "tabUser Permission_user_fkey" FOREIGN KEY ("user") REFERENCES "tabUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tabNotification Log" ADD CONSTRAINT "tabNotification Log_for_user_fkey" FOREIGN KEY ("for_user") REFERENCES "tabUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timegate_subscription" ADD CONSTRAINT "timegate_subscription_company_fkey" FOREIGN KEY ("company") REFERENCES "tabCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timegate_activation_key" ADD CONSTRAINT "timegate_activation_key_company_fkey" FOREIGN KEY ("company") REFERENCES "tabCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timegate_system_settings" ADD CONSTRAINT "timegate_system_settings_company_fkey" FOREIGN KEY ("company") REFERENCES "tabCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timegate_user_branch" ADD CONSTRAINT "timegate_user_branch_user_fkey" FOREIGN KEY ("user") REFERENCES "tabUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timegate_user_branch" ADD CONSTRAINT "timegate_user_branch_branch_fkey" FOREIGN KEY ("branch") REFERENCES "tabBranch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timegate_attendance_event" ADD CONSTRAINT "timegate_attendance_event_company_fkey" FOREIGN KEY ("company") REFERENCES "tabCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timegate_attendance_event" ADD CONSTRAINT "timegate_attendance_event_branch_fkey" FOREIGN KEY ("branch") REFERENCES "tabBranch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timegate_attendance_event" ADD CONSTRAINT "timegate_attendance_event_kiosk_fkey" FOREIGN KEY ("kiosk") REFERENCES "tabTimeGate Kiosk"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timegate_attendance_event" ADD CONSTRAINT "timegate_attendance_event_employee_fkey" FOREIGN KEY ("employee") REFERENCES "tabEmployee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timegate_audit_log" ADD CONSTRAINT "timegate_audit_log_user_fkey" FOREIGN KEY ("user") REFERENCES "tabUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timegate_audit_log" ADD CONSTRAINT "timegate_audit_log_company_fkey" FOREIGN KEY ("company") REFERENCES "tabCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;
