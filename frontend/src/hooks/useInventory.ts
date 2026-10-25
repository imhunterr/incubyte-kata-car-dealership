/**
 * The vehicles the dashboard shows and the filters behind them.
 *
 * Loads the whole inventory on mount, re-queries when the filters change
 * (search endpoint if any filter is set, list endpoint otherwise), and lets
 * callers patch single vehicles in place after a purchase or edit.
 */
import { useCallback, useEffect, useState } from 'react'

import { messageFor } from '../api/client'
import type { Vehicle, VehicleSearch } from '../api/types'
import { hasFilters, listVehicles, searchVehicles } from '../api/vehicles'
import { useAuth } from '../auth/useAuth'
import { compactFilters } from '../lib/filters'

export type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'loaded'; vehicles: Vehicle[] }

export function useInventory() {
  const { request } = useAuth()
  const [load, setLoad] = useState<LoadState>({ status: 'loading' })
  /** The filters behind the current list; empty means "whole inventory". */
  const [filters, setFilters] = useState<VehicleSearch>({})
  /** Makes in the whole inventory, for the brand shortcuts. */
  const [brands, setBrands] = useState<string[]>([])

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

  /** Show a load result; an unfiltered list also refreshes the brand shortcuts. */
  const applyLoad = useCallback((state: LoadState, appliedFilters: VehicleSearch) => {
    setLoad(state)
    if (state.status === 'loaded' && !hasFilters(appliedFilters)) {
      setBrands([...new Set(state.vehicles.map((vehicle) => vehicle.make))].sort())
    }
  }, [])

  useEffect(() => {
    let active = true // ignore a response that arrives after unmounting
    void fetchVehicles({}).then((state) => {
      if (active) applyLoad(state, {})
    })
    return () => {
      active = false
    }
  }, [fetchVehicles, applyLoad])

  /** Apply new filters (empty values are dropped) and load the matching vehicles. */
  async function applyFilters(newFilters: VehicleSearch) {
    const applied = compactFilters(newFilters)
    setFilters(applied)
    setLoad({ status: 'loading' })
    applyLoad(await fetchVehicles(applied), applied)
  }

  /** Replace one vehicle in the loaded list (e.g. with its new stock). */
  function replaceVehicle(updated: Vehicle) {
    setLoad((current) =>
      current.status === 'loaded'
        ? {
            ...current,
            vehicles: current.vehicles.map((v) => (v.id === updated.id ? updated : v)),
          }
        : current,
    )
  }

  return { load, filters, brands, applyFilters, replaceVehicle }
}
