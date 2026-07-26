import { IsString, MaxLength, MinLength } from 'class-validator'

export class CreateEmploymentTypeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(140)
  name!: string
}
