import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseFilePipeBuilder,
  ParseUUIDPipe,
  Post,
  UnprocessableEntityException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { LuxandCloudService, LuxandPhotoInput } from './luxand-cloud.service';
import { extractLuxandPersonUuid, parseLuxandVerify } from './luxand-parse';

@Controller('luxand')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LuxandController {
  constructor(
    private readonly luxand: LuxandCloudService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /** Create Luxand person from photo and link uuid to employee (same contract as example add_person). */
  @Post('enroll')
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor('photo', { limits: { fileSize: 12 * 1024 * 1024 } }))
  async enroll(
    @Body('employeeId', ParseUUIDPipe) employeeId: string,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({ maxSize: 12 * 1024 * 1024 })
        .build({ fileIsRequired: true }),
    )
    file: Express.Multer.File,
  ) {
    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }
    if (employee.luxandPersonUuid) {
      throw new ConflictException('Employee already has luxandPersonUuid; use POST /api/luxand/add-face');
    }
    const name = `${employee.firstName} ${employee.lastName}`.trim() || 'Employee';
    const photo = this.toPhotoInput(file);
    const raw = await this.luxand.addPerson(name, photo);
    const uuid = extractLuxandPersonUuid(raw);
    if (!uuid) {
      throw new UnprocessableEntityException({
        message: 'Luxand response did not contain a person uuid',
        luxand: raw,
      });
    }
    const updated = await this.prisma.employee.update({
      where: { id: employeeId },
      data: { luxandPersonUuid: uuid },
      select: { id: true, luxandPersonUuid: true, firstName: true, lastName: true },
    });
    return { employee: updated, luxand: raw };
  }

  /** Add another face image to an existing Luxand person (same contract as example add_face). */
  @Post('add-face')
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor('photo', { limits: { fileSize: 12 * 1024 * 1024 } }))
  async addFace(
    @Body('employeeId', ParseUUIDPipe) employeeId: string,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({ maxSize: 12 * 1024 * 1024 })
        .build({ fileIsRequired: true }),
    )
    file: Express.Multer.File,
  ) {
    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee?.luxandPersonUuid) {
      throw new BadRequestException('Employee has no luxandPersonUuid; enroll first');
    }
    const raw = await this.luxand.addFace(employee.luxandPersonUuid, this.toPhotoInput(file));
    return { employeeId: employee.id, luxandPersonUuid: employee.luxandPersonUuid, luxand: raw };
  }

  /** Verify face against Luxand person; writes RecognitionLog (same endpoint style as example verify). */
  @Post('verify')
  @Roles(Role.ADMIN, Role.MANAGER)
  @UseInterceptors(FileInterceptor('photo', { limits: { fileSize: 12 * 1024 * 1024 } }))
  async verify(
    @Body('employeeId', ParseUUIDPipe) employeeId: string,
    @Body('deviceId', ParseUUIDPipe) deviceId: string,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({ maxSize: 12 * 1024 * 1024 })
        .build({ fileIsRequired: true }),
    )
    file: Express.Multer.File,
  ) {
    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee?.luxandPersonUuid) {
      throw new BadRequestException('Employee has no luxandPersonUuid; enroll first');
    }
    const device = await this.prisma.device.findUnique({ where: { id: deviceId } });
    if (!device) {
      throw new NotFoundException('Device not found');
    }

    const raw = await this.luxand.verifyPhoto(employee.luxandPersonUuid, this.toPhotoInput(file));
    const threshold = Number(this.config.get('LUXAND_VERIFY_THRESHOLD') ?? 0.65);
    const t = Number.isFinite(threshold) && threshold > 0 && threshold <= 1 ? threshold : 0.65;
    const { success, confidence } = parseLuxandVerify(raw, t);

    const log = await this.prisma.recognitionLog.create({
      data: {
        employeeId: employee.id,
        deviceId: device.id,
        organizationId: device.organizationId,
        success,
        confidence: confidence ?? undefined,
      },
      select: { id: true, success: true, confidence: true, createdAt: true },
    });

    return { success, confidence, log, luxand: raw };
  }

  @Get('person-photo/:employeeId')
  @Roles(Role.ADMIN, Role.MANAGER)
  async getEmployeePhoto(@Param('employeeId', ParseUUIDPipe) employeeId: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, luxandPersonUuid: true },
    });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }
    if (!employee.luxandPersonUuid) {
      return { photoUrl: null };
    }

    const raw = await this.luxand.getPerson(employee.luxandPersonUuid);
    return { photoUrl: this.extractFirstPhotoUrl(raw) };
  }

  private toPhotoInput(file: Express.Multer.File): LuxandPhotoInput {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Empty file');
    }
    return {
      kind: 'buffer',
      buffer: file.buffer,
      filename: file.originalname || 'photo.jpg',
      contentType: file.mimetype,
    };
  }

  private extractFirstPhotoUrl(raw: Record<string, unknown>): string | null {
    const queue: unknown[] = [raw];
    while (queue.length > 0) {
      const current = queue.shift();
      if (!current || typeof current !== 'object') continue;
      const obj = current as Record<string, unknown>;
      for (const value of Object.values(obj)) {
        if (typeof value === 'string' && /^https?:\/\//i.test(value)) {
          return value;
        }
        if (Array.isArray(value)) {
          queue.push(...value);
        } else if (value && typeof value === 'object') {
          queue.push(value);
        }
      }
    }
    return null;
  }
}
