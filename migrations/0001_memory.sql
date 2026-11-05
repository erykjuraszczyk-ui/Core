CREATE TABLE IF NOT EXISTS memory_spaces (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS memory_entries (
  id TEXT PRIMARY KEY,
  space_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('semantic', 'episode')),
  content TEXT NOT NULL CHECK (length(content) BETWEEN 1 AND 4000),
  tags_json TEXT NOT NULL DEFAULT '[]',
  source TEXT NOT NULL DEFAULT 'user',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (space_id) REFERENCES memory_spaces(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_memory_entries_space_updated
  ON memory_entries(space_id, updated_at DESC);
