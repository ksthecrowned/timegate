-- HolidayList scoped to Company (one list per tenant for 1.2.0)
ALTER TABLE "tabHoliday List" ADD COLUMN "company" VARCHAR(140);
CREATE UNIQUE INDEX "tabHoliday List_company_key" ON "tabHoliday List"("company");
ALTER TABLE "tabHoliday List" ADD CONSTRAINT "tabHoliday List_company_fkey" FOREIGN KEY ("company") REFERENCES "tabCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- LeaveType per company + LeaveApplication.reason
ALTER TABLE "tabLeave Type" ADD COLUMN "company" VARCHAR(140);
ALTER TABLE "tabLeave Type" ADD CONSTRAINT "tabLeave Type_company_fkey" FOREIGN KEY ("company") REFERENCES "tabCompany"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE UNIQUE INDEX "tabLeave Type_company_leave_type_name_key" ON "tabLeave Type"("company", "leave_type_name");

ALTER TABLE "tabLeave Application" ADD COLUMN "reason" VARCHAR(500);
