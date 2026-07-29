-- Drop unused kiosk device API key (auth is JWT + deviceToken hash).
ALTER TABLE "tabTimeGate Kiosk" DROP COLUMN IF EXISTS "device_api_key";
