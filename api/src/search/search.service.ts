import { Injectable } from '@nestjs/common';
import { JwtUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { SearchQueryDto } from './dto/search-query.dto';

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  async search(query: SearchQueryDto, user: JwtUser) {
    const q = query.q.trim();
    const limit = query.limit ?? 5;
    const companyId = user.role === 'PLATFORM_ADMIN' ? undefined : user.companyId ?? undefined;
    const contains = { contains: q, mode: 'insensitive' as const };

    const employeeWhere = {
      ...(companyId ? { companyId } : {}),
      OR: [
        { firstName: contains },
        { lastName: contains },
        { employeeName: contains },
        { personalEmail: contains },
      ],
    };

    const [employees, branches, departments, designations, kiosks] = await Promise.all([
      this.prisma.employee.findMany({
        where: employeeWhere,
        take: limit,
        orderBy: { employeeName: 'asc' },
        select: { id: true, firstName: true, lastName: true, employeeName: true, personalEmail: true },
      }),
      this.prisma.branch.findMany({
        where: {
          ...(companyId ? { companyId } : {}),
          OR: [{ branchName: contains }, { address: contains }],
        },
        take: limit,
        orderBy: { branchName: 'asc' },
        select: { id: true, branchName: true, address: true },
      }),
      this.prisma.department.findMany({
        where: {
          ...(companyId ? { companyId } : {}),
          OR: [{ departmentName: contains }, { code: contains }],
        },
        take: limit,
        orderBy: { departmentName: 'asc' },
        select: { id: true, departmentName: true, code: true },
      }),
      this.prisma.designation.findMany({
        where: {
          ...(companyId ? { companyId } : {}),
          designationName: contains,
        },
        take: limit,
        orderBy: { designationName: 'asc' },
        select: { id: true, designationName: true },
      }),
      this.prisma.timeGateKiosk.findMany({
        where: {
          ...(companyId ? { companyId } : {}),
          kioskName: contains,
        },
        take: limit,
        orderBy: { kioskName: 'asc' },
        select: { id: true, kioskName: true, branch: { select: { branchName: true } } },
      }),
    ]);

    return {
      q,
      results: {
        employees: employees.map((row) => ({
          id: row.id,
          label: `${row.firstName ?? row.employeeName} ${row.lastName ?? ''}`.trim(),
          href: `/employees/${row.id}`,
          meta: row.personalEmail,
        })),
        branches: branches.map((row) => ({
          id: row.id,
          label: row.branchName,
          href: `/branches/${row.id}`,
          meta: row.address,
        })),
        departments: departments.map((row) => ({
          id: row.id,
          label: row.departmentName,
          href: `/departments/${row.id}`,
          meta: row.code,
        })),
        designations: designations.map((row) => ({
          id: row.id,
          label: row.designationName,
          href: `/designations/${row.id}`,
        })),
        kiosks: kiosks.map((row) => ({
          id: row.id,
          label: row.kioskName,
          href: `/kiosks/${row.id}`,
          meta: row.branch?.branchName ?? null,
        })),
      },
    };
  }
}
