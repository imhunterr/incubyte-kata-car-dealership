/**
 * Search and filter form for the inventory, laid out as a sidebar.
 *
 * Price bounds are checked here first (non-negative, min ≤ max) for instant
 * feedback; the API applies the same rules.
 */
import { useState, type FormEvent } from 'react'

import { FUEL_TYPES, TRANSMISSIONS, VEHICLE_CATEGORIES, type VehicleSearch } from '../api/types'
import { EMPTY_FILTERS, MILEAGE_OPTIONS, priceRangeError, YEAR_OPTIONS } from '../lib/filters'
import { formatCategory, formatFuel, formatMileage, formatTransmission } from '../lib/format'
import { Button } from './Button'
import { SelectField } from './SelectField'
import { TextField } from './TextField'

interface SearchPanelProps {
  onSearch: (filters: VehicleSearch) => void
  onClear: () => void
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
      aria-label="Filter vehicles"
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-navy-100 bg-white p-5 shadow-sm"
    >
      <h2 className="text-base font-bold">Filters</h2>

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
        onChange={(event) => update('category', event.target.value)}
      >
        <option value="">Any category</option>
        {VEHICLE_CATEGORIES.map((category) => (
          <option key={category} value={category}>
            {formatCategory(category)}
          </option>
        ))}
      </SelectField>

      <fieldset>
        <legend className="mb-1 text-sm font-medium text-slate-700">Budget</legend>
        <div className="grid grid-cols-2 gap-2">
          <TextField
            label="Min price"
            type="number"
            min="0"
            inputMode="decimal"
            value={filters.min_price}
            onChange={(event) => update('min_price', event.target.value)}
            error={priceError}
            className="[&_label]:sr-only"
            placeholder="Min $"
          />
          <TextField
            label="Max price"
            type="number"
            min="0"
            inputMode="decimal"
            value={filters.max_price}
            onChange={(event) => update('max_price', event.target.value)}
            aria-invalid={priceError ? true : undefined}
            className="[&_label]:sr-only"
            placeholder="Max $"
          />
        </div>
      </fieldset>

      <SelectField
        label="Fuel type"
        value={filters.fuel_type}
        onChange={(event) => update('fuel_type', event.target.value)}
      >
        <option value="">Any fuel</option>
        {FUEL_TYPES.map((fuel) => (
          <option key={fuel} value={fuel}>
            {formatFuel(fuel)}
          </option>
        ))}
      </SelectField>
      <SelectField
        label="Transmission"
        value={filters.transmission}
        onChange={(event) => update('transmission', event.target.value)}
      >
        <option value="">Any transmission</option>
        {TRANSMISSIONS.map((transmission) => (
          <option key={transmission} value={transmission}>
            {formatTransmission(transmission)}
          </option>
        ))}
      </SelectField>
      <SelectField
        label="Model year"
        value={filters.min_year}
        onChange={(event) => update('min_year', event.target.value)}
      >
        <option value="">Any year</option>
        {YEAR_OPTIONS.map((year) => (
          <option key={year} value={year}>
            {year} or newer
          </option>
        ))}
      </SelectField>
      <SelectField
        label="Mileage"
        value={filters.max_mileage}
        onChange={(event) => update('max_mileage', event.target.value)}
      >
        <option value="">Any mileage</option>
        {MILEAGE_OPTIONS.map((kilometres) => (
          <option key={kilometres} value={kilometres}>
            Up to {formatMileage(kilometres)}
          </option>
        ))}
      </SelectField>

      <div className="flex gap-2 pt-1">
        <Button variant="secondary" onClick={handleClear} className="flex-1">
          Clear
        </Button>
        <Button type="submit" className="flex-1">
          Search
        </Button>
      </div>
    </form>
  )
}
