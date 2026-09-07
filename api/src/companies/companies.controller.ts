import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FastifyFileInterceptor } from '../common/upload/fastify-file.interceptor';
import { UploadedBinaryFile } from '../common/upload/uploaded-binary-file.decorator';
import type { UploadedFile as UploadedBinary } from '../common/upload/uploaded-file';
import { TimeGateUserRole } from '@prisma/client';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CompaniesService } from './companies.service';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Controller('companies')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CompaniesController {
  constructor(private readonly companies: CompaniesService) {}

  @Roles(TimeGateUserRole.ADMIN, TimeGateUserRole.MANAGER)
  @Get('me')
  getMyCompany(@CurrentUser() user: JwtUser) {
    return this.companies.getMyCompany(user);
  }

  @Roles(TimeGateUserRole.ADMIN)
  @Patch('me')
  updateMyCompany(@CurrentUser() user: JwtUser, @Body() dto: UpdateCompanyDto) {
    return this.companies.updateMyCompany(user, dto);
  }

  @Roles(TimeGateUserRole.ADMIN)
  @Post('me/logo')
  @UseInterceptors(FastifyFileInterceptor('logo', { limits: { fileSize: 2 * 1024 * 1024 } }))
  uploadLogo(
    @CurrentUser() user: JwtUser,
    @UploadedBinaryFile() file: UploadedBinary,
  ) {
    if (!file) {
      throw new BadRequestException('Logo file is required');
    }
    return this.companies.uploadLogo(user, file);
  }
}
