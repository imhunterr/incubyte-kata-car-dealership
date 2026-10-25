import { act, renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { ApiError } from '../api/client'
import { server } from '../test/server'
import { customer, SESSION_KEY, storeSession } from '../test/fixtures'
import { AuthProvider, useAuth } from './AuthContext'

function renderAuth() {
  return renderHook(() => useAuth(), { wrapper: AuthProvider })
}

function respondToLogin(token = 'fresh-token') {
  server.use(
    http.post('*/api/auth/login', () =>
      HttpResponse.json({ access_token: token, token_type: 'bearer', user: customer }),
    ),
  )
}

describe('AuthProvider / useAuth', () => {
  it('starts logged out when nothing is stored', () => {
    const { result } = renderAuth()

    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('logs in, exposes the user and remembers the session', async () => {
    respondToLogin('fresh-token')
    const { result } = renderAuth()

    await act(() => result.current.login('customer@example.com', 'correct-horse'))

    expect(result.current.user).toEqual(customer)
    expect(result.current.isAuthenticated).toBe(true)
    expect(JSON.parse(localStorage.getItem(SESSION_KEY)!)).toEqual({
      token: 'fresh-token',
      user: customer,
    })
  })

  it('restores a stored session on start-up', () => {
    storeSession(customer)

    const { result } = renderAuth()

    expect(result.current.user).toEqual(customer)
  })

  it('ignores a corrupted stored session', () => {
    localStorage.setItem(SESSION_KEY, '{not json')

    const { result } = renderAuth()

    expect(result.current.user).toBeNull()
  })

  it('stays logged out and rethrows when login fails', async () => {
    server.use(
      http.post('*/api/auth/login', () =>
        HttpResponse.json({ detail: 'Invalid email or password' }, { status: 401 }),
      ),
    )
    const { result } = renderAuth()

    await expect(
      act(() => result.current.login('customer@example.com', 'wrong')),
    ).rejects.toMatchObject({ status: 401, message: 'Invalid email or password' })
    expect(result.current.user).toBeNull()
  })

  it('registers and then logs the new user in', async () => {
    let registered: unknown
    server.use(
      http.post('*/api/auth/register', async ({ request }) => {
        registered = await request.json()
        return HttpResponse.json(customer, { status: 201 })
      }),
    )
    respondToLogin()
    const { result } = renderAuth()

    await act(() => result.current.register('customer@example.com', 'correct-horse'))

    expect(registered).toEqual({ email: 'customer@example.com', password: 'correct-horse' })
    expect(result.current.user).toEqual(customer)
  })

  it('logs out and forgets the session', () => {
    storeSession(customer)
    const { result } = renderAuth()

    act(() => result.current.logout())

    expect(result.current.user).toBeNull()
    expect(localStorage.getItem(SESSION_KEY)).toBeNull()
  })

  it('sends the session token with authenticated requests', async () => {
    storeSession(customer, 'stored-token')
    let authorization: string | null = null
    server.use(
      http.get('*/api/vehicles', ({ request }) => {
        authorization = request.headers.get('Authorization')
        return HttpResponse.json([])
      }),
    )
    const { result } = renderAuth()

    await result.current.request('/vehicles')

    expect(authorization).toBe('Bearer stored-token')
  })

  it('logs out automatically when an authenticated request gets 401', async () => {
    storeSession(customer)
    server.use(
      http.get('*/api/vehicles', () =>
        HttpResponse.json({ detail: 'Could not validate credentials' }, { status: 401 }),
      ),
    )
    const { result } = renderAuth()

    await expect(result.current.request('/vehicles')).rejects.toBeInstanceOf(ApiError)

    await waitFor(() => expect(result.current.user).toBeNull())
    expect(localStorage.getItem(SESSION_KEY)).toBeNull()
  })

  it('keeps the session when an authenticated request fails for another reason', async () => {
    storeSession(customer)
    server.use(
      http.post('*/api/vehicles/1/purchase', () =>
        HttpResponse.json({ detail: 'Vehicle is out of stock' }, { status: 409 }),
      ),
    )
    const { result } = renderAuth()

    await expect(
      result.current.request('/vehicles/1/purchase', { method: 'POST' }),
    ).rejects.toMatchObject({ status: 409 })
    expect(result.current.user).toEqual(customer)
  })

  it('throws a helpful error when used outside an AuthProvider', () => {
    expect(() => renderHook(() => useAuth())).toThrow('useAuth must be used inside <AuthProvider>')
  })
})
