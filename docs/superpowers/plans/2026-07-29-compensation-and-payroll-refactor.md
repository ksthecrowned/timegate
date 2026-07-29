# Compensation & Payroll Refactor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the ambiguous `/salaries` monthly-entry model with a contractual compensation grid + fixed employee allowances, feeding into the existing `payroll-runs` cycle as the single source of truth.

**Architecture:** New Prisma models (`CompensationGrid`, `EmployeeCompensationItem`, `PayrollVariableItem`) store contractual and recurring data. The existing `payroll-runs` `generateLines()` is refactored to pull base salary from the grid (instead of `TimeGateSalaryRecord`), sum fixed allowances, include variable items, and compute detailed penalties. `/salaries` pages are replaced by a "Compensation Grid" CRUD and an "Employee Compensation" tab.

**Tech Stack:** NestJS (API), Prisma ORM, Next.js 16 (dashboard), TypeScript, Tailwind CSS, class-validator DTOs.

## Global Constraints

- All monetary values use `Decimal(21,9)` in Prisma, converted via `fromDecimal`/`toDecimal`/`roundMoney` from `api/src/common/utils/money.util.ts`.
- IDs generated via `generateDocId(prefix)` from `api/src/common/utils/doc-id.util.ts`.
- All new API endpoints require `@Roles(TimeGateUserRole.ADMIN)` guard for mutations, company-scoped access checks.
- Follow existing module patterns: `*.module.ts`, `*.service.ts`, `*.controller.ts`, `dto/*.dto.ts`.
- Dashboard pages follow existing patterns in `dashboard/app/(authenticated)/`.
- Migration must be progressive: existing `TimeGateSalaryRecord` stays readable until Phase 3.

---

## File Structure

### API (new files)
- `api/prisma/schema.prisma` — add 3 new models + 1 enum, extend `TimeGatePayrollLine`
- `api/src/compensation-grid/compensation-grid.module.ts`
- `api/src/compensation-grid/compensation-grid.service.ts`
- `api/src/compensation-grid/compensation-grid.controller.ts`
- `api/src/compensation-grid/dto/create-compensation-grid.dto.ts`
- `api/src/compensation-grid/dto/update-compensation-grid.dto.ts`
- `api/src/compensation-grid/dto/find-compensation-grid-query.dto.ts`
- `api/src/employee-compensation/employee-compensation.module.ts`
- `api/src/employee-compensation/employee-compensation.service.ts`
- `api/src/employee-compensation/employee-compensation.controller.ts`
- `api/src/employee-compensation/dto/create-employee-compensation-item.dto.ts`
- `api/src/employee-compensation/dto/update-employee-compensation-item.dto.ts`
- `api/src/payroll-variable-items/payroll-variable-items.module.ts`
- `api/src/payroll-variable-items/payroll-variable-items.service.ts`
- `api/src/payroll-variable-items/payroll-variable-items.controller.ts`
- `api/src/payroll-variable-items/dto/create-payroll-variable-item.dto.ts`

### API (modified files)
- `api/src/payroll-runs/payroll-runs.service.ts` — refactor `generateLines()`
- `api/src/payroll-runs/payroll-runs.module.ts` — import new modules
- `api/src/app.module.ts` — register new modules

### Dashboard (new files)
- `dashboard/app/(authenticated)/compensation-grid/page.tsx`
- `dashboard/app/(authenticated)/compensation-grid/new/page.tsx`
- `dashboard/app/(authenticated)/compensation-grid/[id]/edit/page.tsx`
- `dashboard/components/timegate/CompensationGridForm.tsx`
- `dashboard/components/timegate/EmployeeCompensationItemForm.tsx`
- `dashboard/components/timegate/PayrollVariableItemForm.tsx`

### Dashboard (modified files)
- `dashboard/lib/navigation.ts` — update Paie menu
- `dashboard/app/(authenticated)/employees/[id]/page.tsx` — add Compensation tab
- `dashboard/app/(authenticated)/payroll-runs/new/page.tsx` — add variable items step
- `dashboard/app/(authenticated)/payroll-runs/[id]/page.tsx` — show detailed breakdown

---

### Task 1: Prisma Schema — New Models & Migration

**Files:**
- Modify: `api/prisma/schema.prisma`

**Interfaces:**
- Produces: `CompensationGrid`, `EmployeeCompensationItem`, `PayrollVariableItem` models, `CompensationItemKind` enum, extended `TimeGatePayrollLine` fields.

- [ ] **Step 1: Add the `CompensationItemKind` enum**

In `api/prisma/schema.prisma`, add after the existing enums:

```prisma
enum CompensationItemKind {
  ALLOWANCE
  DEDUCTION
}

enum PayrollVariableSource {
  MANUAL
  AUTO_RULE
}
```

- [ ] **Step 2: Add the `CompensationGrid` model**

```prisma
model CompensationGrid {
  id        String   @id @db.VarChar(140)
  createdAt DateTime @default(now()) @map("creation")
  updatedAt DateTime @updatedAt @map("modified")

  companyId        String   @map("company") @db.VarChar(140)
  company          Company  @relation(fields: [companyId], references: [id])
  designationId    String   @map("designation") @db.VarChar(140)
  employmentTypeId String   @map("employment_type") @db.VarChar(140)
  baseSalary       Decimal  @map("base_salary") @db.Decimal(21, 9)
  effectiveFrom    DateTime @map("effective_from") @db.Date
  effectiveTo      DateTime? @map("effective_to") @db.Date

  @@unique([companyId, designationId, employmentTypeId, effectiveFrom])
  @@index([companyId])
  @@map("timegate_compensation_grid")
}
```

- [ ] **Step 3: Add the `EmployeeCompensationItem` model**

```prisma
model EmployeeCompensationItem {
  id        String   @id @db.VarChar(140)
  createdAt DateTime @default(now()) @map("creation")
  updatedAt DateTime @updatedAt @map("modified")

  companyId     String              @map("company") @db.VarChar(140)
  employeeId    String              @map("employee") @db.VarChar(140)
  employee      Employee            @relation(fields: [employeeId], references: [id])
  label         String              @db.VarChar(200)
  kind          CompensationItemKind
  amount        Decimal             @db.Decimal(21, 9)
  isRecurring   Boolean             @default(true) @map("is_recurring")
  effectiveFrom DateTime            @map("effective_from") @db.Date
  effectiveTo   DateTime?           @map("effective_to") @db.Date
  isActive      Boolean             @default(true) @map("is_active")

  @@index([employeeId])
  @@index([companyId])
  @@map("timegate_employee_compensation_item")
}
```

- [ ] **Step 4: Add the `PayrollVariableItem` model**

