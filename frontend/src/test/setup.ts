/**
 * Global test setup, run by Vitest before every test file.
 *
 * - Registers the jest-dom matchers (`toBeInTheDocument`, `toBeDisabled`, ...).
 * - Runs the mock API server and resets its handlers between tests.
 * - Unmounts rendered components and clears storage after each test, so tests
 *   stay isolated.
 */
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'

import { server } from './server'

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

afterEach(() => {
  cleanup()
  server.resetHandlers()
  localStorage.clear()
})

afterAll(() => {
  server.close()
})
