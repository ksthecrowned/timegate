import { IsInt, IsNotEmpty, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreatePayGroupDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(140)
  name!: string;

  @IsInt()
  @Min(1)
  @Max(28)
  payDayOfMonth!: number;
}
