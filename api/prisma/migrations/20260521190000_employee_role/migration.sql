-- Add EMPLOYEE role for self-service portal (phase 24)
ALTER TYPE "TimeGateUserRole" ADD VALUE IF NOT EXISTS 'EMPLOYEE';
