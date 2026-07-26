import {
  IsBoolean,
  IsInt,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class UpdateSystemConfigDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  minConfidence?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  lateThreshold?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  veryLateThreshold?: number;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  defaultShiftTypeId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  pinFailureThreshold?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(600)
  pinFailureCooldownSeconds?: number;

  /** 0 = désactivé, 5 ou 15 minutes */
  @IsOptional()
  @IsIn([0, 5, 15])
  timesheetRoundingMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(24 * 60)
  overtimeAlertThresholdMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(24 * 60)
  minMinutesBetweenShifts?: number;

  @IsOptional()
  @IsBoolean()
  defaultFaceEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  defaultNfcEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  defaultQrEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(24 * 60)
  notificationUnclosedReminderDelayMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(7 * 24 * 60)
  notificationReviewReminderMinAgeMinutes?: number;

  @IsOptional()
  @IsBoolean()
  allowOfflineSync?: boolean;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(7 * 24 * 60)
  offlineSyncMaxAgeMinutes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(3650)
  faceLogPhotoRetentionDays?: number;

  @IsOptional()
  @IsBoolean()
  webhookEnabled?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  webhookUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  webhookSecret?: string | null;

  /** Prefill pause pour nouveaux horaires types (HH:mm) */
  @IsOptional()
  @IsString()
  @Matches(/^\d{1,2}:\d{2}$/)
  defaultBreakWindowStart?: string | null;

  @IsOptional()
  @IsString()
  @Matches(/^\d{1,2}:\d{2}$/)
  defaultBreakWindowEnd?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(24 * 60)
  defaultBreakDurationMinutes?: number;
}
