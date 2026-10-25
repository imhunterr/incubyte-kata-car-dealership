/** Root component: browser routing and authentication state around the pages. */
import { BrowserRouter } from 'react-router'

import { AppRoutes } from './AppRoutes'
import { AuthProvider } from './auth/AuthProvider'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
