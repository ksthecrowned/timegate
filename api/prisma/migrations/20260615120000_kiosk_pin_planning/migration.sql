-- Employee kiosk PIN (fallback verify)
ALTER TABLE "tabEmployee" ADD COLUMN IF NOT EXISTS "kiosk_pin_hash" VARCHAR(255);

-- Shift swap requests
CREATE TYPE "TimeGateShiftSwapStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

CREATE TABLE "timegate_shift_swap_request" (
    "id" VARCHAR(140) NOT NULL,
    "creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified" TIMESTAMP(3) NOT NULL,
    "company" VARCHAR(140) NOT NULL,
    "requester" VARCHAR(140) NOT NULL,
    "target_employee" VARCHAR(140),
    "shift_assignment" VARCHAR(140),
    "swap_date" DATE NOT NULL,
    "reason" VARCHAR(500),
    "status" "TimeGateShiftSwapStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by" VARCHAR(140),
    "reviewed_at" TIMESTAMP(3),
    "review_note" VARCHAR(500),

    CONSTRAINT "timegate_shift_swap_request_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "timegate_shift_swap_request_company_status_idx" ON "timegate_shift_swap_request"("company", "status");
CREATE INDEX "timegate_shift_swap_request_requester_idx" ON "timegate_shift_swap_request"("requester");

ALTER TABLE "timegate_shift_swap_request" ADD CONSTRAINT "timegate_shift_swap_request_company_fkey" FOREIGN KEY ("company") REFERENCES "tabCompany"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "timegate_shift_swap_request" ADD CONSTRAINT "timegate_shift_swap_request_requester_fkey" FOREIGN KEY ("requester") REFERENCES "tabEmployee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "timegate_shift_swap_request" ADD CONSTRAINT "timegate_shift_swap_request_target_employee_fkey" FOREIGN KEY ("target_employee") REFERENCES "tabEmployee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "timegate_shift_swap_request" ADD CONSTRAINT "timegate_shift_swap_request_shift_assignment_fkey" FOREIGN KEY ("shift_assignment") REFERENCES "tabShift Assignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "timegate_shift_swap_request" ADD CONSTRAINT "timegate_shift_swap_request_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "tabUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
