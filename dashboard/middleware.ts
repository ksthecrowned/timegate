import NextAuth from 'next-auth'
import { authConfig } from '@/auth.config'

/** Garde Edge — ne pas importer `@/auth` (credentials + fetch TimeGate). */
export default NextAuth(authConfig).auth

export const config = {
  matcher: [
    '/',
    '/employees/:path*',
    '/branches/:path*',
    '/kiosks/:path*',
    '/departments/:path*',
    '/designations/:path*',
    '/shift-types/:path*',
    '/shift-assignments/:path*',
    '/work-days/:path*',
    '/leaves/:path*',
    '/leave-types/:path*',
    '/absences/:path*',
    '/late-records/:path*',
    '/attendance/:path*',
    '/timesheets/:path*',
    '/face-recognition-logs/:path*',
    '/payroll-runs/:path*',
    '/salaries/:path*',
    '/holidays/:path*',
    '/admins/:path*',
    '/audit-logs/:path*',
    '/subscriptions/:path*',
    '/system-config/:path*',
    '/organization',
    '/super-admin/:path*',
    '/countries/:path*',
    '/cities/:path*',
    '/login',
    '/activate',
  ],
}
