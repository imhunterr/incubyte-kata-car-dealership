/**
 * Mock API server for tests (Mock Service Worker, Node integration).
 *
 * Starts with no handlers: each test declares exactly the API responses it
 * needs with `server.use(...)`. Any request without a handler fails the test
 * (see `onUnhandledRequest: 'error'` in setup.ts), so tests can never depend
 * on a real backend by accident.
 */
import { setupServer } from 'msw/node'

export const server = setupServer()
