/** Display formatting shared across the UI. */
import type { FuelType, Transmission, VehicleCategory } from '../api/types'

const priceFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

/** `"21999.99"` → `"$21,999.99"`. Prices arrive as decimal strings from the API. */
export function formatPrice(price: string): string {
  return priceFormatter.format(Number(price))
}

const CATEGORY_LABELS: Record<VehicleCategory, string> = {
  sedan: 'Sedan',
  suv: 'SUV',
  hatchback: 'Hatchback',
  coupe: 'Coupe',
  convertible: 'Convertible',
  truck: 'Truck',
  van: 'Van',
  wagon: 'Wagon',
}

/** Human-readable category name, e.g. `"suv"` → `"SUV"`. */
export function formatCategory(category: VehicleCategory): string {
  return CATEGORY_LABELS[category]
}

const FUEL_LABELS: Record<FuelType, string> = {
  petrol: 'Petrol',
  diesel: 'Diesel',
  cng: 'CNG',
  electric: 'Electric',
  hybrid: 'Hybrid',
}

/** `"cng"` → `"CNG"`. */
export function formatFuel(fuel: FuelType): string {
  return FUEL_LABELS[fuel]
}

/** `"automatic"` → `"Automatic"`. */
export function formatTransmission(transmission: Transmission): string {
  return transmission === 'manual' ? 'Manual' : 'Automatic'
}

const numberFormatter = new Intl.NumberFormat('en-US')

/** `18500` → `"18,500 km"`. */
export function formatMileage(kilometres: number): string {
  return `${numberFormatter.format(kilometres)} km`
}
