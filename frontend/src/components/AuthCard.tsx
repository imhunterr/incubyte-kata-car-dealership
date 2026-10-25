/** Centered card used by the login and registration pages. */
import type { ReactNode } from 'react'

interface AuthCardProps {
  title: string
  subtitle: string
  /** Shown below the form, e.g. a link to the other auth page. */
  footer: ReactNode
  children: ReactNode
}

export function AuthCard({ title, subtitle, footer, children }: AuthCardProps) {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
      {children}
      <p className="mt-6 text-center text-sm text-slate-600">{footer}</p>
    </div>
  )
}
