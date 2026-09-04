/**
 * Live smoke: Copilot payroll tools are ADMIN-only (MANAGER must not leak payroll sources).
 * Probes chat if Cloudflare AI is configured; otherwise skips chat with a clear note.
 *
 * Run from api/: bun run scripts/smoke-payroll-copilot-roles.ts
 */
import { login, request, authHeader } from './test/helpers.mjs';

const PAYROLL_TOOLS = [
  'get_payroll_mass',
  'get_payroll_payment_status',
  'get_payroll_due_alerts',
  'list_payroll_runs',
  'compare_payroll_months',
  'get_payroll_by_branch',
  'get_pay_groups',
  'get_employee_compensation',
  'get_upcoming_pay_dues',
];

async function main() {
  const adminToken = await login('admin@sotrafer.cg', { sku: 'SOTR' });
  const managerToken = await login('manager@sotrafer.cg', { sku: 'SOTR' });
  if (!adminToken) throw new Error('admin login failed');
  if (!managerToken) throw new Error('manager login failed');

  const adminChat = await request('/ai/copilot/chat', {
    method: 'POST',
    headers: authHeader(adminToken),
    body: JSON.stringify({ message: 'Quelle est la masse salariale du dernier cycle ?' }),
  });
  const managerChat = await request('/ai/copilot/chat', {
    method: 'POST',
    headers: authHeader(managerToken),
    body: JSON.stringify({ message: 'Quelle est la masse salariale du dernier cycle ?' }),
  });

  console.log('admin chat', adminChat.res.status);
  console.log('manager chat', managerChat.res.status);

  if (adminChat.res.status === 503 || managerChat.res.status === 503) {
    console.log('⚠️ Cloudflare AI non configuré — skip live chat; role gate covered by unit tests.');
    console.log('Payroll tools reserved to ADMIN:', PAYROLL_TOOLS.join(', '));
    console.log('✅ PASS smoke (login OK; chat skipped)');
    return;
  }

  if (adminChat.res.status >= 400) {
    console.log('❌ FAIL admin chat', adminChat.json);
    process.exitCode = 1;
    return;
  }

  const managerSources = managerChat.json?.sources ?? [];
  const leaked = managerSources.some(
    (s: { href?: string }) => typeof s?.href === 'string' && String(s.href).includes('/payroll-runs'),
  );
  if (leaked) {
    console.log('❌ FAIL manager received payroll sources', managerSources);
    process.exitCode = 1;
    return;
  }

  console.log(
    'admin sources',
    (adminChat.json?.sources ?? []).map((s: { href?: string }) => s.href),
  );
  console.log(
    'manager sources',
    managerSources.map((s: { href?: string }) => s.href),
  );
  console.log('✅ PASS Copilot ADMIN vs MANAGER payroll smoke');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