```prisma
model PayrollVariableItem {
  id        String   @id @db.VarChar(140)
  createdAt DateTime @default(now()) @map("creation")

  companyId    String                @map("company") @db.VarChar(140)
  employeeId   String                @map("employee") @db.VarChar(140)
  employee     Employee              @relation(fields: [employeeId], references: [id])
  payrollRunId String?               @map("payroll_run") @db.VarChar(140)
  payrollRun   TimeGatePayrollRun?   @relation(fields: [payrollRunId], references: [id])
  label        String                @db.VarChar(200)
  kind         CompensationItemKind
  amount       Decimal               @db.Decimal(21, 9)
  source       PayrollVariableSource @default(MANUAL)
  notes        String?               @db.VarChar(500)

  @@index([payrollRunId])
  @@index([employeeId])
  @@map("timegate_payroll_variable_item")
}
```

- [ ] **Step 5: Extend `TimeGatePayrollLine` with detailed penalty and allowance fields**

Add these fields to the existing `TimeGatePayrollLine` model:

```prisma
  fixedAllowancesTotal    Decimal @default(0) @map("fixed_allowances_total") @db.Decimal(21, 9)
  fixedDeductionsTotal    Decimal @default(0) @map("fixed_deductions_total") @db.Decimal(21, 9)
  variableAllowancesTotal Decimal @default(0) @map("variable_allowances_total") @db.Decimal(21, 9)
  variableDeductionsTotal Decimal @default(0) @map("variable_deductions_total") @db.Decimal(21, 9)
  lateMinutesPenalty      Decimal @default(0) @map("late_minutes_penalty") @db.Decimal(21, 9)
  gross                   Decimal @default(0) @db.Decimal(21, 9)
  periodStart             DateTime? @map("period_start") @db.Date
  periodEnd               DateTime? @map("period_end") @db.Date
```

- [ ] **Step 6: Add relations to `Company`, `Employee`, and `TimeGatePayrollRun`**

In the `Company` model, add:
```prisma
  compensationGrids          CompensationGrid[]
  employeeCompensationItems  EmployeeCompensationItem[]
  payrollVariableItems       PayrollVariableItem[]
```

In the `Employee` model, add:
```prisma
  compensationItems  EmployeeCompensationItem[]
  payrollVariableItems PayrollVariableItem[]
```

In the `TimeGatePayrollRun` model, add:
```prisma
  variableItems PayrollVariableItem[]
```

- [ ] **Step 7: Generate and apply the migration**

Run:
```bash
cd api && npx prisma migrate dev --name add-compensation-grid-and-payroll-refactor
```
Expected: Migration created and applied successfully. Prisma Client regenerated.

- [ ] **Step 8: Commit**

```bash
git add api/prisma/
git commit -m "$(cat <<'EOF'
feat(schema): add CompensationGrid, EmployeeCompensationItem, PayrollVariableItem models

Introduces contractual base salary grid (designation × employment type),
recurring employee allowances/deductions, and per-run variable items.
Extends TimeGatePayrollLine with detailed breakdown fields.
EOF
)"
```

---

### Task 2: Compensation Grid API Module

**Files:**
- Create: `api/src/compensation-grid/dto/create-compensation-grid.dto.ts`
- Create: `api/src/compensation-grid/dto/update-compensation-grid.dto.ts`
- Create: `api/src/compensation-grid/dto/find-compensation-grid-query.dto.ts`
- Create: `api/src/compensation-grid/compensation-grid.service.ts`
- Create: `api/src/compensation-grid/compensation-grid.controller.ts`
- Create: `api/src/compensation-grid/compensation-grid.module.ts`
- Modify: `api/src/app.module.ts`

**Interfaces:**
- Consumes: `CompensationGrid` Prisma model from Task 1.
- Produces: REST endpoints `GET/POST /compensation-grid`, `GET/PATCH/DELETE /compensation-grid/:id`. Service method `findEffective(companyId, designationId, employmentTypeId, date): CompensationGrid | null` used by Task 5.

- [ ] **Step 1: Create the DTOs**

`api/src/compensation-grid/dto/create-compensation-grid.dto.ts`:
```typescript
import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateCompensationGridDto {
  @IsString() @IsNotEmpty() designationId: string;
  @IsString() @IsNotEmpty() employmentTypeId: string;
  @IsNumber() @Min(0) baseSalary: number;
  @IsDateString() effectiveFrom: string;
  @IsDateString() @IsOptional() effectiveTo?: string;
}
```

`api/src/compensation-grid/dto/update-compensation-grid.dto.ts`:
```typescript
import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateCompensationGridDto {
  @IsString() @IsOptional() designationId?: string;
  @IsString() @IsOptional() employmentTypeId?: string;
  @IsNumber() @Min(0) @IsOptional() baseSalary?: number;
  @IsDateString() @IsOptional() effectiveFrom?: string;
  @IsDateString() @IsOptional() effectiveTo?: string;
}
```

`api/src/compensation-grid/dto/find-compensation-grid-query.dto.ts`:
```typescript
import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class FindCompensationGridQueryDto extends PaginationQueryDto {
  @IsString() @IsOptional() designationId?: string;
  @IsString() @IsOptional() employmentTypeId?: string;
}
```

- [ ] **Step 2: Create the service**

