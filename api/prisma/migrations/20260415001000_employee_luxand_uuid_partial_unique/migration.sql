-- Allow several employees without a Luxand id (NULL) while keeping uniqueness for real UUIDs.
DROP INDEX IF EXISTS "Employee_luxandPersonUuid_key";

CREATE UNIQUE INDEX "Employee_luxandPersonUuid_key" ON "Employee"("luxandPersonUuid")
WHERE "luxandPersonUuid" IS NOT NULL;
