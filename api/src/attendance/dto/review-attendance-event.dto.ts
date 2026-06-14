import { IsIn, IsString, MaxLength, ValidateIf } from 'class-validator';

const REVIEW_DECISIONS = ['ACCEPTED', 'REJECTED'] as const;
export type ReviewAttendanceDecision = (typeof REVIEW_DECISIONS)[number];

export class ReviewAttendanceEventDto {
  @IsIn(REVIEW_DECISIONS)
  status!: ReviewAttendanceDecision;

  @ValidateIf((dto) => dto.status === 'REJECTED')
  @IsString()
  @MaxLength(2000)
  reason?: string;
}
