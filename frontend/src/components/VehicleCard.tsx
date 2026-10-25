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
  /** True if the vehicle is on the user's shortlist. */
  saved: boolean
  onToggleSaved: (vehicle: Vehicle) => void
  /** Inventory actions; passed only for admins, so other users never see them. */
  adminActions?: AdminActions
}

export interface AdminActions {
  onEdit: (vehicle: Vehicle) => void
  onRestock: (vehicle: Vehicle) => void
  onDelete: (vehicle: Vehicle) => void
}

export function VehicleCard({
  vehicle,
  onPurchase,
  purchasing,
  saved,
  onToggleSaved,
  adminActions,
}: VehicleCardProps) {
  const name = `${vehicle.make} ${vehicle.model}`
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
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-lg leading-snug font-semibold text-navy-900">
            {vehicle.make} {vehicle.model}
          </h2>
          <button
            type="button"
            aria-label="Save to shortlist"
            aria-pressed={saved}
            title={saved ? 'Remove from shortlist' : 'Save to shortlist'}
            onClick={() => onToggleSaved(vehicle)}
            className={`-mt-1 -mr-1 grid h-9 w-9 shrink-0 place-items-center rounded-full transition hover:bg-navy-50 focus-visible:outline-2 focus-visible:outline-amber-500 ${
              saved ? 'text-amber-500' : 'text-slate-400 hover:text-navy-700'
            }`}
          >
            <HeartIcon filled={saved} />
          </button>
        </div>

        <ul className="mt-3 flex flex-wrap gap-1.5">
          {details.map((detail) => (
            <li
              key={detail}
              className="rounded-md bg-navy-50 px-2 py-0.5 text-xs font-medium text-navy-700"
            >
              {detail}
            </li>
          ))}
        </ul>

        <div className="mt-auto pt-4">
          <div className="flex items-end justify-between gap-2">
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

          {adminActions && (
            <div className="mt-3 grid grid-cols-3 gap-2 border-t border-navy-100 pt-3">
              <AdminButton label={`Edit ${name}`} onClick={() => adminActions.onEdit(vehicle)}>
                Edit
              </AdminButton>
              <AdminButton
                label={`Restock ${name}`}
                onClick={() => adminActions.onRestock(vehicle)}
              >
                Restock
              </AdminButton>
              <AdminButton
                label={`Delete ${name}`}
                onClick={() => adminActions.onDelete(vehicle)}
                danger
              >
                Delete
              </AdminButton>
            </div>
          )}
        </div>
      </div>
    </li>
  )
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    >
      <path d="M12 20s-7-4.4-9.3-8.6C1 8.1 3 4.5 6.6 4.5c2.1 0 3.6 1.2 4.4 2.6.8-1.4 2.3-2.6 4.4-2.6 3.6 0 5.6 3.6 3.9 6.9C19 15.6 12 20 12 20Z" />
    </svg>
  )
}

function AdminButton({
  label,
  onClick,
  danger = false,
  children,
}: {
  label: string
  onClick: () => void
  danger?: boolean
  children: string
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`rounded-lg px-2 py-1.5 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-amber-500 ${
        danger ? 'text-red-700 hover:bg-red-50' : 'text-navy-700 hover:bg-navy-50'
      }`}
    >
      {children}
    </button>
  )
}
