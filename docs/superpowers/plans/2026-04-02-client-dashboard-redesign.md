# Client Dashboard Redesign - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Pipeline Kanban with a Clients list and comprehensive Client Dashboard that shows assessment results, work plans, tasks, agreements, communications, and financials in a unified, role-based interface.

**Architecture:**
- Backend: New `work_plans` + `work_plan_tasks` + `work_plan_costs` tables with migrations. API endpoints for CRUD operations. Role-based filtering (admin sees everything, client sees filtered data).
- Frontend: Replace Pipeline.tsx with ClientsPage.tsx (list). New ClientDashboard component with 9 tabs (Overview, Assessment, Work Plans, Tasks, Agreements, Engagements, Profile). Each tab has admin and client conditional rendering. Portal-side Client Dashboard mirrors admin structure but filtered.
- Data integration: Existing clients, assessments, portal_messages, agreements tables. New tables link work plans → tasks → costs.

**Tech Stack:** PostgreSQL (migrations), Node/Express (API), React (components), TypeScript, existing theme system

---

## Task 1: Database Schema - Work Plans Table

**Files:**
- Create: `server/src/index.ts` (modify to add migrations)

Add these migrations to the `startServer()` function in `server/src/index.ts` after existing migrations:

```typescript
// Work plans schema
await db.query(`
  CREATE TABLE IF NOT EXISTS work_plans (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    assessment_id INTEGER NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    markdown_source TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    client_approved_at TIMESTAMPTZ,
    client_approved_by VARCHAR(255),
    costs_approved_at TIMESTAMPTZ,
    costs_approved_by VARCHAR(255),
    total_cost NUMERIC(12, 2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(255)
  )
`)

await db.query(`
  CREATE TABLE IF NOT EXISTS work_plan_tasks (
    id SERIAL PRIMARY KEY,
    work_plan_id INTEGER NOT NULL REFERENCES work_plans(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    order_index INTEGER,
    status VARCHAR(50) NOT NULL DEFAULT 'not_started',
    assigned_to VARCHAR(255),
    due_date DATE,
    estimated_hours NUMERIC(6, 1),
    actual_hours NUMERIC(6, 1),
    cost NUMERIC(12, 2),
    progress_percent INTEGER DEFAULT 0,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`)

await db.query(`
  CREATE TABLE IF NOT EXISTS work_plan_costs (
    id SERIAL PRIMARY KEY,
    work_plan_id INTEGER NOT NULL REFERENCES work_plans(id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    category VARCHAR(100),
    approved BOOLEAN DEFAULT false,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`)

// Create indices
await db.query(`CREATE INDEX IF NOT EXISTS idx_work_plans_client ON work_plans(client_id)`)
await db.query(`CREATE INDEX IF NOT EXISTS idx_work_plans_status ON work_plans(status)`)
await db.query(`CREATE INDEX IF NOT EXISTS idx_work_plan_tasks_plan ON work_plan_tasks(work_plan_id)`)
await db.query(`CREATE INDEX IF NOT EXISTS idx_work_plan_costs_plan ON work_plan_costs(work_plan_id)`)
```

---

## Task 2: Backend API - Work Plans Endpoints

**Files:**
- Create: `server/src/routes/workplans.ts`
- Modify: `server/src/index.ts`

Create POST /api/work-plans, GET /api/work-plans/:client_id, GET /api/work-plans/:id/detail, PUT /api/work-plans/:id endpoints.

Register in index.ts: `app.use('/api/work-plans', workplansRouter)`

---

## Task 3: Backend API - Work Plan Tasks Endpoints

**Files:**
- Create: `server/src/routes/workplantasks.ts`
- Modify: `server/src/index.ts`

Create POST /api/work-plan-tasks, PUT /api/work-plan-tasks/:id endpoints for task management.

Register in index.ts: `app.use('/api/work-plan-tasks', workplantasksRouter)`

---

## Task 4: Frontend - Clients List (Replace Pipeline)

**Files:**
- Create: `client/src/components/Dashboard/ClientsPage.tsx`
- Modify: `client/src/components/Dashboard/index.tsx`

Replace Pipeline with ClientsPage. Show clients in card grid with search. Clicking client calls `onSelectClient(id)`.

---

## Task 5: Frontend - Client Dashboard Shell (9 tabs)

**Files:**
- Create: `client/src/components/Dashboard/ClientDashboard/index.tsx`
- Create: `client/src/components/Dashboard/ClientDashboard/OverviewTab.tsx`
- Create: `client/src/components/Dashboard/ClientDashboard/AssessmentTab.tsx`
- Create: `client/src/components/Dashboard/ClientDashboard/WorkPlansTab.tsx`
- Create: `client/src/components/Dashboard/ClientDashboard/TasksTab.tsx`
- Create: `client/src/components/Dashboard/ClientDashboard/AgreementsTab.tsx`
- Create: `client/src/components/Dashboard/ClientDashboard/EngagementsTab.tsx`
- Create: `client/src/components/Dashboard/ClientDashboard/ProfileTab.tsx`

Main dashboard with tabs. Update Dashboard index.tsx to render ClientDashboard when client selected.

---

## Task 6: Frontend - Overview Tab Implementation

Implement OverviewTab.tsx showing: status badge, next actions, financial summary, recent activity, quick action buttons. Admin view shows full info, client view shows filtered info.

---

## Task 7: Frontend - Assessment Tab Implementation

Show assessment results (score, breakdown, problem domains, biggest opportunity/risk, conversation transcript). Admin can unlock for client, client sees read-only.

---

## Task 8: Frontend - Work Plans Tab Implementation

Show list of plans (status, dates, progress). Admin can edit/send/assign costs. Client sees current plan with approval actions.

---

## Task 9: Frontend - Tasks Tab Implementation

Task list with status, assignee, due date, progress. Admin can update status/assign. Client sees read-only with contact button.

---

## Task 10: Frontend - Agreements Tab Implementation

Show signed agreements (name, date, download). Admin can send for signature. Client sees their signed docs (download only).

---

## Task 11: Frontend - Engagements Tab Implementation

Two-way message thread. Both admin and client can send messages. Show message history sorted by date.

---

## Task 12: Frontend - Profile Tab Implementation

Client profile (name, company, email, phone, website, start date, fees). Admin can edit all. Client can update contact info only.

---

## Task 13: Backend API - Work Plan Costs Endpoints

Create POST /api/work-plan-costs, PUT /api/work-plan-costs/:id (approve) endpoints.

---

## Task 14: Frontend - Work Plans Tab Markdown Upload

Add file upload to WorkPlansTab. Parse markdown to extract bullet points as tasks. Create work_plan_tasks automatically.

---

## Task 15: Portal - Client Dashboard View

Create client-side version in Portal (client/src/components/Portal/ClientDashboard). Mirror dashboard structure but show only client data. Link from Portal Results tab.

---

## Task 16: Integration & Testing

Wire all endpoints together. Test full flow: upload plan → approve → assign costs → approve → execute + track progress.

