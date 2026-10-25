/** Search-filter values and rules shared by the dashboard's filter UI. */
import type { VehicleSearch } from '../api/types'

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
