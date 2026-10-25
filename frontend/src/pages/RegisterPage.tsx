/**
 * Registration page. Mirrors the API's rules client-side (valid e-mail,
 * 8-128 character password) for instant feedback; the API still validates.
 * After registering, the user is logged straight in.
 */
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'

import { messageFor } from '../api/client'
import { useAuth } from '../auth/useAuth'
import { Alert } from '../components/Alert'
import { AuthCard } from '../components/AuthCard'
import { Button } from '../components/Button'
import { TextField } from '../components/TextField'

const PASSWORD_MIN_LENGTH = 8
const PASSWORD_MAX_LENGTH = 128
// Deliberately simple: something@something.something. The API has the final say.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface FieldErrors {
  email?: string
  password?: string
  confirm?: string
}

function validate(email: string, password: string, confirm: string): FieldErrors {
  return {
    email: EMAIL_PATTERN.test(email) ? undefined : 'Enter a valid email address',
    password:
      password.length < PASSWORD_MIN_LENGTH
        ? `Password must be at least ${PASSWORD_MIN_LENGTH} characters`
        : password.length > PASSWORD_MAX_LENGTH
          ? `Password must be at most ${PASSWORD_MAX_LENGTH} characters`
          : undefined,
    confirm: confirm === password ? undefined : 'Passwords do not match',
  }
}

export function RegisterPage() {
  const { register } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const errors = validate(email.trim(), password, confirm)
    setFieldErrors(errors)
    if (Object.values(errors).some(Boolean)) return

    setFormError(null)
    setSubmitting(true)
    try {
      // Success logs the user in; the route guard then opens the dashboard.
      await register(email.trim(), password)
    } catch (error) {
      setFormError(messageFor(error))
      setSubmitting(false)
    }
  }

  return (
    <AuthCard
      title="Create an account"
      subtitle="Sign up to browse and buy vehicles."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-700">
            Log in
          </Link>
        </>
      }
    >
      {formError && <Alert className="mt-6">{formError}</Alert>}

      <form noValidate onSubmit={handleSubmit} className="mt-6 space-y-4">
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={fieldErrors.email}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={fieldErrors.password}
        />
        <TextField
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          error={fieldErrors.confirm}
        />
        <Button type="submit" disabled={submitting} className="w-full py-2.5">
          {submitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
    </AuthCard>
  )
}
