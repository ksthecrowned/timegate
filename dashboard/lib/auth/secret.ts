/**
 * Auth.js lit `AUTH_SECRET` en priorité — une valeur vide ne doit pas masquer `NEXTAUTH_SECRET`.
 */
export function getAuthSecret(): string {
  const secret =
    process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim()

  if (!secret) {
    throw new Error(
      'AUTH_SECRET manquant. Définissez AUTH_SECRET (ou NEXTAUTH_SECRET) dans .env — ex. : openssl rand -base64 32',
    )
  }

  return secret
}
