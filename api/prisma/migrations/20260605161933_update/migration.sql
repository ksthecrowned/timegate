-- DropForeignKey
ALTER TABLE "tabDesignation" DROP CONSTRAINT "tabDesignation_company_fkey";

-- AlterTable
ALTER TABLE "tabShift Type" ALTER COLUMN "shift_type_name" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "tabDesignation" ADD CONSTRAINT "tabDesignation_company_fkey" FOREIGN KEY ("company") REFERENCES "tabCompany"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
