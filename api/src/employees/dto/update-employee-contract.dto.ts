import { PartialType } from '@nestjs/mapped-types';
import { CreateEmployeeContractDto } from './create-employee-contract.dto';

export class UpdateEmployeeContractDto extends PartialType(CreateEmployeeContractDto) {}
