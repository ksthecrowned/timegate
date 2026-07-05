-- Lot D (ops) - kiosk offline / verify failures
ALTER TYPE "TimeGateNotificationType" ADD VALUE IF NOT EXISTS 'KIOSK_OFFLINE';
ALTER TYPE "TimeGateNotificationType" ADD VALUE IF NOT EXISTS 'VERIFY_FAILURE_SPIKE';
