#!/usr/bin/env node
/**
 * Post-migration setup: fenêtres horaires, NFC kiosk, re-provision deviceToken.
 * Usage: node scripts/post-migration-setup.mjs
 */
const BASE = process.env.TIMEGATE_API_URL ?? 'http://localhost:4001/api/v1';
const LOGIN = {
  email: 'admin@monorganisation.com',
  password: 'ChangeMe123!',
  sku: 'SOTR',
};

const SHIFT_BRAZZAVILLE = 'SHIFT-e29672bb9e831a86';
const KIOSK_BRAZZAVILLE = 'KSK-5a6086a40388f2a8';
const BRANCH_BRAZZAVILLE = 'BR-9442a8802afd6209';
const KIOSK_POINTE = 'KSK-5b5df6b804d89027';
const BRANCH_POINTE = 'BR-c3eec330971722e6';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options);
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    throw new Error(`${options.method ?? 'GET'} ${path} → ${res.status}: ${JSON.stringify(body)}`);
  }
  return body;
}

async function adminToken() {
  const data = await request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(LOGIN),
  });
  return data.access_token;
}

async function operatorToken() {
  const data = await request('/auth/kiosk/bootstrap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(LOGIN),
  });
  return data.operator_token;
}

async function provision(operatorToken, kioskId, branchId, label) {
  const data = await request('/auth/kiosk/provision', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${operatorToken}`,
    },
    body: JSON.stringify({ kioskId, branchId }),
  });
  const config = await request('/auth/kiosk/config', {
    headers: { Authorization: `Bearer ${data.lifetime_token}` },
  });
  console.log(`✓ Re-provisionné ${label}: deviceToken actif, features=${JSON.stringify(config.features)}`);
}

async function main() {
  console.log('TimeGate post-migration setup\n');

  const token = await adminToken();
  const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const shift = await request(`/shift-types/${SHIFT_BRAZZAVILLE}`, {
    method: 'PATCH',
    headers: auth,
    body: JSON.stringify({
      checkInWindowStart: '07:00',
      checkInWindowEnd: '12:00',
      checkOutWindowStart: '17:00',
      checkOutWindowEnd: '23:59',
      breakWindowStart: '12:00',
      breakWindowEnd: '14:00',
      breakDurationMinutes: 60,
    }),
  });
  console.log(`✓ Fenêtres configurées sur « ${shift.name} »`);
  console.log(
    `  Arrivée ${shift.checkInWindowStart?.slice(11, 16)}–${shift.checkInWindowEnd?.slice(11, 16)}, pause ${shift.breakWindowStart?.slice(11, 16)}–${shift.breakWindowEnd?.slice(11, 16)}`,
  );

  const kiosk = await request(`/kiosks/${KIOSK_BRAZZAVILLE}`, {
    method: 'PATCH',
    headers: auth,
    body: JSON.stringify({ nfcEnabled: true, faceEnabled: true }),
  });
  console.log(`✓ NFC activé sur « ${kiosk.name} » (face=${kiosk.faceEnabled}, nfc=${kiosk.nfcEnabled})`);

  const op = await operatorToken();
  await provision(op, KIOSK_BRAZZAVILLE, BRANCH_BRAZZAVILLE, 'Kiosque Brazzaville');
  await provision(op, KIOSK_POINTE, BRANCH_POINTE, 'Kiosque Pointe-Noire');

  console.log('\nTerminé. Sur le terminal kiosk : reconfigurez ou relancez l’app pour récupérer le nouveau token.');
}

main().catch((err) => {
  console.error('Erreur:', err.message);
  process.exit(1);
});
