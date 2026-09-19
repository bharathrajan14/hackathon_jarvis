CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  resource_id UUID REFERENCES resources(id) ON DELETE SET NULL,
  risk_score INTEGER NOT NULL,
  risk_band TEXT NOT NULL,
  policy_action TEXT NOT NULL,
  factors_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  evidence_json JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
