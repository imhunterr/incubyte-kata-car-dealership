import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'

import type { User } from '../api/types'
import { admin, customer, inventory, storeSession } from '../test/fixtures'
import { renderApp } from '../test/render'
import { server } from '../test/server'

beforeEach(() => {
  server.use(http.get('*/api/vehicles', () => HttpResponse.json(inventory)))
})

async function renderLoadedDashboard(user: User = admin) {
  storeSession(user)
  const rendered = renderApp('/')
  await screen.findByRole('heading', { name: 'Toyota Corolla' })
  return rendered
}

function card(name: string): HTMLElement {
  return screen.getByRole('heading', { name }).closest('li') as HTMLElement
}

describe('DashboardPage: admin controls', () => {
  it('shows admins an "Add vehicle" button', async () => {
    await renderLoadedDashboard(admin)

    expect(screen.getByRole('button', { name: 'Add vehicle' })).toBeInTheDocument()
  })

  it('shows admins Edit, Restock and Delete on every card', async () => {
    await renderLoadedDashboard(admin)

    for (const name of ['Toyota Corolla', 'Ford Mustang', 'Toyota RAV4']) {
      const actions = within(card(name))
      expect(actions.getByRole('button', { name: `Edit ${name}` })).toBeInTheDocument()
      expect(actions.getByRole('button', { name: `Restock ${name}` })).toBeInTheDocument()
      expect(actions.getByRole('button', { name: `Delete ${name}` })).toBeInTheDocument()
    }
  })

  it('hides every admin control from regular users', async () => {
    await renderLoadedDashboard(customer)

    expect(screen.queryByRole('button', { name: 'Add vehicle' })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /^(Edit|Restock|Delete) / }),
    ).not.toBeInTheDocument()
  })
})
