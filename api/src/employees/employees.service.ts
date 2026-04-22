import { ConflictException, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CloudflareR2Service } from '../storage/cloudflare-r2.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { CreateEmployeeContractDto } from './dto/create-employee-contract.dto';
import { EmployeeQueryDto } from './dto/employee-query.dto';
import { EmployeeContractQueryDto } from './dto/employee-contract-query.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Injectable()
export class EmployeesService {
  constructor(
    private prisma: PrismaService,
    private readonly storage: CloudflareR2Service,
  ) {}

  async create(dto: CreateEmployeeDto) {
    if (!dto.siteId) {
      throw new BadRequestException('siteId is required');
    }

    const site = await this.ensureSite(dto.siteId);
    const organizationId = site.organizationId;
    if (dto.scheduleId) {
      await this.ensureSchedule(dto.scheduleId, organizationId, dto.siteId);
    }

    if (dto.email) {
      const exists = await this.prisma.employee.findUnique({
        where: {
          email_organizationId: { email: dto.email, organizationId },
        },
      });
      if (exists) {
        throw new ConflictException('Employee email already exists');
      }
    }

    if (dto.luxandPersonUuid) {
      const taken = await this.prisma.employee.findUnique({ where: { luxandPersonUuid: dto.luxandPersonUuid } });
      if (taken) {
        throw new ConflictException('luxandPersonUuid already linked to another employee');
      }
    }

    return this.prisma.employee.create({
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        whatsappPhone: dto.whatsappPhone?.trim() || undefined,
        phone: dto.phone?.trim() || undefined,
        address: dto.address?.trim() || undefined,
        employeeCode: dto.employeeCode?.trim() || undefined,
        hireDate: dto.hireDate ? new Date(dto.hireDate) : undefined,
        contractType: dto.contractType?.trim() || undefined,
        nationalId: dto.nationalId?.trim() || undefined,
        emergencyContactName: dto.emergencyContactName?.trim() || undefined,
        emergencyContactPhone: dto.emergencyContactPhone?.trim() || undefined,
        photoUrl: dto.photoUrl?.trim() || undefined,
        department: dto.department,
        position: dto.position,
        siteId: dto.siteId,
        scheduleId: dto.scheduleId,
        organizationId,
        isActive: dto.isActive ?? true,
        luxandPersonUuid: dto.luxandPersonUuid,
        ...(dto.faceEmbedding ? { faceEmbedding: dto.faceEmbedding as Prisma.InputJsonValue } : {}),
      },
    });
  }

  async findAll(query: EmployeeQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.EmployeeWhereInput = {
      ...(query.siteId ? { siteId: query.siteId } : {}),
      ...(query.employeeId ? { id: query.employeeId } : {}),
      ...(typeof query.isActive === 'boolean' ? { isActive: query.isActive } : {}),
      ...(query.search
        ? {
            OR: [
              { firstName: { contains: query.search, mode: 'insensitive' } },
              { lastName: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          site: { select: { id: true, name: true } },
          schedule: { select: { id: true, name: true, siteId: true } },
        },
      }),
      this.prisma.employee.count({ where }),
    ]);
    const data = items.map((item) => ({
      ...item,
      hasFaceEmbedding: Array.isArray(item.faceEmbedding),
    }));
    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        site: { select: { id: true, name: true, address: true } },
        schedule: { select: { id: true, name: true, siteId: true } },
      },
    });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }
    return {
      ...employee,
      hasFaceEmbedding: Array.isArray(employee.faceEmbedding),
    };
  }

  async update(id: string, dto: UpdateEmployeeDto) {
    const current = await this.findOne(id);
    if (dto.email) {
      const conflict = await this.prisma.employee.findFirst({
        where: { email: dto.email, NOT: { id } },
      });
      if (conflict) {
        throw new ConflictException('Employee email already exists');
      }
    }
    if (dto.siteId) {
      await this.ensureSite(dto.siteId);
    }
    const targetOrganizationId = current.organizationId;
    const targetSiteId = dto.siteId ?? current.siteId;
    if (dto.scheduleId) {
      await this.ensureSchedule(dto.scheduleId, targetOrganizationId, targetSiteId);
    }
    if (dto.luxandPersonUuid) {
      const taken = await this.prisma.employee.findFirst({
        where: { luxandPersonUuid: dto.luxandPersonUuid, NOT: { id } },
      });
      if (taken) {
        throw new ConflictException('luxandPersonUuid already linked to another employee');
      }
    }
    return this.prisma.employee.update({
      where: { id },
      data: {
        ...dto,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : dto.birthDate === null ? null : undefined,
        whatsappPhone: dto.whatsappPhone?.trim() || (dto.whatsappPhone === null ? null : undefined),
        phone: dto.phone?.trim() || (dto.phone === null ? null : undefined),
        address: dto.address?.trim() || (dto.address === null ? null : undefined),
        employeeCode: dto.employeeCode?.trim() || (dto.employeeCode === null ? null : undefined),
        hireDate: dto.hireDate ? new Date(dto.hireDate) : dto.hireDate === null ? null : undefined,
        contractType: dto.contractType?.trim() || (dto.contractType === null ? null : undefined),
        nationalId: dto.nationalId?.trim() || (dto.nationalId === null ? null : undefined),
        emergencyContactName:
          dto.emergencyContactName?.trim() || (dto.emergencyContactName === null ? null : undefined),
        emergencyContactPhone:
          dto.emergencyContactPhone?.trim() || (dto.emergencyContactPhone === null ? null : undefined),
        photoUrl: dto.photoUrl?.trim() || (dto.photoUrl === null ? null : undefined),
        ...(dto.scheduleId !== undefined ? { scheduleId: dto.scheduleId } : {}),
        faceEmbedding: dto.faceEmbedding as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.employee.delete({ where: { id } });
    return { id, deleted: true };
  }

  async createContract(employeeId: string, dto: CreateEmployeeContractDto, file?: Express.Multer.File) {
    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }
    const contractFileUrl = file
      ? await this.storage.uploadEmployeeContract({
          organizationId: employee.organizationId,
          employeeId: employee.id,
          contentType: file.mimetype,
          buffer: file.buffer,
        })
      : null;

    return this.prisma.$transaction(async (tx) => {
      const previousCurrent = await tx.employeeContract.findFirst({
        where: { employeeId, isCurrent: true },
        orderBy: { createdAt: 'desc' },
        select: { renewalsCount: true },
      });
      await tx.employeeContract.updateMany({
        where: { employeeId, isCurrent: true },
        data: { isCurrent: false },
      });

      return tx.employeeContract.create({
        data: {
          employeeId,
          organizationId: employee.organizationId,
          signedAt: new Date(dto.signedAt),
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
          renewalsCount: dto.renewalsCount ?? (previousCurrent?.renewalsCount ?? -1) + 1,
          notes: dto.notes?.trim() || undefined,
          contractFileUrl: contractFileUrl ?? undefined,
          isCurrent: true,
        },
      });
    });
  }

  async findContracts(query: EmployeeContractQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.EmployeeContractWhereInput = {
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.employeeContract.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } },
        },
      }),
      this.prisma.employeeContract.count({ where }),
    ]);
    return { data: items, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  private async ensureSite(siteId: string) {
    const site = await this.prisma.site.findUnique({ where: { id: siteId } });
    if (!site) {
      throw new NotFoundException('Site not found');
    }
    return site;
  }

  private async ensureSchedule(scheduleId: string, organizationId: string, siteId?: string | null) {
    const schedule = await this.prisma.workSchedule.findUnique({ where: { id: scheduleId } });
    if (!schedule) {
      throw new NotFoundException('WorkSchedule not found');
    }
    if (schedule.organizationId !== organizationId) {
      throw new BadRequestException('WorkSchedule does not belong to employee organization');
    }
    if (siteId && schedule.siteId !== siteId) {
      throw new BadRequestException('WorkSchedule does not belong to employee site');
    }
    return schedule;
  }
}