`api/src/compensation-grid/compensation-grid.service.ts`:
```typescript
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtUser } from '../common/decorators/current-user.decorator';
import { generateDocId } from '../common/utils/doc-id.util';
import { toDecimal, fromDecimal } from '../common/utils/money.util';
import { PLATFORM_ADMIN } from '../common/constants/platform-admin';
import { CreateCompensationGridDto } from './dto/create-compensation-grid.dto';
import { UpdateCompensationGridDto } from './dto/update-compensation-grid.dto';
import { FindCompensationGridQueryDto } from './dto/find-compensation-grid-query.dto';

@Injectable()
export class CompensationGridService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCompensationGridDto, user: JwtUser) {
    const companyId = this.requireCompanyId(user);

    const overlap = await this.prisma.compensationGrid.findFirst({
      where: {
        companyId,
        designationId: dto.designationId,
        employmentTypeId: dto.employmentTypeId,
        effectiveFrom: { lte: dto.effectiveTo ? new Date(dto.effectiveTo) : undefined },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: new Date(dto.effectiveFrom) } },
        ],
      },
    });
    if (overlap) {
      throw new BadRequestException(
        'An overlapping compensation grid entry already exists for this designation/employment type combination',
      );
    }

    const entry = await this.prisma.compensationGrid.create({
      data: {
        id: generateDocId('CGRID'),
        companyId,
        designationId: dto.designationId,
        employmentTypeId: dto.employmentTypeId,
        baseSalary: toDecimal(dto.baseSalary),
        effectiveFrom: new Date(dto.effectiveFrom),
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
      },
    });

    return this.toShape(entry);
  }

  async findAll(query: FindCompensationGridQueryDto, user: JwtUser) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const companyId = this.resolveCompanyFilter(user);

    const where: Prisma.CompensationGridWhereInput = {
      ...(companyId ? { companyId } : {}),
      ...(query.designationId ? { designationId: query.designationId } : {}),
      ...(query.employmentTypeId ? { employmentTypeId: query.employmentTypeId } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.compensationGrid.findMany({
        where,
        orderBy: [{ effectiveFrom: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.compensationGrid.count({ where }),
    ]);

    return {
      data: items.map((r) => this.toShape(r)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string, user: JwtUser) {
    const entry = await this.prisma.compensationGrid.findUnique({ where: { id } });
    if (!entry) throw new NotFoundException('Compensation grid entry not found');
    this.assertCompanyAccess(user, entry.companyId);
    return this.toShape(entry);
  }

  async findEffective(
    companyId: string,
    designationId: string,
    employmentTypeId: string,
    date: Date,
  ) {
    return this.prisma.compensationGrid.findFirst({
      where: {
        companyId,
        designationId,
        employmentTypeId,
        effectiveFrom: { lte: date },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }],
      },
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  async update(id: string, dto: UpdateCompensationGridDto, user: JwtUser) {
    const existing = await this.prisma.compensationGrid.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Compensation grid entry not found');
    this.assertCompanyAccess(user, existing.companyId);

    const updated = await this.prisma.compensationGrid.update({
      where: { id },
      data: {
        ...(dto.designationId !== undefined ? { designationId: dto.designationId } : {}),
        ...(dto.employmentTypeId !== undefined ? { employmentTypeId: dto.employmentTypeId } : {}),
        ...(dto.baseSalary !== undefined ? { baseSalary: toDecimal(dto.baseSalary) } : {}),
        ...(dto.effectiveFrom !== undefined ? { effectiveFrom: new Date(dto.effectiveFrom) } : {}),
        ...(dto.effectiveTo !== undefined
          ? { effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null }
          : {}),
      },
    });

    return this.toShape(updated);
  }

  async remove(id: string, user: JwtUser) {
    const existing = await this.prisma.compensationGrid.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Compensation grid entry not found');
    this.assertCompanyAccess(user, existing.companyId);
    await this.prisma.compensationGrid.delete({ where: { id } });
    return { deleted: true };
  }

  private toShape(row: any) {
    return {
      id: row.id,
      companyId: row.companyId,
      designationId: row.designationId,
      employmentTypeId: row.employmentTypeId,
      baseSalary: fromDecimal(row.baseSalary),
      effectiveFrom: row.effectiveFrom?.toISOString?.() ?? row.effectiveFrom,
      effectiveTo: row.effectiveTo?.toISOString?.() ?? null,
      createdAt: row.createdAt?.toISOString?.() ?? row.createdAt,
      updatedAt: row.updatedAt?.toISOString?.() ?? row.updatedAt,
    };
  }

  private requireCompanyId(user: JwtUser): string {
    if (user.role === PLATFORM_ADMIN) {
      throw new BadRequestException('Super admin must specify company via a dedicated flow');
    }
    if (!user.companyId) throw new BadRequestException('User not linked to a company');
    return user.companyId;
  }

  private resolveCompanyFilter(user: JwtUser): string | undefined {
    if (user.role === PLATFORM_ADMIN) return undefined;
    return user.companyId ?? undefined;
  }

  private assertCompanyAccess(user: JwtUser, companyId: string) {
    if (user.role === PLATFORM_ADMIN) return;
    if (!user.companyId || user.companyId !== companyId) {
      throw new ForbiddenException('Access denied');
    }
  }
}
```

- [ ] **Step 3: Create the controller**

`api/src/compensation-grid/compensation-grid.controller.ts`:
```typescript
import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query,
} from '@nestjs/common';
import { TimeGateUserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { CompensationGridService } from './compensation-grid.service';
import { CreateCompensationGridDto } from './dto/create-compensation-grid.dto';
import { UpdateCompensationGridDto } from './dto/update-compensation-grid.dto';
import { FindCompensationGridQueryDto } from './dto/find-compensation-grid-query.dto';

@Controller('compensation-grid')
export class CompensationGridController {
  constructor(private readonly service: CompensationGridService) {}

  @Post()
  @Roles(TimeGateUserRole.ADMIN)
  create(@Body() dto: CreateCompensationGridDto, @CurrentUser() user: JwtUser) {
    return this.service.create(dto, user);
  }

  @Get()
  findAll(@Query() query: FindCompensationGridQueryDto, @CurrentUser() user: JwtUser) {
    return this.service.findAll(query, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.service.findOne(id, user);
  }

  @Patch(':id')
  @Roles(TimeGateUserRole.ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCompensationGridDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(TimeGateUserRole.ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.service.remove(id, user);
  }
}
```

- [ ] **Step 4: Create the module and register it**

`api/src/compensation-grid/compensation-grid.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { CompensationGridService } from './compensation-grid.service';
import { CompensationGridController } from './compensation-grid.controller';

@Module({
  controllers: [CompensationGridController],
  providers: [CompensationGridService],
  exports: [CompensationGridService],
})
export class CompensationGridModule {}
```

In `api/src/app.module.ts`, add `CompensationGridModule` to `imports`.

- [ ] **Step 5: Verify compilation**

Run:
```bash
cd api && npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add api/src/compensation-grid/ api/src/app.module.ts
git commit -m "$(cat <<'EOF'
feat(api): add compensation-grid CRUD module

REST endpoints for managing base salary by designation × employment type
with effective date ranges and overlap validation.
EOF
)"
```

---

### Task 3: Employee Compensation Items API Module

**Files:**
- Create: `api/src/employee-compensation/dto/create-employee-compensation-item.dto.ts`
- Create: `api/src/employee-compensation/dto/update-employee-compensation-item.dto.ts`
- Create: `api/src/employee-compensation/employee-compensation.service.ts`
- Create: `api/src/employee-compensation/employee-compensation.controller.ts`
- Create: `api/src/employee-compensation/employee-compensation.module.ts`
- Modify: `api/src/app.module.ts`

**Interfaces:**
- Consumes: `EmployeeCompensationItem` Prisma model from Task 1.
- Produces: REST endpoints scoped under `/employees/:employeeId/compensation-items`. Service method `findActiveForEmployee(companyId, employeeId, date): EmployeeCompensationItem[]` used by Task 5.

- [ ] **Step 1: Create the DTOs**

`api/src/employee-compensation/dto/create-employee-compensation-item.dto.ts`:
```typescript
import {
  IsBoolean, IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min,
} from 'class-validator';
import { CompensationItemKind } from '@prisma/client';

export class CreateEmployeeCompensationItemDto {
  @IsString() @IsNotEmpty() label: string;
  @IsEnum(CompensationItemKind) kind: CompensationItemKind;
  @IsNumber() @Min(0) amount: number;
  @IsBoolean() @IsOptional() isRecurring?: boolean;
  @IsDateString() effectiveFrom: string;
  @IsDateString() @IsOptional() effectiveTo?: string;
}
```

`api/src/employee-compensation/dto/update-employee-compensation-item.dto.ts`:
```typescript
import {
  IsBoolean, IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min,
} from 'class-validator';
import { CompensationItemKind } from '@prisma/client';

export class UpdateEmployeeCompensationItemDto {
  @IsString() @IsOptional() label?: string;
  @IsEnum(CompensationItemKind) @IsOptional() kind?: CompensationItemKind;
  @IsNumber() @Min(0) @IsOptional() amount?: number;
  @IsBoolean() @IsOptional() isRecurring?: boolean;
  @IsBoolean() @IsOptional() isActive?: boolean;
  @IsDateString() @IsOptional() effectiveFrom?: string;
  @IsDateString() @IsOptional() effectiveTo?: string;
}
```

