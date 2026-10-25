/** Calls to the authentication endpoints. */
import { apiRequest } from './client'
import type { TokenResponse, User } from './types'

export function login(email: string, password: string): Promise<TokenResponse> {
  return apiRequest<TokenResponse>('/auth/login', {
    method: 'POST',
    body: { email, password },
  })
}

export function register(email: string, password: string): Promise<User> {
  return apiRequest<User>('/auth/register', { method: 'POST', body: { email, password } })
}
