-- Create device_trust_level enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'device_trust_level') THEN
        CREATE TYPE device_trust_level AS ENUM ('trusted', 'unknown', 'untrusted');
    END IF;
END$$;

-- Create devices table
CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    fingerprint TEXT NOT NULL,
    trust_level device_trust_level NOT NULL DEFAULT 'unknown',
    first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_user_device_fingerprint UNIQUE (user_id, fingerprint)
);
