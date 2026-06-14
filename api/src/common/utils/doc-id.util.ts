import { randomBytes } from 'crypto';

/** Frappe-style document id (VarChar 140). */
export function generateDocId(prefix?: string): string {
  const token = randomBytes(8).toString('hex');
  return prefix ? `${prefix}-${token}` : token;
}
