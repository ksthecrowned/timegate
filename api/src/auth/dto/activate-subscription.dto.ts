import { IsString, MinLength } from 'class-validator';

export class ActivateSubscriptionDto {
  @IsString()
  @MinLength(8)
  activationKey!: string;
}
