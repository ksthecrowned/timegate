-- Remove unused employee CTC (Cost to Company); base salary comes from compensation grid only.
ALTER TABLE "tabEmployee" DROP COLUMN IF EXISTS "ctc";
