export const INDUSTRY_SECTOR_OPTIONS = [
  { value: 'OFFICE', label: 'Bureaux' },
  { value: 'TRAINING', label: 'Formation' },
  { value: 'INDUSTRY', label: 'Industrie' },
  { value: 'SECURITY', label: 'Sécurité' },
  { value: 'CLEANING', label: 'Nettoyage' },
  { value: 'STAFFING', label: 'Placement' },
  { value: 'CLINIC', label: 'Clinique' },
  { value: 'HOTEL', label: 'Hôtel' },
  { value: 'OTHER', label: 'Autre' },
] as const

export const EXPECTED_SITE_COUNT_OPTIONS = [
  { value: '1', label: '1 site' },
  { value: '2-5', label: '2 – 5 sites' },
  { value: '6+', label: '6 sites ou plus' },
] as const

export const WORKFORCE_MODEL_OPTIONS = [
  { value: 'fixed_sites', label: 'Sites fixes' },
  { value: 'client_sites', label: 'Sites clients' },
  { value: 'mixed', label: 'Mixte' },
] as const

export const SCHEDULE_PATTERN_OPTIONS = [
  { value: 'fixed_day', label: 'Journée fixe' },
  { value: 'multi_shift', label: 'Multi-équipes' },
  { value: 'includes_night', label: 'Avec nuit' },
] as const
