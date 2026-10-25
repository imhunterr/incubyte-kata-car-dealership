/** One vehicle in the inventory grid: illustration, key details, price and Purchase. */
import type { Vehicle } from '../api/types'
import {
  formatCategory,
  formatFuel,
  formatMileage,
  formatPrice,
  formatTransmission,
} from '../lib/format'
import { Button } from './Button'
import { VehicleIllustration } from './VehicleIllustration'

/** At or below this many units, the card warns that stock is running out. */
const LOW_STOCK_THRESHOLD = 2

interface VehicleCardProps {
  vehicle: Vehicle
  onPurchase: (vehicle: Vehicle) => void
  /** True while this vehicle's purchase request is in flight. */
  purchasing: boolean
}

export function VehicleCard({ vehicle, onPurchase, purchasing }: VehicleCardProps) {
  const soldOut = vehicle.quantity === 0
  const lowStock = !soldOut && vehicle.quantity <= LOW_STOCK_THRESHOLD
  const details = [
    String(vehicle.year),
    formatMileage(vehicle.mileage_km),
    formatFuel(vehicle.fuel_type),
    formatTransmission(vehicle.transmission),
  ]

  return (
    <li className="flex flex-col overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="relative bg-gradient-to-br from-navy-50 to-navy-100 px-6 pt-6 pb-3">
        <VehicleIllustration category={vehicle.category} />
        <span className="absolute top-3 left-3 rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-semibold text-navy-800 shadow-sm">
          {formatCategory(vehicle.category)}
        </span>
        {lowStock && (
          <span className="absolute top-3 right-3 rounded-full bg-amber-400 px-2.5 py-0.5 text-xs font-bold text-navy-950">
            Only {vehicle.quantity} left
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h2 className="text-lg leading-snug font-semibold text-navy-900">
          {vehicle.make} {vehicle.model}
        </h2>

        <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-600">
          {details.map((detail, index) => (
            <li key={detail} className="flex items-center gap-3">
              {index > 0 && (
                <span aria-hidden="true" className="h-1 w-1 rounded-full bg-slate-300" />
              )}
              {detail}
            </li>
          ))}
        </ul>

        <div className="mt-4 flex items-end justify-between gap-2">
          <p className="text-2xl font-extrabold tracking-tight text-navy-900">
            {formatPrice(vehicle.price)}
          </p>
          <p className={`text-sm font-medium ${soldOut ? 'text-red-600' : 'text-emerald-700'}`}>
            {soldOut ? 'Out of stock' : `${vehicle.quantity} in stock`}
          </p>
        </div>

        <Button
          className="mt-5 w-full"
          disabled={soldOut || purchasing}
          onClick={() => onPurchase(vehicle)}
        >
          {purchasing ? 'Purchasing…' : 'Purchase'}
        </Button>
      </div>
    </li>
  )
}
