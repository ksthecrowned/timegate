import { redirect } from 'next/navigation'

/** Jours ouvrés fusionnés dans Horaires — redirection. */
export default function WorkDaysRedirectPage() {
  redirect('/shift-types')
}
