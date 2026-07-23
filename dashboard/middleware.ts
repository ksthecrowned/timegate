import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { safeCallbackUrl } from '@/lib/auth/callback-url'
import {
  isProtectedAppPath,
  publicPaths,
  sessionCookieNames,
} from '@/lib/auth/route-guard'

function hasSessionCookie(request: NextRequest): boolean {
  return sessionCookieNames.some((name) => request.cookies.has(name))
}

function loginRedirect(request: NextRequest, returnTo?: string) {
  const loginUrl = new URL('/login', request.url)
  const callback = safeCallbackUrl(returnTo)
  if (callback) {
    loginUrl.searchParams.set('callbackUrl', callback)
  }
  return NextResponse.redirect(loginUrl)
}

/**
 * Garde Edge sans NextAuth/jose — la session JWT est validée côté serveur
 * dans les layouts (`auth()`), pas dans le middleware.
 */
export function middleware(request: NextRequest) {
  const isLoggedIn = hasSessionCookie(request)
  const pathname = request.nextUrl.pathname

  if (publicPaths.has(pathname)) {
    if (pathname === '/activate') {
      if (!isLoggedIn) {
        return loginRedirect(request)
      }
      return NextResponse.next()
    }

    // /login, /signup — déjà connecté → callbackUrl ou accueil
    if (isLoggedIn) {
      const dest =
        safeCallbackUrl(request.nextUrl.searchParams.get('callbackUrl')) ?? '/'
      return NextResponse.redirect(new URL(dest, request.url))
    }
    return NextResponse.next()
  }

  if (!isProtectedAppPath(pathname)) {
    return NextResponse.next()
  }

  if (!isLoggedIn) {
    const returnTo = `${pathname}${request.nextUrl.search}`
    return loginRedirect(request, returnTo)
  }

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', pathname)

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

// Must be a static literal — Next.js cannot analyze imported identifiers here.
// Keep in sync with `protectedPathPrefixes` + `publicPaths` in route-guard.ts.
export const config = {
  matcher: [
    '/',
    '/manager',
    '/manager/:path*',
    '/employees',
    '/employees/:path*',
    '/branches',
    '/branches/:path*',
    '/kiosks',
    '/kiosks/:path*',
    '/departments',
    '/departments/:path*',
    '/designations',
    '/designations/:path*',
    '/shift-types',
    '/shift-types/:path*',
    '/shift-assignments',
    '/shift-assignments/:path*',
    '/planning',
    '/planning/:path*',
    '/shift-swaps',
    '/shift-swaps/:path*',
    '/work-days',
    '/work-days/:path*',
    '/leaves',
    '/leaves/:path*',
    '/leave-types',
    '/leave-types/:path*',
    '/absences',
    '/absences/:path*',
    '/late-records',
    '/late-records/:path*',
    '/attendance',
    '/attendance/:path*',
    '/timesheets',
    '/timesheets/:path*',
    '/face-recognition-logs',
    '/face-recognition-logs/:path*',
    '/payroll-runs',
    '/payroll-runs/:path*',
    '/salaries',
    '/salaries/:path*',
    '/holidays',
    '/holidays/:path*',
    '/users',
    '/users/:path*',
    '/audit-logs',
    '/audit-logs/:path*',
    '/subscriptions',
    '/subscriptions/:path*',
    '/system-config',
    '/system-config/:path*',
    '/organization',
    '/organization/:path*',
    '/punch-claims',
    '/punch-claims/:path*',
    '/profile',
    '/profile/:path*',
    '/trusted-devices',
    '/trusted-devices/:path*',
    '/login',
    '/signup',
    '/activate',
  ],
}
