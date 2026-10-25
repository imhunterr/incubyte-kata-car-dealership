/** The dashboard's navy banner: headline plus the one-click quick filters. */
import type { VehicleSearch } from '../api/types'
import { QuickFilters } from './QuickFilters'

interface DashboardHeroProps {
  filters: VehicleSearch
  brands: string[]
  onFiltersChange: (filters: VehicleSearch) => void
}

export function DashboardHero({ filters, brands, onFiltersChange }: DashboardHeroProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-navy-900 via-navy-800 to-navy-700 px-6 py-10 text-white shadow-lg sm:px-10">
      <p className="text-sm font-semibold tracking-wider text-amber-300 uppercase">
        Quality cars, transparent prices
      </p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
        Find your next car
      </h1>
      <p className="mt-2 max-w-xl text-navy-200">
        Search by make, model, body type or budget, then buy in one click.
      </p>
      <QuickFilters filters={filters} brands={brands} onChange={onFiltersChange} />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-amber-400/20 blur-3xl"
      />
    </div>
  )
}
