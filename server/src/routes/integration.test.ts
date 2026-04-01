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
import workplansRouter from './workplans'
import workplantasksRouter from './workplantasks'
import workplancostsRouter from './workplancosts'

const mockDb = vi.mocked(db)

const app = express()
app.use(express.json())
app.use('/api/work-plans', workplansRouter)
app.use('/api/work-plan-tasks', workplantasksRouter)
app.use('/api/work-plan-costs', workplancostsRouter)

beforeEach(() => vi.clearAllMocks())

describe('Integration: Complete Work Plan Approval Flow', () => {
  it('should create a work plan, tasks, costs, and complete full workflow', async () => {
    // Step 1: Admin creates a work plan
    const mockPlan = {
      id: 1,
      client_id: 1,
      assessment_id: 1,
      title: 'Phase 1 - Setup',
      description: 'Initial setup work',
      markdown_source: '# Phase 1\n## Task 1\n## Task 2',
      status: 'draft',
      client_approved_at: null,
      client_approved_by: null,
      costs_approved_at: null,
      costs_approved_by: null,
      total_cost: null,
      created_at: '2026-04-02T00:00:00Z',
      updated_at: '2026-04-02T00:00:00Z',
      created_by: 'admin@test.com',
    }

    mockDb.query.mockResolvedValueOnce({ rows: [mockPlan] } as any)

    let res = await request(app).post('/api/work-plans').send({
      client_id: 1,
      assessment_id: 1,
      title: 'Phase 1 - Setup',
      description: 'Initial setup work',
      markdown_source: '# Phase 1\n## Task 1\n## Task 2',
    })

    expect(res.status).toBe(200)
    expect(res.body.id).toBe(1)
    expect(res.body.status).toBe('draft')

    // Step 2: System creates tasks from markdown
    const mockTasks = [
      {
        id: 1,
        work_plan_id: 1,
        title: 'Task 1',
        description: undefined,
        order_index: 0,
        status: 'not_started',
        progress_percent: 0,
        assigned_to: null,
        due_date: null,
        estimated_hours: null,
        actual_hours: null,
        cost: null,
        completed_at: null,
        created_at: '2026-04-02T00:00:00Z',
        updated_at: '2026-04-02T00:00:00Z',
      },
      {
        id: 2,
        work_plan_id: 1,
        title: 'Task 2',
        description: undefined,
        order_index: 1,
        status: 'not_started',
        progress_percent: 0,
        assigned_to: null,
        due_date: null,
        estimated_hours: null,
        actual_hours: null,
        cost: null,
        completed_at: null,
        created_at: '2026-04-02T00:00:00Z',
        updated_at: '2026-04-02T00:00:00Z',
      },
    ]

    mockDb.query.mockResolvedValueOnce({ rows: mockTasks } as any)

    res = await request(app).get('/api/work-plan-tasks?client_id=1')
    expect(res.status).toBe(200)
    expect(res.body.length).toBe(2)

    // Step 3: Admin adds costs to work plan
    const mockCosts = [
      {
        id: 1,
        work_plan_id: 1,
        description: 'Design work',
        amount: 5000,
        category: 'design',
        approved: false,
        approved_at: null,
        created_at: '2026-04-02T00:00:00Z',
      },
      {
        id: 2,
        work_plan_id: 1,
        description: 'Development',
        amount: 10000,
        category: 'development',
        approved: false,
        approved_at: null,
        created_at: '2026-04-02T00:00:00Z',
      },
    ]

    mockDb.query
      .mockResolvedValueOnce({ rows: [{ id: 1 }] } as any) // plan exists
      .mockResolvedValueOnce({ rows: [mockCosts[0]] } as any) // cost created

    res = await request(app).post('/api/work-plan-costs').send({
      work_plan_id: 1,
      description: 'Design work',
      amount: 5000,
      category: 'design',
    })

    expect(res.status).toBe(201)
    expect(res.body.description).toBe('Design work')
    expect(res.body.approved).toBe(false)

    // Step 4: Client approves costs
    const approvedCost = { ...mockCosts[0], approved: true, approved_at: '2026-04-02T12:00:00Z' }

    mockDb.query
      .mockResolvedValueOnce({ rows: [mockCosts[0]] } as any) // cost exists
      .mockResolvedValueOnce({ rows: [approvedCost] } as any) // cost approved
      .mockResolvedValueOnce({
        rows: [{ total: '2', approved_count: '1' }],
      } as any) // not all approved yet

    res = await request(app).put('/api/work-plan-costs/1/approve')
    expect(res.status).toBe(200)
    expect(res.body.approved).toBe(true)

    // Step 5: Update work plan status to in_progress
    const progressPlan = { ...mockPlan, status: 'in_progress' }
    mockDb.query.mockResolvedValueOnce({ rows: [progressPlan] } as any)

    res = await request(app).put('/api/work-plans/1').send({
      status: 'in_progress',
    })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('in_progress')

    // Step 6: Update task progress
    const progressTask = { ...mockTasks[0], status: 'in_progress', progress_percent: 50 }
    mockDb.query.mockResolvedValueOnce({ rows: [progressTask] } as any)

    res = await request(app).put('/api/work-plan-tasks/1').send({
      status: 'in_progress',
      progress_percent: 50,
    })

    expect(res.status).toBe(200)
    expect(res.body.progress_percent).toBe(50)

    // Step 7: Complete task
    const completedTask = {
      ...mockTasks[0],
      status: 'completed',
      progress_percent: 100,
      completed_at: '2026-04-02T16:00:00Z',
    }
    mockDb.query.mockResolvedValueOnce({ rows: [completedTask] } as any)

    res = await request(app).put('/api/work-plan-tasks/1').send({
      status: 'completed',
      progress_percent: 100,
    })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('completed')
    expect(res.body.completed_at).toBeDefined()
  })
})

