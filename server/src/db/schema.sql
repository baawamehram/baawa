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
  founder_name VARCHAR(255),
  company_name VARCHAR(255),
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

-- Portal authentication: OTP tokens for email login
CREATE TABLE IF NOT EXISTS portal_tokens (
  id SERIAL PRIMARY KEY,
  assessment_id INT NOT NULL REFERENCES assessments(id),
  token VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_portal_tokens_assessment ON portal_tokens(assessment_id);
CREATE INDEX IF NOT EXISTS idx_portal_tokens_token ON portal_tokens(token);

-- Portal: Messages between prospect and team
CREATE TABLE IF NOT EXISTS portal_messages (
  id SERIAL PRIMARY KEY,
  assessment_id INT NOT NULL REFERENCES assessments(id),
  sender VARCHAR(50) NOT NULL CHECK (sender IN ('team', 'prospect')),
  body TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_portal_messages_assessment ON portal_messages(assessment_id);

-- Email queue for email scheduler
CREATE TABLE IF NOT EXISTS email_queue (
  id SERIAL PRIMARY KEY,
  assessment_id INT REFERENCES assessments(id),
  email_type VARCHAR(100) NOT NULL,
  recipient_email VARCHAR(255) NOT NULL,
  subject VARCHAR(255),
  body TEXT,
  ab_variant VARCHAR(50),
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_assessment ON email_queue(assessment_id);
CREATE INDEX IF NOT EXISTS idx_email_queue_type ON email_queue(email_type);

-- Email templates for different sequences
CREATE TABLE IF NOT EXISTS email_templates (
  id SERIAL PRIMARY KEY,
  email_type VARCHAR(50) NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Email sequence configuration (timing + enabled state)
CREATE TABLE IF NOT EXISTS email_sequence_config (
  id SERIAL PRIMARY KEY,
  email_type VARCHAR(50) NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  delay_hours NUMERIC(6,2) NOT NULL DEFAULT 12,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- A/B test configuration for emails
CREATE TABLE IF NOT EXISTS email_ab_tests (
  id SERIAL PRIMARY KEY,
  email_type VARCHAR(50) NOT NULL,
  variant_name VARCHAR(100) NOT NULL,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  traffic_split NUMERIC(4,3) NOT NULL DEFAULT 0.5,
  active BOOLEAN NOT NULL DEFAULT true,
  winner BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ab_tests_one_active
  ON email_ab_tests(email_type) WHERE active = true;

-- Call scheduling: slots offered to prospects
CREATE TABLE IF NOT EXISTS call_slots (
  id SERIAL PRIMARY KEY,
  assessment_id INT NOT NULL REFERENCES assessments(id),
  proposed_slots JSONB,
  selected_slot TIMESTAMP,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_call_slots_assessment ON call_slots(assessment_id);

-- Proposals sent to prospects
CREATE TABLE IF NOT EXISTS proposals (
  id SERIAL PRIMARY KEY,
  assessment_id INT NOT NULL REFERENCES assessments(id),
  title VARCHAR(255),
  content TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'approved', 'rejected')),
  sent_at TIMESTAMP,
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_proposals_assessment ON proposals(assessment_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status);

-- Agreements: signed proposals
CREATE TABLE IF NOT EXISTS agreements (
  id SERIAL PRIMARY KEY,
  proposal_id INT NOT NULL REFERENCES proposals(id),
  assessment_id INT NOT NULL REFERENCES assessments(id),
  signed_name VARCHAR(255),
  signed_at TIMESTAMP,
  signed_ip VARCHAR(50),
  signed_user_agent TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'signed')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(proposal_id)
);

CREATE INDEX IF NOT EXISTS idx_agreements_assessment ON agreements(assessment_id);

-- Sentinel: AI-detected insights and proposals
CREATE TABLE IF NOT EXISTS sentinel_proposals (
  id SERIAL PRIMARY KEY,
  assessment_id INT NOT NULL REFERENCES assessments(id),
  type VARCHAR(50) NOT NULL CHECK (type IN ('friction', 'optimization', 'anomaly')),
  observation TEXT,
  proposal TEXT,
  behavioral_frame VARCHAR(100),
  status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'implemented', 'archived')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sentinel_assessment ON sentinel_proposals(assessment_id);
CREATE INDEX IF NOT EXISTS idx_sentinel_status ON sentinel_proposals(status);

-- Add missing columns to assessments if needed
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS results_unlocked BOOLEAN DEFAULT FALSE;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS problem_domains JSONB;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS founder_archetype VARCHAR(100);
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS engagement_pulse VARCHAR(100);
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS phone VARCHAR(50);

-- Add missing columns to deliverables if needed
ALTER TABLE deliverables ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE deliverables ADD COLUMN IF NOT EXISTS file_url VARCHAR(255);
ALTER TABLE deliverables ADD COLUMN IF NOT EXISTS file_data BYTEA;
ALTER TABLE deliverables ADD COLUMN IF NOT EXISTS file_name VARCHAR(255);
ALTER TABLE deliverables ADD COLUMN IF NOT EXISTS file_mime VARCHAR(100);
ALTER TABLE deliverables ADD COLUMN IF NOT EXISTS milestone_order INT;
ALTER TABLE deliverables ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP;
ALTER TABLE deliverables ADD COLUMN IF NOT EXISTS accepted_by VARCHAR(255);
ALTER TABLE deliverables ADD COLUMN IF NOT EXISTS portal_visible BOOLEAN DEFAULT FALSE;

-- Add missing columns to clients if needed
ALTER TABLE clients ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS website VARCHAR(255);

-- Add missing columns to email_queue if needed
ALTER TABLE email_queue ADD COLUMN IF NOT EXISTS ab_variant VARCHAR(20);
