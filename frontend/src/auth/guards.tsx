/**
 * Route guards. They only decide what to *show*; the API enforces the real
 * access rules on every request.
 */
import { Navigate, Outlet } from 'react-router'

import { useAuth } from './useAuth'

/** Renders nested routes for logged-in users; sends everyone else to login. */
export function RequireAuth() {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />
}

/** Keeps logged-in users off pages meant for visitors (login, register). */
export function RedirectIfAuthenticated() {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <Navigate to="/" replace /> : <Outlet />
}
