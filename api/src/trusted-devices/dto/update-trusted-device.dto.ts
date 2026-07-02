import { IsIn } from 'class-validator';

export class UpdateTrustedDeviceDto {
  @IsIn(['TRUSTED', 'REVOKED'])
  status!: 'TRUSTED' | 'REVOKED';
}
