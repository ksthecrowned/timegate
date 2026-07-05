-- Lot D (RH) - low leave balance notification
ALTER TYPE "TimeGateNotificationType" ADD VALUE IF NOT EXISTS 'LEAVE_BALANCE_LOW';
