import {
  BadRequestException,
  Body,
  Controller,
  NotFoundException,
  ParseFilePipeBuilder,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TimeGateUserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { OperationalAccessGuard } from '../common/guards/operational-access.guard';
import { DocIdPipe } from '../common/pipes/doc-id.pipe';
import { PrismaService } from '../prisma/prisma.service';
import { FaceEmbeddingService } from './face-embedding.service';
import { CloudflareR2Service } from '../storage/cloudflare-r2.service';

@Controller('face')
@UseGuards(JwtAuthGuard, RolesGuard, OperationalAccessGuard)
export class FaceController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly embedding: FaceEmbeddingService,
    private readonly storage: CloudflareR2Service,
  ) {}

  @Post('enroll')
  @Roles(TimeGateUserRole.ADMIN)
  @UseInterceptors(FileInterceptor('photo', { limits: { fileSize: 12 * 1024 * 1024 } }))
  async enroll(
    @Body('employeeId', DocIdPipe) employeeId: string,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({ maxSize: 12 * 1024 * 1024 })
        .build({ fileIsRequired: true }),
    )
    file: Express.Multer.File,
  ) {
    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw new NotFoundException('Employee not found');
    const vector = await this.embedding.embedFromBuffer(file.buffer);
    const photoUrl = await this.storage.uploadEmployeePhoto({
      organizationId: employee.companyId,
      employeeId: employee.id,
      contentType: file.mimetype,
      buffer: file.buffer,
    });
    const updated = await this.prisma.employee.update({
      where: { id: employeeId },
      data: {
        faceEmbedding: vector,
        faceEnrolledAt: new Date(),
        ...(photoUrl ? { faceEnrollmentPhoto: photoUrl } : {}),
      },
      select: { id: true, firstName: true, lastName: true, employeeName: true, faceEnrollmentPhoto: true },
    });
    return {
      employee: {
        id: updated.id,
        firstName: updated.firstName ?? updated.employeeName,
        lastName: updated.lastName ?? '',
        photoUrl: updated.faceEnrollmentPhoto,
      },
      enrolled: true,
    };
  }

  @Post('add-face')
  @Roles(TimeGateUserRole.ADMIN)
  @UseInterceptors(FileInterceptor('photo', { limits: { fileSize: 12 * 1024 * 1024 } }))
  async addFace(
    @Body('employeeId', DocIdPipe) employeeId: string,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({ maxSize: 12 * 1024 * 1024 })
        .build({ fileIsRequired: true }),
    )
    file: Express.Multer.File,
  ) {
    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw new NotFoundException('Employee not found');
    const current = this.toVector(employee.faceEmbedding);
    if (!current) throw new BadRequestException('Employee has no enrolled face. Use /face/enroll first');
    const incoming = await this.embedding.embedFromBuffer(file.buffer);
    const merged = this.embedding.mergeEmbeddings(current, incoming);
    const updated = await this.prisma.employee.update({
      where: { id: employeeId },
      data: { faceEmbedding: merged, faceEnrolledAt: new Date() },
      select: { id: true, firstName: true, lastName: true, employeeName: true },
    });
    return {
      employee: {
        id: updated.id,
        firstName: updated.firstName ?? updated.employeeName,
        lastName: updated.lastName ?? '',
      },
      updatedEmbedding: true,
    };
  }

  private toVector(value: unknown): number[] | null {
    if (!Array.isArray(value)) return null;
    const vector = value.filter((v): v is number => typeof v === 'number');
    return vector.length ? vector : null;
  }
}
