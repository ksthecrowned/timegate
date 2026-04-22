/*
  Warnings:

  - A unique constraint covering the columns `[luxandPersonUuid]` on the table `Employee` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "luxandPersonUuid" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Employee_luxandPersonUuid_key" ON "Employee"("luxandPersonUuid");