- [ ] **Step 2: Create the service**

`api/src/employee-compensation/employee-compensation.service.ts`:
```typescript
import {
  ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import { CompensationItemKind, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtUser } from '../common/decorators/current-user.decorator';
import { generateDocId } from '../common/utils/doc-id.util';
import { toDecimal, fromDecimal } from '../common/utils/money.util';
import { PLATFORM_ADMIN } from '../common/constants/platform-admin';
import { CreateEmployeeCompensationItemDto } from './dto/create-employee-compensation-item.dto';
import { UpdateEmployeeCompensationItemDto } from './dto/update-employee-compensation-item.dto';

@Injectable()
export class EmployeeCompensationService {
  constructor(private prisma: PrismaService) {}

  async create(employeeId: string, dto: CreateEmployeeCompensationItemDto, user: JwtUser) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, companyId: true },
    });
    if (!employee) throw new NotFoundException('Employee not found');
    this.assertCompanyAccess(user, employee.companyId);

    const item = await this.prisma.employeeCompensationItem.create({
      data: {
        id: generateDocId('ECITEM'),
        companyId: employee.companyId,
        employeeId,
        label: dto.label,
        kind: dto.kind,
        amount: toDecimal(dto.amount),
        isRecurring: dto.isRecurring ?? true,
        effectiveFrom: new Date(dto.effectiveFrom),
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
      },
    });

    return this.toShape(item);
  }

  async findAllForEmployee(employeeId: string, user: JwtUser) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, companyId: true },
    });
    if (!employee) throw new NotFoundException('Employee not found');
    this.assertCompanyAccess(user, employee.companyId);

    const items = await this.prisma.employeeCompensationItem.findMany({
      where: { employeeId },
      orderBy: { effectiveFrom: 'desc' },
    });

    return items.map((i) => this.toShape(i));
  }

  async findActiveForEmployee(companyId: string, employeeId: string, date: Date) {
    return this.prisma.employeeCompensationItem.findMany({
      where: {
        companyId,
        employeeId,
        isActive: true,
        isRecurring: true,
        effectiveFrom: { lte: date },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }],
      },
    });
  }

  async update(id: string, dto: UpdateEmployeeCompensationItemDto, user: JwtUser) {
    const item = await this.prisma.employeeCompensationItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Compensation item not found');
    this.assertCompanyAccess(user, item.companyId);

    const updated = await this.prisma.employeeCompensationItem.update({
      where: { id },
      data: {
        ...(dto.label !== undefined ? { label: dto.label } : {}),
        ...(dto.kind !== undefined ? { kind: dto.kind } : {}),
        ...(dto.amount !== undefined ? { amount: toDecimal(dto.amount) } : {}),
        ...(dto.isRecurring !== undefined ? { isRecurring: dto.isRecurring } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.effectiveFrom !== undefined ? { effectiveFrom: new Date(dto.effectiveFrom) } : {}),
        ...(dto.effectiveTo !== undefined
          ? { effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null }
          : {}),
      },
    });

    return this.toShape(updated);
  }

  async remove(id: string, user: JwtUser) {
    const item = await this.prisma.employeeCompensationItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Compensation item not found');
    this.assertCompanyAccess(user, item.companyId);
    await this.prisma.employeeCompensationItem.delete({ where: { id } });
    return { deleted: true };
  }

  private toShape(row: any) {
    return {
      id: row.id,
      companyId: row.companyId,
      employeeId: row.employeeId,
      label: row.label,
      kind: row.kind,
      amount: fromDecimal(row.amount),
      isRecurring: row.isRecurring,
      effectiveFrom: row.effectiveFrom?.toISOString?.() ?? row.effectiveFrom,
      effectiveTo: row.effectiveTo?.toISOString?.() ?? null,
      isActive: row.isActive,
      createdAt: row.createdAt?.toISOString?.() ?? row.createdAt,
      updatedAt: row.updatedAt?.toISOString?.() ?? row.updatedAt,
    };
  }

  private assertCompanyAccess(user: JwtUser, companyId: string) {
    if (user.role === PLATFORM_ADMIN) return;
    if (!user.companyId || user.companyId !== companyId) {
      throw new ForbiddenException('Access denied');
    }
  }
}
```

- [ ] **Step 3: Create the controller**

`api/src/employee-compensation/employee-compensation.controller.ts`:
```typescript
import {
  Body, Controller, Delete, Get, Param, Patch, Post,
} from '@nestjs/common';
import { TimeGateUserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { EmployeeCompensationService } from './employee-compensation.service';
import { CreateEmployeeCompensationItemDto } from './dto/create-employee-compensation-item.dto';
import { UpdateEmployeeCompensationItemDto } from './dto/update-employee-compensation-item.dto';

@Controller('employees/:employeeId/compensation-items')
export class EmployeeCompensationController {
  constructor(private readonly service: EmployeeCompensationService) {}

  @Post()
  @Roles(TimeGateUserRole.ADMIN)
  create(
    @Param('employeeId') employeeId: string,
    @Body() dto: CreateEmployeeCompensationItemDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.create(employeeId, dto, user);
  }

  @Get()
  findAll(
    @Param('employeeId') employeeId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.findAllForEmployee(employeeId, user);
  }

  @Patch(':id')
  @Roles(TimeGateUserRole.ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateEmployeeCompensationItemDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(TimeGateUserRole.ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.service.remove(id, user);
  }
}
```

- [ ] **Step 4: Create the module and register it**

`api/src/employee-compensation/employee-compensation.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { EmployeeCompensationService } from './employee-compensation.service';
import { EmployeeCompensationController } from './employee-compensation.controller';

@Module({
  controllers: [EmployeeCompensationController],
  providers: [EmployeeCompensationService],
  exports: [EmployeeCompensationService],
})
export class EmployeeCompensationModule {}
```

Register `EmployeeCompensationModule` in `api/src/app.module.ts`.

- [ ] **Step 5: Verify compilation**

Run:
```bash
cd api && npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add api/src/employee-compensation/ api/src/app.module.ts
git commit -m "$(cat <<'EOF'
feat(api): add employee compensation items CRUD

Recurring allowances/deductions per employee with effective date ranges,
scoped under /employees/:id/compensation-items.
EOF
)"
```

---

### Task 4: Payroll Variable Items API Module

**Files:**
- Create: `api/src/payroll-variable-items/dto/create-payroll-variable-item.dto.ts`
- Create: `api/src/payroll-variable-items/payroll-variable-items.service.ts`
- Create: `api/src/payroll-variable-items/payroll-variable-items.controller.ts`
- Create: `api/src/payroll-variable-items/payroll-variable-items.module.ts`
- Modify: `api/src/app.module.ts`

