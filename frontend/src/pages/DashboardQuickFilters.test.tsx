import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'

import { customer, inventory, storeSession } from '../test/fixtures'
import { renderApp } from '../test/render'
import { server } from '../test/server'

/** Query strings of every search request, in order. */
let searches: Record<string, string>[] = []

beforeEach(() => {
  searches = []
  server.use(
    http.get('*/api/vehicles', () => HttpResponse.json(inventory)),
    http.get('*/api/vehicles/search', ({ request }) => {
      searches.push(Object.fromEntries(new URL(request.url).searchParams))
      return HttpResponse.json(inventory.slice(0, 1))
    }),
  )
})

async function renderLoadedDashboard() {
  storeSession(customer)
  const rendered = renderApp('/')
  await screen.findByRole('heading', { name: 'Toyota Corolla' })
  return rendered
}

const group = (name: string) => screen.getByRole('group', { name })

describe('DashboardPage: quick filters', () => {
  it('filters by body type in one click and reflects it in the sidebar', async () => {
    const { user } = await renderLoadedDashboard()

    await user.click(within(group('Browse by body type')).getByRole('button', { name: 'SUV' }))

    await screen.findByText('1 vehicle')
    expect(searches.at(-1)).toEqual({ category: 'suv' })
    expect(
      within(group('Browse by body type')).getByRole('button', { name: 'SUV' }),
    ).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('Category')).toHaveValue('suv')
  })

  it('offers the brands in the inventory, alphabetically, as shortcuts', async () => {
    await renderLoadedDashboard()

    const brands = within(group('Popular brands'))
      .getAllByRole('button')
      .map((button) => button.textContent)
    expect(brands).toEqual(['Ford', 'Toyota'])
  })

  it('filters by brand in one click', async () => {
    const { user } = await renderLoadedDashboard()

    await user.click(within(group('Popular brands')).getByRole('button', { name: 'Toyota' }))

    await screen.findByText('1 vehicle')
    expect(searches.at(-1)).toEqual({ make: 'Toyota' })
    expect(screen.getByLabelText('Make')).toHaveValue('Toyota')
  })

  it.each([
    ['Under $25,000', { max_price: '25000' }],
    ['$25,000 – $35,000', { min_price: '25000', max_price: '35000' }],
    ['$35,000 – $45,000', { min_price: '35000', max_price: '45000' }],
    ['Over $45,000', { min_price: '45000' }],
  ])('applies the "%s" budget', async (label, expected) => {
    const { user } = await renderLoadedDashboard()

    await user.click(within(group('Budget presets')).getByRole('button', { name: label }))

    await screen.findByText('1 vehicle')
    expect(searches.at(-1)).toEqual(expected)
  })

  it('adds a quick filter to the filters already applied', async () => {
    const { user } = await renderLoadedDashboard()
    await user.type(screen.getByLabelText('Make'), 'toyota')
    await user.click(screen.getByRole('button', { name: 'Search' }))
    await screen.findByText('1 vehicle')

    await user.click(within(group('Browse by body type')).getByRole('button', { name: 'SUV' }))

    expect(searches.at(-1)).toEqual({ make: 'toyota', category: 'suv' })
  })

  it('clicking the active body type again removes that filter', async () => {
    const { user } = await renderLoadedDashboard()
    const suv = () => within(group('Browse by body type')).getByRole('button', { name: 'SUV' })
    await user.click(suv())
    await screen.findByText('1 vehicle')

    await user.click(suv())

    expect(await screen.findByText('3 vehicles')).toBeInTheDocument()
    expect(suv()).toHaveAttribute('aria-pressed', 'false')
  })
})

describe('DashboardPage: active filter chips', () => {
  async function searchToyotaSuvs() {
    const rendered = await renderLoadedDashboard()
    await rendered.user.type(screen.getByLabelText('Make'), 'toyota')
    await rendered.user.selectOptions(screen.getByLabelText('Category'), 'suv')
    await rendered.user.selectOptions(screen.getByLabelText('Mileage'), '50000')
    await rendered.user.click(screen.getByRole('button', { name: 'Search' }))
    await screen.findByText('1 vehicle')
    return rendered
  }

  it('shows each applied filter as a chip', async () => {
    await searchToyotaSuvs()

    const chips = within(group('Active filters'))
    expect(chips.getByText('Make: toyota')).toBeInTheDocument()
    expect(chips.getByText('Body type: SUV')).toBeInTheDocument()
    expect(chips.getByText('Mileage: up to 50,000 km')).toBeInTheDocument()
  })

  it('describes price ranges in words', async () => {
    const { user } = await renderLoadedDashboard()

    await user.click(
      within(group('Budget presets')).getByRole('button', { name: '$25,000 – $35,000' }),
    )

    await screen.findByText('1 vehicle')
    expect(
      within(group('Active filters')).getByText('Price: $25,000 – $35,000'),
    ).toBeInTheDocument()
  })

  it('removes one filter and searches again', async () => {
    const { user } = await searchToyotaSuvs()

    await user.click(screen.getByRole('button', { name: 'Remove filter Make: toyota' }))

    expect(searches.at(-1)).toEqual({ category: 'suv', max_mileage: '50000' })
    expect(screen.getByLabelText('Make')).toHaveValue('')
    expect(within(group('Active filters')).queryByText('Make: toyota')).not.toBeInTheDocument()
  })

  it('clears every filter at once', async () => {
    const { user } = await searchToyotaSuvs()

    await user.click(screen.getByRole('button', { name: 'Clear all filters' }))

    expect(await screen.findByText('3 vehicles')).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Active filters' })).not.toBeInTheDocument()
  })

  it('shows no chips when nothing is filtered', async () => {
    await renderLoadedDashboard()

    expect(screen.queryByRole('group', { name: 'Active filters' })).not.toBeInTheDocument()
  })
})
