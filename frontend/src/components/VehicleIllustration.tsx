/**
 * Decorative side-view silhouette of a vehicle's body type, shown at the top
 * of each card in place of a photo. Purely visual (`aria-hidden`).
 */
import type { VehicleCategory } from '../api/types'

type Shape = 'low' | 'hatch' | 'tall' | 'pickup'

const SHAPES: Record<VehicleCategory, Shape> = {
  sedan: 'low',
  coupe: 'low',
  convertible: 'low',
  hatchback: 'hatch',
  wagon: 'hatch',
  suv: 'tall',
  van: 'tall',
  truck: 'pickup',
}

/** Body outlines drawn on a 120×48 canvas, wheels excluded. */
const BODY_PATHS: Record<Shape, string> = {
  low: 'M6 34 L10 26 L30 24 L44 14 L78 14 L92 24 L110 27 L114 34 Z',
  hatch: 'M6 34 L10 25 L28 22 L40 12 L84 12 L96 22 L112 24 L114 34 Z',
  tall: 'M6 34 L8 22 L22 20 L32 8 L96 8 L104 20 L112 22 L114 34 Z',
  pickup: 'M6 34 L8 22 L24 20 L34 10 L62 10 L66 20 L112 20 L114 34 Z',
}

export function VehicleIllustration({ category }: { category: VehicleCategory }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 120 48" className="h-20 w-full">
      <path d={BODY_PATHS[SHAPES[category]]} className="fill-navy-700" />
      <circle cx="32" cy="36" r="7" className="fill-navy-950" />
      <circle cx="32" cy="36" r="3" className="fill-amber-400" />
      <circle cx="88" cy="36" r="7" className="fill-navy-950" />
      <circle cx="88" cy="36" r="3" className="fill-amber-400" />
    </svg>
  )
}