**Interfaces:**
- Consumes: `PayrollVariableItem` Prisma model from Task 1.
- Produces: REST endpoints under `/payroll-runs/:runId/variable-items`. Service method `findForRun(runId): PayrollVariableItem[]` used by Task 5.

- [ ] **Step 1: Create the DTO**

`api/src/payroll-variable-items/dto/create-payroll-variable-item.dto.ts`:
```typescript
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { CompensationItemKind } from '@prisma/client';

export class CreatePayrollVariableItemDto {
  @IsString() @IsNotEmpty() employeeId: string;
  @IsString() @IsNotEmpty() label: string;
  @IsEnum(CompensationItemKind) kind: CompensationItemKind;
  @IsNumber() @Min(0) amount: number;
  @IsString() @IsOptional() notes?: string;
}
```

- [ ] **Step 2: Create the service**

`api/src/payroll-variable-items/payroll-variable-items.service.ts`:
```typescript
import {
  BadRequestException, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import { CompensationItemKind, TimeGatePayrollRunStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { JwtUser } from '../common/decorators/current-user.decorator';
import { generateDocId } from '../common/utils/doc-id.util';
import { toDecimal, fromDecimal } from '../common/utils/money.util';
import { PLATFORM_ADMIN } from '../common/constants/platform-admin';
import { CreatePayrollVariableItemDto } from './dto/create-payroll-variable-item.dto';

@Injectable()
export class PayrollVariableItemsService {
  constructor(private prisma: PrismaService) {}

  async create(runId: string, dto: CreatePayrollVariableItemDto, user: JwtUser) {
    const run = await this.prisma.timeGatePayrollRun.findUnique({ where: { id: runId } });
    if (!run) throw new NotFoundException('Payroll run not found');
    this.assertCompanyAccess(user, run.companyId);
    if (run.status !== TimeGatePayrollRunStatus.DRAFT) {
      throw new BadRequestException('Can only add variable items to DRAFT runs');
    }

    const item = await this.prisma.payrollVariableItem.create({
      data: {
        id: generateDocId('PVITEM'),
        companyId: run.companyId,
        employeeId: dto.employeeId,
        payrollRunId: runId,
        label: dto.label,
        kind: dto.kind,
        amount: toDecimal(dto.amount),
        source: 'MANUAL',
        notes: dto.notes ?? null,
      },
    });

    return this.toShape(item);
  }

  async findForRun(runId: string, user: JwtUser) {
    const run = await this.prisma.timeGatePayrollRun.findUnique({ where: { id: runId } });
    if (!run) throw new NotFoundException('Payroll run not found');
    this.assertCompanyAccess(user, run.companyId);

    const items = await this.prisma.payrollVariableItem.findMany({
      where: { payrollRunId: runId },
      orderBy: { createdAt: 'desc' },
    });

    return items.map((i) => this.toShape(i));
  }

  async remove(id: string, user: JwtUser) {
    const item = await this.prisma.payrollVariableItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Variable item not found');
    this.assertCompanyAccess(user, item.companyId);

    if (item.payrollRunId) {
      const run = await this.prisma.timeGatePayrollRun.findUnique({
        where: { id: item.payrollRunId },
      });
      if (run && run.status !== TimeGatePayrollRunStatus.DRAFT) {
        throw new BadRequestException('Cannot remove items from a non-DRAFT run');
      }
    }

    await this.prisma.payrollVariableItem.delete({ where: { id } });
    return { deleted: true };
  }

  private toShape(row: any) {
    return {
      id: row.id,
      companyId: row.companyId,
      employeeId: row.employeeId,
      payrollRunId: row.payrollRunId,
      label: row.label,
      kind: row.kind,
      amount: fromDecimal(row.amount),
      source: row.source,
      notes: row.notes,
      createdAt: row.createdAt?.toISOString?.() ?? row.createdAt,
    };
  }

  private assertCompanyAccess(user: JwtUser, companyId: string) {
    if (user.role === PLATFORM_ADMIN) return;
    if (!user.companyId || user.companyId !== companyId) {
      throw new ForbiddenException('Access denied');
    }
  }
}
```

- [ ] **Step 3: Create the controller**

`api/src/payroll-variable-items/payroll-variable-items.controller.ts`:
```typescript
import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { TimeGateUserRole } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';
import { PayrollVariableItemsService } from './payroll-variable-items.service';
import { CreatePayrollVariableItemDto } from './dto/create-payroll-variable-item.dto';

@Controller('payroll-runs/:runId/variable-items')
export class PayrollVariableItemsController {
  constructor(private readonly service: PayrollVariableItemsService) {}

  @Post()
  @Roles(TimeGateUserRole.ADMIN)
  create(
    @Param('runId') runId: string,
    @Body() dto: CreatePayrollVariableItemDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.service.create(runId, dto, user);
  }

  @Get()
  findAll(@Param('runId') runId: string, @CurrentUser() user: JwtUser) {
    return this.service.findForRun(runId, user);
  }

  @Delete(':id')
  @Roles(TimeGateUserRole.ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: JwtUser) {
    return this.service.remove(id, user);
  }
}
```

- [ ] **Step 4: Create the module and register it**

`api/src/payroll-variable-items/payroll-variable-items.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { PayrollVariableItemsService } from './payroll-variable-items.service';
import { PayrollVariableItemsController } from './payroll-variable-items.controller';

@Module({
  controllers: [PayrollVariableItemsController],
  providers: [PayrollVariableItemsService],
  exports: [PayrollVariableItemsService],
})
export class PayrollVariableItemsModule {}
```

Register `PayrollVariableItemsModule` in `api/src/app.module.ts`.

- [ ] **Step 5: Verify compilation**

Run:
```bash
cd api && npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add api/src/payroll-variable-items/ api/src/app.module.ts
git commit -m "$(cat <<'EOF'
feat(api): add payroll variable items (monthly primes/deductions per run)

Manual one-off allowances/deductions attached to a DRAFT payroll run,
scoped under /payroll-runs/:runId/variable-items.
EOF
)"
```

---

### Task 5: Refactor `generateLines()` to Use New Compensation Sources

**Files:**
- Modify: `api/src/payroll-runs/payroll-runs.service.ts`
- Modify: `api/src/payroll-runs/payroll-runs.module.ts`

**Interfaces:**
- Consumes: `CompensationGridService.findEffective()` from Task 2, `EmployeeCompensationService.findActiveForEmployee()` from Task 3, `PayrollVariableItem` Prisma model from Task 4.
- Produces: Updated `TimeGatePayrollLine` rows with all new breakdown fields populated.

- [ ] **Step 1: Import new modules into PayrollRunsModule**

In `api/src/payroll-runs/payroll-runs.module.ts`, add:
```typescript
import { CompensationGridModule } from '../compensation-grid/compensation-grid.module';
import { EmployeeCompensationModule } from '../employee-compensation/employee-compensation.module';

@Module({
  imports: [CompensationGridModule, EmployeeCompensationModule],
  // ... rest unchanged
})
```

