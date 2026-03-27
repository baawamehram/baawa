-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Knowledge base chunks for RAG
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id SERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  embedding vector(768),
  source_name VARCHAR(255) NOT NULL DEFAULT 'default',
  is_active BOOLEAN NOT NULL DEFAULT true,
  chunk_index INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Active assessment sessions (conversation state)
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address VARCHAR(50),
  city VARCHAR(100),
  country VARCHAR(100),
  lat DECIMAL(10,6),
  lon DECIMAL(10,6),
  conversation JSONB NOT NULL DEFAULT '[]',
  question_count INT NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Final assessments (linked to session, created on email submit)
CREATE TABLE IF NOT EXISTS assessments (
  id SERIAL PRIMARY KEY,
  session_id UUID REFERENCES sessions(id),
  email VARCHAR(255) UNIQUE NOT NULL,
  city VARCHAR(100),
  country VARCHAR(100),
  conversation JSONB NOT NULL,
  score INT,
  score_breakdown JSONB,
  score_summary TEXT,
  biggest_opportunity TEXT,
  biggest_risk TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'onboarded', 'deferred')),
  founder_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CRM: Clients (created when assessment is accepted/onboarded)
CREATE TABLE IF NOT EXISTS clients (
  id SERIAL PRIMARY KEY,
  assessment_id INT REFERENCES assessments(id),
  founder_name VARCHAR(255),
  company_name VARCHAR(255),
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  website VARCHAR(255),
  stage VARCHAR(50) NOT NULL DEFAULT 'phase1' CHECK (stage IN ('phase1', 'phase2', 'churned')),
  phase1_fee DECIMAL(10,2),
  phase2_monthly_fee DECIMAL(10,2),
  phase2_revenue_pct DECIMAL(5,2),
  start_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CRM: Deliverables per client
CREATE TABLE IF NOT EXISTS deliverables (
  id SERIAL PRIMARY KEY,
  client_id INT REFERENCES clients(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  due_date DATE,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CRM: Notes per client
CREATE TABLE IF NOT EXISTS client_notes (
  id SERIAL PRIMARY KEY,
  client_id INT REFERENCES clients(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CRM: Activity log
CREATE TABLE IF NOT EXISTS activities (
  id SERIAL PRIMARY KEY,
  client_id INT REFERENCES clients(id) ON DELETE CASCADE,
  type VARCHAR(50),
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_knowledge_active ON knowledge_chunks(is_active);
CREATE INDEX IF NOT EXISTS idx_knowledge_source ON knowledge_chunks(source_name);
CREATE INDEX IF NOT EXISTS idx_knowledge_embedding ON knowledge_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_assessment_email ON assessments(email);
CREATE INDEX IF NOT EXISTS idx_assessment_status ON assessments(status);
CREATE INDEX IF NOT EXISTS idx_assessment_created ON assessments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_stage ON clients(stage);
CREATE INDEX IF NOT EXISTS idx_deliverable_client ON deliverables(client_id);
CREATE INDEX IF NOT EXISTS idx_assessment_session ON assessments(session_id);

-- Add journey_config_version to sessions (idempotent)
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS journey_config_version INT;

-- Versioned snapshots of all runtime-configurable funnel content
-- status: 'proposed' | 'active' | 'archived' | 'dismissed'
CREATE TABLE IF NOT EXISTS journey_config (
  id              SERIAL PRIMARY KEY,
  version         INT NOT NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'proposed',
  system_prompt   TEXT NOT NULL,
  intro_messages  JSONB NOT NULL,
  scoring_weights JSONB NOT NULL,
  change_summary  TEXT NOT NULL,
  risk_level      VARCHAR(10) NOT NULL,
  reasoning       TEXT NOT NULL,
  metrics_snapshot JSONB,
  activated_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_journey_config_status ON journey_config (status);
CREATE INDEX IF NOT EXISTS idx_journey_config_version ON journey_config (version DESC);

-- Only one active config at a time (DB-enforced via partial unique index)
CREATE UNIQUE INDEX IF NOT EXISTS journey_config_one_active
  ON journey_config ((1)) WHERE status = 'active';

-- Derived signals per session, computed server-side
CREATE TABLE IF NOT EXISTS session_analytics (
  id                      SERIAL PRIMARY KEY,
  session_id              UUID NOT NULL REFERENCES sessions(id),
  assessment_id           INT REFERENCES assessments(id),
  completed               BOOLEAN NOT NULL DEFAULT FALSE,
  question_count          INT NOT NULL DEFAULT 0,
  avg_answer_words        FLOAT,
  min_answer_words        INT,
  max_answer_words        INT,
  drop_off_at_question    INT,
  score                   INT,
  score_breakdown         JSONB,
  journey_config_version  INT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS session_analytics_session_id
  ON session_analytics (session_id);
CREATE INDEX IF NOT EXISTS idx_session_analytics_completed
  ON session_analytics (completed);
CREATE INDEX IF NOT EXISTS idx_session_analytics_created
  ON session_analytics (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_session_analytics_config_version
  ON session_analytics (journey_config_version);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS region VARCHAR(255);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS language VARCHAR(50);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS email VARCHAR(255);
