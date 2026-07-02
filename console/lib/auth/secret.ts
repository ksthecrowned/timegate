export function getAuthSecret(): string {
  const secret =
    process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim()

  if (!secret) {
    throw new Error(
      'AUTH_SECRET manquant. Définissez AUTH_SECRET (ou NEXTAUTH_SECRET) dans .env.local',
    )
  }

  return secret
}
