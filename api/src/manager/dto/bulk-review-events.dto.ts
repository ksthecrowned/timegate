import { ArrayMaxSize, ArrayMinSize, IsArray, IsString, MaxLength } from 'class-validator';
import { ReviewAttendanceEventDto } from '../../attendance/dto/review-attendance-event.dto';

export class BulkReviewEventsDto extends ReviewAttendanceEventDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MaxLength(140, { each: true })
  eventIds!: string[];
}