- [ ] **Step 2: Inject services into PayrollRunsService**

In the constructor of `PayrollRunsService`:
```typescript
import { CompensationGridService } from '../compensation-grid/compensation-grid.service';
import { EmployeeCompensationService } from '../employee-compensation/employee-compensation.service';

constructor(
  private prisma: PrismaService,
  private compensationGrid: CompensationGridService,
  private employeeCompensation: EmployeeCompensationService,
) {}
```

- [ ] **Step 3: Rewrite `generateLines()` with the new calculation logic**

Replace the entire `private async generateLines(...)` method:

```typescript
private async generateLines(
  payrollRunId: string,
  companyId: string,
  year: number,
  month: number,
) {
  const { from, to } = this.monthBounds(year, month);

  const employees = await this.prisma.employee.findMany({
    where: { companyId, status: EmployeeStatus.ACTIVE },
    select: { id: true, ctc: true, designationId: true, employmentTypeId: true },
  });

  if (!employees.length) return;

  const employeeIds = employees.map((e) => e.id);

  const [timesheets, absences, variableItems] = await Promise.all([
    this.prisma.timeGateTimesheetDay.findMany({
      where: {
        companyId,
        employeeId: { in: employeeIds },
        workDate: { gte: from, lte: to },
      },
      select: { employeeId: true, lateMinutes: true, overtimeMinutes: true },
    }),
    this.prisma.timeGateAbsenceRecord.findMany({
      where: {
        companyId,
        employeeId: { in: employeeIds },
        recordDate: { gte: from, lte: to },
        justified: false,
      },
      select: { employeeId: true },
    }),
    this.prisma.payrollVariableItem.findMany({
      where: { payrollRunId, companyId },
    }),
  ]);

  const timesheetByEmployee = new Map<string, { lateMinutes: number; overtimeMinutes: number }>();
  for (const row of timesheets) {
    const bucket = timesheetByEmployee.get(row.employeeId) ?? { lateMinutes: 0, overtimeMinutes: 0 };
    bucket.lateMinutes += row.lateMinutes;
    bucket.overtimeMinutes += row.overtimeMinutes;
    timesheetByEmployee.set(row.employeeId, bucket);
  }

  const absenceCountByEmployee = new Map<string, number>();
  for (const row of absences) {
    absenceCountByEmployee.set(row.employeeId, (absenceCountByEmployee.get(row.employeeId) ?? 0) + 1);
  }

  const variableByEmployee = new Map<string, typeof variableItems>();
  for (const item of variableItems) {
    const list = variableByEmployee.get(item.employeeId) ?? [];
    list.push(item);
    variableByEmployee.set(item.employeeId, list);
  }

  const hourlyRate = (base: number) => (base > 0 ? base / MONTHLY_HOURS : 0);
  const dailyRate = (base: number) => (base > 0 ? base / WORKING_DAYS_PER_MONTH : 0);

  const lineData = await Promise.all(
    employees.map(async (employee) => {
      // 1. Base salary from compensation grid (fallback: ctc/12, then 0)
      let baseSalary = 0;
      if (employee.designationId && employee.employmentTypeId) {
        const grid = await this.compensationGrid.findEffective(
          companyId,
          employee.designationId,
          employee.employmentTypeId,
          to,
        );
        if (grid) baseSalary = fromDecimal(grid.baseSalary);
      }
      if (baseSalary === 0 && employee.ctc) {
        baseSalary = roundMoney(Number(employee.ctc) / 12);
      }

      // 2. Fixed employee allowances/deductions
      const fixedItems = await this.employeeCompensation.findActiveForEmployee(
        companyId,
        employee.id,
        to,
      );
      let fixedAllowancesTotal = 0;
      let fixedDeductionsTotal = 0;
      for (const item of fixedItems) {
        const amt = fromDecimal(item.amount);
        if (item.kind === 'ALLOWANCE') fixedAllowancesTotal += amt;
        else fixedDeductionsTotal += amt;
      }
      fixedAllowancesTotal = roundMoney(fixedAllowancesTotal);
      fixedDeductionsTotal = roundMoney(fixedDeductionsTotal);

      // 3. Variable items for this run
      const vars = variableByEmployee.get(employee.id) ?? [];
      let variableAllowancesTotal = 0;
      let variableDeductionsTotal = 0;
      for (const v of vars) {
        const amt = fromDecimal(v.amount);
        if (v.kind === 'ALLOWANCE') variableAllowancesTotal += amt;
        else variableDeductionsTotal += amt;
      }
      variableAllowancesTotal = roundMoney(variableAllowancesTotal);
      variableDeductionsTotal = roundMoney(variableDeductionsTotal);

      // 4. Penalties (late + absences)
      const ts = timesheetByEmployee.get(employee.id);
      const lateMinutes = ts?.lateMinutes ?? 0;
      const overtimeMinutes = ts?.overtimeMinutes ?? 0;
      const unjustifiedAbsences = absenceCountByEmployee.get(employee.id) ?? 0;

      const rate = hourlyRate(baseSalary);
      const overtimeAmount = roundMoney((overtimeMinutes / 60) * rate);
      const lateMinutesPenalty = roundMoney((lateMinutes / 60) * rate * 0.5);
      const absenceAmount = roundMoney(unjustifiedAbsences * dailyRate(baseSalary));
      const penaltyAmount = roundMoney(lateMinutesPenalty + absenceAmount);

      // 5. Totals
      const bonusAmount = roundMoney(fixedAllowancesTotal + variableAllowancesTotal);
      const totalDeductions = roundMoney(fixedDeductionsTotal + variableDeductionsTotal);
      const gross = roundMoney(baseSalary + bonusAmount + overtimeAmount);
      const netSalary = roundMoney(gross - penaltyAmount - totalDeductions);

      return {
        id: generateDocId('PLINE'),
        payrollRunId,
        companyId,
        employeeId: employee.id,
        baseSalary: toDecimal(baseSalary),
        overtimeAmount: toDecimal(overtimeAmount),
        penaltyAmount: toDecimal(penaltyAmount),
        absenceAmount: toDecimal(absenceAmount),
        bonusAmount: toDecimal(bonusAmount),
        netSalary: toDecimal(netSalary),
        fixedAllowancesTotal: toDecimal(fixedAllowancesTotal),
        fixedDeductionsTotal: toDecimal(fixedDeductionsTotal),
        variableAllowancesTotal: toDecimal(variableAllowancesTotal),
        variableDeductionsTotal: toDecimal(variableDeductionsTotal),
        lateMinutesPenalty: toDecimal(lateMinutesPenalty),
        gross: toDecimal(gross),
        periodStart: from,
        periodEnd: to,
        explainJson: {
          ruleVersion: RULE_VERSION,
          lateMinutes,
          overtimeMinutes,
          unjustifiedAbsences,
          hourlyRate: roundMoney(rate),
          fixedItems: fixedItems.map((i) => ({
            label: i.label,
            kind: i.kind,
            amount: fromDecimal(i.amount),
          })),
          variableItems: vars.map((v) => ({
            label: v.label,
            kind: v.kind,
            amount: fromDecimal(v.amount),
          })),
        },
      };
    }),
  );

  await this.prisma.timeGatePayrollLine.createMany({ data: lineData });
}
```

