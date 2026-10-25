import { screen } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'

import { customer } from '../test/fixtures'
import { renderApp } from '../test/render'
import { server } from '../test/server'

async function fillForm(
  user: UserEvent,
  { email = 'customer@example.com', password = 'correct-horse', confirm = password } = {},
) {
  if (email) await user.type(screen.getByLabelText('Email'), email)
  if (password) await user.type(screen.getByLabelText('Password'), password)
  if (confirm) await user.type(screen.getByLabelText('Confirm password'), confirm)
  await user.click(screen.getByRole('button', { name: 'Create account' }))
}

function acceptRegistration() {
  server.use(
    http.post('*/api/auth/register', () => HttpResponse.json(customer, { status: 201 })),
    http.post('*/api/auth/login', () =>
      HttpResponse.json({ access_token: 't', token_type: 'bearer', user: customer }),
    ),
  )
}

describe('RegisterPage', () => {
  beforeEach(() => {
    server.use(http.get('*/api/vehicles', () => HttpResponse.json([])))
  })

  it('creates the account, logs in and opens the dashboard', async () => {
    acceptRegistration()
    const { user } = renderApp('/register')

    await fillForm(user)

    expect(await screen.findByRole('heading', { name: 'Vehicles' })).toBeInTheDocument()
    expect(screen.getByText('customer@example.com')).toBeInTheDocument()
  })

  it('rejects an invalid e-mail before calling the API', async () => {
    const { user } = renderApp('/register')

    await fillForm(user, { email: 'not-an-email' })

    expect(screen.getByText('Enter a valid email address')).toBeInTheDocument()
  })

  it('rejects a password shorter than 8 characters', async () => {
    const { user } = renderApp('/register')

    await fillForm(user, { password: 'short' })

    expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument()
  })

  it('rejects a password longer than 128 characters', async () => {
    const { user } = renderApp('/register')
    const longPassword = 'x'.repeat(129)

    await fillForm(user, { password: longPassword })

    expect(screen.getByText('Password must be at most 128 characters')).toBeInTheDocument()
  })

  it('requires the confirmation to match the password', async () => {
    const { user } = renderApp('/register')

    await fillForm(user, { password: 'correct-horse', confirm: 'correct-house' })

    expect(screen.getByText('Passwords do not match')).toBeInTheDocument()
  })

  it('shows the API error when the e-mail is already registered', async () => {
    server.use(
      http.post('*/api/auth/register', () =>
        HttpResponse.json({ detail: 'Email is already registered' }, { status: 409 }),
      ),
    )
    const { user } = renderApp('/register')

    await fillForm(user)

    expect(await screen.findByRole('alert')).toHaveTextContent('Email is already registered')
  })

  it('disables the button while creating the account', async () => {
    server.use(
      http.post('*/api/auth/register', async () => {
        await delay(50)
        return HttpResponse.json(customer, { status: 201 })
      }),
      http.post('*/api/auth/login', () =>
        HttpResponse.json({ access_token: 't', token_type: 'bearer', user: customer }),
      ),
    )
    const { user } = renderApp('/register')

    await fillForm(user)

    expect(screen.getByRole('button', { name: 'Creating account…' })).toBeDisabled()
    expect(await screen.findByRole('heading', { name: 'Vehicles' })).toBeInTheDocument()
  })

  it('links back to the login page', async () => {
    const { user } = renderApp('/register')

    await user.click(screen.getByRole('link', { name: 'Log in' }))

    expect(screen.getByRole('heading', { name: 'Log in' })).toBeInTheDocument()
  })
})
