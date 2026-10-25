/** The admin form for adding or editing a vehicle. */
import { useState, type FormEvent } from 'react'

import { FUEL_TYPES, TRANSMISSIONS, VEHICLE_CATEGORIES, type VehicleInput } from '../api/types'
import { useAsyncAction } from '../hooks/useAsyncAction'
import { formatCategory, formatFuel, formatTransmission } from '../lib/format'
import {
  toVehicleInput,
  validateVehicleForm,
  type VehicleFormErrors,
  type VehicleFormValues,
} from '../lib/vehicleForm'
import { Alert } from './Alert'
import { Button } from './Button'
import { SelectField } from './SelectField'
import { TextField } from './TextField'

interface VehicleFormProps {
  initialValues: VehicleFormValues
  /** Saves the vehicle; a rejection is shown in the form. */
  onSubmit: (input: VehicleInput) => Promise<void>
  onCancel: () => void
}

export function VehicleForm({ initialValues, onSubmit, onCancel }: VehicleFormProps) {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState<VehicleFormErrors>({})
  const { busy: saving, error: formError, run } = useAsyncAction()

  function update<K extends keyof VehicleFormValues>(field: K, value: VehicleFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fieldErrors = validateVehicleForm(values)
    setErrors(fieldErrors)
    if (Object.keys(fieldErrors).length > 0) return

    await run(() => onSubmit(toVehicleInput(values)))
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-4">
      {formError && <Alert>{formError}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Make"
          value={values.make}
          onChange={(event) => update('make', event.target.value)}
          error={errors.make}
        />
        <TextField
          label="Model"
          value={values.model}
          onChange={(event) => update('model', event.target.value)}
          error={errors.model}
        />
        <SelectField
          label="Category"
          value={values.category}
          onChange={(event) =>
            update('category', event.target.value as VehicleFormValues['category'])
          }
        >
          {VEHICLE_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {formatCategory(category)}
            </option>
          ))}
        </SelectField>
        <TextField
          label="Price (USD)"
          inputMode="decimal"
          value={values.price}
          onChange={(event) => update('price', event.target.value)}
          error={errors.price}
        />
        <TextField
          label="Units in stock"
          inputMode="numeric"
          value={values.quantity}
          onChange={(event) => update('quantity', event.target.value)}
          error={errors.quantity}
        />
        <TextField
          label="Year"
          inputMode="numeric"
          value={values.year}
          onChange={(event) => update('year', event.target.value)}
          error={errors.year}
        />
        <SelectField
          label="Fuel type"
          value={values.fuel_type}
          onChange={(event) =>
            update('fuel_type', event.target.value as VehicleFormValues['fuel_type'])
          }
        >
          {FUEL_TYPES.map((fuel) => (
            <option key={fuel} value={fuel}>
              {formatFuel(fuel)}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Transmission"
          value={values.transmission}
          onChange={(event) =>
            update('transmission', event.target.value as VehicleFormValues['transmission'])
          }
        >
          {TRANSMISSIONS.map((transmission) => (
            <option key={transmission} value={transmission}>
              {formatTransmission(transmission)}
            </option>
          ))}
        </SelectField>
        <TextField
          label="Mileage (km)"
          inputMode="numeric"
          value={values.mileage_km}
          onChange={(event) => update('mileage_km', event.target.value)}
          error={errors.mileage_km}
          className="sm:col-span-2"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save vehicle'}
        </Button>
      </div>
    </form>
  )
}
