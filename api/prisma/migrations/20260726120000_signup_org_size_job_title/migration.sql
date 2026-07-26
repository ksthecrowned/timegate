-- AlterTable
ALTER TABLE "tabCompany" ADD COLUMN IF NOT EXISTS "organization_size" VARCHAR(40);

-- AlterTable
ALTER TABLE "tabUser" ADD COLUMN IF NOT EXISTS "job_title" VARCHAR(140);