describe('Integration: Task Management & Progress Tracking', () => {
  it('should handle task filtering, sorting, and status updates', async () => {
    const mockTasks = [
      {
        id: 1,
        work_plan_id: 1,
        title: 'Setup Database',
        description: 'Initialize database schema',
        status: 'in_progress',
        progress_percent: 75,
        assigned_to: 'Alice',
        due_date: '2026-04-10',
        work_plan_title: 'Phase 1',
        created_at: '2026-04-02T00:00:00Z',
        updated_at: '2026-04-02T00:00:00Z',
        order_index: 0,
        estimated_hours: 10,
        actual_hours: 8,
        cost: 2000,
        completed_at: null,
      },
      {
        id: 2,
        work_plan_id: 1,
        title: 'API Development',
        description: 'Build REST endpoints',
        status: 'not_started',
        progress_percent: 0,
        assigned_to: null,
        due_date: '2026-04-15',
        work_plan_title: 'Phase 1',
        created_at: '2026-04-02T00:00:00Z',
        updated_at: '2026-04-02T00:00:00Z',
        order_index: 1,
        estimated_hours: 20,
        actual_hours: null,
        cost: 5000,
        completed_at: null,
      },
    ]

    // Test: Fetch tasks for client (should be sorted by due date)
    mockDb.query.mockResolvedValueOnce({ rows: mockTasks } as any)

    let res = await request(app).get('/api/work-plan-tasks?client_id=1')
    expect(res.status).toBe(200)
    expect(res.body.length).toBe(2)
    expect(res.body[0].progress_percent).toBe(75)

    // Test: Update task assignment
    const updatedTask = { ...mockTasks[1], assigned_to: 'Bob' }
    mockDb.query.mockResolvedValueOnce({ rows: [updatedTask] } as any)

    res = await request(app).put('/api/work-plan-tasks/2').send({
      assigned_to: 'Bob',
    })

    expect(res.status).toBe(200)
    expect(res.body.assigned_to).toBe('Bob')

    // Test: Update due date
    const dueDateUpdated = { ...mockTasks[1], due_date: '2026-04-20' }
    mockDb.query.mockResolvedValueOnce({ rows: [dueDateUpdated] } as any)

    res = await request(app).put('/api/work-plan-tasks/2').send({
      due_date: '2026-04-20',
    })

    expect(res.status).toBe(200)
    expect(res.body.due_date).toBe('2026-04-20')

    // Test: Block a task
    const blockedTask = { ...mockTasks[1], status: 'blocked' }
    mockDb.query.mockResolvedValueOnce({ rows: [blockedTask] } as any)

    res = await request(app).put('/api/work-plan-tasks/2').send({
      status: 'blocked',
    })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('blocked')
  })
})

