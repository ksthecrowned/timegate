import { IsBoolean } from 'class-validator';

export class SuspendOrganizationDto {
  @IsBoolean()
  suspended!: boolean;
}
