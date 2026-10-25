/**
 * The inventory dashboard: search and filters, then every matching vehicle as
 * a card, with purchasing.
 *
 * Loading, empty and error states are all explicit, and the outcome of each
 * purchase is announced (`role="status"` for success, an alert for errors).
 */
import { useCallback, useEffect, useState } from 'react'

import { ApiError, messageFor } from '../api/client'
import type { Vehicle, VehicleSearch } from '../api/types'
import { hasFilters, listVehicles, purchaseVehicle, searchVehicles } from '../api/vehicles'
import { useAuth } from '../auth/useAuth'
import { Alert } from '../components/Alert'
import { Button } from '../components/Button'
import { SearchPanel } from '../components/SearchPanel'
import { VehicleCard } from '../components/VehicleCard'

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'loaded'; vehicles: Vehicle[] }

export function DashboardPage() {
  const { request } = useAuth()
  const [load, setLoad] = useState<LoadState>({ status: 'loading' })
  const [purchasingId, setPurchasingId] = useState<number | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  /** The filters behind the current list; empty means "whole inventory". */
  const [filters, setFilters] = useState<VehicleSearch>({})

  /** Fetch the vehicles matching `filters` and describe the outcome as a load state. */
  const fetchVehicles = useCallback(
    async (filters: VehicleSearch): Promise<LoadState> => {
      try {
        const vehicles = hasFilters(filters)
          ? await searchVehicles(request, filters)
          : await listVehicles(request)
        return { status: 'loaded', vehicles }
      } catch (error) {
        return { status: 'error', message: messageFor(error) }
      }
    },
    [request],
  )

  useEffect(() => {
    let active = true // ignore a response that arrives after unmounting
    void fetchVehicles({}).then((state) => {
      if (active) setLoad(state)
    })
    return () => {
      active = false
    }
  }, [fetchVehicles])

  async function showVehicles(newFilters: VehicleSearch) {
    setFilters(newFilters)
    setLoad({ status: 'loading' })
    setLoad(await fetchVehicles(newFilters))
  }

  /** Replace one vehicle in the loaded list (e.g. with its new stock). */
  function updateVehicle(updated: Vehicle) {
    setLoad((current) =>
      current.status === 'loaded'
        ? {
            ...current,
            vehicles: current.vehicles.map((v) => (v.id === updated.id ? updated : v)),
          }
        : current,
    )
  }

  async function handlePurchase(vehicle: Vehicle) {
    setPurchasingId(vehicle.id)
    setNotice(null)
    setActionError(null)
    try {
      updateVehicle(await purchaseVehicle(request, vehicle.id))
      setNotice(`You bought a ${vehicle.make} ${vehicle.model}.`)
    } catch (error) {
      setActionError(messageFor(error))
      // 409: someone else bought the last unit first, so it is sold out now.
      if (error instanceof ApiError && error.status === 409) {
        updateVehicle({ ...vehicle, quantity: 0 })
      }
    } finally {
      setPurchasingId(null)
    }
  }

  return (
    <section>
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
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-16 -right-16 h-64 w-64 rounded-full bg-amber-400/10"
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[18rem_1fr]">
        <aside>
          <SearchPanel
            onSearch={(newFilters) => void showVehicles(newFilters)}
            onClear={() => void showVehicles({})}
          />
        </aside>

        <div>
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 className="text-2xl font-bold tracking-tight">Vehicles</h2>
            {load.status === 'loaded' && (
              <p className="text-sm text-slate-600">
                {load.vehicles.length} {load.vehicles.length === 1 ? 'vehicle' : 'vehicles'}
              </p>
            )}
          </div>

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
                <Button variant="secondary" onClick={() => void showVehicles(filters)}>
                  Try again
                </Button>
              </div>
            )}

            {load.status === 'loaded' && load.vehicles.length === 0 && (
              <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">
                {hasFilters(filters)
                  ? 'No vehicles match your search.'
                  : 'No vehicles in the inventory yet.'}
              </p>
            )}

            {load.status === 'loaded' && load.vehicles.length > 0 && (
              <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {load.vehicles.map((vehicle) => (
                  <VehicleCard
                    key={vehicle.id}
                    vehicle={vehicle}
                    onPurchase={handlePurchase}
                    purchasing={purchasingId === vehicle.id}
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
