import { PartialType } from '@nestjs/mapped-types';
import { CreatePayGroupDto } from './create-pay-group.dto';

export class UpdatePayGroupDto extends PartialType(CreatePayGroupDto) {}
