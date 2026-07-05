import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CopilotChatDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  message!: string;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  sessionId?: string;
}
