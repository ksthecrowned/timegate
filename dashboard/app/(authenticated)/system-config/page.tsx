import { redirect } from 'next/navigation'

/** Fusionné dans Paramètres de pointage. */
export default function SystemConfigRedirectPage() {
  redirect('/organization/attendance-settings')
}
