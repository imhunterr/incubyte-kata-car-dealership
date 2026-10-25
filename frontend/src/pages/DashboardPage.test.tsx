import { screen, within } from '@testing-library/react'
import { delay, http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import type { Vehicle } from '../api/types'
import { corolla, customer, inventory, storeSession } from '../test/fixtures'
import { renderApp } from '../test/render'
import { server } from '../test/server'

function serveInventory(vehicles: Vehicle[] = inventory) {
  server.use(http.get('*/api/vehicles', () => HttpResponse.json(vehicles)))
}

/** The card (list item) showing a given vehicle. */
async function findCard(name: string) {
  const heading = await screen.findByRole('heading', { name })
  return heading.closest('li') as HTMLElement
}

function renderDashboard() {
  storeSession(customer)
  return renderApp('/')
}

describe('DashboardPage: inventory', () => {
  it('shows a loading message, then every vehicle', async () => {
    serveInventory()
    renderDashboard()

    expect(screen.getByText('Loading vehicles…')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Toyota Corolla' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Ford Mustang' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Toyota RAV4' })).toBeInTheDocument()
    expect(screen.queryByText('Loading vehicles…')).not.toBeInTheDocument()
  })

  it('shows each vehicle’s category, formatted price and stock', async () => {
    serveInventory()
    renderDashboard()

    const card = await findCard('Toyota Corolla')
    expect(within(card).getByText('Sedan')).toBeInTheDocument()
    expect(within(card).getByText('$21,999.99')).toBeInTheDocument()
    expect(within(card).getByText('3 in stock')).toBeInTheDocument()
  })

  it('says how many vehicles are shown', async () => {
    serveInventory()
    renderDashboard()

    expect(await screen.findByText('3 vehicles')).toBeInTheDocument()
  })

  it('explains when the inventory is empty', async () => {
    serveInventory([])
    renderDashboard()

    expect(await screen.findByText('No vehicles in the inventory yet.')).toBeInTheDocument()
  })

  it('shows an error with a retry button when loading fails', async () => {
    server.use(
      http.get('*/api/vehicles', () => HttpResponse.json({ detail: 'Boom' }, { status: 500 }), {
        once: true,
      }),
    )
    const { user } = renderDashboard()

    expect(await screen.findByRole('alert')).toHaveTextContent('Boom')

    serveInventory()
    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('heading', { name: 'Toyota Corolla' })).toBeInTheDocument()
  })

  it('logs out when the session has expired', async () => {
    server.use(
      http.get('*/api/vehicles', () =>
        HttpResponse.json({ detail: 'Could not validate credentials' }, { status: 401 }),
      ),
    )
    renderDashboard()

    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument()
  })
})

describe('DashboardPage: purchasing', () => {
  it('enables Purchase for vehicles in stock', async () => {
    serveInventory()
    renderDashboard()

    const card = await findCard('Toyota Corolla')
    expect(within(card).getByRole('button', { name: 'Purchase' })).toBeEnabled()
  })

  it('disables Purchase and says "Out of stock" when the quantity is zero', async () => {
    serveInventory()
    renderDashboard()

    const card = await findCard('Ford Mustang')
    expect(within(card).getByRole('button', { name: 'Purchase' })).toBeDisabled()
    expect(within(card).getByText('Out of stock')).toBeInTheDocument()
  })

  it('buys the vehicle and shows the updated stock', async () => {
    serveInventory()
    let purchasedId: string | undefined
    server.use(
      http.post('*/api/vehicles/:id/purchase', ({ params }) => {
        purchasedId = String(params.id)
        return HttpResponse.json({ ...corolla, quantity: 2 })
      }),
    )
    const { user } = renderDashboard()

    const card = await findCard('Toyota Corolla')
    await user.click(within(card).getByRole('button', { name: 'Purchase' }))

    expect(await within(card).findByText('2 in stock')).toBeInTheDocument()
    expect(purchasedId).toBe(String(corolla.id))
    expect(screen.getByRole('status')).toHaveTextContent('You bought a Toyota Corolla.')
  })

  it('disables Purchase once the last unit is bought', async () => {
    serveInventory([{ ...corolla, quantity: 1 }])
    server.use(
      http.post('*/api/vehicles/:id/purchase', () =>
        HttpResponse.json({ ...corolla, quantity: 0 }),
      ),
    )
    const { user } = renderDashboard()

    const card = await findCard('Toyota Corolla')
    await user.click(within(card).getByRole('button', { name: 'Purchase' }))

    expect(await within(card).findByText('Out of stock')).toBeInTheDocument()
    expect(within(card).getByRole('button', { name: 'Purchase' })).toBeDisabled()
  })

  it('shows "Purchasing…" and blocks double clicks while the purchase is in flight', async () => {
    serveInventory()
    server.use(
      http.post('*/api/vehicles/:id/purchase', async () => {
        await delay(50)
        return HttpResponse.json({ ...corolla, quantity: 2 })
      }),
    )
    const { user } = renderDashboard()

    const card = await findCard('Toyota Corolla')
    await user.click(within(card).getByRole('button', { name: 'Purchase' }))

    expect(within(card).getByRole('button', { name: 'Purchasing…' })).toBeDisabled()
    expect(await within(card).findByText('2 in stock')).toBeInTheDocument()
  })

  it('marks the vehicle sold out when someone else bought the last unit first', async () => {
    serveInventory()
    server.use(
      http.post('*/api/vehicles/:id/purchase', () =>
        HttpResponse.json({ detail: 'Vehicle is out of stock' }, { status: 409 }),
      ),
    )
    const { user } = renderDashboard()

    const card = await findCard('Toyota Corolla')
    await user.click(within(card).getByRole('button', { name: 'Purchase' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Vehicle is out of stock')
    expect(within(card).getByText('Out of stock')).toBeInTheDocument()
    expect(within(card).getByRole('button', { name: 'Purchase' })).toBeDisabled()
  })

  it('reports other purchase failures without changing the stock', async () => {
    serveInventory()
    server.use(
      http.post('*/api/vehicles/:id/purchase', () =>
        HttpResponse.json({ detail: 'Vehicle not found' }, { status: 404 }),
      ),
    )
    const { user } = renderDashboard()

    const card = await findCard('Toyota Corolla')
    await user.click(within(card).getByRole('button', { name: 'Purchase' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Vehicle not found')
    expect(within(card).getByText('3 in stock')).toBeInTheDocument()
  })
})
