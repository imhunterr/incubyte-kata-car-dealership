/** Search-filter values and rules shared by the dashboard's filter UI. */
import type { FuelType, Transmission, VehicleCategory, VehicleSearch } from '../api/types'
import {
  formatCategory,
  formatFuel,
  formatMileage,
  formatTransmission,
  formatWholePrice,
} from './format'

export const EMPTY_FILTERS: Required<VehicleSearch> = {
  make: '',
  model: '',
  category: '',
  min_price: '',
  max_price: '',
  fuel_type: '',
  transmission: '',
  min_year: '',
  max_mileage: '',
}

const OLDEST_YEAR_OPTION = 2010
const NEWEST_YEAR_OPTION = new Date().getFullYear()
/** "2026 or newer", "2025 or newer", … down to 2010. */
export const YEAR_OPTIONS = Array.from(
  { length: NEWEST_YEAR_OPTION - OLDEST_YEAR_OPTION + 1 },
  (_, index) => NEWEST_YEAR_OPTION - index,
)
export const MILEAGE_OPTIONS = [10_000, 25_000, 50_000, 75_000, 100_000]

/** Validation message for the price range, or `undefined` if it is valid. */
export function priceRangeError({ min_price, max_price }: VehicleSearch): string | undefined {
  const min = min_price ? Number(min_price) : undefined
  const max = max_price ? Number(max_price) : undefined
  if ((min !== undefined && min < 0) || (max !== undefined && max < 0)) {
    return 'Prices cannot be negative'
  }
  if (min !== undefined && max !== undefined && min > max) {
    return 'Min price must not exceed max price'
  }
  return undefined
}

/** Only the filters that have a value (so `{}` means "no filters"). */
export function compactFilters(filters: VehicleSearch): VehicleSearch {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined && value !== ''),
  ) as VehicleSearch
}

/** A one-click price range. Empty bounds are open-ended. */
export interface BudgetPreset {
  label: string
  min_price: string
  max_price: string
}

export const BUDGET_PRESETS: BudgetPreset[] = [
  { label: 'Under $25,000', min_price: '', max_price: '25000' },
  { label: '$25,000 – $35,000', min_price: '25000', max_price: '35000' },
  { label: '$35,000 – $45,000', min_price: '35000', max_price: '45000' },
  { label: 'Over $45,000', min_price: '45000', max_price: '' },
]

/** True if `filters` has exactly this preset's price range. */
export function isPresetActive(filters: VehicleSearch, preset: BudgetPreset): boolean {
  return (
    (filters.min_price ?? '') === preset.min_price && (filters.max_price ?? '') === preset.max_price
  )
}

/** One applied filter, as shown in the "Active filters" chips. */
export interface FilterChip {
  /** The filter fields this chip stands for (both price bounds share one chip). */
  fields: (keyof VehicleSearch)[]
  label: string
}

function priceLabel({ min_price, max_price }: VehicleSearch): string | null {
  if (min_price && max_price)
    return `Price: ${formatWholePrice(min_price)} – ${formatWholePrice(max_price)}`
  if (max_price) return `Price: up to ${formatWholePrice(max_price)}`
  if (min_price) return `Price: from ${formatWholePrice(min_price)}`
  return null
}

/** A chip for every applied filter, in the order the sidebar lists them. */
export function filterChips(filters: VehicleSearch): FilterChip[] {
  const chips: FilterChip[] = []
  const add = (field: keyof VehicleSearch, label: string) => chips.push({ fields: [field], label })

  if (filters.make) add('make', `Make: ${filters.make}`)
  if (filters.model) add('model', `Model: ${filters.model}`)
  if (filters.category)
    add('category', `Body type: ${formatCategory(filters.category as VehicleCategory)}`)
  const price = priceLabel(filters)
  if (price) chips.push({ fields: ['min_price', 'max_price'], label: price })
  if (filters.fuel_type) add('fuel_type', `Fuel: ${formatFuel(filters.fuel_type as FuelType)}`)
  if (filters.transmission)
    add('transmission', `Transmission: ${formatTransmission(filters.transmission as Transmission)}`)
  if (filters.min_year) add('min_year', `Year: ${filters.min_year} or newer`)
  if (filters.max_mileage)
    add('max_mileage', `Mileage: up to ${formatMileage(Number(filters.max_mileage))}`)
  return chips
}

/** `filters` without the given fields. */
export function withoutFields(
  filters: VehicleSearch,
  fields: (keyof VehicleSearch)[],
): VehicleSearch {
  const remaining = { ...filters }
  for (const field of fields) delete remaining[field]
  return remaining
}