- [ ] **Step 4: Update `toLineShape` to include new fields**

```typescript
private toLineShape(row: PayrollLineRow) {
  return {
    id: row.id,
    payrollRunId: row.payrollRunId,
    companyId: row.companyId,
    employeeId: row.employeeId,
    baseSalary: fromDecimal(row.baseSalary),
    overtimeAmount: fromDecimal(row.overtimeAmount),
    penaltyAmount: fromDecimal(row.penaltyAmount),
    absenceAmount: fromDecimal(row.absenceAmount),
    bonusAmount: fromDecimal(row.bonusAmount),
    netSalary: fromDecimal(row.netSalary),
    fixedAllowancesTotal: fromDecimal(row.fixedAllowancesTotal),
    fixedDeductionsTotal: fromDecimal(row.fixedDeductionsTotal),
    variableAllowancesTotal: fromDecimal(row.variableAllowancesTotal),
    variableDeductionsTotal: fromDecimal(row.variableDeductionsTotal),
    lateMinutesPenalty: fromDecimal(row.lateMinutesPenalty),
    gross: fromDecimal(row.gross),
    periodStart: row.periodStart?.toISOString?.() ?? null,
    periodEnd: row.periodEnd?.toISOString?.() ?? null,
    explainJson: row.explainJson,
    createdAt: row.createdAt.toISOString(),
    employee: toEmployeeSummary(row.employee) ?? undefined,
  };
}
```

- [ ] **Step 5: Add `designationId` and `employmentTypeId` to employee select in `generateLines`**

Already done in Step 3 — the employee query now selects `designationId` and `employmentTypeId`. Verify these fields exist on the `Employee` model (they do: `designationId` and `employmentTypeId` are existing fields).

- [ ] **Step 6: Verify compilation**

Run:
```bash
cd api && npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add api/src/payroll-runs/
git commit -m "$(cat <<'EOF'
feat(api): refactor generateLines to use compensation grid + fixed/variable items

Base salary now resolved from CompensationGrid (designation × employment type),
with fallback to employee.ctc/12. Payroll lines include detailed breakdown:
fixed allowances, variable items, late penalties, absence deductions.
EOF
)"
```

---

### Task 6: Dashboard — Compensation Grid Pages

**Files:**
- Create: `dashboard/components/timegate/CompensationGridForm.tsx`
- Create: `dashboard/app/(authenticated)/compensation-grid/page.tsx`
- Create: `dashboard/app/(authenticated)/compensation-grid/new/page.tsx`
- Create: `dashboard/app/(authenticated)/compensation-grid/[id]/edit/page.tsx`
- Modify: `dashboard/lib/navigation.ts`

**Interfaces:**
- Consumes: API `GET/POST/PATCH/DELETE /compensation-grid` from Task 2.
- Produces: Full CRUD UI for compensation grid entries.

- [ ] **Step 1: Create the form component**

`dashboard/components/timegate/CompensationGridForm.tsx`:

Build a form with fields: designation (select from `/designations`), employment type (select from `/employment-types`), base salary (NumberInput), effective from (DatePicker), effective to (DatePicker, optional). Follow existing form patterns (e.g., `EmployeeForm.tsx`): use `useState` for each field, `handleSubmit` calling the API, show validation errors.

```tsx
'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useApi } from '@/lib/api';
import { NumberInput } from '@/components/ui/NumberInput';
import { DatePicker } from '@/components/ui/DatePicker';
import { SelectSearch } from '@/components/ui/SelectSearch';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';

interface Props {
  initialData?: {
    id: string;
    designationId: string;
    employmentTypeId: string;
    baseSalary: number;
    effectiveFrom: string;
    effectiveTo: string | null;
  };
}

export function CompensationGridForm({ initialData }: Props) {
  const router = useRouter();
  const api = useApi();
  const isEdit = !!initialData;

  const [designationId, setDesignationId] = useState(initialData?.designationId ?? '');
  const [employmentTypeId, setEmploymentTypeId] = useState(initialData?.employmentTypeId ?? '');
  const [baseSalary, setBaseSalary] = useState(initialData?.baseSalary ?? 0);
  const [effectiveFrom, setEffectiveFrom] = useState(initialData?.effectiveFrom ?? '');
  const [effectiveTo, setEffectiveTo] = useState(initialData?.effectiveTo ?? '');
  const [designations, setDesignations] = useState<{ value: string; label: string }[]>([]);
  const [employmentTypes, setEmploymentTypes] = useState<{ value: string; label: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/designations?limit=200').then((res) => {
      setDesignations(
        (res.data?.data ?? []).map((d: any) => ({
          value: d.id ?? d.designationName,
          label: d.designationName,
        })),
      );
    });
    api.get('/employment-types?limit=200').then((res) => {
      setEmploymentTypes(
        (res.data?.data ?? []).map((t: any) => ({
          value: t.id ?? t.employeeTypeName,
          label: t.employeeTypeName,
        })),
      );
    });
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        designationId,
        employmentTypeId,
        baseSalary,
        effectiveFrom,
        ...(effectiveTo ? { effectiveTo } : {}),
      };
      if (isEdit) {
        await api.patch(`/compensation-grid/${initialData.id}`, payload);
        toast.success('Grille mise à jour');
      } else {
        await api.post('/compensation-grid', payload);
        toast.success('Entrée créée');
      }
      router.push('/compensation-grid');
      router.refresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Erreur');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
      <SelectSearch
        label="Poste"
        options={designations}
        value={designationId}
        onChange={setDesignationId}
        required
      />
      <SelectSearch
        label="Type de contrat"
        options={employmentTypes}
        value={employmentTypeId}
        onChange={setEmploymentTypeId}
        required
      />
      <NumberInput
        label="Salaire de base"
        value={baseSalary}
        onChange={setBaseSalary}
        min={0}
        required
      />
      <DatePicker
        label="Effectif depuis"
        value={effectiveFrom}
        onChange={setEffectiveFrom}
        required
      />
      <DatePicker
        label="Effectif jusqu'au"
        value={effectiveTo}
        onChange={setEffectiveTo}
      />
      <Button type="submit" loading={saving}>
        {isEdit ? 'Mettre à jour' : 'Créer'}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Create the list page**

`dashboard/app/(authenticated)/compensation-grid/page.tsx`:

Standard list page following existing patterns (e.g., `salaries/page.tsx`). DataTable with columns: Poste, Type contrat, Salaire de base, Effectif depuis, Effectif jusqu'au. Actions: edit, delete. PageHeader with "Nouvelle entrée" button.

- [ ] **Step 3: Create the new/edit pages**

`dashboard/app/(authenticated)/compensation-grid/new/page.tsx`: Renders `<CompensationGridForm />`.

`dashboard/app/(authenticated)/compensation-grid/[id]/edit/page.tsx`: Fetches existing entry, renders `<CompensationGridForm initialData={...} />`.

- [ ] **Step 4: Update navigation**

In `dashboard/lib/navigation.ts`, replace the "Rémunérations de base" (`/salaries`) entry:

```typescript
{
  label: 'Grille de rémunération',
  href: '/compensation-grid',
  faIcon: 'fa-solid fa-table-cells',
},
```

Keep the `Cycles de paie` entry unchanged.

- [ ] **Step 5: Verify the pages render**

Run:
```bash
cd dashboard && npm run build
```
Expected: Build succeeds with no errors.

- [ ] **Step 6: Commit**

```bash
git add dashboard/components/timegate/CompensationGridForm.tsx dashboard/app/\(authenticated\)/compensation-grid/ dashboard/lib/navigation.ts
git commit -m "$(cat <<'EOF'
feat(dashboard): add compensation grid CRUD pages

