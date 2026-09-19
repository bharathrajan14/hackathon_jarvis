DO $$ BEGIN
  CREATE TYPE session_status AS ENUM ('ACTIVE', 'MFA_REQUIRED', 'RESTRICTED', 'SUSPENDED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status session_status NOT NULL,
  current_risk INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
