/**
 * Calls to the vehicle endpoints. Each takes the authenticated `request`
 * function from `useAuth()`, so the token (and 401 handling) come for free.
 */
import type { AuthContextValue } from '../auth/AuthContext'
import type { Vehicle } from './types'

type AuthRequest = AuthContextValue['request']

export function listVehicles(request: AuthRequest): Promise<Vehicle[]> {
  return request<Vehicle[]>('/vehicles')
}

export function purchaseVehicle(request: AuthRequest, id: number): Promise<Vehicle> {
  return request<Vehicle>(`/vehicles/${id}/purchase`, { method: 'POST' })
}
