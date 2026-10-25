import { screen } from '@testing-library/react'
import { delay, http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'

import { customer } from '../test/fixtures'
import { renderApp } from '../test/render'
import { server } from '../test/server'

describe('LoginPage', () => {
  beforeEach(() => {
    server.use(http.get('*/api/vehicles', () => HttpResponse.json([])))
  })

  it('has labelled e-mail and password fields', () => {
    renderApp('/login')

    expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email')
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
  })

  it('logs in with the entered credentials and opens the dashboard', async () => {
    let credentials: unknown
    server.use(
      http.post('*/api/auth/login', async ({ request }) => {
        credentials = await request.json()
        return HttpResponse.json({ access_token: 't', token_type: 'bearer', user: customer })
      }),
    )
    const { user } = renderApp('/login')

    await user.type(screen.getByLabelText('Email'), 'customer@example.com')
    await user.type(screen.getByLabelText('Password'), 'correct-horse')
    await user.click(screen.getByRole('button', { name: 'Log in' }))

    expect(await screen.findByRole('heading', { name: 'Vehicles' })).toBeInTheDocument()
    expect(credentials).toEqual({ email: 'customer@example.com', password: 'correct-horse' })
  })

  it('shows the API error when the credentials are wrong', async () => {
    server.use(
      http.post('*/api/auth/login', () =>
        HttpResponse.json({ detail: 'Invalid email or password' }, { status: 401 }),
      ),
    )
    const { user } = renderApp('/login')

    await user.type(screen.getByLabelText('Email'), 'customer@example.com')
    await user.type(screen.getByLabelText('Password'), 'wrong-password')
    await user.click(screen.getByRole('button', { name: 'Log in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password')
    expect(screen.getByRole('heading', { name: 'Log in' })).toBeInTheDocument()
  })

  it('asks for both fields before calling the API', async () => {
    // No login handler: an API call would fail the test (unhandled request).
    const { user } = renderApp('/login')

    await user.click(screen.getByRole('button', { name: 'Log in' }))

    expect(screen.getByText('Enter your email')).toBeInTheDocument()
    expect(screen.getByText('Enter your password')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
  })

  it('disables the button while logging in', async () => {
    server.use(
      http.post('*/api/auth/login', async () => {
        await delay(50)
        return HttpResponse.json({ access_token: 't', token_type: 'bearer', user: customer })
      }),
    )
    const { user } = renderApp('/login')

    await user.type(screen.getByLabelText('Email'), 'customer@example.com')
    await user.type(screen.getByLabelText('Password'), 'correct-horse')
    await user.click(screen.getByRole('button', { name: 'Log in' }))

    expect(screen.getByRole('button', { name: 'Logging in…' })).toBeDisabled()
    expect(await screen.findByRole('heading', { name: 'Vehicles' })).toBeInTheDocument()
  })

  it('links to the registration page', async () => {
    const { user } = renderApp('/login')

    await user.click(screen.getByRole('link', { name: 'Create an account' }))

    expect(screen.getByRole('heading', { name: 'Create an account' })).toBeInTheDocument()
  })
})
