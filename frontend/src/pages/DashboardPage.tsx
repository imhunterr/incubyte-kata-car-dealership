/**
 * The inventory dashboard: search and filters, then every matching vehicle as
 * a card, with purchasing.
 *
 * Loading, empty and error states are all explicit, and the outcome of each
 * purchase is announced (`role="status"` for success, an alert for errors).
 */
import { useId, useState } from 'react'

import { ApiError, messageFor } from '../api/client'
import type { Vehicle } from '../api/types'
import { hasFilters, purchaseVehicle } from '../api/vehicles'
import { useAuth } from '../auth/useAuth'
import { Alert } from '../components/Alert'
import { Button } from '../components/Button'
import { ActiveFilters } from '../components/ActiveFilters'
import { DashboardHero } from '../components/DashboardHero'
import { SearchPanel } from '../components/SearchPanel'
import { VehicleCard, type AdminActions } from '../components/VehicleCard'
import { SelectField } from '../components/SelectField'
import { useInventory } from '../hooks/useInventory'
import { useShortlist } from '../hooks/useShortlist'
import { SORT_OPTIONS, sortVehicles, type SortOrder } from '../lib/sorting'

export function DashboardPage() {
  const { request, user, isAdmin } = useAuth()
  // The dashboard is only rendered for logged-in users.
  const shortlist = useShortlist(user!.id)
  const [showShortlistOnly, setShowShortlistOnly] = useState(false)
  const { load, filters, brands, applyFilters, replaceVehicle } = useInventory()
  const [purchasingId, setPurchasingId] = useState<number | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [sortOrder, setSortOrder] = useState<SortOrder>('recommended')
  // On small screens the filter panel is collapsed behind a toggle so the
  // results are visible straight away; from `lg` up it is always shown.
  const [filtersOpen, setFiltersOpen] = useState(false)
  const filterPanelId = useId()

  async function handlePurchase(vehicle: Vehicle) {
    setPurchasingId(vehicle.id)
    setNotice(null)
    setActionError(null)
    try {
      replaceVehicle(await purchaseVehicle(request, vehicle.id))
      setNotice(`You bought a ${vehicle.make} ${vehicle.model}.`)
    } catch (error) {
      setActionError(messageFor(error))
      // 409: someone else bought the last unit first, so it is sold out now.
      if (error instanceof ApiError && error.status === 409) {
        replaceVehicle({ ...vehicle, quantity: 0 })
      }
    } finally {
      setPurchasingId(null)
    }
  }

  // Wired up to dialogs in the following steps.
  const adminActions: AdminActions = {
    onEdit: () => undefined,
    onRestock: () => undefined,
    onDelete: () => undefined,
  }

  const loadedVehicles = load.status === 'loaded' ? load.vehicles : []
  const shownVehicles = sortVehicles(
    showShortlistOnly ? loadedVehicles.filter((v) => shortlist.has(v.id)) : loadedVehicles,
    sortOrder,
  )

  /** Why there is nothing to show, once loaded. */
  function emptyMessage(): string {
    if (showShortlistOnly) {
      return shortlist.size === 0
        ? 'Your shortlist is empty. Save vehicles to compare them here.'
        : 'None of your shortlisted vehicles match this search.'
    }
    return hasFilters(filters)
      ? 'No vehicles match your search.'
      : 'No vehicles in the inventory yet.'
  }

  return (
    <section>
      <DashboardHero
        filters={filters}
        brands={brands}
        onFiltersChange={(newFilters) => void applyFilters(newFilters)}
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[18rem_1fr]">
        <aside>
          <Button
            variant="secondary"
            aria-expanded={filtersOpen}
            aria-controls={filterPanelId}
            onClick={() => setFiltersOpen((open) => !open)}
            className="mb-3 w-full lg:hidden"
          >
            {filtersOpen ? 'Hide filters' : 'Show filters'}
          </Button>
          <SearchPanel
            id={filterPanelId}
            className={filtersOpen ? '' : 'hidden lg:block'}
            key={JSON.stringify(filters)}
            initialFilters={filters}
            onSearch={(newFilters) => void applyFilters(newFilters)}
            onClear={() => void applyFilters({})}
          />
        </aside>

        <div>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Vehicles</h2>
              {load.status === 'loaded' && (
                <p className="text-sm text-slate-600">
                  {load.vehicles.length} {load.vehicles.length === 1 ? 'vehicle' : 'vehicles'}
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-end gap-3">
              {isAdmin && <Button onClick={() => undefined}>Add vehicle</Button>}
              <Button
                variant="secondary"
                aria-pressed={showShortlistOnly}
                onClick={() => setShowShortlistOnly((current) => !current)}
                className={showShortlistOnly ? 'ring-2 ring-amber-400' : ''}
              >
                Shortlisted ({shortlist.size})
              </Button>
              <SelectField
                label="Sort by"
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value as SortOrder)}
                className="w-52"
              >
                {SORT_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </SelectField>
            </div>
          </div>

          <ActiveFilters
            filters={filters}
            onChange={(newFilters) => void applyFilters(newFilters)}
          />

          <div role="status" className="mt-4 empty:hidden">
            {notice && (
              <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                {notice}
              </p>
            )}
          </div>
          {actionError && <Alert className="mt-4">{actionError}</Alert>}

          <div className="mt-6">
            {load.status === 'loading' && <p className="text-slate-600">Loading vehicles…</p>}

            {load.status === 'error' && (
              <div className="space-y-3">
                <Alert>{load.message}</Alert>
                <Button variant="secondary" onClick={() => void applyFilters(filters)}>
                  Try again
                </Button>
              </div>
            )}

            {load.status === 'loaded' && shownVehicles.length === 0 && (
              <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">
                {emptyMessage()}
              </p>
            )}

            {shownVehicles.length > 0 && (
              <ul aria-label="Search results" className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {shownVehicles.map((vehicle) => (
                  <VehicleCard
                    key={vehicle.id}
                    vehicle={vehicle}
                    onPurchase={handlePurchase}
                    purchasing={purchasingId === vehicle.id}
                    saved={shortlist.has(vehicle.id)}
                    onToggleSaved={(saved) => shortlist.toggle(saved.id)}
                    adminActions={isAdmin ? adminActions : undefined}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
