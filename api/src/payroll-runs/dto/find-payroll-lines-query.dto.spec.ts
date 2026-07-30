import 'reflect-metadata';
import { describe, expect, test } from 'bun:test';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { FindPayrollLinesQueryDto } from './find-payroll-lines-query.dto';

/**
 * Mirrors the global ValidationPipe config (whitelist + forbidNonWhitelisted + transform)
 * so this test catches the same 400s the dashboard would hit against the real API.
 */
async function validateAsPipeWould(plain: Record<string, unknown>) {
  const instance = plainToInstance(FindPayrollLinesQueryDto, plain, {
    enableImplicitConversion: true,
    excludeExtraneousValues: false,
  });
  return validate(instance, { whitelist: true, forbidNonWhitelisted: true });
}

describe('FindPayrollLinesQueryDto', () => {
  test('accepts the dashboard payment-table query shape ({ paymentStatus, limit: 1000 })', async () => {
    const errors = await validateAsPipeWould({ paymentStatus: 'UNPAID', limit: 1000 });
    expect(errors).toHaveLength(0);
  });

  test('rejects a limit above the 1000 ceiling', async () => {
    const errors = await validateAsPipeWould({ limit: 1001 });
    expect(errors.length).toBeGreaterThan(0);
  });

  test('rejects unknown properties (forbidNonWhitelisted)', async () => {
    const errors = await validateAsPipeWould({ limit: 100, notARealField: 'x' });
    expect(errors.length).toBeGreaterThan(0);
  });

  test('defaults page and limit when omitted', () => {
    const instance = plainToInstance(FindPayrollLinesQueryDto, {}, { enableImplicitConversion: true });
    expect(instance.page).toBe(1);
    expect(instance.limit).toBe(1000);
  });
});
