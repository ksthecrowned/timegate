const TOKEN_KEY = 'timegate_employee_token'
const PROFILE_KEY = 'timegate_employee_profile'

export type StoredProfile = {
  id: string
  firstName: string
  lastName: string
  email: string
  branchName?: string | null
}

export function getApiBaseUrl(): string {
  const base = process.env.NEXT_PUBLIC_TIMEGATE_API_URL?.trim()
  if (!base) return 'http://127.0.0.1:4001/api/v1'
  return base.replace(/\/$/, '')
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function getStoredProfile(): StoredProfile | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(PROFILE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as StoredProfile
  } catch {
    return null
  }
}

export function saveSession(token: string, profile: StoredProfile) {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile))
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(PROFILE_KEY)
}

export function isAuthenticated(): boolean {
  return !!getToken()
}

export async function loginEmployee(email: string, password: string) {
  const res = await fetch(`${getApiBaseUrl()}/auth/employee/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email: email.trim(), password }),
  })

  if (!res.ok) {
    const text = await res.text()
    let message = 'Identifiants invalides'
    try {
      const json = JSON.parse(text) as { message?: string | string[] }
      if (Array.isArray(json.message)) message = json.message.join(', ')
      else if (typeof json.message === 'string') message = json.message
    } catch {
      if (text) message = text
    }
    throw new Error(message)
  }

  const json = (await res.json()) as {
    access_token: string
    employee: { id: string; firstName: string; lastName: string; branchName?: string | null }
  }

  saveSession(json.access_token, {
    id: json.employee.id,
    firstName: json.employee.firstName,
    lastName: json.employee.lastName,
    email: email.trim(),
    branchName: json.employee.branchName ?? null,
  })

  return json
}

export function logoutEmployee() {
  clearSession()
}
