-- Trusted employee devices + nullable user password (portal onboarding)

CREATE TYPE "TimeGateTrustedDeviceStatus" AS ENUM ('TRUSTED', 'PENDING', 'REVOKED');

ALTER TABLE "tabUser" ALTER COLUMN "password_hash" DROP NOT NULL;

CREATE TABLE "timegate_trusted_device" (
    "id" VARCHAR(140) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user" VARCHAR(140) NOT NULL,
    "device_install_id" VARCHAR(64) NOT NULL,
    "platform" "TimeGateDevicePlatform" NOT NULL,
    "device_label" VARCHAR(140),
    "status" "TimeGateTrustedDeviceStatus" NOT NULL,
    "trusted_at" TIMESTAMP(3),
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "timegate_trusted_device_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "timegate_trusted_device_user_device_install_id_key" ON "timegate_trusted_device"("user", "device_install_id");
CREATE INDEX "timegate_trusted_device_device_install_id_status_idx" ON "timegate_trusted_device"("device_install_id", "status");
CREATE INDEX "timegate_trusted_device_user_status_idx" ON "timegate_trusted_device"("user", "status");

ALTER TABLE "timegate_trusted_device" ADD CONSTRAINT "timegate_trusted_device_user_fkey" FOREIGN KEY ("user") REFERENCES "tabUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
