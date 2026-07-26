import { redirect } from 'next/navigation'

type Props = { params: Promise<{ id: string }> }

/** Legacy deep-link — conversation ouverte dans la boîte unifiée. */
export default async function MessageThreadRedirectPage({ params }: Props) {
  const { id } = await params
  redirect(`/manager/inbox?view=messages&c=${encodeURIComponent(id)}`)
}
