CREATE TABLE conversations (
  id UUID PRIMARY KEY,
  model VARCHAR(50) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE TABLE conversation_sources (
  id SERIAL PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  source_type VARCHAR(50) NOT NULL,
  source_reference TEXT,
  ingested_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE conversation_storage (
  id SERIAL PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  storage_type VARCHAR(50) NOT NULL,
  storage_key TEXT NOT NULL CHECK (length(storage_key) > 0),
  content_hash TEXT NOT NULL,
  parser_version VARCHAR(20) NOT NULL DEFAULT 'v1',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_conversation_storage_content_hash
ON conversation_storage(content_hash);

CREATE TABLE conversation_stats (
  conversation_id UUID PRIMARY KEY REFERENCES conversations(id) ON DELETE CASCADE,
  view_count INTEGER NOT NULL DEFAULT 0,
  last_accessed TIMESTAMP,
  embedding_cached BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_conversations_model ON conversations(model);
CREATE INDEX idx_sources_type ON conversation_sources(source_type);
CREATE INDEX idx_storage_type ON conversation_storage(storage_type);
CREATE INDEX idx_stats_last_accessed ON conversation_stats(last_accessed);



