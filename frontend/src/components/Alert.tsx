/** An error message announced to screen readers as soon as it appears. */
import type { ReactNode } from 'react'

export function Alert({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      role="alert"
      className={`rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 ${className}`}
    >
      {children}
    </div>
  )
}
