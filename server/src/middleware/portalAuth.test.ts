import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Request, Response, NextFunction } from 'express'

vi.mock('../db/client', () => ({ db: { query: vi.fn() } }))
vi.mock('jsonwebtoken')

import jwt from 'jsonwebtoken'
import { db } from '../db/client'
import { requirePortalAuth } from './portalAuth'

const mockDb = vi.mocked(db)
const mockJwt = vi.mocked(jwt)

function makeReq(cookie?: string): Partial<Request> {
  return { cookies: cookie ? { portal_token: cookie } : {} } as Partial<Request>
}
function makeRes(): { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> } {
  const json = vi.fn()
  const status = vi.fn().mockReturnValue({ json })
  return { status, json }
}

beforeEach(() => { vi.clearAllMocks() })

describe('requirePortalAuth', () => {
  it('returns 401 if no cookie present', async () => {
    const req = makeReq()
    const res = makeRes()
    const next = vi.fn()
    await requirePortalAuth(req as Request, res as unknown as Response, next as NextFunction)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 401 if JWT is invalid', async () => {
    mockJwt.verify = vi.fn().mockImplementation(() => { throw new Error('bad token') })
    const req = makeReq('bad.token.here')
    const res = makeRes()
    const next = vi.fn()
    await requirePortalAuth(req as Request, res as unknown as Response, next as NextFunction)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('returns 401 if assessment email does not match JWT email', async () => {
    mockJwt.verify = vi.fn().mockReturnValue({ assessmentId: 1, email: 'a@test.com' })
    mockDb.query.mockResolvedValueOnce({ rows: [{ email: 'different@test.com' }] } as any)
    const req = makeReq('valid.token.here')
    const res = makeRes()
    const next = vi.fn()
    await requirePortalAuth(req as Request, res as unknown as Response, next as NextFunction)
    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('calls next and sets req.portalUser when token is valid', async () => {
    mockJwt.verify = vi.fn().mockReturnValue({ assessmentId: 1, email: 'a@test.com' })
    mockDb.query.mockResolvedValueOnce({ rows: [{ email: 'a@test.com' }] } as any)
    const req = makeReq('valid.token.here') as Request
    const res = makeRes()
    const next = vi.fn()
    await requirePortalAuth(req, res as unknown as Response, next as NextFunction)
    expect(next).toHaveBeenCalled()
    expect(req.portalUser).toEqual({ assessmentId: 1, email: 'a@test.com' })
  })
})
