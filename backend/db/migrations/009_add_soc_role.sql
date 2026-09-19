-- Add 'soc' to user_role enum
DO $$ BEGIN
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'soc';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
