import { redirect } from 'next/navigation'

/** Legacy URL — messagerie unifiée dans la boîte de réception. */
export default function MessagesRedirectPage() {
  redirect('/manager/inbox?view=messages')
}
