/** Client-side ordering of the vehicles currently shown. */
import type { Vehicle } from '../api/types'

export type SortOrder = 'recommended' | 'price-asc' | 'price-desc' | 'year-desc' | 'mileage-asc'

export const SORT_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'year-desc', label: 'Newest first' },
  { value: 'mileage-asc', label: 'Lowest mileage' },
]

const COMPARATORS: Record<Exclude<SortOrder, 'recommended'>, (a: Vehicle, b: Vehicle) => number> = {
  'price-asc': (a, b) => Number(a.price) - Number(b.price),
  'price-desc': (a, b) => Number(b.price) - Number(a.price),
  'year-desc': (a, b) => b.year - a.year,
  'mileage-asc': (a, b) => a.mileage_km - b.mileage_km,
}

/**
 * A sorted copy of `vehicles`. "Recommended" keeps the API's order (by id).
 * The sort is stable, so ties keep that order too.
 */
export function sortVehicles(vehicles: Vehicle[], order: SortOrder): Vehicle[] {
  return order === 'recommended' ? vehicles : [...vehicles].sort(COMPARATORS[order])
}
