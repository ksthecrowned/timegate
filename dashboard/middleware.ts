import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { safeCallbackUrl } from '@/lib/auth/callback-url'
import {
  isProtectedAppPath,
  middlewareMatcher,
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

export const config = {
  matcher: middlewareMatcher,
}
