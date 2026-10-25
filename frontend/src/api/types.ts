/**
 * Shapes of the data exchanged with the API. They mirror the backend's
 * Pydantic schemas (see docs/SPEC.md).
 */

export type Role = 'user' | 'admin'

export interface User {
  id: number
  email: string
  role: Role
}

export interface TokenResponse {
  access_token: string
  token_type: 'bearer'
  user: User
}

export const VEHICLE_CATEGORIES = [
  'sedan',
  'suv',
  'hatchback',
  'coupe',
  'convertible',
  'truck',
  'van',
  'wagon',
] as const

export type VehicleCategory = (typeof VEHICLE_CATEGORIES)[number]

export interface Vehicle {
  id: number
  make: string
  model: string
  category: VehicleCategory
  /** Decimal amount as a string (e.g. "21999.99"), so no precision is lost. */
  price: string
  quantity: number
}

/** Body for creating or (fully) updating a vehicle. */
export type VehicleInput = Omit<Vehicle, 'id'>

/** Search filters; every one is optional. */
export interface VehicleSearch {
  make?: string
  model?: string
  category?: VehicleCategory | ''
  min_price?: string
  max_price?: string
}
