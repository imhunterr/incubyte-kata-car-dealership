/**
 * Minimal typed HTTP client for the dealership API.
 *
 * Every call goes to `/api/...` on the current origin: in development Vite
 * proxies it to the FastAPI backend, and in production the web server does.
 * Every failure, whether an HTTP error or a network problem, is raised as an
 * {@link ApiError} with a message that is safe to show to users.
 */

/** A failed API call. `status` is the HTTP status, or 0 if the server was unreachable. */
export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

type QueryValue = string | number | undefined | null

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  /** Serialised as JSON. */
  body?: unknown
  /** Access token; sent as `Authorization: Bearer <token>`. */
  token?: string | null
  /** Query parameters. Empty, `undefined` and `null` values are left out. */
  query?: Record<string, QueryValue>
}

const NETWORK_ERROR_MESSAGE = 'Could not reach the server. Check your connection.'

/**
 * Call the API and return the parsed JSON response (`undefined` for 204).
 *
 * @throws {ApiError} for any non-2xx response or network failure.
 */
export async function apiRequest<T = unknown>(
  path: string,
  { method = 'GET', body, token, query }: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers['Authorization'] = `Bearer ${token}`

  let response: Response
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, NETWORK_ERROR_MESSAGE)
  }

  if (!response.ok) {
    throw new ApiError(response.status, await errorMessage(response))
  }
  if (response.status === 204) {
    return undefined as T
  }
  return (await response.json()) as T
}

function buildUrl(path: string, query: RequestOptions['query']): string {
  // An absolute URL (resolved against the page's origin) also works outside
  // the browser, e.g. in tests.
  const url = new URL(`/api${path}`, window.location.origin)
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value))
    }
  }
  return url.toString()
}

interface ValidationIssue {
  loc?: (string | number)[]
  msg?: string
}

/** Extract a human-readable message from an error response. */
async function errorMessage(response: Response): Promise<string> {
  const fallback = `Request failed (${response.status})`
  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    return fallback
  }

  const detail = (payload as { detail?: unknown } | null)?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    // FastAPI validation errors: [{ loc: ["body", "password"], msg: "..." }, ...]
    return (detail as ValidationIssue[])
      .map(({ loc, msg }) => {
        const field = loc?.filter((part) => part !== 'body').join('.')
        return field ? `${field}: ${msg}` : String(msg)
      })
      .join('; ')
  }
  return fallback
}

/** A user-facing message for any error thrown while calling the API. */
export function messageFor(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Something went wrong. Please try again.'
}
