/**
 * Values and validation for the admin vehicle form. The rules mirror the
 * API's (see docs/SPEC.md) so admins get instant feedback; the API still has
 * the final say.
 */
import type { FuelType, Transmission, Vehicle, VehicleCategory, VehicleInput } from '../api/types'

/** What the form holds: every field as typed (strings), selects as enum values. */
export interface VehicleFormValues {
  make: string
  model: string
  category: VehicleCategory
  price: string
  quantity: string
  year: string
  fuel_type: FuelType
  transmission: Transmission
  mileage_km: string
}

export type VehicleFormErrors = Partial<Record<keyof VehicleFormValues, string>>

export const OLDEST_MODEL_YEAR = 1990
export const MAX_MILEAGE_KM = 1_000_000
const MAX_NAME_LENGTH = 50
const MAX_PRICE = 99_999_999.99
const WHOLE_NUMBER = /^\d+$/
const PRICE = /^\d+(\.\d+)?$/

export const EMPTY_VEHICLE_FORM: VehicleFormValues = {
  make: '',
  model: '',
  category: 'sedan',
  price: '',
  quantity: '',
  year: '',
  fuel_type: 'petrol',
  transmission: 'manual',
  mileage_km: '',
}

/** Form values for editing an existing vehicle. */
export function formValuesFor(vehicle: Vehicle): VehicleFormValues {
  return {
    make: vehicle.make,
    model: vehicle.model,
    category: vehicle.category,
    price: vehicle.price,
    quantity: String(vehicle.quantity),
    year: String(vehicle.year),
    fuel_type: vehicle.fuel_type,
    transmission: vehicle.transmission,
    mileage_km: String(vehicle.mileage_km),
  }
}

/** Newest acceptable model year: next year's models go on sale early. */
export function latestModelYear(): number {
  return new Date().getFullYear() + 1
}

function nameError(value: string, field: 'make' | 'model'): string | undefined {
  if (!value.trim()) return `Enter a ${field}`
  if (value.trim().length > MAX_NAME_LENGTH)
    return `${field === 'make' ? 'Make' : 'Model'} must be at most ${MAX_NAME_LENGTH} characters`
  return undefined
}

function priceError(value: string): string | undefined {
  const price = value.trim()
  if (!price) return 'Enter a price'
  if (!PRICE.test(price) || Number(price) <= 0) return 'Price must be greater than 0'
  if ((price.split('.')[1] ?? '').length > 2) return 'Use at most 2 decimal places'
  if (Number(price) > MAX_PRICE) return 'Price must be at most $99,999,999.99'
  return undefined
}

function quantityError(value: string): string | undefined {
  if (!value.trim()) return 'Enter the number of units in stock'
  if (!WHOLE_NUMBER.test(value.trim())) return 'Units in stock must be a whole number of 0 or more'
  return undefined
}

function yearError(value: string): string | undefined {
  if (!value.trim()) return 'Enter the model year'
  const year = Number(value)
  if (!WHOLE_NUMBER.test(value.trim()) || year < OLDEST_MODEL_YEAR || year > latestModelYear())
    return `Year must be between ${OLDEST_MODEL_YEAR} and ${latestModelYear()}`
  return undefined
}

function mileageError(value: string): string | undefined {
  if (!value.trim()) return 'Enter the mileage'
  if (!WHOLE_NUMBER.test(value.trim()) || Number(value) > MAX_MILEAGE_KM)
    return 'Mileage must be a whole number from 0 to 1,000,000'
  return undefined
}

/** Field errors; an empty object means the values are valid. */
export function validateVehicleForm(values: VehicleFormValues): VehicleFormErrors {
  const errors: VehicleFormErrors = {
    make: nameError(values.make, 'make'),
    model: nameError(values.model, 'model'),
    price: priceError(values.price),
    quantity: quantityError(values.quantity),
    year: yearError(values.year),
    mileage_km: mileageError(values.mileage_km),
  }
  return Object.fromEntries(
    Object.entries(errors).filter(([, message]) => message),
  ) as VehicleFormErrors
}

/** The API request body for valid form values. */
export function toVehicleInput(values: VehicleFormValues): VehicleInput {
  return {
    make: values.make.trim(),
    model: values.model.trim(),
    category: values.category,
    price: values.price.trim(),
    quantity: Number(values.quantity),
    year: Number(values.year),
    fuel_type: values.fuel_type,
    transmission: values.transmission,
    mileage_km: Number(values.mileage_km),
  }
}
