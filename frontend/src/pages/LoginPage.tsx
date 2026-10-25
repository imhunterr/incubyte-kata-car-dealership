/** Login page: e-mail and password, with inline validation and API errors. */
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'

import { ApiError } from '../api/client'
import { useAuth } from '../auth/useAuth'
import { TextField } from '../components/TextField'

interface FieldErrors {
  email?: string
  password?: string
}

export function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const errors: FieldErrors = {
      email: email.trim() ? undefined : 'Enter your email',
      password: password ? undefined : 'Enter your password',
    }
    setFieldErrors(errors)
    if (errors.email || errors.password) return

    setFormError(null)
    setSubmitting(true)
    try {
      // On success the auth state changes and the route guard redirects to
      // the dashboard, so there is nothing else to do here.
      await login(email.trim(), password)
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : 'Something went wrong')
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-2xl font-bold tracking-tight">Log in</h1>
      <p className="mt-1 text-sm text-slate-600">Welcome back. Browse and buy in a few clicks.</p>

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
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={fieldErrors.password}
        />
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Logging in…' : 'Log in'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        New here?{' '}
        <Link to="/register" className="font-semibold text-indigo-600 hover:text-indigo-700">
          Create an account
        </Link>
      </p>
    </div>
  )
}
