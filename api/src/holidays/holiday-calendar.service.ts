import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  EmployeeHolidayIndex,
  holidayDateKey,
} from '../common/utils/holiday-calendar.util';

type EmployeeHolidayScope = {
  id: string;
  companyId: string;
  holidayListId: string | null;
};

@Injectable()
export class HolidayCalendarService {
  constructor(private readonly prisma: PrismaService) {}

  /** Liste employé → dates férié (liste company par défaut ou `employee.holidayListId`). */
  async buildIndexForEmployees(
    employees: EmployeeHolidayScope[],
    from: Date,
    to: Date,
  ): Promise<EmployeeHolidayIndex> {
    const index: EmployeeHolidayIndex = new Map();
    if (!employees.length) return index;

    const companyIds = [...new Set(employees.map((e) => e.companyId))];
    const companyLists = await this.prisma.holidayList.findMany({
      where: { companyId: { in: companyIds } },
      select: { id: true, companyId: true },
    });
    const listByCompany = new Map(
      companyLists
        .filter((l): l is { id: string; companyId: string } => !!l.companyId)
        .map((l) => [l.companyId, l.id]),
    );

    const listIds = new Set<string>();
    for (const employee of employees) {
      const listId = employee.holidayListId ?? listByCompany.get(employee.companyId);
      if (listId) listIds.add(listId);
    }

    if (!listIds.size) return index;

    const holidays = await this.prisma.holiday.findMany({
      where: {
        parentId: { in: [...listIds] },
        holidayDate: { gte: from, lte: to },
      },
      select: { parentId: true, holidayDate: true },
    });

    const datesByList = new Map<string, Set<string>>();
    for (const row of holidays) {
      if (!row.holidayDate) continue;
      const bucket = datesByList.get(row.parentId) ?? new Set();
      bucket.add(holidayDateKey(row.holidayDate));
      datesByList.set(row.parentId, bucket);
    }

    for (const employee of employees) {
      const listId = employee.holidayListId ?? listByCompany.get(employee.companyId);
      if (!listId) continue;
      const dates = datesByList.get(listId);
      if (dates?.size) {
        index.set(employee.id, new Set(dates));
      }
    }

    return index;
  }
}
