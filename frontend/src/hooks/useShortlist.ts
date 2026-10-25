/**
 * The current user's shortlist: vehicle ids they saved to compare later.
 *
 * Kept in `localStorage` under a per-user key, so it survives reloads and
 * people sharing a browser each keep their own. It is a convenience, not
 * account data, so it is not stored on the server.
 */
import { useState } from 'react'

function storageKey(userId: number): string {
  return `dealership.shortlist.${userId}`
}

function load(userId: number): Set<number> {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(storageKey(userId)) ?? '[]')
    return new Set(Array.isArray(stored) ? stored.filter(Number.isInteger) : [])
  } catch {
    return new Set() // unreadable data: start with an empty shortlist
  }
}

export interface Shortlist {
  /** Number of saved vehicles. */
  size: number
  has: (vehicleId: number) => boolean
  /** Save the vehicle, or unsave it if it is already saved. */
  toggle: (vehicleId: number) => void
}

export function useShortlist(userId: number): Shortlist {
  const [ids, setIds] = useState(() => load(userId))

  function toggle(vehicleId: number) {
    const next = new Set(ids)
    if (next.has(vehicleId)) next.delete(vehicleId)
    else next.add(vehicleId)
    localStorage.setItem(storageKey(userId), JSON.stringify([...next]))
    setIds(next)
  }

  return { size: ids.size, has: (vehicleId) => ids.has(vehicleId), toggle }
}
