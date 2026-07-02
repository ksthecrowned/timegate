import { IsLatitude, IsLongitude } from 'class-validator';

export class BreakResumeDto {
  @IsLatitude()
  latitude!: number;

  @IsLongitude()
  longitude!: number;
}
