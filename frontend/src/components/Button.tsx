/** Buttons in the app's visual styles. */
import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'inverse'

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    'bg-amber-400 text-navy-950 shadow-sm hover:bg-amber-300 focus-visible:outline-amber-500',
  secondary:
    'border border-navy-200 bg-white text-navy-800 hover:bg-navy-50 focus-visible:outline-amber-500',
  danger: 'bg-red-600 text-white shadow-sm hover:bg-red-700 focus-visible:outline-red-600',
  /** For use on dark (navy) backgrounds. */
  inverse:
    'border border-navy-700 bg-navy-800 text-white hover:bg-navy-700 focus-visible:outline-amber-400',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

export function Button({
  variant = 'primary',
  type = 'button',
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:border-transparent disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  )
}
