import { ArrayMaxSize, ArrayMinSize, IsArray, IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class MarkLinesPaidDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @IsString({ each: true })
  @MaxLength(140, { each: true })
  lineIds!: string[];

  @IsOptional()
  @IsDateString()
  paidAt?: string;
}
