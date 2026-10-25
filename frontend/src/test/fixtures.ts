/** Sample API data shared by tests. */
import type { User } from '../api/types'

export const customer: User = { id: 1, email: 'customer@example.com', role: 'user' }
export const admin: User = { id: 2, email: 'admin@example.com', role: 'admin' }

/** The localStorage key the app keeps the session under. */
export const SESSION_KEY = 'dealership.session'

/** Put a logged-in session in storage, as if the user had logged in earlier. */
export function storeSession(user: User = customer, token = 'stored-token'): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ token, user }))
}
