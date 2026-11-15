CREATE TABLE IF NOT EXISTS oidc_transactions (
  state_hash TEXT PRIMARY KEY,
  nonce TEXT NOT NULL,
  encrypted_verifier TEXT NOT NULL,
  redirect_after TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_oidc_transactions_expiry
  ON oidc_transactions(expires_at);

CREATE TABLE IF NOT EXISTS auth_sessions (
  session_hash TEXT PRIMARY KEY,
  subject TEXT NOT NULL,
  issuer TEXT NOT NULL,
  encrypted_tokens TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  refresh_lock_until INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_expiry
  ON auth_sessions(expires_at);

