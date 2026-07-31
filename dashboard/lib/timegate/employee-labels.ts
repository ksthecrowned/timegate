/** Libellés FR pour les champs employé affichés en lecture. */

const GENDER_LABELS: Record<string, string> = {
  Male: 'Homme',
  Female: 'Femme',
  Other: 'Autre',
}

const MARITAL_LABELS: Record<string, string> = {
  Single: 'Célibataire',
  Married: 'Marié(e)',
  Divorced: 'Divorcé(e)',
  Widowed: 'Veuf(ve)',
}

export function employeeGenderLabel(value: string | null | undefined): string {
  if (!value) return '—'
  return GENDER_LABELS[value] ?? value
}

export function employeeMaritalLabel(value: string | null | undefined): string {
  if (!value) return '—'
  return MARITAL_LABELS[value] ?? value
}
