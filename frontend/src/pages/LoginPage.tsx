/** Login page: e-mail and password, with inline validation and API errors. */
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'

import { useAuth } from '../auth/useAuth'
import { Alert } from '../components/Alert'
import { AuthCard } from '../components/AuthCard'
import { Button } from '../components/Button'
import { TextField } from '../components/TextField'
import { useAsyncAction } from '../hooks/useAsyncAction'

interface FieldErrors {
  email?: string
  password?: string
}

export function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const { busy: submitting, error: formError, run } = useAsyncAction()

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const errors: FieldErrors = {
      email: email.trim() ? undefined : 'Enter your email',
      password: password ? undefined : 'Enter your password',
    }
    setFieldErrors(errors)
    if (errors.email || errors.password) return

    // On success the auth state changes and the route guard redirects to
    // the dashboard, so there is nothing else to do here.
    await run(() => login(email.trim(), password))
  }

  return (
    <AuthCard
      title="Log in"
      subtitle="Welcome back. Browse and buy in a few clicks."
      footer={
        <>
          New here?{' '}
          <Link to="/register" className="font-semibold text-amber-700 hover:text-amber-800">
            Create an account
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
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={fieldErrors.password}
        />
        <Button type="submit" disabled={submitting} className="w-full py-2.5">
          {submitting ? 'Logging in…' : 'Log in'}
        </Button>
      </form>
    </AuthCard>
  )
}
