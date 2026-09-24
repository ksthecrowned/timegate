import { ArrayMaxSize, IsArray, IsString, MaxLength } from 'class-validator';

export class SetManagedLocationsDto {
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  @MaxLength(140, { each: true })
  locationIds!: string[];
}
