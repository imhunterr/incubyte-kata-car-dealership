/**
 * The app's pages and the access rules between them:
 *
 * - `/login`, `/register`: only for logged-out visitors.
 * - `/`: the dashboard, only for logged-in users.
 * - anything else: back to `/` (which itself redirects to login if needed).
 */
import { Navigate, Route, Routes } from 'react-router'

import { RedirectIfAuthenticated, RequireAuth } from './auth/guards'
import { Layout } from './components/Layout'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route element={<RedirectIfAuthenticated />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>
        <Route element={<RequireAuth />}>
          <Route path="/" element={<DashboardPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
