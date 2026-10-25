import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'

import { customer, inventory, storeSession } from '../test/fixtures'
import { renderApp } from '../test/render'
import { server } from '../test/server'

beforeEach(() => {
  server.use(
    http.get('*/api/vehicles', () => HttpResponse.json(inventory)),
    http.get('*/api/vehicles/search', () => HttpResponse.json(inventory)),
  )
})

async function renderLoadedDashboard() {
  storeSession(customer)
  const rendered = renderApp('/')
  await screen.findByRole('heading', { name: 'Toyota Corolla' })
  return rendered
}

/** Vehicle names in the order the results show them. */
function shownOrder(): string[] {
  const results = screen.getByRole('list', { name: 'Search results' })
  return within(results)
    .getAllByRole('heading')
    .map((heading) => heading.textContent ?? '')
}

describe('DashboardPage: sorting', () => {
  it('keeps the inventory order by default', async () => {
    await renderLoadedDashboard()

    expect(screen.getByLabelText('Sort by')).toHaveValue('recommended')
    expect(shownOrder()).toEqual(['Toyota Corolla', 'Ford Mustang', 'Toyota RAV4'])
  })

  it.each([
    ['price-asc', ['Toyota Corolla', 'Toyota RAV4', 'Ford Mustang']],
    ['price-desc', ['Ford Mustang', 'Toyota RAV4', 'Toyota Corolla']],
    ['year-desc', ['Toyota Corolla', 'Toyota RAV4', 'Ford Mustang']],
    ['mileage-asc', ['Toyota Corolla', 'Ford Mustang', 'Toyota RAV4']],
  ])('sorts by %s', async (order, expected) => {
    const { user } = await renderLoadedDashboard()

    await user.selectOptions(screen.getByLabelText('Sort by'), order)

    expect(shownOrder()).toEqual(expected)
  })

  it('labels the sort options in plain words', async () => {
    await renderLoadedDashboard()

    const labels = within(screen.getByLabelText('Sort by'))
      .getAllByRole('option')
      .map((option) => option.textContent)
    expect(labels).toEqual([
      'Recommended',
      'Price: low to high',
      'Price: high to low',
      'Newest first',
      'Lowest mileage',
    ])
  })

  it('keeps the chosen order after a new search', async () => {
    const { user } = await renderLoadedDashboard()
    await user.selectOptions(screen.getByLabelText('Sort by'), 'price-desc')

    await user.type(screen.getByLabelText('Make'), 'o')
    await user.click(screen.getByRole('button', { name: 'Search' }))

    expect(await screen.findByLabelText('Sort by')).toHaveValue('price-desc')
    expect(shownOrder()).toEqual(['Ford Mustang', 'Toyota RAV4', 'Toyota Corolla'])
  })
})
