/**
 * The inventory dashboard: every vehicle as a card, with purchasing.
 *
 * Loading, empty and error states are all explicit, and the outcome of each
 * purchase is announced (`role="status"` for success, an alert for errors).
 */
import { useCallback, useEffect, useState } from 'react'

import { ApiError, messageFor } from '../api/client'
import type { Vehicle } from '../api/types'
import { listVehicles, purchaseVehicle } from '../api/vehicles'
import { useAuth } from '../auth/useAuth'
import { Alert } from '../components/Alert'
import { Button } from '../components/Button'
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

  /** Fetch the inventory and describe the outcome as a load state. */
  const fetchInventory = useCallback(async (): Promise<LoadState> => {
    try {
      return { status: 'loaded', vehicles: await listVehicles(request) }
    } catch (error) {
      return { status: 'error', message: messageFor(error) }
    }
  }, [request])

  useEffect(() => {
    let active = true // ignore a response that arrives after unmounting
    void fetchInventory().then((state) => {
      if (active) setLoad(state)
    })
    return () => {
      active = false
    }
  }, [fetchInventory])

  async function retry() {
    setLoad({ status: 'loading' })
    setLoad(await fetchInventory())
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
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Vehicles</h1>
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
            <Button variant="secondary" onClick={() => void retry()}>
              Try again
            </Button>
          </div>
        )}

        {load.status === 'loaded' && load.vehicles.length === 0 && (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">
            No vehicles in the inventory yet.
          </p>
        )}

        {load.status === 'loaded' && load.vehicles.length > 0 && (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
    </section>
  )
}
