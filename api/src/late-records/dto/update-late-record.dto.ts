import { PartialType } from '@nestjs/mapped-types';
import { CreateLateRecordDto } from './create-late-record.dto';

export class UpdateLateRecordDto extends PartialType(CreateLateRecordDto) {}
