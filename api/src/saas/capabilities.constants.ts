/** Product capability flags — gates features without forking by industry sector. */
export const TIMEGATE_CAPABILITIES = [
  'multi_locations',
  'multi_kiosks',
  'client_missions',
  'scoped_managers',
  'anomaly_workflow',
] as const;

export type TimeGateCapability = (typeof TIMEGATE_CAPABILITIES)[number];

export function parseCapabilitiesJson(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
}
