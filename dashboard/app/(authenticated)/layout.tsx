import { auth } from '@/auth'
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

  if (!session?.user) {
    redirect('/login')
  }

  if (!isDashboardRole(session.user.role)) {
    redirect('/login')
  }

  if (session.user.subscriptionActive === false) {
    redirect('/activate')
  }

  const pathname = (await headers()).get('x-pathname') ?? '/'
  if (!isRoleAllowedForPathname(pathname, session.user.role)) {
    redirect('/')
  }

  return <AuthenticatedShell>{children}</AuthenticatedShell>
}
