import { auth } from '@/auth'
import { safeCallbackUrl } from '@/lib/auth/callback-url'
import { isRoleAllowedForPathname } from '@/lib/auth/route-guard'
import { isDashboardRole } from '@/lib/timegate/roles'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import AuthenticatedShell from './AuthenticatedShell'

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  const pathname = (await headers()).get('x-pathname') ?? '/'

  if (!session?.user) {
    const returnTo = safeCallbackUrl(pathname)
    redirect(returnTo ? `/login?callbackUrl=${encodeURIComponent(returnTo)}` : '/login')
  }

  if (!isDashboardRole(session.user.role)) {
    redirect('/login')
  }

  if (session.user.subscriptionActive === false) {
    redirect('/activate')
  }

  if (!isRoleAllowedForPathname(pathname, session.user.role)) {
    redirect('/')
  }

  return <AuthenticatedShell>{children}</AuthenticatedShell>
}
