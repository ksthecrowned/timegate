/**
 * Format money for employee-facing UI.
 * Prefer org/employee currency when known; fall back to XAF.
 */
const COUNTRY_CURRENCY: Record<string, string> = {
  SN: 'XOF',
  CI: 'XOF',
  BF: 'XOF',
  ML: 'XOF',
  NE: 'XOF',
  TG: 'XOF',
  BJ: 'XOF',
  GW: 'XOF',
  CM: 'XAF',
  GA: 'XAF',
  CG: 'XAF',
  TD: 'XAF',
  CF: 'XAF',
  GQ: 'XAF',
  CD: 'CDF',
  MA: 'MAD',
  TN: 'TND',
  DZ: 'DZD',
  NG: 'NGN',
  GH: 'GHS',
  KE: 'KES',
  ZA: 'ZAR',
};

export function currencyFromCountryCode(countryCode?: string | null): string | null {
  if (!countryCode) return null;
  const key = countryCode.trim().toUpperCase();
  return COUNTRY_CURRENCY[key] ?? null;
}

export function resolveCurrencyCode(opts: {
  salaryCurrency?: string | null;
  countryCode?: string | null;
  fallback?: string;
}): string {
  const fromSalary = opts.salaryCurrency?.trim().toUpperCase();
  if (fromSalary && /^[A-Z]{3}$/.test(fromSalary)) return fromSalary;
  return (
    currencyFromCountryCode(opts.countryCode) ??
    opts.fallback ??
    'XAF'
  );
}

export function formatMoney(
  amount: number,
  currencyCode = 'XAF',
  locale = 'fr-FR',
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${Math.round(amount).toLocaleString(locale)} ${currencyCode}`;
  }
}
