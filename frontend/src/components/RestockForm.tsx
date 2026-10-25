/** Admin form for adding units to a vehicle's stock (1 to 10,000 at a time, like the API). */
import { useState, type FormEvent } from 'react'

import { messageFor } from '../api/client'
import type { Vehicle } from '../api/types'
import { Alert } from './Alert'
import { Button } from './Button'
import { TextField } from './TextField'

const MAX_RESTOCK = 10_000

interface RestockFormProps {
  vehicle: Vehicle
  /** Adds `units` to stock; a rejection is shown in the form. */
  onSubmit: (units: number) => Promise<void>
  onCancel: () => void
}

function unitsError(value: string): string | undefined {
  if (!value.trim()) return 'Enter how many units to add'
  const units = Number(value)
  if (!/^\d+$/.test(value.trim()) || units < 1 || units > MAX_RESTOCK) {
    return 'Add between 1 and 10,000 units'
  }
  return undefined
}

export function RestockForm({ vehicle, onSubmit, onCancel }: RestockFormProps) {
  const [units, setUnits] = useState('')
  const [fieldError, setFieldError] = useState<string | undefined>()
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const error = unitsError(units)
    setFieldError(error)
    if (error) return

    setFormError(null)
    setSaving(true)
    try {
      await onSubmit(Number(units))
    } catch (caught) {
      setFormError(messageFor(caught))
      setSaving(false)
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-4">
      {formError && <Alert>{formError}</Alert>}
      <p className="text-sm text-slate-600">
        {vehicle.quantity === 0
          ? 'Currently out of stock.'
          : `Currently ${vehicle.quantity} in stock.`}
      </p>
      <TextField
        label="Units to add"
        inputMode="numeric"
        value={units}
        onChange={(event) => setUnits(event.target.value)}
        error={fieldError}
      />
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Restocking…' : 'Restock'}
        </Button>
      </div>
    </form>
  )
}
