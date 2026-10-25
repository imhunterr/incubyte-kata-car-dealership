/**
 * One-click shortcuts shown in the dashboard hero: body types, the brands in
 * stock and budget ranges. Each button reflects whether its filter is applied
 * (`aria-pressed`); pressing an applied body type or brand again removes it.
 */
import type { ReactNode } from 'react'

import { VEHICLE_CATEGORIES, type VehicleSearch } from '../api/types'
import { BUDGET_PRESETS, isPresetActive, withoutFields } from '../lib/filters'
import { formatCategory } from '../lib/format'

interface QuickFiltersProps {
  filters: VehicleSearch
  /** Makes available in the inventory, alphabetically. */
  brands: string[]
  onChange: (filters: VehicleSearch) => void
}

export function QuickFilters({ filters, brands, onChange }: QuickFiltersProps) {
  function toggle(field: 'category' | 'make', value: string) {
    onChange(
      filters[field] === value ? withoutFields(filters, [field]) : { ...filters, [field]: value },
    )
  }

  return (
    <div className="mt-6 space-y-4">
      <ChipGroup label="Browse by body type">
        {VEHICLE_CATEGORIES.map((category) => (
          <Chip
            key={category}
            pressed={filters.category === category}
            onClick={() => toggle('category', category)}
          >
            {formatCategory(category)}
          </Chip>
        ))}
      </ChipGroup>

      {brands.length > 0 && (
        <ChipGroup label="Popular brands">
          {brands.map((brand) => (
            <Chip
              key={brand}
              pressed={filters.make === brand}
              onClick={() => toggle('make', brand)}
            >
              {brand}
            </Chip>
          ))}
        </ChipGroup>
      )}

      <ChipGroup label="Budget presets" visibleLabel="Budget">
        {BUDGET_PRESETS.map((preset) => (
          <Chip
            key={preset.label}
            pressed={isPresetActive(filters, preset)}
            onClick={() =>
              onChange({ ...filters, min_price: preset.min_price, max_price: preset.max_price })
            }
          >
            {preset.label}
          </Chip>
        ))}
      </ChipGroup>
    </div>
  )
}

function ChipGroup({
  label,
  visibleLabel = label,
  children,
}: {
  label: string
  visibleLabel?: string
  children: ReactNode
}) {
  return (
    <div role="group" aria-label={label}>
      <p className="mb-2 text-xs font-semibold tracking-wider text-navy-200 uppercase">
        {visibleLabel}
      </p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

function Chip({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 ${
        pressed
          ? 'bg-amber-400 text-navy-950'
          : 'bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/20'
      }`}
    >
      {children}
    </button>
  )
}
