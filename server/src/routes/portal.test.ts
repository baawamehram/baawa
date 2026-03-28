import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import cookieParser from 'cookie-parser'

vi.mock('../db/client', () => ({ db: { query: vi.fn() } }))
vi.mock('../services/email', () => ({
  sendPortalOTP: vi.fn().mockResolvedValue(undefined),
  sendProspectReplyNotification: vi.fn().mockResolvedValue(undefined),
  sendCallConfirmation: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('../middleware/portalAuth', () => ({
  requirePortalAuth: vi.fn((req: any, _res: any, next: any) => {
    req.portalUser = { assessmentId: 1, email: 'a@test.com' }
    next()
  }),
}))
vi.mock('jsonwebtoken', () => ({
  default: { sign: vi.fn().mockReturnValue('mock.jwt.token'), verify: vi.fn() },
}))

import { db } from '../db/client'
import portalRouter from './portal'

const mockDb = vi.mocked(db)

const app = express()
app.use(express.json())
app.use(cookieParser())
app.use('/api/portal', portalRouter)

beforeEach(() => vi.clearAllMocks())

describe('POST /api/portal/login', () => {
  it('returns ok:true even when email not found (prevents enumeration)', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [] } as any)
    const res = await request(app).post('/api/portal/login').send({ email: 'nobody@test.com' })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  it('returns 400 for invalid email', async () => {
    const res = await request(app).post('/api/portal/login').send({ email: 'not-an-email' })
    expect(res.status).toBe(400)
  })

  it('sends OTP when email exists', async () => {
    mockDb.query
      .mockResolvedValueOnce({ rows: [{ id: 42 }] } as any)
      .mockResolvedValueOnce({ rows: [] } as any)
      .mockResolvedValueOnce({ rows: [] } as any)
    const { sendPortalOTP } = await import('../services/email')
    const res = await request(app).post('/api/portal/login').send({ email: 'user@test.com' })
    expect(res.status).toBe(200)
    expect(vi.mocked(sendPortalOTP)).toHaveBeenCalled()
  })
})

describe('POST /api/portal/verify', () => {
  it('returns 400 if OTP is not 6 digits', async () => {
    const res = await request(app).post('/api/portal/verify').send({ email: 'a@b.com', token: '123' })
    expect(res.status).toBe(400)
  })

  it('handles mixed-case email during verify', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [{ id: 1, assessment_id: 42 }] } as any)
    mockDb.query.mockResolvedValueOnce({ rows: [{ email: 'user@test.com' }] } as any)
    mockDb.query.mockResolvedValueOnce({ rows: [] } as any)

    const res = await request(app).post('/api/portal/verify').send({ 
      email: 'User@Test.Com', 
      token: '123456' 
    })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    // Verify that the query was called with lowercase email
    expect(mockDb.query).toHaveBeenCalledWith(expect.stringContaining('a.email = $1'), expect.arrayContaining(['user@test.com', '123456']))
  })

  it('returns 400 if token not found or expired', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [] } as any)
    const res = await request(app).post('/api/portal/verify').send({ email: 'a@b.com', token: '111111' })
    expect(res.status).toBe(400)
  })

  it('sets portal_token cookie and returns ok:true on valid token', async () => {
    const validToken = '123456'
    mockDb.query
      .mockResolvedValueOnce({ rows: [{ id: 1, assessment_id: 42 }] } as any)
      .mockResolvedValueOnce({ rows: [{ email: 'user@test.com' }] } as any)
      .mockResolvedValueOnce({ rows: [] } as any)

    const res = await request(app).post('/api/portal/verify').send({ email: 'user@test.com', token: validToken })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.headers['set-cookie']).toBeDefined()
  })
})

describe('GET /api/portal/me', () => {
  it('returns assessment data when authenticated', async () => {
    mockDb.query.mockResolvedValueOnce({
      rows: [{ id: 1, email: 'a@test.com', results_unlocked: false, conversation: [] }]
    } as any)
    const res = await request(app).get('/api/portal/me')
    expect(res.status).toBe(200)
    expect(res.body.email).toBe('a@test.com')
  })
})

describe('POST /api/portal/messages', () => {
  it('returns 400 for empty message body', async () => {
    const res = await request(app).post('/api/portal/messages').send({ body: '   ' })
    expect(res.status).toBe(400)
  })

  it('inserts message and returns ok:true', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [] } as any)
    const res = await request(app).post('/api/portal/messages').send({ body: 'Hello there' })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })
})
