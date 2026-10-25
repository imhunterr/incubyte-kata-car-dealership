import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'

import { server } from '../test/server'
import { ApiError, apiRequest, messageFor } from './client'

describe('apiRequest', () => {
  it('sends a JSON body and returns the parsed JSON response', async () => {
    let received: unknown
    let contentType: string | null = null
    server.use(
      http.post('*/api/echo', async ({ request }) => {
        received = await request.json()
        contentType = request.headers.get('Content-Type')
        return HttpResponse.json({ ok: true }, { status: 201 })
      }),
    )

    const result = await apiRequest<{ ok: boolean }>('/echo', {
      method: 'POST',
      body: { hello: 'world' },
    })

    expect(result).toEqual({ ok: true })
    expect(received).toEqual({ hello: 'world' })
    expect(contentType).toBe('application/json')
  })

  it('sends the access token as a bearer Authorization header', async () => {
    let authorization: string | null = null
    server.use(
      http.get('*/api/secret', ({ request }) => {
        authorization = request.headers.get('Authorization')
        return HttpResponse.json({})
      }),
    )

    await apiRequest('/secret', { token: 'abc.def.ghi' })

    expect(authorization).toBe('Bearer abc.def.ghi')
  })

  it('sends no Authorization header without a token', async () => {
    let authorization: string | null = 'unset'
    server.use(
      http.get('*/api/public', ({ request }) => {
        authorization = request.headers.get('Authorization')
        return HttpResponse.json({})
      }),
    )

    await apiRequest('/public')

    expect(authorization).toBeNull()
  })

  it('adds query parameters, skipping empty and undefined values', async () => {
    let search = ''
    server.use(
      http.get('*/api/items', ({ request }) => {
        search = new URL(request.url).search
        return HttpResponse.json([])
      }),
    )

    await apiRequest('/items', { query: { make: 'Toyota', model: '', max_price: undefined } })

    expect(search).toBe('?make=Toyota')
  })

  it('returns undefined for 204 No Content', async () => {
    server.use(http.delete('*/api/items/1', () => new HttpResponse(null, { status: 204 })))

    await expect(apiRequest('/items/1', { method: 'DELETE' })).resolves.toBeUndefined()
  })

  it('throws an ApiError carrying the status and the API detail message', async () => {
    server.use(
      http.post('*/api/vehicles/1/purchase', () =>
        HttpResponse.json({ detail: 'Vehicle is out of stock' }, { status: 409 }),
      ),
    )

    const error = await apiRequest('/vehicles/1/purchase', { method: 'POST' }).catch(
      (caught: unknown) => caught,
    )

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 409, message: 'Vehicle is out of stock' })
  })

  it('turns a validation error list into a readable message', async () => {
    server.use(
      http.post('*/api/auth/register', () =>
        HttpResponse.json(
          {
            detail: [
              { loc: ['body', 'email'], msg: 'value is not a valid email address' },
              { loc: ['body', 'password'], msg: 'String should have at least 8 characters' },
            ],
          },
          { status: 422 },
        ),
      ),
    )

    const error = await apiRequest('/auth/register', { method: 'POST', body: {} }).catch(
      (caught: unknown) => caught,
    )

    expect(error).toMatchObject({
      status: 422,
      message:
        'email: value is not a valid email address; password: String should have at least 8 characters',
    })
  })

  it('falls back to a generic message when the error body is not JSON', async () => {
    server.use(http.get('*/api/broken', () => new HttpResponse('oops', { status: 500 })))

    const error = await apiRequest('/broken').catch((caught: unknown) => caught)

    expect(error).toMatchObject({ status: 500, message: 'Request failed (500)' })
  })

  it('falls back to a generic message when a JSON error has no usable detail', async () => {
    server.use(http.get('*/api/odd', () => HttpResponse.json({ error: 'nope' }, { status: 502 })))

    const error = await apiRequest('/odd').catch((caught: unknown) => caught)

    expect(error).toMatchObject({ status: 502, message: 'Request failed (502)' })
  })

  it('shows a validation message without a field name when it has no location', async () => {
    server.use(
      http.get('*/api/search', () =>
        HttpResponse.json(
          { detail: [{ loc: ['body'], msg: 'min_price must not be greater than max_price' }] },
          { status: 422 },
        ),
      ),
    )

    const error = await apiRequest('/search').catch((caught: unknown) => caught)

    expect(error).toMatchObject({ message: 'min_price must not be greater than max_price' })
  })

  it('reports a network failure as an ApiError with status 0', async () => {
    server.use(http.get('*/api/offline', () => HttpResponse.error()))

    const error = await apiRequest('/offline').catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      status: 0,
      message: 'Could not reach the server. Check your connection.',
    })
  })
})

describe('messageFor', () => {
  it('uses the message of an ApiError', () => {
    expect(messageFor(new ApiError(409, 'Vehicle is out of stock'))).toBe('Vehicle is out of stock')
  })

  it('falls back to a generic message for anything else', () => {
    expect(messageFor(new TypeError('x is undefined'))).toBe(
      'Something went wrong. Please try again.',
    )
  })
})
