/** Display formatting shared across the UI. */
import type { VehicleCategory } from '../api/types'

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
