-- Create resource_sensitivity enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'resource_sensitivity') THEN
        CREATE TYPE resource_sensitivity AS ENUM ('low', 'medium', 'high');
    END IF;
END$$;

-- Create resources table
CREATE TABLE IF NOT EXISTS resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    sensitivity resource_sensitivity NOT NULL,
    min_role user_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed initial resources spanning all sensitivities and min_roles
INSERT INTO resources (name, sensitivity, min_role)
SELECT * FROM (VALUES
    ('Team Calendar', 'low'::resource_sensitivity, 'employee'::user_role),
    ('Employee Handbook', 'low'::resource_sensitivity, 'employee'::user_role),
    ('Sales Report', 'medium'::resource_sensitivity, 'manager'::user_role),
    ('Payroll.xlsx', 'high'::resource_sensitivity, 'manager'::user_role),
    ('System Config', 'high'::resource_sensitivity, 'admin'::user_role),
    ('Audit Logs & Keys', 'high'::resource_sensitivity, 'admin'::user_role)
) AS v(name, sensitivity, min_role)
WHERE NOT EXISTS (SELECT 1 FROM resources WHERE resources.name = v.name);
