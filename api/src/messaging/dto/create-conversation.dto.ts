import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateConversationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  subject!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  body!: string;

  /** Required for managers starting a thread with an employee. */
  @IsOptional()
  @IsString()
  @MaxLength(140)
  employeeId?: string;
}
