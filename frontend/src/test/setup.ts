/**
 * Global test setup, run by Vitest before every test file.
 *
 * - Registers the jest-dom matchers (`toBeInTheDocument`, `toBeDisabled`, ...).
 * - Unmounts rendered components after each test so tests stay isolated.
 */
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})
