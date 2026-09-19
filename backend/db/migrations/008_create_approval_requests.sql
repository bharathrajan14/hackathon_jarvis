-- Ensure 'hr' is in user_role enum
DO $$ BEGIN
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'hr';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create approval_status enum
DO $$ BEGIN
  CREATE TYPE approval_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create approval_requests table
CREATE TABLE IF NOT EXISTS approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  requested_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action_description TEXT NOT NULL,
  status approval_status NOT NULL DEFAULT 'PENDING',
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);
