import NextAuth from 'next-auth'
import { authConfig } from '@/auth.config'

export default NextAuth(authConfig).auth

export const config = {
  matcher: ['/', '/login', '/organizations/:path*', '/plans/:path*', '/platform-settings', '/subscriptions', '/audit-logs', '/countries', '/cities'],
}
