-- Platform Admin entity (console) separate from tenant User.
-- Migrate former User SUPER_ADMIN rows, then drop SUPER_ADMIN from TimeGateUserRole.

CREATE TABLE "tabAdmin" (
    "id" VARCHAR(140) NOT NULL,
    "creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified" TIMESTAMP(3) NOT NULL,
    "email" VARCHAR(140) NOT NULL,
    "first_name" VARCHAR(140),
    "last_name" VARCHAR(140),
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "password_hash" VARCHAR(255),

    CONSTRAINT "tabAdmin_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tabAdmin_email_key" ON "tabAdmin"("email");

INSERT INTO "tabAdmin" ("id", "creation", "modified", "email", "first_name", "last_name", "enabled", "password_hash")
SELECT "id", "creation", "modified", "email", "first_name", "last_name", "enabled", "password_hash"
FROM "tabUser"
WHERE "timegate_role" = 'SUPER_ADMIN';

-- Clear / detach dependents before removing legacy platform users.
UPDATE "timegate_audit_log" SET "user" = NULL
WHERE "user" IN (SELECT "id" FROM "tabUser" WHERE "timegate_role" = 'SUPER_ADMIN');

DELETE FROM "tabPasswordResetToken" WHERE "user" IN (
  SELECT "id" FROM "tabUser" WHERE "timegate_role" = 'SUPER_ADMIN'
);
DELETE FROM "tabHas Role" WHERE "parent" IN (
  SELECT "id" FROM "tabUser" WHERE "timegate_role" = 'SUPER_ADMIN'
);
DELETE FROM "tabUser Permission" WHERE "user" IN (
  SELECT "id" FROM "tabUser" WHERE "timegate_role" = 'SUPER_ADMIN'
);

DELETE FROM "tabUser" WHERE "timegate_role" = 'SUPER_ADMIN';

ALTER TYPE "TimeGateUserRole" RENAME TO "TimeGateUserRole_old";
CREATE TYPE "TimeGateUserRole" AS ENUM ('ADMIN', 'MANAGER', 'EMPLOYEE');
ALTER TABLE "tabUser"
  ALTER COLUMN "timegate_role" TYPE "TimeGateUserRole"
  USING ("timegate_role"::text::"TimeGateUserRole");
DROP TYPE "TimeGateUserRole_old";
