/**
 * Persistence of the logged-in session in `localStorage`, so a page reload
 * keeps the user logged in until the token expires (the API then answers 401
 * and the app logs out).
 */
import type { User } from '../api/types'

export interface Session {
  token: string
  user: User
}

const SESSION_KEY = 'dealership.session'

/** The stored session, or `null` if there is none or it is unreadable. */
export function loadSession(): Session | null {
  try {
    const stored = localStorage.getItem(SESSION_KEY)
    if (!stored) return null
    const parsed = JSON.parse(stored) as Partial<Session>
    if (typeof parsed.token !== 'string' || typeof parsed.user?.email !== 'string') return null
    return parsed as Session
  } catch {
    // Corrupted data or storage disabled: behave as logged out.
    return null
  }
}

export function saveSession(session: Session): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY)
}
