import { useContext } from 'react'

import { AuthContext, type AuthContextValue } from './AuthContext'

/** Access the authentication state. Must be used inside `<AuthProvider>`. */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (context === null) throw new Error('useAuth must be used inside <AuthProvider>')
  return context
}
