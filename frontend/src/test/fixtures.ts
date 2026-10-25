/** Sample API data shared by tests. */
import type { User, Vehicle } from '../api/types'

export const customer: User = { id: 1, email: 'customer@example.com', role: 'user' }
export const admin: User = { id: 2, email: 'admin@example.com', role: 'admin' }

/** The localStorage key the app keeps the session under. */
export const SESSION_KEY = 'dealership.session'

/** Put a logged-in session in storage, as if the user had logged in earlier. */
export function storeSession(user: User = customer, token = 'stored-token'): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ token, user }))
}

export const corolla: Vehicle = {
  id: 1,
  make: 'Toyota',
  model: 'Corolla',
  category: 'sedan',
  price: '21999.99',
  quantity: 3,
}
export const mustang: Vehicle = {
  id: 2,
  make: 'Ford',
  model: 'Mustang',
  category: 'coupe',
  price: '38000.00',
  quantity: 0,
}
export const rav4: Vehicle = {
  id: 3,
  make: 'Toyota',
  model: 'RAV4',
  category: 'suv',
  price: '32450.00',
  quantity: 1,
}

export const inventory: Vehicle[] = [corolla, mustang, rav4]
