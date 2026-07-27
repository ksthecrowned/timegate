import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { Prisma, TimeGateUserRole } from '@prisma/client'
import { PLATFORM_ADMIN } from '../common/constants/platform-admin'
import { PrismaService } from '../prisma/prisma.service'
import { generateDocId } from '../common/utils/doc-id.util'
import { JwtUser } from '../common/decorators/current-user.decorator'
import { CreateEmploymentTypeDto } from './dto/create-employment-type.dto'
import { UpdateEmploymentTypeDto } from './dto/update-employment-type.dto'
import { PaginationQueryDto } from '../common/dto/pagination-query.dto'

@Injectable()
export class EmploymentTypesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateEmploymentTypeDto, companyId: string) {
    const name = dto.name.trim()
    const existing = await this.prisma.employmentType.findFirst({
      where: { companyId, employeeTypeName: name },
    })
    if (existing) {
      throw new ConflictException('Employment type name already exists for this company')
    }

    const created = await this.prisma.employmentType.create({
      data: {
        id: generateDocId('EMPT'),
        employeeTypeName: name,
        companyId,
      },
    })
    return this.toApiShape(created)
  }

  async findAll(query: PaginationQueryDto, companyId?: string) {
    const page = query.page ?? 1
    const limit = query.limit ?? 20
    const where: Prisma.EmploymentTypeWhereInput = {
      ...(companyId ? { companyId } : {}),
    }

    const [items, total] = await Promise.all([
      this.prisma.employmentType.findMany({
        where,
        orderBy: { employeeTypeName: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.employmentType.count({ where }),
    ])

    return {
      data: items.map((row) => this.toApiShape(row)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    }
  }

  async findOne(id: string, user?: JwtUser) {
    const row = await this.prisma.employmentType.findUnique({ where: { id } })
    if (!row) throw new NotFoundException('Employment type not found')
    if (user) this.assertCompanyAccess(user, row.companyId)
    return this.toApiShape(row)
  }

  async update(id: string, dto: UpdateEmploymentTypeDto, user: JwtUser) {
    const current = await this.prisma.employmentType.findUnique({ where: { id } })
    if (!current) throw new NotFoundException('Employment type not found')
    this.assertCompanyAccess(user, current.companyId)

    if (dto.name && dto.name.trim() !== current.employeeTypeName) {
      const clash = await this.prisma.employmentType.findFirst({
        where: { companyId: current.companyId, employeeTypeName: dto.name.trim() },
      })
      if (clash) {
        throw new ConflictException('Employment type name already exists for this company')
      }
    }

    const updated = await this.prisma.employmentType.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { employeeTypeName: dto.name.trim() } : {}),
      },
    })
    return this.toApiShape(updated)
  }

  async remove(id: string, user: JwtUser) {
    await this.findOne(id, user)
    await this.prisma.employmentType.delete({ where: { id } })
    return { id, deleted: true }
  }

  private assertCompanyAccess(user: JwtUser, companyId: string) {
    if (user.role === PLATFORM_ADMIN) return
    if (!user.companyId || user.companyId !== companyId) {
      throw new ForbiddenException('Access denied for this company')
    }
  }

  private toApiShape(row: {
    id: string
    employeeTypeName: string
    companyId: string
    createdAt: Date
    updatedAt: Date
  }) {
    return {
      id: row.id,
      name: row.employeeTypeName,
      companyId: row.companyId,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }
  }
}
