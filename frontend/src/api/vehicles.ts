/**
 * Calls to the vehicle endpoints. Each takes the authenticated `request`
 * function from `useAuth()`, so the token (and 401 handling) come for free.
 */
import type { AuthContextValue } from '../auth/AuthContext'
import type { Vehicle, VehicleInput, VehicleSearch } from './types'

type AuthRequest = AuthContextValue['request']

export function listVehicles(request: AuthRequest): Promise<Vehicle[]> {
  return request<Vehicle[]>('/vehicles')
}

/** Vehicles matching every non-empty filter. */
export function searchVehicles(request: AuthRequest, filters: VehicleSearch): Promise<Vehicle[]> {
  return request<Vehicle[]>('/vehicles/search', { query: { ...filters } })
}

/** True if at least one filter has a value. */
export function hasFilters(filters: VehicleSearch): boolean {
  return Object.values(filters).some((value) => value !== undefined && value !== '')
}

export function purchaseVehicle(request: AuthRequest, id: number): Promise<Vehicle> {
  return request<Vehicle>(`/vehicles/${id}/purchase`, { method: 'POST' })
}

export function createVehicle(request: AuthRequest, input: VehicleInput): Promise<Vehicle> {
  return request<Vehicle>('/vehicles', { method: 'POST', body: input })
}

/** Replace every editable field of a vehicle (PUT). */
export function updateVehicle(
  request: AuthRequest,
  id: number,
  input: VehicleInput,
): Promise<Vehicle> {
  return request<Vehicle>(`/vehicles/${id}`, { method: 'PUT', body: input })
}
