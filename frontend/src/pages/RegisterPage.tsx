/**
 * Registration page. Mirrors the API's rules client-side (valid e-mail,
 * 8-128 character password) for instant feedback; the API still validates.
 * After registering, the user is logged straight in.
 */
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'

import { ApiError } from '../api/client'
import { useAuth } from '../auth/useAuth'
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
      setFormError(error instanceof ApiError ? error.message : 'Something went wrong')
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-bold tracking-tight">Create an account</h1>
      <p className="mt-1 text-sm text-slate-600">Sign up to browse and buy vehicles.</p>

      {formError && (
        <div
          role="alert"
          className="mt-6 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {formError}
        </div>
      )}

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
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-700">
          Log in
        </Link>
      </p>
    </div>
  )
}
