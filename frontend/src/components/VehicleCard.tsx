/** One vehicle in the inventory grid, with its Purchase button. */
import type { Vehicle } from '../api/types'
import { formatCategory, formatPrice } from '../lib/format'
import { Button } from './Button'

interface VehicleCardProps {
  vehicle: Vehicle
  onPurchase: (vehicle: Vehicle) => void
  /** True while this vehicle's purchase request is in flight. */
  purchasing: boolean
}

export function VehicleCard({ vehicle, onPurchase, purchasing }: VehicleCardProps) {
  const soldOut = vehicle.quantity === 0

  return (
    <li className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-semibold leading-snug">
          {vehicle.make} {vehicle.model}
        </h2>
        <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
          {formatCategory(vehicle.category)}
        </span>
      </div>

      <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
        {formatPrice(vehicle.price)}
      </p>
      <p className={`mt-1 text-sm font-medium ${soldOut ? 'text-red-600' : 'text-emerald-700'}`}>
        {soldOut ? 'Out of stock' : `${vehicle.quantity} in stock`}
      </p>

      <Button
        className="mt-5 w-full"
        disabled={soldOut || purchasing}
        onClick={() => onPurchase(vehicle)}
      >
        {purchasing ? 'Purchasing…' : 'Purchase'}
      </Button>
    </li>
  )
}
