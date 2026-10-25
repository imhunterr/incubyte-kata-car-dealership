/** The authentication context object and the shape of its value. */
import { createContext } from 'react'

import type { RequestOptions } from '../api/client'
import type { User } from '../api/types'

export interface AuthContextValue {
  /** The logged-in user, or `null` when logged out. */
  user: User | null
  isAuthenticated: boolean
  isAdmin: boolean
  /** Log in; rejects with an `ApiError` on bad credentials. */
  login: (email: string, password: string) => Promise<void>
  /** Create an account, then log straight in. */
  register: (email: string, password: string) => Promise<void>
  logout: () => void
  /** `apiRequest` with the session token; a 401 response logs the user out. */
  request: <T = unknown>(path: string, options?: Omit<RequestOptions, 'token'>) => Promise<T>
}

/** `null` outside an `<AuthProvider>`; `useAuth()` turns that into an error. */
export const AuthContext = createContext<AuthContextValue | null>(null)
