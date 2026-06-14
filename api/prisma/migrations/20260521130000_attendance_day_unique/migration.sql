-- CreateIndex
CREATE UNIQUE INDEX "tabAttendance_employee_attendance_date_key" ON "tabAttendance"("employee", "attendance_date");

-- CreateIndex
CREATE INDEX "tabAttendance_company_attendance_date_idx" ON "tabAttendance"("company", "attendance_date");
