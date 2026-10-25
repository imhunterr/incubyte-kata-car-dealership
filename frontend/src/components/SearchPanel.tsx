/**
 * Search and filter form for the inventory.
 *
 * Price bounds are checked here first (non-negative, min ≤ max) for instant
 * feedback; the API applies the same rules.
 */
import { useState, type FormEvent } from 'react'

import { VEHICLE_CATEGORIES, type VehicleCategory, type VehicleSearch } from '../api/types'
import { formatCategory } from '../lib/format'
import { Button } from './Button'
import { SelectField } from './SelectField'
import { TextField } from './TextField'

const EMPTY_FILTERS: Required<VehicleSearch> = {
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

interface SearchPanelProps {
  onSearch: (filters: VehicleSearch) => void
  onClear: () => void
}

/** Validation message for the price range, or `undefined` if it is valid. */
function priceRangeError({ min_price, max_price }: VehicleSearch): string | undefined {
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

export function SearchPanel({ onSearch, onClear }: SearchPanelProps) {
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [priceError, setPriceError] = useState<string | undefined>()

  function update(field: keyof VehicleSearch, value: string) {
    setFilters((current) => ({ ...current, [field]: value }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const error = priceRangeError(filters)
    setPriceError(error)
    if (!error) onSearch({ ...filters, make: filters.make.trim(), model: filters.model.trim() })
  }

  function handleClear() {
    setFilters(EMPTY_FILTERS)
    setPriceError(undefined)
    onClear()
  }

  return (
    <form
      noValidate
      role="search"
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <TextField
          label="Make"
          value={filters.make}
          onChange={(event) => update('make', event.target.value)}
          placeholder="e.g. Toyota"
        />
        <TextField
          label="Model"
          value={filters.model}
          onChange={(event) => update('model', event.target.value)}
          placeholder="e.g. Corolla"
        />
        <SelectField
          label="Category"
          value={filters.category}
          onChange={(event) => update('category', event.target.value as VehicleCategory | '')}
        >
          <option value="">Any category</option>
          {VEHICLE_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {formatCategory(category)}
            </option>
          ))}
        </SelectField>
        <TextField
          label="Min price"
          type="number"
          min="0"
          inputMode="decimal"
          value={filters.min_price}
          onChange={(event) => update('min_price', event.target.value)}
          error={priceError}
        />
        <TextField
          label="Max price"
          type="number"
          min="0"
          inputMode="decimal"
          value={filters.max_price}
          onChange={(event) => update('max_price', event.target.value)}
          aria-invalid={priceError ? true : undefined}
        />
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={handleClear}>
          Clear
        </Button>
        <Button type="submit">Search</Button>
      </div>
    </form>
  )
}
