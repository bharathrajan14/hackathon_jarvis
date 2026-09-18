-- Create access_requests table for audit logging
CREATE TABLE IF NOT EXISTS access_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    resource_id UUID NOT NULL REFERENCES resources(id) ON DELETE CASCADE,
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    network TEXT NOT NULL,
    location TEXT NOT NULL,
    risk_score INTEGER NOT NULL,
    risk_band TEXT NOT NULL,
    policy_action TEXT NOT NULL,
    factors_json JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
