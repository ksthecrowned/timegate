-- Lot D (RH) - contract expiring + missing document notifications
ALTER TYPE "TimeGateNotificationType" ADD VALUE IF NOT EXISTS 'HR_CONTRACT_EXPIRING';
ALTER TYPE "TimeGateNotificationType" ADD VALUE IF NOT EXISTS 'HR_DOCUMENT_MISSING';
