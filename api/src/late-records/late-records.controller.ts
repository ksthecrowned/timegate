import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TimeGateUserRole } from '@prisma/client';
import { PLATFORM_ADMIN } from '../common/constants/platform-admin';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { OperationalAccessGuard } from '../common/guards/operational-access.guard';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { SyncRecordsDto } from '../common/dto/sync-records.dto';
import { DocIdPipe } from '../common/pipes/doc-id.pipe';
import { CreateLateRecordDto } from './dto/create-late-record.dto';
import { UpdateLateRecordDto } from './dto/update-late-record.dto';
import { LateRecordsService } from './late-records.service';

@Controller('late-records')
@UseGuards(JwtAuthGuard, RolesGuard, OperationalAccessGuard)
export class LateRecordsController {
  constructor(private readonly service: LateRecordsService) {}

  @Roles(TimeGateUserRole.ADMIN, TimeGateUserRole.MANAGER)
  @Post()
  create(@Body() dto: CreateLateRecordDto, @CurrentUser() user: JwtUser) {
    return this.service.create(dto, user);
  }

  @Roles(TimeGateUserRole.ADMIN, TimeGateUserRole.MANAGER)
  @Post('upload-justification')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  uploadJustification(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('employeeId') employeeId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.uploadJustification(file, user, employeeId);
  }

  @Get()
  findAll(@Query() query: PaginationQueryDto, @CurrentUser() user: JwtUser) {
    const companyId =
      user.role === PLATFORM_ADMIN ? undefined : user.companyId ?? undefined;
    return this.service.findAll(query, companyId);
  }

  @Get(':id')
  findOne(@Param('id', DocIdPipe) id: string, @CurrentUser() user: JwtUser) {
    return this.service.findOne(id, user);
  }

  @Roles(TimeGateUserRole.ADMIN, TimeGateUserRole.MANAGER)
  @Post('sync')
  sync(@Body() dto: SyncRecordsDto, @CurrentUser() user: JwtUser) {
    return this.service.syncFromTimesheets(dto, user);
  }

  @Roles(TimeGateUserRole.ADMIN, TimeGateUserRole.MANAGER)
  @Patch(':id')
  update(
    @Param('id', DocIdPipe) id: string,
    @Body() dto: UpdateLateRecordDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.update(id, dto, user);
  }

  @Roles(TimeGateUserRole.ADMIN, TimeGateUserRole.MANAGER)
  @Delete(':id')
  remove(@Param('id', DocIdPipe) id: string, @CurrentUser() user: JwtUser) {
    return this.service.remove(id, user);
  }
}
