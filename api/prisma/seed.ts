import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  PrismaClient,
  Role,
  AttendanceType,
  AttendanceAnomaly,
  AttendanceStatus,
  DeviceStatus,
  LeaveStatus,
  LeaveType,
  WeekDay,
} from '@prisma/client';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const ORG_SKU = 'TMGT';
const ORG_NAME = 'TimeGate Demo';
const ACTIVATION_KEY_PLAIN = 'TMGT-DEMO-2026';

/** Safe re-run: remove only rows created by this seed (by known emails / names). */
async function resetDemoSeed() {
  await prisma.auditLog.deleteMany();
  await prisma.recognitionLog.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.leave.deleteMany();
  await prisma.workSession.deleteMany();
  await prisma.workDay.deleteMany();
  await prisma.holiday.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.device.deleteMany();
  await prisma.userSite.deleteMany();
  await prisma.workSchedule.deleteMany();
  await prisma.site.deleteMany();
  await prisma.activationKey.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.systemConfig.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany({ where: { sku: ORG_SKU } });
}

async function main() {
  await resetDemoSeed();

  const passwordHash = await bcrypt.hash('ChangeMe123!', 10);
  const activationHash = createHash('sha256').update(ACTIVATION_KEY_PLAIN).digest('hex');

  const organization = await prisma.organization.create({
    data: {
      name: ORG_NAME,
      sku: ORG_SKU,
    },
  });

  await prisma.systemConfig.create({
    data: {
      organizationId: organization.id,
      minConfidence: 0.75,
      lateThreshold: 10,
      veryLateThreshold: 30,
    },
  });

  await prisma.activationKey.create({
    data: {
      organizationId: organization.id,
      keyHash: activationHash,
      plan: 'PRO',
      maxEmployees: 200,
      maxDevices: 20,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
      usedAt: new Date(),
    },
  });

  await prisma.subscription.create({
    data: {
      organizationId: organization.id,
      plan: 'PRO',
      maxEmployees: 200,
      maxDevices: 20,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
    },
  });

  const admin = await prisma.user.upsert({
    where: { email_organizationId: { email: 'admin@monorganisation.com', organizationId: organization.id } },
    update: {},
    create: {
      email: 'admin@monorganisation.com',
      password: passwordHash,
      role: Role.ADMIN,
      organizationId: organization.id,
    },
  });

  const manager = await prisma.user.upsert({
    where: { email_organizationId: { email: 'manager@monorganisation.com', organizationId: organization.id } },
    update: {},
    create: {
      email: 'manager@monorganisation.com',
      password: passwordHash,
      role: Role.MANAGER,
      organizationId: organization.id,
    },
  });

  const existingSuperAdmin = await prisma.user.findFirst({
    where: { email: 'superadmin@monorganisation.com', organizationId: null },
  });
  const superAdmin = existingSuperAdmin
    ? await prisma.user.update({
        where: { id: existingSuperAdmin.id },
        data: { password: passwordHash, role: Role.SUPER_ADMIN },
      })
    : await prisma.user.create({
        data: {
          email: 'superadmin@monorganisation.com',
          password: passwordHash,
          role: Role.SUPER_ADMIN,
          organizationId: null,
        },
      });

  const hq = await prisma.site.create({
    data: {
      name: 'Headquarters',
      address: '100 Main St',
      timezone: 'America/New_York',
      organizationId: organization.id,
    },
  });

  const branch = await prisma.site.create({
    data: {
      name: 'West Branch',
      address: '200 Coast Rd',
      timezone: 'America/Los_Angeles',
      organizationId: organization.id,
    },
  });

  const hqSchedule = await prisma.workSchedule.create({
    data: {
      siteId: hq.id,
      organizationId: organization.id,
      name: 'HQ Day Shift',
      startTime: new Date('2026-01-01T08:00:00.000Z'),
      endTime: new Date('2026-01-01T17:00:00.000Z'),
      lateGraceMinutes: 10,
    },
  });

  const branchSchedule = await prisma.workSchedule.create({
    data: {
      siteId: branch.id,
      organizationId: organization.id,
      name: 'Branch Flex Shift',
      startTime: new Date('2026-01-01T09:00:00.000Z'),
      endTime: new Date('2026-01-01T18:00:00.000Z'),
      lateGraceMinutes: 5,
    },
  });

  const weekdays: WeekDay[] = [
    WeekDay.MONDAY,
    WeekDay.TUESDAY,
    WeekDay.WEDNESDAY,
    WeekDay.THURSDAY,
    WeekDay.FRIDAY,
  ];
  await prisma.workDay.createMany({
    data: weekdays.map((day) => ({
      scheduleId: hqSchedule.id,
      day,
      startTime: '08:00',
      endTime: '17:00',
    })),
  });
  await prisma.workDay.createMany({
    data: weekdays.map((day) => ({
      scheduleId: branchSchedule.id,
      day,
      startTime: '09:00',
      endTime: '18:00',
    })),
  });

  const holiday = await prisma.holiday.create({
    data: {
      organizationId: organization.id,
      name: 'Fête Nationale (Demo)',
      date: new Date('2026-07-14T00:00:00.000Z'),
    },
  });

  const kioskHq = await prisma.device.create({
    data: {
      name: 'Lobby Kiosk HQ',
      organizationId: organization.id,
      siteId: hq.id,
      apiKey: randomBytes(24).toString('hex'),
      location: 'Main lobby',
      status: DeviceStatus.ONLINE,
      lastSeenAt: new Date(),
    },
  });

  const tabletBranch = await prisma.device.create({
    data: {
      name: 'Tablet West',
      organizationId: organization.id,
      siteId: branch.id,
      apiKey: randomBytes(24).toString('hex'),
      location: 'Reception',
      status: DeviceStatus.OFFLINE,
    },
  });

  const emp1 = await prisma.employee.create({
    data: {
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada.lovelace@example.com',
      department: 'Engineering',
      position: 'Lead',
      organizationId: organization.id,
      siteId: hq.id,
      scheduleId: hqSchedule.id,
      faceEmbedding: [0.01, 0.02, 0.03] as unknown as object,
    },
  });

  const emp2 = await prisma.employee.create({
    data: {
      firstName: 'Alan',
      lastName: 'Turing',
      email: 'alan.turing@example.com',
      department: 'Research',
      position: 'Scientist',
      organizationId: organization.id,
      siteId: branch.id,
      scheduleId: branchSchedule.id,
      faceEmbedding: [0.1, 0.2, 0.3] as unknown as object,
    },
  });

  const emp3 = await prisma.employee.create({
    data: {
      firstName: 'Grace',
      lastName: 'Hopper',
      email: 'grace.hopper@example.com',
      department: 'Operations',
      position: 'Director',
      organizationId: organization.id,
      siteId: hq.id,
      scheduleId: hqSchedule.id,
      faceEmbedding: [0.5, 0.5, 0.5] as unknown as object,
    },
  });

  const checkIn = await prisma.attendance.create({
    data: {
      employeeId: emp1.id,
      deviceId: kioskHq.id,
      organizationId: organization.id,
      type: AttendanceType.CHECK_IN,
      status: AttendanceStatus.ON_TIME,
      anomaly: AttendanceAnomaly.NONE,
      timestamp: new Date('2026-04-18T08:02:00.000Z'),
      confidence: 0.97,
    },
  });

  const checkOut = await prisma.attendance.create({
    data: {
      employeeId: emp1.id,
      deviceId: kioskHq.id,
      organizationId: organization.id,
      type: AttendanceType.CHECK_OUT,
      status: AttendanceStatus.EARLY_LEAVE,
      anomaly: AttendanceAnomaly.LOW_CONFIDENCE,
      timestamp: new Date('2026-04-18T16:44:00.000Z'),
      confidence: 0.78,
    },
  });

  const session = await prisma.workSession.create({
    data: {
      employeeId: emp1.id,
      organizationId: organization.id,
      checkInId: checkIn.id,
      checkOutId: checkOut.id,
      startedAt: new Date('2026-04-18T08:02:00.000Z'),
      endedAt: new Date('2026-04-18T16:44:00.000Z'),
      duration: 522,
      normalDuration: 480,
      overtimeDuration: 42,
      validatedById: manager.id,
      validatedAt: new Date('2026-04-18T18:00:00.000Z'),
    },
  });

  await prisma.attendance.update({
    where: { id: checkIn.id },
    data: { sessionId: session.id },
  });
  await prisma.attendance.update({
    where: { id: checkOut.id },
    data: { sessionId: session.id },
  });

  await prisma.attendance.create({
    data: {
      employeeId: emp2.id,
      deviceId: tabletBranch.id,
      organizationId: organization.id,
      type: AttendanceType.CHECK_IN,
      status: AttendanceStatus.VERY_LATE,
      anomaly: AttendanceAnomaly.DOUBLE_CHECKIN,
      confidence: 0.83,
      timestamp: new Date('2026-04-18T10:05:00.000Z'),
    },
  });

  const leave = await prisma.leave.create({
    data: {
      employeeId: emp3.id,
      organizationId: organization.id,
      startDate: new Date('2026-05-05T00:00:00.000Z'),
      endDate: new Date('2026-05-08T00:00:00.000Z'),
      reason: 'Annual leave demo',
      status: LeaveStatus.APPROVED,
      type: LeaveType.ANNUAL,
    },
  });

  await prisma.recognitionLog.create({
    data: {
      employeeId: emp1.id,
      deviceId: kioskHq.id,
      organizationId: organization.id,
      success: true,
      confidence: 0.97,
    },
  });

  await prisma.recognitionLog.create({
    data: {
      employeeId: null,
      deviceId: tabletBranch.id,
      organizationId: organization.id,
      success: false,
      confidence: 0.42,
      imageUrl: 'https://example.com/captures/unknown.jpg',
    },
  });

  await prisma.auditLog.createMany({
    data: [
      {
        organizationId: organization.id,
        userId: admin.id,
        action: 'CREATE',
        entity: 'WorkSchedule',
        entityId: hqSchedule.id,
      },
      {
        organizationId: organization.id,
        userId: manager.id,
        action: 'VALIDATE',
        entity: 'WorkSession',
        entityId: session.id,
      },
      {
        organizationId: organization.id,
        userId: manager.id,
        action: 'APPROVE',
        entity: 'Leave',
        entityId: leave.id,
      },
    ],
  });

  console.log('Seed complete.', {
    organization: { id: organization.id, name: organization.name, sku: organization.sku },
    users: [superAdmin.email, admin.email, manager.email],
    sites: [
      { name: hq.name, id: hq.id },
      { name: branch.name, id: branch.id },
    ],
    schedules: [
      { name: hqSchedule.name, id: hqSchedule.id },
      { name: branchSchedule.name, id: branchSchedule.id },
    ],
    workDaysPerSchedule: weekdays.length,
    holiday: { id: holiday.id, name: holiday.name, date: holiday.date.toISOString().slice(0, 10) },
    employees: [emp1.email, emp2.email],
    workSession: { id: session.id, normal: session.normalDuration, overtime: session.overtimeDuration },
    leave: { id: leave.id, status: leave.status, type: leave.type },
    password: 'ChangeMe123!',
    activationKey: ACTIVATION_KEY_PLAIN,
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
