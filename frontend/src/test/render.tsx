/**
 * Render helpers for tests that exercise the app as a whole.
 */
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'

import { AppRoutes } from '../AppRoutes'
import { AuthProvider } from '../auth/AuthProvider'

/**
 * Render the full app (auth state + routes) starting at `route`.
 * Returns a `user-event` instance for realistic interactions.
 */
export function renderApp(route = '/') {
  const user = userEvent.setup()
  const result = render(
    <AuthProvider>
      <MemoryRouter initialEntries={[route]}>
        <AppRoutes />
      </MemoryRouter>
    </AuthProvider>,
  )
  return { user, ...result }
}
