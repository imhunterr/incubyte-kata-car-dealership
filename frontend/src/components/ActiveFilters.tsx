/** The applied filters as removable chips, with "Clear all". Hidden when nothing is filtered. */
import type { VehicleSearch } from '../api/types'
import { filterChips, withoutFields } from '../lib/filters'

interface ActiveFiltersProps {
  filters: VehicleSearch
  onChange: (filters: VehicleSearch) => void
}

export function ActiveFilters({ filters, onChange }: ActiveFiltersProps) {
  const chips = filterChips(filters)
  if (chips.length === 0) return null

  return (
    <div
      role="group"
      aria-label="Active filters"
      className="mt-3 flex flex-wrap items-center gap-2"
    >
      {chips.map((chip) => (
        <span
          key={chip.label}
          className="inline-flex items-center gap-1 rounded-full bg-navy-100 py-1 pr-1 pl-3 text-sm font-medium text-navy-800"
        >
          {chip.label}
          <button
            type="button"
            aria-label={`Remove filter ${chip.label}`}
            onClick={() => onChange(withoutFields(filters, chip.fields))}
            className="grid h-6 w-6 place-items-center rounded-full text-navy-500 hover:bg-navy-200 hover:text-navy-900 focus-visible:outline-2 focus-visible:outline-amber-500"
          >
            <span aria-hidden="true">×</span>
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={() => onChange({})}
        className="text-sm font-semibold text-amber-700 hover:text-amber-800"
      >
        Clear all filters
      </button>
    </div>
  )
}