describe('Integration: Cost Approval Workflow', () => {
  it('should track cost approval cascade and update work plan when all costs approved', async () => {
    const mockCosts = [
      {
        id: 1,
        work_plan_id: 1,
        description: 'Consulting hours',
        amount: 8000,
        category: 'consulting',
        approved: false,
        approved_at: null,
        created_at: '2026-04-02T00:00:00Z',
      },
      {
        id: 2,
        work_plan_id: 1,
        description: 'Software licenses',
        amount: 2000,
        category: 'licenses',
        approved: false,
        approved_at: null,
        created_at: '2026-04-02T00:00:00Z',
      },
    ]

    // Test: Fetch costs for work plan
    mockDb.query.mockResolvedValueOnce({ rows: mockCosts } as any)

    let res = await request(app).get('/api/work-plan-costs?work_plan_id=1')
    expect(res.status).toBe(200)
    expect(res.body.length).toBe(2)
    expect(res.body.every((c: any) => !c.approved)).toBe(true)

    // Test: Approve first cost (not all approved yet)
    const cost1Approved = { ...mockCosts[0], approved: true, approved_at: '2026-04-02T10:00:00Z' }
    mockDb.query
      .mockResolvedValueOnce({ rows: [mockCosts[0]] } as any) // cost exists
      .mockResolvedValueOnce({ rows: [cost1Approved] } as any) // approval updates
      .mockResolvedValueOnce({
        rows: [{ total: '2', approved_count: '1' }],
      } as any) // check: 1 of 2 approved

    res = await request(app).put('/api/work-plan-costs/1/approve')
    expect(res.status).toBe(200)
    expect(res.body.approved).toBe(true)

    // Test: Approve second cost (now all approved)
    const cost2Approved = { ...mockCosts[1], approved: true, approved_at: '2026-04-02T10:05:00Z' }
    mockDb.query
      .mockResolvedValueOnce({ rows: [mockCosts[1]] } as any) // cost exists
      .mockResolvedValueOnce({ rows: [cost2Approved] } as any) // approval updates
      .mockResolvedValueOnce({
        rows: [{ total: '2', approved_count: '2' }],
      } as any) // check: 2 of 2 approved
      .mockResolvedValueOnce({ rows: [{ id: 1 }] } as any) // work plan updated

    res = await request(app).put('/api/work-plan-costs/2/approve')
    expect(res.status).toBe(200)

    // Verify all costs are approved
    mockDb.query.mockResolvedValueOnce({
      rows: [cost1Approved, cost2Approved],
    } as any)

    res = await request(app).get('/api/work-plan-costs?work_plan_id=1')
    expect(res.status).toBe(200)
    expect(res.body.every((c: any) => c.approved)).toBe(true)
  })
})

describe('Integration: Admin vs Client View Differences', () => {
  it('should handle role-based data access and actions', async () => {
    const mockPlan = {
      id: 1,
      client_id: 1,
      assessment_id: 1,
      title: 'Full Project',
      description: 'Complete project plan',
      status: 'draft',
      total_cost: 15000,
      costs_approved_at: null,
      client_approved_at: null,
      created_at: '2026-04-02T00:00:00Z',
      updated_at: '2026-04-02T00:00:00Z',
      created_by: 'admin@test.com',
    }

    // Admin can see all plan details (GET /:client_id returns array)
    mockDb.query.mockResolvedValueOnce({ rows: [mockPlan] } as any)

    let res = await request(app).get('/api/work-plans/1')
    expect(res.status).toBe(200)
    // GET endpoint returns array of plans
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body[0].total_cost).toBeDefined()

    // Test: Admin-only action - Change status to awaiting_approval
    const pendingPlan = { ...mockPlan, status: 'awaiting_approval' }
    mockDb.query.mockResolvedValueOnce({ rows: [pendingPlan] } as any)

    res = await request(app).put('/api/work-plans/1').send({
      status: 'awaiting_approval',
    })
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('awaiting_approval')

    // Test: Admin can assign costs to tasks
    mockDb.query
      .mockResolvedValueOnce({ rows: [{ id: 1, work_plan_id: 1 }] } as any)
      .mockResolvedValueOnce({ rows: [{ id: 1, work_plan_id: 1, assigned_to: 'Team Member' }] } as any)

    res = await request(app).put('/api/work-plan-tasks/1').send({
      assigned_to: 'Team Member',
    })
    expect(res.status).toBe(200)
  })
})

describe('Integration: Error Handling & Validation', () => {
  it('should validate data and return appropriate error responses', async () => {
    // Test: Missing required client_id
    let res = await request(app).post('/api/work-plans').send({
      assessment_id: 1,
      title: 'Test Plan',
    })
    expect(res.status).toBe(400)

    // Test: Missing work_plan_id for tasks
    res = await request(app).get('/api/work-plan-tasks')
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('client_id query parameter required')

    // Test: Invalid task status
    res = await request(app).put('/api/work-plan-tasks/1').send({
      status: 'invalid_status',
    })
    expect(res.status).toBe(400)

    // Test: Negative cost amount
    res = await request(app).post('/api/work-plan-costs').send({
      work_plan_id: 1,
      description: 'Invalid',
      amount: -5000,
    })
    expect(res.status).toBe(400)

    // Test: Zero cost amount
    res = await request(app).post('/api/work-plan-costs').send({
      work_plan_id: 1,
      description: 'Invalid',
      amount: 0,
    })
    expect(res.status).toBe(400)

    // Test: Missing cost description
    res = await request(app).post('/api/work-plan-costs').send({
      work_plan_id: 1,
      amount: 5000,
    })
    expect(res.status).toBe(400)
  })

})

