import { PartialType } from '@nestjs/mapped-types';
import { CreateShiftLocationDto } from './create-shift-location.dto';

export class UpdateShiftLocationDto extends PartialType(CreateShiftLocationDto) {}
