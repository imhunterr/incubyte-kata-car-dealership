/**
 * Authentication state for the whole app.
 *
 * `<AuthProvider>` holds the current session (token + user) and exposes it via
 * `useAuth()`, together with `login`, `register`, `logout` and `request`, an
 * authenticated version of `apiRequest` that adds the token and logs the user
 * out whenever the API answers 401 (expired or revoked token).
 */
import { useCallback, useMemo, useState, type ReactNode } from 'react'

import * as authApi from '../api/auth'
import { ApiError, apiRequest, type RequestOptions } from '../api/client'
import { AuthContext, type AuthContextValue } from './AuthContext'
import { clearSession, loadSession, saveSession, type Session } from './session'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(loadSession)

  const logout = useCallback(() => {
    clearSession()
    setSession(null)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const { access_token: token, user } = await authApi.login(email, password)
    const newSession = { token, user }
    saveSession(newSession)
    setSession(newSession)
  }, [])

  const register = useCallback(
    async (email: string, password: string) => {
      await authApi.register(email, password)
      await login(email, password)
    },
    [login],
  )

  const token = session?.token ?? null
  const request = useCallback(
    async <T,>(path: string, options: Omit<RequestOptions, 'token'> = {}): Promise<T> => {
      try {
        return await apiRequest<T>(path, { ...options, token })
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) logout()
        throw error
      }
    },
    [token, logout],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      user: session?.user ?? null,
      isAuthenticated: session !== null,
      isAdmin: session?.user.role === 'admin',
      login,
      register,
      logout,
      request,
    }),
    [session, login, register, logout, request],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
