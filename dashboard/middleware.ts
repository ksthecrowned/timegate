import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import {
  isProtectedAppPath,
  sessionCookieNames,
  stripTimegatePrefix,
} from '@/lib/auth/route-guard'

function hasSessionCookie(request: NextRequest): boolean {
  return sessionCookieNames.some((name) => request.cookies.has(name))
}

/**
 * Garde Edge sans NextAuth/jose — la session JWT est validée côté serveur
 * dans les layouts (`auth()`), pas dans le middleware.
 */
export function middleware(request: NextRequest) {
  const isLoggedIn = hasSessionCookie(request)
  const rawPathname = request.nextUrl.pathname
  const pathname = stripTimegatePrefix(rawPathname)
  const isLoginPage = pathname === '/login'
  const isSignupPage = pathname === '/signup'
  const isActivatePage = pathname === '/activate'
  const isOldDashboardRedirect = pathname.startsWith('/dashboard')
  const isDeprecatedShiftLocations = pathname.startsWith('/shift-locations')

  if (isOldDashboardRedirect) {
    const target = pathname.replace(/^\/dashboard/, '') || '/'
    return NextResponse.redirect(new URL(target, request.url))
  }

  if (isDeprecatedShiftLocations) {
    return NextResponse.redirect(new URL('/branches', request.url))
  }

  if (rawPathname !== pathname) {
    return NextResponse.redirect(new URL(pathname || '/', request.url))
  }

  if (isLoginPage || isSignupPage) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return NextResponse.next()
  }

  if (isActivatePage) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return NextResponse.next()
  }

  if (!isProtectedAppPath(pathname)) {
    return NextResponse.next()
  }

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', pathname)

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

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
    '/organization/:path*',
    '/manager/:path*',
    '/planning/:path*',
    '/shift-swaps/:path*',
    '/punch-claims/:path*',
    '/profile/:path*',
    '/trusted-devices/:path*',
    '/login',
    '/signup',
    '/activate',
  ],
}
