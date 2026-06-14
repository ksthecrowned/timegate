-- CreateEnum
CREATE TYPE "WeekDay" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- AlterTable
ALTER TABLE "tabShift Type" ADD COLUMN     "shift_type_name" VARCHAR(140) NOT NULL DEFAULT 'Default Shift',
ADD COLUMN     "company" VARCHAR(140),
ADD COLUMN     "branch" VARCHAR(140),
ADD COLUMN     "late_grace_minutes" INTEGER NOT NULL DEFAULT 5;

-- CreateTable
CREATE TABLE "timegate_shift_type_week_day" (
    "id" VARCHAR(140) NOT NULL,
    "creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "idx" INTEGER NOT NULL DEFAULT 0,
    "parent" VARCHAR(140) NOT NULL,
    "day" "WeekDay" NOT NULL,
    "start_time" VARCHAR(10) NOT NULL,
    "end_time" VARCHAR(10) NOT NULL,

    CONSTRAINT "timegate_shift_type_week_day_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tabShift Type_company_idx" ON "tabShift Type"("company");

-- CreateIndex
CREATE INDEX "tabShift Type_branch_idx" ON "tabShift Type"("branch");

-- CreateIndex
CREATE UNIQUE INDEX "timegate_shift_type_week_day_parent_day_key" ON "timegate_shift_type_week_day"("parent", "day");

-- AddForeignKey
ALTER TABLE "tabShift Type" ADD CONSTRAINT "tabShift Type_company_fkey" FOREIGN KEY ("company") REFERENCES "tabCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tabShift Type" ADD CONSTRAINT "tabShift Type_branch_fkey" FOREIGN KEY ("branch") REFERENCES "tabBranch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timegate_shift_type_week_day" ADD CONSTRAINT "timegate_shift_type_week_day_parent_fkey" FOREIGN KEY ("parent") REFERENCES "tabShift Type"("id") ON DELETE CASCADE ON UPDATE CASCADE;
