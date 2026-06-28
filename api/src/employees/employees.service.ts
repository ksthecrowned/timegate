import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EmployeeStatus, Prisma, TimeGateUserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { JwtUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { CloudflareR2Service } from '../storage/cloudflare-r2.service';
import { generateDocId } from '../common/utils/doc-id.util';
import { BulkImportResultDto, BulkEmployeeRowDto } from './dto/bulk-create-employees.dto';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { EmployeeQueryDto } from './dto/employee-query.dto';
import { EmployeeContractQueryDto } from './dto/employee-contract-query.dto';
import { CreateEmployeeContractDto } from './dto/create-employee-contract.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { SetKioskPinDto } from './dto/set-kiosk-pin.dto';
import { SetNfcBadgeDto } from './dto/set-nfc-badge.dto';
import { UpdateEmployeeContractDto } from './dto/update-employee-contract.dto';

@Injectable()
export class EmployeesService {
  constructor(
    private prisma: PrismaService,
    private readonly storage: CloudflareR2Service,
  ) {}

  async create(dto: CreateEmployeeDto) {
    return this.createOne(dto);
  }

  async bulkCreate(employees: BulkEmployeeRowDto[]) {
    const created: BulkImportResultDto['employees'] = [];
    const errors: BulkImportResultDto['errors'] = [];
    const seenEmails = new Set<string>();

    for (let index = 0; index < employees.length; index++) {
      const row = index + 1;
      const dto = employees[index];

      if (dto.email) {
        const emailKey = dto.email.trim().toLowerCase();
        if (seenEmails.has(emailKey)) {
          errors.push({ row, message: 'Duplicate email in import file' });
          continue;
        }
        seenEmails.add(emailKey);
      }

      try {
        const employee = await this.createOne(dto as CreateEmployeeDto);
        created.push({
          row,
          id: employee.id,
          firstName: employee.firstName,
          lastName: employee.lastName,
        });
      } catch (error) {
        errors.push({
          row,
          message: this.extractErrorMessage(error),
        });
      }
    }

    return {
      created: created.length,
      failed: errors.length,
      employees: created,
      errors,
    } satisfies BulkImportResultDto;
  }

  private async createOne(dto: CreateEmployeeDto) {
    const branchId = dto.branchId;
    if (!branchId) {
      throw new BadRequestException('branchId is required');
    }

    const branch = await this.ensureBranch(branchId);
    if (dto.defaultShiftId) {
      await this.ensureShiftType(dto.defaultShiftId, branch.companyId, branchId);
    }
    if (dto.departmentId) {
      await this.ensureDepartment(dto.departmentId, branch.companyId);
    }
    if (dto.designationId) {
      await this.ensureDesignation(dto.designationId, branch.companyId);
    }
    if (dto.holidayListId) {
      await this.ensureHolidayList(dto.holidayListId, branch.companyId);
    }
    const employeeName = `${dto.firstName} ${dto.lastName}`.trim();

    if (dto.email) {
      const exists = await this.prisma.employee.findFirst({
        where: { personalEmail: dto.email, companyId: branch.companyId },
      });
      if (exists) {
        throw new ConflictException('Employee email already exists');
      }
    }

    const created = await this.prisma.employee.create({
      data: {
        id: generateDocId('EMP'),
        employeeName,
        firstName: dto.firstName,
        lastName: dto.lastName,
        personalEmail: dto.email,
        dateOfBirth: dto.birthDate ? new Date(dto.birthDate) : undefined,
        gender: dto.gender,
        nationality: dto.nationality,
        maritalStatus: dto.maritalStatus,
        addressLine1: dto.addressLine1,
        addressLine2: dto.addressLine2,
        cityId: dto.cityId,
        countryId: dto.countryId,
        province: dto.province,
        postalCode: dto.postalCode,
        emergencyContactName: dto.emergencyContactName,
        emergencyContactPhone: dto.emergencyContactPhone,
        nationalIdNumber: dto.nationalIdNumber,
        passportNumber: dto.passportNumber,
        cellNumber: dto.phone ?? dto.whatsappPhone,
        dateOfJoining: dto.hireDate ? new Date(dto.hireDate) : undefined,
        companyId: branch.companyId,
        branchId,
        defaultShiftId: dto.defaultShiftId,
        departmentId: dto.departmentId,
        designationId: dto.designationId,
        holidayListId: dto.holidayListId,
        status: dto.isActive === false ? EmployeeStatus.INACTIVE : EmployeeStatus.ACTIVE,
        faceEmbedding: dto.faceEmbedding as Prisma.InputJsonValue | undefined,
      },
      include: this.employeeIncludes(),
    });

    return this.toLegacyEmployeeShape(created);
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof BadRequestException || error instanceof ConflictException || error instanceof NotFoundException) {
      const response = error.getResponse();
      if (typeof response === 'string') return response;
      if (typeof response === 'object' && response && 'message' in response) {
        const message = (response as { message?: string | string[] }).message;
        return Array.isArray(message) ? message.join(', ') : String(message);
      }
    }
    if (error instanceof Error) return error.message;
    return 'Unknown error';
  }

  async findAll(query: EmployeeQueryDto, user?: JwtUser) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const branchId = query.branchId;
    const companyId =
      user?.role === TimeGateUserRole.SUPER_ADMIN ? undefined : user?.companyId ?? undefined;
    const where: Prisma.EmployeeWhereInput = {
      ...(companyId ? { companyId } : {}),
      ...(branchId ? { branchId } : {}),
      ...(query.employeeId ? { id: query.employeeId } : {}),
      ...(typeof query.isActive === 'boolean'
        ? { status: query.isActive ? EmployeeStatus.ACTIVE : EmployeeStatus.INACTIVE }
        : {}),
      ...(query.search
        ? {
            OR: [
              { firstName: { contains: query.search, mode: 'insensitive' } },
              { lastName: { contains: query.search, mode: 'insensitive' } },
              { employeeName: { contains: query.search, mode: 'insensitive' } },
              { personalEmail: { contains: query.search, mode: 'insensitive' } },
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
        include: this.employeeIncludes(),
      }),
      this.prisma.employee.count({ where }),
    ]);
    const data = items.map((item) => ({
      ...this.toLegacyEmployeeShape(item),
      hasFaceEmbedding: Array.isArray(item.faceEmbedding),
    }));
    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string, user?: JwtUser) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: this.employeeIncludes(),
    });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }
    if (user) {
      this.assertCompanyAccess(user, employee.companyId);
    }
    return {
      ...this.toLegacyEmployeeShape(employee),
      hasFaceEmbedding: Array.isArray(employee.faceEmbedding),
      hasKioskPin: Boolean(employee.kioskPinHash),
      hasNfcBadge: Boolean(employee.nfcBadgeUid),
      hasQrPunchToken: Boolean(employee.qrPunchTokenHash),
      nfcBadgeUid: employee.nfcBadgeUid,
      qrPunchTokenIssuedAt: employee.qrPunchTokenIssuedAt,
    };
  }

  async setNfcBadge(id: string, dto: SetNfcBadgeDto, user: JwtUser) {
    const current = await this.findOne(id, user);
    const raw = dto.badgeUid?.trim();
    const normalized = raw ? raw.replace(/[\s:-]/g, '').toUpperCase() : null;
    if (normalized && normalized.length < 4) {
      throw new BadRequestException('Badge UID must be at least 4 characters');
    }
    if (normalized) {
      const conflict = await this.prisma.employee.findFirst({
        where: {
          companyId: current.companyId,
          nfcBadgeUid: normalized,
          NOT: { id },
        },
      });
      if (conflict) {
        throw new ConflictException('This NFC badge is already assigned to another employee');
      }
    }
    await this.prisma.employee.update({
      where: { id },
      data: { nfcBadgeUid: normalized },
    });
    return { id, hasNfcBadge: Boolean(normalized), nfcBadgeUid: normalized };
  }

  async regenerateQrPunchToken(id: string, user: JwtUser) {
    await this.findOne(id, user);
    const token = randomBytes(24).toString('base64url');
    const hash = createHash('sha256').update(token).digest('hex');
    const issuedAt = new Date();
    await this.prisma.employee.update({
      where: { id },
      data: { qrPunchTokenHash: hash, qrPunchTokenIssuedAt: issuedAt },
    });
    return {
      id,
      qrToken: `TGQR:v1:${token}`,
      issuedAt,
    };
  }

  async clearQrPunchToken(id: string, user: JwtUser) {
    await this.findOne(id, user);
    await this.prisma.employee.update({
      where: { id },
      data: { qrPunchTokenHash: null, qrPunchTokenIssuedAt: null },
    });
    return { id, hasQrPunchToken: false };
  }

  async setKioskPin(id: string, dto: SetKioskPinDto, user: JwtUser) {
    await this.findOne(id, user);
    const pin = dto.pin?.trim();
    if (pin && !/^\d{4,6}$/.test(pin)) {
      throw new BadRequestException('PIN must be 4 to 6 digits');
    }
    const kioskPinHash = pin && pin.length >= 4 ? await bcrypt.hash(pin, 10) : null;
    await this.prisma.employee.update({
      where: { id },
      data: { kioskPinHash },
    });
    return { id, hasKioskPin: Boolean(kioskPinHash) };
  }

  async update(id: string, dto: UpdateEmployeeDto, user: JwtUser) {
    const current = await this.findOne(id, user);
    if (dto.email) {
      const conflict = await this.prisma.employee.findFirst({
        where: { personalEmail: dto.email, companyId: current.companyId, NOT: { id } },
      });
      if (conflict) {
        throw new ConflictException('Employee email already exists');
      }
    }
    const branchId = dto.branchId;
    if (branchId) {
      await this.ensureBranch(branchId);
    }
    if (dto.defaultShiftId) {
      await this.ensureShiftType(
        dto.defaultShiftId,
        current.companyId,
        branchId ?? current.branchId,
      );
    }
    const companyId = current.companyId;
    if (dto.departmentId) {
      await this.ensureDepartment(dto.departmentId, companyId);
    }
    if (dto.designationId) {
      await this.ensureDesignation(dto.designationId, companyId);
    }
    if (dto.holidayListId) {
      await this.ensureHolidayList(dto.holidayListId, companyId);
    }

    const updated = await this.prisma.employee.update({
      where: { id },
      data: {
        ...(dto.firstName !== undefined || dto.lastName !== undefined
          ? {
              firstName: dto.firstName ?? current.firstName,
              lastName: dto.lastName ?? current.lastName,
              employeeName: `${dto.firstName ?? current.firstName} ${dto.lastName ?? current.lastName}`.trim(),
            }
          : {}),
        ...(dto.email !== undefined ? { personalEmail: dto.email } : {}),
        ...(dto.birthDate !== undefined
          ? { dateOfBirth: dto.birthDate ? new Date(dto.birthDate) : null }
          : {}),
        ...(dto.phone !== undefined ? { cellNumber: dto.phone } : {}),
        ...(dto.whatsappPhone !== undefined ? { cellNumber: dto.whatsappPhone } : {}),
        ...(dto.hireDate !== undefined
          ? { dateOfJoining: dto.hireDate ? new Date(dto.hireDate) : null }
          : {}),
        ...(dto.gender !== undefined ? { gender: dto.gender || null } : {}),
        ...(dto.nationality !== undefined ? { nationality: dto.nationality || null } : {}),
        ...(dto.maritalStatus !== undefined ? { maritalStatus: dto.maritalStatus || null } : {}),
        ...(dto.addressLine1 !== undefined ? { addressLine1: dto.addressLine1 || null } : {}),
        ...(dto.addressLine2 !== undefined ? { addressLine2: dto.addressLine2 || null } : {}),
        ...(dto.cityId !== undefined ? { cityId: dto.cityId || null } : {}),
        ...(dto.countryId !== undefined ? { countryId: dto.countryId || null } : {}),
        ...(dto.province !== undefined ? { province: dto.province || null } : {}),
        ...(dto.postalCode !== undefined ? { postalCode: dto.postalCode || null } : {}),
        ...(dto.emergencyContactName !== undefined
          ? { emergencyContactName: dto.emergencyContactName || null }
          : {}),
        ...(dto.emergencyContactPhone !== undefined
          ? { emergencyContactPhone: dto.emergencyContactPhone || null }
          : {}),
        ...(dto.nationalIdNumber !== undefined
          ? { nationalIdNumber: dto.nationalIdNumber || null }
          : {}),
        ...(dto.passportNumber !== undefined ? { passportNumber: dto.passportNumber || null } : {}),
        ...(branchId !== undefined ? { branchId } : {}),
        ...(dto.defaultShiftId !== undefined ? { defaultShiftId: dto.defaultShiftId } : {}),
        ...(dto.departmentId !== undefined ? { departmentId: dto.departmentId } : {}),
        ...(dto.designationId !== undefined ? { designationId: dto.designationId } : {}),
        ...(dto.holidayListId !== undefined ? { holidayListId: dto.holidayListId } : {}),
        ...(dto.isActive !== undefined
          ? { status: dto.isActive ? EmployeeStatus.ACTIVE : EmployeeStatus.INACTIVE }
          : {}),
        ...(dto.faceEmbedding !== undefined
          ? { faceEmbedding: dto.faceEmbedding as Prisma.InputJsonValue }
          : {}),
      },
      include: this.employeeIncludes(),
    });

    return this.toLegacyEmployeeShape(updated);
  }

  async remove(id: string, user: JwtUser) {
    await this.findOne(id, user);
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.timeGateShiftSwapRequest.deleteMany({
          where: { OR: [{ requesterEmployeeId: id }, { targetEmployeeId: id }] },
        });
        await tx.salaryStructureAssignment.deleteMany({ where: { employeeId: id } });
        await tx.timeGateEmployeeContract.deleteMany({ where: { employeeId: id } });
        await tx.faceRecognitionLog.deleteMany({ where: { employeeId: id } });
        await tx.employeeCheckin.deleteMany({ where: { employeeId: id } });
        await tx.attendance.deleteMany({ where: { employeeId: id } });
        await tx.leaveApplication.deleteMany({ where: { employeeId: id } });
        await tx.leaveAllocation.deleteMany({ where: { employeeId: id } });
        await tx.shiftAssignment.deleteMany({ where: { employeeId: id } });
        await tx.timesheet.deleteMany({ where: { employeeId: id } });
        await tx.salarySlip.deleteMany({ where: { employeeId: id } });
        await tx.employee.update({ where: { id }, data: { userId: null } });
        await tx.employee.delete({ where: { id } });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'Impossible de supprimer cet employé : des enregistrements liés existent encore.',
        );
      }
      throw error;
    }
    return { id, deleted: true };
  }

  async findContracts(query: EmployeeContractQueryDto, user?: JwtUser) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const companyId =
      user?.role === TimeGateUserRole.SUPER_ADMIN ? undefined : user?.companyId ?? undefined;
    const where: Prisma.TimeGateEmployeeContractWhereInput = {
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      ...(companyId ? { companyId } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.timeGateEmployeeContract.findMany({
        where,
        orderBy: [{ isCurrent: 'desc' }, { signedAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          employee: {
            select: { id: true, firstName: true, lastName: true, employeeName: true },
          },
        },
      }),
      this.prisma.timeGateEmployeeContract.count({ where }),
    ]);

    return {
      data: items.map((row) => this.toLegacyContractShape(row)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async createContract(
    employeeId: string,
    dto: CreateEmployeeContractDto,
    file?: Express.Multer.File,
  ) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, companyId: true },
    });
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }

    const signedAt = new Date(dto.signedAt);
    if (Number.isNaN(signedAt.getTime())) {
      throw new BadRequestException('Invalid signedAt date');
    }
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    if (expiresAt && Number.isNaN(expiresAt.getTime())) {
      throw new BadRequestException('Invalid expiresAt date');
    }

    let contractFileUrl: string | null = null;
    if (file?.buffer?.length) {
      contractFileUrl = await this.storage.uploadEmployeeContract({
        organizationId: employee.companyId,
        employeeId: employee.id,
        contentType: file.mimetype,
        buffer: file.buffer,
      });
    }

    const created = await this.prisma.$transaction(async (tx) => {
      await tx.timeGateEmployeeContract.updateMany({
        where: { employeeId: employee.id, isCurrent: true },
        data: { isCurrent: false },
      });

      return tx.timeGateEmployeeContract.create({
        data: {
          id: generateDocId('CTR'),
          companyId: employee.companyId,
          employeeId: employee.id,
          signedAt,
          expiresAt,
          renewalsCount: dto.renewalsCount ?? 0,
          contractFileUrl,
          notes: dto.notes?.trim() || null,
          isCurrent: true,
        },
        include: {
          employee: {
            select: { id: true, firstName: true, lastName: true, employeeName: true },
          },
        },
      });
    });

    return this.toLegacyContractShape(created);
  }

  async updateContract(
    employeeId: string,
    contractId: string,
    dto: UpdateEmployeeContractDto,
    user: JwtUser,
    file?: Express.Multer.File,
  ) {
    const contract = await this.prisma.timeGateEmployeeContract.findFirst({
      where: { id: contractId, employeeId },
      include: { employee: { select: { companyId: true } } },
    });
    if (!contract) throw new NotFoundException('Contract not found');
    this.assertCompanyAccess(user, contract.companyId);

    let contractFileUrl = contract.contractFileUrl;
    if (file?.buffer?.length) {
      contractFileUrl = await this.storage.uploadEmployeeContract({
        organizationId: contract.companyId,
        employeeId: contract.employeeId,
        contentType: file.mimetype,
        buffer: file.buffer,
      });
    }

    const signedAt = dto.signedAt ? new Date(dto.signedAt) : undefined;
    if (signedAt && Number.isNaN(signedAt.getTime())) {
      throw new BadRequestException('Invalid signedAt date');
    }
    const expiresAt =
      dto.expiresAt !== undefined ? (dto.expiresAt ? new Date(dto.expiresAt) : null) : undefined;
    if (expiresAt && Number.isNaN(expiresAt.getTime())) {
      throw new BadRequestException('Invalid expiresAt date');
    }

    const updated = await this.prisma.timeGateEmployeeContract.update({
      where: { id: contractId },
      data: {
        ...(signedAt !== undefined ? { signedAt } : {}),
        ...(expiresAt !== undefined ? { expiresAt } : {}),
        ...(dto.renewalsCount !== undefined ? { renewalsCount: dto.renewalsCount } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes?.trim() || null } : {}),
        ...(contractFileUrl !== contract.contractFileUrl ? { contractFileUrl } : {}),
      },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, employeeName: true },
        },
      },
    });

    return this.toLegacyContractShape(updated);
  }

  async removeContract(employeeId: string, contractId: string, user: JwtUser) {
    const contract = await this.prisma.timeGateEmployeeContract.findFirst({
      where: { id: contractId, employeeId },
    });
    if (!contract) throw new NotFoundException('Contract not found');
    this.assertCompanyAccess(user, contract.companyId);
    await this.prisma.timeGateEmployeeContract.delete({ where: { id: contractId } });
    return { id: contractId, deleted: true };
  }

  private toLegacyContractShape(
    row: Prisma.TimeGateEmployeeContractGetPayload<{
      include: { employee: { select: { id: true; firstName: true; lastName: true; employeeName: true } } };
    }>,
  ) {
    return {
      id: row.id,
      employeeId: row.employeeId,
      companyId: row.companyId,
      signedAt: row.signedAt.toISOString(),
      expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
      renewalsCount: row.renewalsCount,
      contractFileUrl: row.contractFileUrl,
      notes: row.notes,
      isCurrent: row.isCurrent,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      employee: row.employee
        ? {
            id: row.employee.id,
            firstName: row.employee.firstName ?? row.employee.employeeName,
            lastName: row.employee.lastName ?? '',
          }
        : undefined,
    };
  }

  private async ensureBranch(branchId: string) {
    const branch = await this.prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }
    return branch;
  }

  private employeeIncludes() {
    return {
      branch: { select: { id: true, branchName: true, address: true } },
      defaultShift: { select: { id: true, shiftName: true, branchId: true } },
      department: { select: { id: true, departmentName: true } },
      designation: { select: { id: true, designationName: true } },
      holidayList: { select: { id: true, holidayListName: true } },
      city: { select: { id: true, name: true } },
      country: { select: { id: true, name: true, isoCode: true } },
    } as const;
  }

  private async ensureDepartment(departmentId: string, companyId: string) {
    const row = await this.prisma.department.findUnique({ where: { id: departmentId } });
    if (!row || row.companyId !== companyId) {
      throw new NotFoundException('Department not found');
    }
    return row;
  }

  private async ensureDesignation(designationId: string, companyId: string) {
    const row = await this.prisma.designation.findUnique({ where: { id: designationId } });
    if (!row || row.companyId !== companyId) {
      throw new NotFoundException('Designation not found');
    }
    return row;
  }

  private async ensureHolidayList(holidayListId: string, companyId: string) {
    const row = await this.prisma.holidayList.findUnique({ where: { id: holidayListId } });
    if (!row || row.companyId !== companyId) {
      throw new NotFoundException('Holiday list not found for this organization');
    }
    return row;
  }

  private async ensureShiftType(
    shiftTypeId: string,
    companyId: string | null,
    branchId: string | null,
  ) {
    const shift = await this.prisma.shiftType.findUnique({ where: { id: shiftTypeId } });
    if (!shift) {
      throw new NotFoundException('Work schedule not found');
    }
    if (companyId && shift.companyId && shift.companyId !== companyId) {
      throw new BadRequestException('Work schedule does not belong to employee company');
    }
    if (branchId && shift.branchId && shift.branchId !== branchId) {
      throw new BadRequestException('Work schedule does not belong to employee branch');
    }
    return shift;
  }

  private assertCompanyAccess(user: JwtUser, companyId: string | null) {
    if (user.role === TimeGateUserRole.SUPER_ADMIN) return;
    if (!companyId || !user.companyId || user.companyId !== companyId) {
      throw new ForbiddenException('Access denied for this company');
    }
  }

  private toLegacyEmployeeShape(employee: {
    id: string;
    employeeName: string;
    firstName: string | null;
    lastName: string | null;
    personalEmail: string | null;
    dateOfBirth: Date | null;
    cellNumber: string | null;
    dateOfJoining: Date | null;
    gender: string | null;
    nationality: string | null;
    maritalStatus: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    cityId: string | null;
    countryId: string | null;
    province: string | null;
    postalCode: string | null;
    emergencyContactName: string | null;
    emergencyContactPhone: string | null;
    nationalIdNumber: string | null;
    passportNumber: string | null;
    companyId: string;
    branchId: string | null;
    defaultShiftId: string | null;
    departmentId: string | null;
    designationId: string | null;
    holidayListId: string | null;
    status: EmployeeStatus;
    faceEmbedding: unknown;
    faceEnrollmentPhoto: string | null;
    faceEnrolledAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    branch?: { id: string; branchName: string; address?: string | null } | null;
    defaultShift?: { id: string; shiftName: string; branchId: string | null } | null;
    department?: { id: string; departmentName: string } | null;
    designation?: { id: string; designationName: string } | null;
    holidayList?: { id: string; holidayListName: string } | null;
    city?: { id: string; name: string } | null;
    country?: { id: string; name: string; isoCode: string } | null;
  }) {
    return {
      id: employee.id,
      firstName: employee.firstName ?? employee.employeeName,
      lastName: employee.lastName ?? '',
      email: employee.personalEmail,
      birthDate: employee.dateOfBirth,
      gender: employee.gender,
      nationality: employee.nationality,
      maritalStatus: employee.maritalStatus,
      addressLine1: employee.addressLine1,
      addressLine2: employee.addressLine2,
      cityId: employee.cityId,
      countryId: employee.countryId,
      province: employee.province,
      postalCode: employee.postalCode,
      emergencyContactName: employee.emergencyContactName,
      emergencyContactPhone: employee.emergencyContactPhone,
      nationalIdNumber: employee.nationalIdNumber,
      passportNumber: employee.passportNumber,
      city: employee.city ? { id: employee.city.id, name: employee.city.name } : null,
      country: employee.country
        ? { id: employee.country.id, name: employee.country.name, isoCode: employee.country.isoCode }
        : null,
      phone: employee.cellNumber,
      whatsappPhone: employee.cellNumber,
      hireDate: employee.dateOfJoining,
      isActive: employee.status === EmployeeStatus.ACTIVE,
      status: employee.status,
      companyId: employee.companyId,
      branchId: employee.branchId,
      defaultShiftId: employee.defaultShiftId,
      departmentId: employee.departmentId,
      designationId: employee.designationId,
      holidayListId: employee.holidayListId,
      department: employee.department?.departmentName ?? null,
      designation: employee.designation?.designationName ?? null,
      defaultShift: employee.defaultShift
        ? {
            id: employee.defaultShift.id,
            name: employee.defaultShift.shiftName,
            branchId: employee.defaultShift.branchId,
          }
        : null,
      photoUrl: employee.faceEnrollmentPhoto,
      faceEnrolledAt: employee.faceEnrolledAt,
      branch: employee.branch
        ? {
            id: employee.branch.id,
            name: employee.branch.branchName,
            address: employee.branch.address ?? null,
          }
        : null,
      holidayList: employee.holidayList
        ? {
            id: employee.holidayList.id,
            name: employee.holidayList.holidayListName,
          }
        : null,
      createdAt: employee.createdAt,
      updatedAt: employee.updatedAt,
    };
  }
}