List, create, edit pages for the base salary grid (designation × contract type).
Replaces "Rémunérations de base" nav entry with "Grille de rémunération".
EOF
)"
```

---

### Task 7: Dashboard — Employee Compensation Tab

**Files:**
- Create: `dashboard/components/timegate/EmployeeCompensationItemForm.tsx`
- Modify: `dashboard/app/(authenticated)/employees/[id]/page.tsx`

**Interfaces:**
- Consumes: API `GET/POST/PATCH/DELETE /employees/:id/compensation-items` from Task 3.
- Produces: Inline CRUD for employee fixed allowances/deductions on the employee detail page.

- [ ] **Step 1: Create the form component**

`dashboard/components/timegate/EmployeeCompensationItemForm.tsx`:

Inline form/modal with: label (text), kind (select: ALLOWANCE/DEDUCTION), amount (NumberInput), effectiveFrom (DatePicker), effectiveTo (DatePicker optional). Follow the pattern used for schedule-day-exceptions in `shift-types/[id]/page.tsx`.

- [ ] **Step 2: Add a "Compensation" tab/section to employee detail page**

In `dashboard/app/(authenticated)/employees/[id]/page.tsx`, add a new `FormTabs` tab titled "Rémunération" that:
1. Fetches items from `GET /employees/${id}/compensation-items` on mount.
2. Displays them in a table (label, type, montant, depuis, jusqu'au, actions).
3. "Ajouter" button opens the inline form.
4. Edit/delete actions per row.

- [ ] **Step 3: Verify the page renders**

Run:
```bash
cd dashboard && npm run build
```
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add dashboard/components/timegate/EmployeeCompensationItemForm.tsx dashboard/app/\(authenticated\)/employees/
git commit -m "$(cat <<'EOF'
feat(dashboard): add employee compensation items tab

Inline CRUD for recurring allowances/deductions on the employee detail page,
under a new "Rémunération" tab.
EOF
)"
```

---

### Task 8: Dashboard — Payroll Run Variable Items & Detailed Breakdown

**Files:**
- Create: `dashboard/components/timegate/PayrollVariableItemForm.tsx`
- Modify: `dashboard/app/(authenticated)/payroll-runs/[id]/page.tsx`
- Modify: `dashboard/app/(authenticated)/payroll-runs/new/page.tsx`

**Interfaces:**
- Consumes: API `GET/POST/DELETE /payroll-runs/:runId/variable-items` from Task 4, updated `findLines` response from Task 5.
- Produces: UI for adding variable items to DRAFT runs and viewing the detailed payroll breakdown.

- [ ] **Step 1: Create the variable item form component**

`dashboard/components/timegate/PayrollVariableItemForm.tsx`:

Inline form: employee (select), label (text), kind (ALLOWANCE/DEDUCTION), amount (NumberInput), notes (textarea optional).

- [ ] **Step 2: Update payroll run detail page**

In `dashboard/app/(authenticated)/payroll-runs/[id]/page.tsx`:

1. If run is DRAFT, show a section "Éléments variables" with the list of variable items + "Ajouter" form.
2. Update the payroll lines table to show the new breakdown columns: Base, Majorations fixes, Variables, Retards, Absences, HS, Brut, Net.
3. Each line can be expanded to show `explainJson` details.

- [ ] **Step 3: Update payroll run creation page**

In `dashboard/app/(authenticated)/payroll-runs/new/page.tsx`, after the run is created (DRAFT), redirect to the detail page where variable items can be added before locking.

- [ ] **Step 4: Verify the pages render**

Run:
```bash
cd dashboard && npm run build
```
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add dashboard/components/timegate/PayrollVariableItemForm.tsx dashboard/app/\(authenticated\)/payroll-runs/
git commit -m "$(cat <<'EOF'
feat(dashboard): variable items UI + detailed payroll breakdown

DRAFT runs show variable items editor. Payroll lines table now displays
full breakdown: base, fixed allowances, variable items, penalties, gross, net.
EOF
)"
```

---

### Task 9: Legacy Salary Pages — Read-Only + Deprecation Notice

**Files:**
- Modify: `dashboard/app/(authenticated)/salaries/page.tsx`
- Modify: `dashboard/app/(authenticated)/salaries/new/page.tsx`
- Modify: `dashboard/app/(authenticated)/salaries/[id]/edit/page.tsx`

**Interfaces:**
- Consumes: Nothing new — uses existing salary API.
- Produces: Read-only salary pages with deprecation banner.

- [ ] **Step 1: Add deprecation banner to salary list page**

At the top of `dashboard/app/(authenticated)/salaries/page.tsx`, add an info banner:

```tsx
<div className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-700 p-4 mb-6">
  <p className="text-sm text-amber-800 dark:text-amber-200">
    <strong>Module en transition.</strong> Les rémunérations de base sont désormais gérées via la{' '}
    <a href="/compensation-grid" className="underline font-medium">Grille de rémunération</a>.
    Les données ci-dessous sont conservées en lecture seule.
  </p>
</div>
```

- [ ] **Step 2: Disable create/edit actions**

Remove or hide the "Nouveau" button on the list page. On `new/page.tsx` and `[id]/edit/page.tsx`, redirect to `/compensation-grid`:

```tsx
import { redirect } from 'next/navigation';
export default function Page() {
  redirect('/compensation-grid');
}
```

- [ ] **Step 3: Remove "Rémunérations de base" from navigation (if not already done in Task 6)**

Already handled in Task 6 Step 4 — verify it's gone.

- [ ] **Step 4: Commit**

```bash
git add dashboard/app/\(authenticated\)/salaries/
git commit -m "$(cat <<'EOF'
feat(dashboard): make legacy salary pages read-only with deprecation notice

List page shows transition banner pointing to compensation grid.
Create/edit pages redirect to /compensation-grid.
EOF
)"
```

---

Plan saved to `docs/superpowers/plans/2026-07-29-compensation-and-payroll-refactor.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?

<function_calls>
<invoke name="TodoWrite">
<parameter name="todos">[{"id": "7", "content": "Write implementation plan using writing-plans skill", "status": "completed"}]