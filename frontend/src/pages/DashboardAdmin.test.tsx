import { screen, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'

import type { User, Vehicle } from '../api/types'
import { admin, corolla, customer, inventory, storeSession } from '../test/fixtures'
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

const NEXT_YEAR = new Date().getFullYear() + 1

const civic: Vehicle = {
  id: 99,
  make: 'Honda',
  model: 'Civic',
  category: 'hatchback',
  price: '23500.00',
  quantity: 4,
  year: 2023,
  fuel_type: 'petrol',
  transmission: 'manual',
  mileage_km: 1200,
}

interface FormValues {
  make?: string
  model?: string
  category?: string
  price?: string
  quantity?: string
  year?: string
  fuel?: string
  transmission?: string
  mileage?: string
}

/** Fill the vehicle form inside `dialog`, replacing what is there. */
async function fillVehicleForm(user: UserEvent, dialog: HTMLElement, values: FormValues) {
  const form = within(dialog)
  const typeInto = async (label: string, value: string | undefined) => {
    if (value === undefined) return
    const field = form.getByLabelText(label)
    await user.clear(field)
    if (value) await user.type(field, value)
  }
  await typeInto('Make', values.make)
  await typeInto('Model', values.model)
  if (values.category) await user.selectOptions(form.getByLabelText('Category'), values.category)
  await typeInto('Price (USD)', values.price)
  await typeInto('Units in stock', values.quantity)
  await typeInto('Year', values.year)
  if (values.fuel) await user.selectOptions(form.getByLabelText('Fuel type'), values.fuel)
  if (values.transmission)
    await user.selectOptions(form.getByLabelText('Transmission'), values.transmission)
  await typeInto('Mileage (km)', values.mileage)
}

const CIVIC_FORM: FormValues = {
  make: 'Honda',
  model: 'Civic',
  category: 'hatchback',
  price: '23500',
  quantity: '4',
  year: '2023',
  fuel: 'petrol',
  transmission: 'manual',
  mileage: '1200',
}

async function openAddDialog(user: UserEvent) {
  await user.click(screen.getByRole('button', { name: 'Add vehicle' }))
  return screen.getByRole('dialog', { name: 'Add vehicle' })
}

describe('DashboardPage: adding a vehicle', () => {
  it('opens a dialog with the vehicle form, focused on the first field', async () => {
    const { user } = await renderLoadedDashboard()

    const dialog = await openAddDialog(user)

    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(within(dialog).getByLabelText('Make')).toHaveFocus()
  })

  it('creates the vehicle and shows it in the list', async () => {
    let body: unknown
    server.use(
      http.post('*/api/vehicles', async ({ request }) => {
        body = await request.json()
        return HttpResponse.json(civic, { status: 201 })
      }),
    )
    const { user } = await renderLoadedDashboard()
    const dialog = await openAddDialog(user)

    await fillVehicleForm(user, dialog, CIVIC_FORM)
    await user.click(within(dialog).getByRole('button', { name: 'Save vehicle' }))

    expect(await screen.findByRole('heading', { name: 'Honda Civic' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Added Honda Civic.')
    expect(body).toEqual({
      make: 'Honda',
      model: 'Civic',
      category: 'hatchback',
      price: '23500',
      quantity: 4,
      year: 2023,
      fuel_type: 'petrol',
      transmission: 'manual',
      mileage_km: 1200,
    })
  })

  it('checks every field before calling the API', async () => {
    // No POST handler: a request would fail the test as unhandled.
    const { user } = await renderLoadedDashboard()
    const dialog = await openAddDialog(user)

    await user.click(within(dialog).getByRole('button', { name: 'Save vehicle' }))

    const form = within(dialog)
    expect(form.getByText('Enter a make')).toBeInTheDocument()
    expect(form.getByText('Enter a model')).toBeInTheDocument()
    expect(form.getByText('Enter a price')).toBeInTheDocument()
    expect(form.getByText('Enter the number of units in stock')).toBeInTheDocument()
    expect(form.getByText('Enter the model year')).toBeInTheDocument()
    expect(form.getByText('Enter the mileage')).toBeInTheDocument()
  })

  it.each([
    [{ price: '0' }, 'Price must be greater than 0'],
    [{ price: '19.999' }, 'Use at most 2 decimal places'],
    [{ quantity: '1.5' }, 'Units in stock must be a whole number of 0 or more'],
    [{ quantity: '-1' }, 'Units in stock must be a whole number of 0 or more'],
    [{ year: '1985' }, `Year must be between 1990 and ${NEXT_YEAR}`],
    [{ year: String(NEXT_YEAR + 1) }, `Year must be between 1990 and ${NEXT_YEAR}`],
    [{ mileage: '-5' }, 'Mileage must be a whole number from 0 to 1,000,000'],
    [{ mileage: '1000001' }, 'Mileage must be a whole number from 0 to 1,000,000'],
  ])('rejects %o with "%s"', async (override, message) => {
    const { user } = await renderLoadedDashboard()
    const dialog = await openAddDialog(user)

    await fillVehicleForm(user, dialog, { ...CIVIC_FORM, ...override })
    await user.click(within(dialog).getByRole('button', { name: 'Save vehicle' }))

    expect(within(dialog).getByText(message)).toBeInTheDocument()
  })

  it('shows API errors inside the dialog and keeps it open', async () => {
    server.use(
      http.post('*/api/vehicles', () =>
        HttpResponse.json({ detail: 'Admin privileges required' }, { status: 403 }),
      ),
    )
    const { user } = await renderLoadedDashboard()
    const dialog = await openAddDialog(user)

    await fillVehicleForm(user, dialog, CIVIC_FORM)
    await user.click(within(dialog).getByRole('button', { name: 'Save vehicle' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Admin privileges required')
    expect(screen.getByRole('dialog', { name: 'Add vehicle' })).toBeInTheDocument()
  })

  it('closes without saving on Cancel', async () => {
    const { user } = await renderLoadedDashboard()
    const dialog = await openAddDialog(user)

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('closes without saving on Escape', async () => {
    const { user } = await renderLoadedDashboard()
    await openAddDialog(user)

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('DashboardPage: editing a vehicle', () => {
  async function openEditDialog(user: UserEvent, name = 'Toyota Corolla') {
    await user.click(within(card(name)).getByRole('button', { name: `Edit ${name}` }))
    return screen.getByRole('dialog', { name: `Edit ${name}` })
  }

  it('opens the form filled in with the vehicle’s details', async () => {
    const { user } = await renderLoadedDashboard()

    const dialog = await openEditDialog(user)

    const form = within(dialog)
    expect(form.getByLabelText('Make')).toHaveValue('Toyota')
    expect(form.getByLabelText('Model')).toHaveValue('Corolla')
    expect(form.getByLabelText('Category')).toHaveValue('sedan')
    expect(form.getByLabelText('Price (USD)')).toHaveValue('21999.99')
    expect(form.getByLabelText('Units in stock')).toHaveValue('3')
    expect(form.getByLabelText('Year')).toHaveValue('2022')
    expect(form.getByLabelText('Fuel type')).toHaveValue('hybrid')
    expect(form.getByLabelText('Transmission')).toHaveValue('automatic')
    expect(form.getByLabelText('Mileage (km)')).toHaveValue('18500')
  })

  it('saves the changes with PUT and updates the card', async () => {
    let request: { id: string; body: unknown } | undefined
    server.use(
      http.put('*/api/vehicles/:id', async ({ params, request: req }) => {
        const body = (await req.json()) as Record<string, unknown>
        request = { id: String(params.id), body }
        return HttpResponse.json({ ...corolla, ...body, price: '20500.00' })
      }),
    )
    const { user } = await renderLoadedDashboard()
    const dialog = await openEditDialog(user)

    await fillVehicleForm(user, dialog, { model: 'Corolla Cross', price: '20500' })
    await user.click(within(dialog).getByRole('button', { name: 'Save vehicle' }))

    expect(await screen.findByRole('heading', { name: 'Toyota Corolla Cross' })).toBeInTheDocument()
    expect(within(card('Toyota Corolla Cross')).getByText('$20,500.00')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Saved Toyota Corolla Cross.')
    expect(request).toEqual({
      id: String(corolla.id),
      body: {
        make: 'Toyota',
        model: 'Corolla Cross',
        category: 'sedan',
        price: '20500',
        quantity: 3,
        year: 2022,
        fuel_type: 'hybrid',
        transmission: 'automatic',
        mileage_km: 18500,
      },
    })
  })

  it('validates edits like new vehicles', async () => {
    const { user } = await renderLoadedDashboard()
    const dialog = await openEditDialog(user)

    await fillVehicleForm(user, dialog, { make: '' })
    await user.click(within(dialog).getByRole('button', { name: 'Save vehicle' }))

    expect(within(dialog).getByText('Enter a make')).toBeInTheDocument()
  })

  it('shows API errors (e.g. the vehicle was deleted meanwhile)', async () => {
    server.use(
      http.put('*/api/vehicles/:id', () =>
        HttpResponse.json({ detail: 'Vehicle not found' }, { status: 404 }),
      ),
    )
    const { user } = await renderLoadedDashboard()
    const dialog = await openEditDialog(user)

    await user.click(within(dialog).getByRole('button', { name: 'Save vehicle' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Vehicle not found')
  })
})

describe('DashboardPage: deleting a vehicle', () => {
  async function openDeleteDialog(user: UserEvent, name = 'Toyota Corolla') {
    await user.click(within(card(name)).getByRole('button', { name: `Delete ${name}` }))
    return screen.getByRole('dialog', { name: `Delete ${name}?` })
  }

  it('asks for confirmation, with Cancel focused', async () => {
    const { user } = await renderLoadedDashboard()

    const dialog = await openDeleteDialog(user)

    expect(
      within(dialog).getByText(/removes it from the inventory permanently/),
    ).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus()
  })

  it('deletes the vehicle and removes its card', async () => {
    let deletedId: string | undefined
    server.use(
      http.delete('*/api/vehicles/:id', ({ params }) => {
        deletedId = String(params.id)
        return new HttpResponse(null, { status: 204 })
      }),
    )
    const { user } = await renderLoadedDashboard()
    const dialog = await openDeleteDialog(user)

    await user.click(within(dialog).getByRole('button', { name: 'Delete vehicle' }))

    expect(await screen.findByText('2 vehicles')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Toyota Corolla' })).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Deleted Toyota Corolla.')
    expect(deletedId).toBe(String(corolla.id))
  })

  it('keeps the vehicle when cancelled', async () => {
    const { user } = await renderLoadedDashboard()
    const dialog = await openDeleteDialog(user)

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Toyota Corolla' })).toBeInTheDocument()
  })

  it('shows API errors in the dialog', async () => {
    server.use(
      http.delete('*/api/vehicles/:id', () =>
        HttpResponse.json({ detail: 'Vehicle not found' }, { status: 404 }),
      ),
    )
    const { user } = await renderLoadedDashboard()
    const dialog = await openDeleteDialog(user)

    await user.click(within(dialog).getByRole('button', { name: 'Delete vehicle' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Vehicle not found')
  })
})
