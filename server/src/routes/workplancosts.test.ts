import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'

vi.mock('../db/client', () => ({ db: { query: vi.fn() } }))
vi.mock('../middleware/auth', () => ({
  requireAuth: vi.fn((req: any, _res: any, next: any) => {
    req.user = { email: 'admin@test.com' }
    next()
  }),
}))

import { db } from '../db/client'
import workplancostsRouter from './workplancosts'

const mockDb = vi.mocked(db)

const app = express()
app.use(express.json())
app.use('/api/work-plan-costs', workplancostsRouter)

beforeEach(() => vi.clearAllMocks())

describe('GET /api/work-plan-costs', () => {
  it('returns 400 if work_plan_id is missing', async () => {
    const res = await request(app).get('/api/work-plan-costs')
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('work_plan_id query parameter required')
  })

  it('returns costs for a work plan', async () => {
    const mockCosts = [
      { id: 1, work_plan_id: 1, description: 'Design', amount: 5000, category: 'design', approved: false, approved_at: null, created_at: '2026-04-02T00:00:00Z' },
      { id: 2, work_plan_id: 1, description: 'Development', amount: 10000, category: 'dev', approved: true, approved_at: '2026-04-01T00:00:00Z', created_at: '2026-04-02T00:00:00Z' },
    ]
    mockDb.query.mockResolvedValueOnce({ rows: mockCosts } as any)

    const res = await request(app).get('/api/work-plan-costs?work_plan_id=1')
    expect(res.status).toBe(200)
    expect(res.body).toEqual(mockCosts)
  })

  it('returns empty array if no costs exist', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [] } as any)

    const res = await request(app).get('/api/work-plan-costs?work_plan_id=999')
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })
})

describe('POST /api/work-plan-costs', () => {
  it('returns 400 for invalid request (missing description)', async () => {
    const res = await request(app).post('/api/work-plan-costs').send({
      work_plan_id: 1,
      amount: 5000,
    })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Invalid request')
  })

  it('returns 400 for invalid request (amount not positive)', async () => {
    const res = await request(app).post('/api/work-plan-costs').send({
      work_plan_id: 1,
      description: 'Design',
      amount: -1000,
    })
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid request (empty description)', async () => {
    const res = await request(app).post('/api/work-plan-costs').send({
      work_plan_id: 1,
      description: '',
      amount: 5000,
    })
    expect(res.status).toBe(400)
  })

  it('returns 404 if work plan does not exist', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [] } as any)

    const res = await request(app).post('/api/work-plan-costs').send({
      work_plan_id: 999,
      description: 'Design',
      amount: 5000,
      category: 'design',
    })
    expect(res.status).toBe(404)
    expect(res.body.error).toBe('Work plan not found')
  })

  it('creates a new cost item', async () => {
    const mockCost = {
      id: 1,
      work_plan_id: 1,
      description: 'Design',
      amount: 5000,
      category: 'design',
      approved: false,
      approved_at: null,
      created_at: '2026-04-02T00:00:00Z',
    }
    mockDb.query
      .mockResolvedValueOnce({ rows: [{ id: 1 }] } as any) // work plan exists
      .mockResolvedValueOnce({ rows: [mockCost] } as any) // insert returns cost

    const res = await request(app).post('/api/work-plan-costs').send({
      work_plan_id: 1,
      description: 'Design',
      amount: 5000,
      category: 'design',
    })
    expect(res.status).toBe(201)
    expect(res.body).toEqual(mockCost)
  })

  it('creates cost with optional category as null', async () => {
    const mockCost = {
      id: 2,
      work_plan_id: 1,
      description: 'Other',
      amount: 3000,
      category: null,
      approved: false,
      approved_at: null,
      created_at: '2026-04-02T00:00:00Z',
    }
    mockDb.query
      .mockResolvedValueOnce({ rows: [{ id: 1 }] } as any)
      .mockResolvedValueOnce({ rows: [mockCost] } as any)

    const res = await request(app).post('/api/work-plan-costs').send({
      work_plan_id: 1,
      description: 'Other',
      amount: 3000,
    })
    expect(res.status).toBe(201)
    expect(res.body.category).toBeNull()
  })
})

describe('PUT /api/work-plan-costs/:id', () => {
  it('returns 404 if cost does not exist', async () => {
    mockDb.query.mockResolvedValueOnce({ rows: [] } as any)

    const res = await request(app).put('/api/work-plan-costs/999').send({
      description: 'Updated',
    })
    expect(res.status).toBe(404)
    expect(res.body.error).toBe('Cost not found')
  })

  it('returns 400 if no fields to update', async () => {
    mockDb.query.mockResolvedValueOnce({
      rows: [{ id: 1, work_plan_id: 1, description: 'Design', amount: 5000 }]
    } as any)

    const res = await request(app).put('/api/work-plan-costs/1').send({})
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('No fields to update')
  })

  it('updates description only', async () => {
    const updated = {
      id: 1,
      work_plan_id: 1,
      description: 'Updated Design',
      amount: 5000,
      category: 'design',
      approved: false,
    }
    mockDb.query
      .mockResolvedValueOnce({ rows: [{ id: 1 }] } as any)
      .mockResolvedValueOnce({ rows: [updated] } as any)

    const res = await request(app).put('/api/work-plan-costs/1').send({
      description: 'Updated Design',
    })
    expect(res.status).toBe(200)
    expect(res.body.description).toBe('Updated Design')
  })

  it('updates amount and validates positive', async () => {
    mockDb.query.mockResolvedValueOnce({
      rows: [{ id: 1, work_plan_id: 1 }]
    } as any)

    const res = await request(app).put('/api/work-plan-costs/1').send({
      amount: -100,
    })
    expect(res.status).toBe(400)
  })

  it('validates amount is positive when updating', async () => {
    mockDb.query.mockResolvedValueOnce({
      rows: [{ id: 1, work_plan_id: 1 }]
    } as any)

    const res = await request(app).put('/api/work-plan-costs/1').send({
      amount: 0,
    })
    expect(res.status).toBe(400)
  })
})

describe('PUT /api/work-plan-costs/:id/approve', () => {
  it('approves cost successfully', async () => {
    const approved = {
      id: 1,
      work_plan_id: 1,
      description: 'Design',
      amount: 5000,
      category: 'design',
      approved: true,
      approved_at: '2026-04-02T12:00:00Z',
    }
    mockDb.query
      .mockResolvedValueOnce({ rows: [{ id: 1 }] } as any) // cost exists
      .mockResolvedValueOnce({ rows: [approved] } as any) // approval updates cost
      .mockResolvedValueOnce({ rows: [{ total: '2', approved_count: '1' }] } as any) // not all approved

    const res = await request(app).put('/api/work-plan-costs/1/approve')
    expect(res.status).toBe(200)
  })
})

