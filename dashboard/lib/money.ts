/** Devise d’affichage par défaut (Congo / CEMAC). Multicurrency non branché côté société. */
export const DEFAULT_CURRENCY = 'XAF'

/**
 * Formate un montant en devise (XAF par défaut, sans décimales).
 * Ex. `420 000 XAF`
 */
export function formatMoney(
  value: number | undefined | null,
  currency: string = DEFAULT_CURRENCY,
): string {
  return (value ?? 0).toLocaleString('fr-FR', {
    style: 'currency',
    currency,
    currencyDisplay: 'code',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}
