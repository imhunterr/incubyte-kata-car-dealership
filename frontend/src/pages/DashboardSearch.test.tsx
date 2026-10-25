import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'

import { corolla, customer, inventory, rav4, storeSession } from '../test/fixtures'
import { renderApp } from '../test/render'
import { server } from '../test/server'

async function renderLoadedDashboard() {
  storeSession(customer)
  const rendered = renderApp('/')
  await screen.findByRole('heading', { name: 'Toyota Corolla' })
  return rendered
}

describe('DashboardPage: search and filters', () => {
  beforeEach(() => {
    server.use(http.get('*/api/vehicles', () => HttpResponse.json(inventory)))
  })

  it('offers every category plus "Any category"', async () => {
    await renderLoadedDashboard()

    const options = within(screen.getByLabelText('Category')).getAllByRole('option')
    expect(options.map((option) => option.textContent)).toEqual([
      'Any category',
      'Sedan',
      'SUV',
      'Hatchback',
      'Coupe',
      'Convertible',
      'Truck',
      'Van',
      'Wagon',
    ])
  })

  it('searches with the filled-in filters only and shows the matches', async () => {
    let query: Record<string, string> = {}
    server.use(
      http.get('*/api/vehicles/search', ({ request }) => {
        query = Object.fromEntries(new URL(request.url).searchParams)
        return HttpResponse.json([rav4])
      }),
    )
    const { user } = await renderLoadedDashboard()

    await user.type(screen.getByLabelText('Make'), 'toyota')
    await user.selectOptions(screen.getByLabelText('Category'), 'suv')
    await user.type(screen.getByLabelText('Max price'), '35000')
    await user.click(screen.getByRole('button', { name: 'Search' }))

    expect(await screen.findByText('1 vehicle')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Toyota RAV4' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Toyota Corolla' })).not.toBeInTheDocument()
    expect(query).toEqual({ make: 'toyota', category: 'suv', max_price: '35000' })
  })

  it('sends model and both price bounds too', async () => {
    let query: Record<string, string> = {}
    server.use(
      http.get('*/api/vehicles/search', ({ request }) => {
        query = Object.fromEntries(new URL(request.url).searchParams)
        return HttpResponse.json([corolla])
      }),
    )
    const { user } = await renderLoadedDashboard()

    await user.type(screen.getByLabelText('Model'), 'cor')
    await user.type(screen.getByLabelText('Min price'), '20000')
    await user.type(screen.getByLabelText('Max price'), '25000')
    await user.click(screen.getByRole('button', { name: 'Search' }))

    await screen.findByText('1 vehicle')
    expect(query).toEqual({ model: 'cor', min_price: '20000', max_price: '25000' })
  })

  it('offers fuel types, transmissions, model years and mileage caps', async () => {
    await renderLoadedDashboard()

    const optionsOf = (label: string) =>
      within(screen.getByLabelText(label))
        .getAllByRole('option')
        .map((option) => option.textContent)
    expect(optionsOf('Fuel type')).toEqual([
      'Any fuel',
      'Petrol',
      'Diesel',
      'CNG',
      'Electric',
      'Hybrid',
    ])
    expect(optionsOf('Transmission')).toEqual(['Any transmission', 'Manual', 'Automatic'])
    expect(optionsOf('Model year')).toContain('2020 or newer')
    expect(optionsOf('Mileage')).toEqual([
      'Any mileage',
      'Up to 10,000 km',
      'Up to 25,000 km',
      'Up to 50,000 km',
      'Up to 75,000 km',
      'Up to 100,000 km',
    ])
  })

  it('searches by fuel type, transmission, model year and mileage', async () => {
    let query: Record<string, string> = {}
    server.use(
      http.get('*/api/vehicles/search', ({ request }) => {
        query = Object.fromEntries(new URL(request.url).searchParams)
        return HttpResponse.json([corolla])
      }),
    )
    const { user } = await renderLoadedDashboard()

    await user.selectOptions(screen.getByLabelText('Fuel type'), 'hybrid')
    await user.selectOptions(screen.getByLabelText('Transmission'), 'automatic')
    await user.selectOptions(screen.getByLabelText('Model year'), '2020')
    await user.selectOptions(screen.getByLabelText('Mileage'), '50000')
    await user.click(screen.getByRole('button', { name: 'Search' }))

    await screen.findByText('1 vehicle')
    expect(query).toEqual({
      fuel_type: 'hybrid',
      transmission: 'automatic',
      min_year: '2020',
      max_mileage: '50000',
    })
  })

  it('explains when nothing matches', async () => {
    server.use(http.get('*/api/vehicles/search', () => HttpResponse.json([])))
    const { user } = await renderLoadedDashboard()

    await user.type(screen.getByLabelText('Make'), 'ferrari')
    await user.click(screen.getByRole('button', { name: 'Search' }))

    expect(await screen.findByText('No vehicles match your search.')).toBeInTheDocument()
  })

  it('rejects a minimum price above the maximum without calling the API', async () => {
    // No search handler: a request would fail the test as unhandled.
    const { user } = await renderLoadedDashboard()

    await user.type(screen.getByLabelText('Min price'), '50000')
    await user.type(screen.getByLabelText('Max price'), '10000')
    await user.click(screen.getByRole('button', { name: 'Search' }))

    expect(screen.getByText('Min price must not exceed max price')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Toyota Corolla' })).toBeInTheDocument()
  })

  it('rejects a negative price without calling the API', async () => {
    const { user } = await renderLoadedDashboard()

    await user.type(screen.getByLabelText('Min price'), '-5')
    await user.click(screen.getByRole('button', { name: 'Search' }))

    expect(screen.getByText('Prices cannot be negative')).toBeInTheDocument()
  })

  it('shows the API error if the search fails', async () => {
    server.use(
      http.get('*/api/vehicles/search', () =>
        HttpResponse.json({ detail: 'Service unavailable' }, { status: 503 }),
      ),
    )
    const { user } = await renderLoadedDashboard()

    await user.type(screen.getByLabelText('Make'), 'toyota')
    await user.click(screen.getByRole('button', { name: 'Search' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Service unavailable')
  })

  it('lists everything when searching with no filters', async () => {
    const { user } = await renderLoadedDashboard()

    await user.click(screen.getByRole('button', { name: 'Search' }))

    expect(await screen.findByText('3 vehicles')).toBeInTheDocument()
  })

  it('clears the filters and shows the whole inventory again', async () => {
    server.use(http.get('*/api/vehicles/search', () => HttpResponse.json([rav4])))
    const { user } = await renderLoadedDashboard()
    await user.type(screen.getByLabelText('Make'), 'toyota')
    await user.click(screen.getByRole('button', { name: 'Search' }))
    await screen.findByText('1 vehicle')

    await user.click(screen.getByRole('button', { name: 'Clear' }))

    expect(await screen.findByText('3 vehicles')).toBeInTheDocument()
    expect(screen.getByLabelText('Make')).toHaveValue('')
  })
})

describe('DashboardPage: filters on small screens', () => {
  beforeEach(() => {
    server.use(http.get('*/api/vehicles', () => HttpResponse.json(inventory)))
  })

  it('has a button that shows and hides the filter panel', async () => {
    const { user } = await renderLoadedDashboard()
    const toggle = screen.getByRole('button', { name: 'Show filters' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveAttribute(
      'aria-controls',
      screen.getByRole('search', { name: 'Filter vehicles' }).id,
    )

    await user.click(toggle)

    expect(screen.getByRole('button', { name: 'Hide filters' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
  })
})
