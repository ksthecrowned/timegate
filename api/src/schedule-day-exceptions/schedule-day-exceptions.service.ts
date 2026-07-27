import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { Prisma, TimeGateUserRole } from '@prisma/client'
import { PLATFORM_ADMIN } from '../common/constants/platform-admin'
import { PrismaService } from '../prisma/prisma.service'
import { generateDocId } from '../common/utils/doc-id.util'
import { formatTimeOnly, toTimeOnlyDate } from '../common/utils/time.util'
import { JwtUser } from '../common/decorators/current-user.decorator'
import { CreateScheduleDayExceptionDto } from './dto/create-schedule-day-exception.dto'
import { UpdateScheduleDayExceptionDto } from './dto/update-schedule-day-exception.dto'
import { ScheduleDayExceptionQueryDto } from './dto/schedule-day-exception-query.dto'

@Injectable()
export class ScheduleDayExceptionsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateScheduleDayExceptionDto, companyId: string) {
    const shiftType = await this.prisma.shiftType.findUnique({
      where: { id: dto.shiftTypeId },
      select: { id: true, companyId: true, shiftName: true },
    })
    if (!shiftType || shiftType.companyId !== companyId) {
      throw new BadRequestException('Invalid shift type for this organization')
    }

    const isOff = dto.isOff === true
    if (!isOff && (!dto.startTime || !dto.endTime)) {
      throw new BadRequestException('startTime and endTime are required when isOff is false')
    }

    const workDate = this.toDateOnly(dto.workDate)
    const existing = await this.prisma.timeGateScheduleDayException.findUnique({
      where: { shiftTypeId_workDate: { shiftTypeId: dto.shiftTypeId, workDate } },
    })
    if (existing) {
      throw new ConflictException('An exception already exists for this shift on that date')
    }

    const created = await this.prisma.timeGateScheduleDayException.create({
      data: {
        id: generateDocId('SDEX'),
        companyId,
        shiftTypeId: dto.shiftTypeId,
        workDate,
        isOff,
        startTime: isOff ? null : toTimeOnlyDate(dto.startTime!),
        endTime: isOff ? null : toTimeOnlyDate(dto.endTime!),
        note: dto.note?.trim() || null,
      },
      include: { shiftType: { select: { id: true, shiftName: true } } },
    })
    return this.toApiShape(created)
  }

  async findAll(query: ScheduleDayExceptionQueryDto, companyId?: string) {
    const page = query.page ?? 1
    const limit = query.limit ?? 50
    const where: Prisma.TimeGateScheduleDayExceptionWhereInput = {
      ...(companyId ? { companyId } : {}),
      ...(query.shiftTypeId ? { shiftTypeId: query.shiftTypeId } : {}),
      ...(query.from || query.to
        ? {
            workDate: {
              ...(query.from ? { gte: this.toDateOnly(query.from) } : {}),
              ...(query.to ? { lte: this.toDateOnly(query.to) } : {}),
            },
          }
        : {}),
    }

    const [items, total] = await Promise.all([
      this.prisma.timeGateScheduleDayException.findMany({
        where,
        include: { shiftType: { select: { id: true, shiftName: true } } },
        orderBy: [{ workDate: 'asc' }, { shiftTypeId: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.timeGateScheduleDayException.count({ where }),
    ])

    return {
      data: items.map((row) => this.toApiShape(row)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    }
  }

  async findOne(id: string, user?: JwtUser) {
    const row = await this.prisma.timeGateScheduleDayException.findUnique({
      where: { id },
      include: { shiftType: { select: { id: true, shiftName: true } } },
    })
    if (!row) throw new NotFoundException('Schedule day exception not found')
    if (user) this.assertCompanyAccess(user, row.companyId)
    return this.toApiShape(row)
  }

  async update(id: string, dto: UpdateScheduleDayExceptionDto, user: JwtUser) {
    const current = await this.prisma.timeGateScheduleDayException.findUnique({ where: { id } })
    if (!current) throw new NotFoundException('Schedule day exception not found')
    this.assertCompanyAccess(user, current.companyId)

    let shiftTypeId = current.shiftTypeId
    if (dto.shiftTypeId && dto.shiftTypeId !== current.shiftTypeId) {
      const shiftType = await this.prisma.shiftType.findUnique({
        where: { id: dto.shiftTypeId },
        select: { id: true, companyId: true },
      })
      if (!shiftType || shiftType.companyId !== current.companyId) {
        throw new BadRequestException('Invalid shift type for this organization')
      }
      shiftTypeId = dto.shiftTypeId
    }

    const isOff = dto.isOff !== undefined ? dto.isOff : current.isOff
    const startTime =
      dto.startTime !== undefined
        ? dto.startTime
          ? toTimeOnlyDate(dto.startTime)
          : null
        : current.startTime
    const endTime =
      dto.endTime !== undefined
        ? dto.endTime
          ? toTimeOnlyDate(dto.endTime)
          : null
        : current.endTime

    if (!isOff && (!startTime || !endTime)) {
      throw new BadRequestException('startTime and endTime are required when isOff is false')
    }

    let workDate = current.workDate
    if (dto.workDate) {
      workDate = this.toDateOnly(dto.workDate)
    }

    if (
      shiftTypeId !== current.shiftTypeId ||
      workDate.getTime() !== current.workDate.getTime()
    ) {
      const clash = await this.prisma.timeGateScheduleDayException.findUnique({
        where: { shiftTypeId_workDate: { shiftTypeId, workDate } },
      })
      if (clash && clash.id !== id) {
        throw new ConflictException('An exception already exists for this shift on that date')
      }
    }

    const updated = await this.prisma.timeGateScheduleDayException.update({
      where: { id },
      data: {
        shiftTypeId,
        workDate,
        isOff,
        startTime: isOff ? null : startTime,
        endTime: isOff ? null : endTime,
        ...(dto.note !== undefined ? { note: dto.note?.trim() || null } : {}),
      },
      include: { shiftType: { select: { id: true, shiftName: true } } },
    })
    return this.toApiShape(updated)
  }

  async remove(id: string, user: JwtUser) {
    await this.findOne(id, user)
    await this.prisma.timeGateScheduleDayException.delete({ where: { id } })
    return { id, deleted: true }
  }

  private assertCompanyAccess(user: JwtUser, companyId: string) {
    if (user.role === PLATFORM_ADMIN) return
    if (!user.companyId || user.companyId !== companyId) {
      throw new ForbiddenException('Access denied for this company')
    }
  }

  private toDateOnly(value: string): Date {
    const d = new Date(`${value.slice(0, 10)}T00:00:00.000Z`)
    if (Number.isNaN(d.getTime())) {
      throw new BadRequestException('Invalid date')
    }
    return d
  }

  private toApiShape(row: {
    id: string
    companyId: string
    shiftTypeId: string
    workDate: Date
    isOff: boolean
    startTime: Date | null
    endTime: Date | null
    note: string | null
    createdAt: Date
    updatedAt: Date
    shiftType?: { id: string; shiftName: string } | null
  }) {
    return {
      id: row.id,
      companyId: row.companyId,
      shiftTypeId: row.shiftTypeId,
      workDate: row.workDate.toISOString().slice(0, 10),
      isOff: row.isOff,
      startTime: row.startTime ? formatTimeOnly(row.startTime) : null,
      endTime: row.endTime ? formatTimeOnly(row.endTime) : null,
      note: row.note,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      shiftType: row.shiftType
        ? { id: row.shiftType.id, name: row.shiftType.shiftName }
        : null,
    }
  }
}
