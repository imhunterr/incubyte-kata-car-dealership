import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'

import { admin, customer, inventory, storeSession } from '../test/fixtures'
import { renderApp } from '../test/render'
import { server } from '../test/server'

beforeEach(() => {
  server.use(http.get('*/api/vehicles', () => HttpResponse.json(inventory)))
})

async function renderLoadedDashboard(user = customer) {
  storeSession(user)
  const rendered = renderApp('/')
  await screen.findByRole('heading', { name: 'Toyota Corolla' })
  return rendered
}

function card(name: string): HTMLElement {
  return screen.getByRole('heading', { name }).closest('li') as HTMLElement
}

function saveButton(name: string): HTMLElement {
  return within(card(name)).getByRole('button', { name: 'Save to shortlist' })
}

const shortlistToggle = () => screen.getByRole('button', { name: /^Shortlisted/ })

describe('DashboardPage: shortlist', () => {
  it('lets a user save a vehicle to their shortlist', async () => {
    const { user } = await renderLoadedDashboard()
    expect(saveButton('Toyota Corolla')).toHaveAttribute('aria-pressed', 'false')

    await user.click(saveButton('Toyota Corolla'))

    expect(saveButton('Toyota Corolla')).toHaveAttribute('aria-pressed', 'true')
    expect(shortlistToggle()).toHaveTextContent('Shortlisted (1)')
  })

  it('unsaves a vehicle on a second click', async () => {
    const { user } = await renderLoadedDashboard()
    await user.click(saveButton('Toyota Corolla'))

    await user.click(saveButton('Toyota Corolla'))

    expect(saveButton('Toyota Corolla')).toHaveAttribute('aria-pressed', 'false')
    expect(shortlistToggle()).toHaveTextContent('Shortlisted (0)')
  })

  it('shows only the shortlisted vehicles when asked', async () => {
    const { user } = await renderLoadedDashboard()
    await user.click(saveButton('Toyota Corolla'))
    await user.click(saveButton('Toyota RAV4'))

    await user.click(shortlistToggle())

    expect(shortlistToggle()).toHaveAttribute('aria-pressed', 'true')
    const shown = within(screen.getByRole('list', { name: 'Search results' }))
      .getAllByRole('heading')
      .map((heading) => heading.textContent)
    expect(shown).toEqual(['Toyota Corolla', 'Toyota RAV4'])
  })

  it('explains an empty shortlist', async () => {
    const { user } = await renderLoadedDashboard()

    await user.click(shortlistToggle())

    expect(
      screen.getByText('Your shortlist is empty. Save vehicles to compare them here.'),
    ).toBeInTheDocument()
  })

  it('remembers the shortlist after a reload', async () => {
    const first = await renderLoadedDashboard()
    await first.user.click(saveButton('Toyota RAV4'))
    first.unmount()

    await renderLoadedDashboard()

    expect(saveButton('Toyota RAV4')).toHaveAttribute('aria-pressed', 'true')
    expect(saveButton('Toyota Corolla')).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps a separate shortlist for each user', async () => {
    const first = await renderLoadedDashboard(customer)
    await first.user.click(saveButton('Toyota Corolla'))
    first.unmount()

    await renderLoadedDashboard(admin)

    expect(saveButton('Toyota Corolla')).toHaveAttribute('aria-pressed', 'false')
    expect(shortlistToggle()).toHaveTextContent('Shortlisted (0)')
  })

  it('ignores an unreadable stored shortlist', async () => {
    localStorage.setItem(`dealership.shortlist.${customer.id}`, 'not json')

    await renderLoadedDashboard()

    expect(shortlistToggle()).toHaveTextContent('Shortlisted (0)')
  })
})
