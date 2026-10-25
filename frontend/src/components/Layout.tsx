/** Page frame: the navy top bar (brand, current user, log out) above the routed page. */
import { Link, Outlet } from 'react-router'

import { useAuth } from '../auth/useAuth'
import { Button } from './Button'

export function Layout() {
  const { user, isAdmin, logout } = useAuth()

  return (
    <div className="min-h-screen">
      <header className="bg-navy-900 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
            <CarIcon />
            Car Dealership
          </Link>

          {user && (
            <div className="flex items-center gap-3 text-sm">
              <span className="hidden text-navy-200 sm:inline">{user.email}</span>
              {isAdmin && (
                <span className="rounded-full bg-amber-400/15 px-2.5 py-0.5 text-xs font-semibold text-amber-300 ring-1 ring-amber-400/40">
                  Admin
                </span>
              )}
              <Button variant="inverse" onClick={logout}>
                Log out
              </Button>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  )
}

function CarIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-7 w-7 text-amber-400"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 17H3v-5l2-5h11l4 5h1a1 1 0 0 1 1 1v4h-2" />
      <circle cx="7.5" cy="17" r="2" />
      <circle cx="16.5" cy="17" r="2" />
      <path d="M9.5 17h5M5 12h15" />
    </svg>
  )
}
