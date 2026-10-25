import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'

import { admin, customer, storeSession } from './test/fixtures'
import { renderApp } from './test/render'
import { server } from './test/server'

describe('routing', () => {
  beforeEach(() => {
    // The dashboard loads the inventory; an empty one is enough here.
    server.use(http.get('*/api/vehicles', () => HttpResponse.json([])))
  })

  it('sends anonymous visitors of the dashboard to the login page', async () => {
    renderApp('/')

    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument()
  })

  it('shows the dashboard to logged-in users', async () => {
    storeSession(customer)

    renderApp('/')

    expect(await screen.findByRole('heading', { name: 'Vehicles' })).toBeInTheDocument()
  })

  it('sends logged-in users away from the login page to the dashboard', async () => {
    storeSession(customer)

    renderApp('/login')

    expect(await screen.findByRole('heading', { name: 'Vehicles' })).toBeInTheDocument()
  })

  it('sends logged-in users away from the register page to the dashboard', async () => {
    storeSession(customer)

    renderApp('/register')

    expect(await screen.findByRole('heading', { name: 'Vehicles' })).toBeInTheDocument()
  })

  it('shows the register page to anonymous visitors', () => {
    renderApp('/register')

    expect(screen.getByRole('heading', { name: 'Create an account' })).toBeInTheDocument()
  })

  it('redirects unknown addresses to the dashboard (or login)', async () => {
    renderApp('/no-such-page')

    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument()
  })
})

describe('app header', () => {
  beforeEach(() => {
    server.use(http.get('*/api/vehicles', () => HttpResponse.json([])))
  })

  it('shows the brand on every page', () => {
    renderApp('/login')

    expect(screen.getByRole('link', { name: /car dealership/i })).toBeInTheDocument()
  })

  it('shows who is logged in', () => {
    storeSession(customer)

    renderApp('/')

    expect(screen.getByText('customer@example.com')).toBeInTheDocument()
    expect(screen.queryByText('Admin')).not.toBeInTheDocument()
  })

  it('marks admins with a badge', () => {
    storeSession(admin)

    renderApp('/')

    expect(screen.getByText('Admin')).toBeInTheDocument()
  })

  it('logs out and returns to the login page', async () => {
    storeSession(customer)
    const { user } = renderApp('/')

    await user.click(screen.getByRole('button', { name: 'Log out' }))

    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument()
    expect(screen.queryByText('customer@example.com')).not.toBeInTheDocument()
  })
})
