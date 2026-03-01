-- Add is_admin column to profiles table (2026-03-01)
-- Allows distinguishing admin users for privileged operations

-- 1. Add is_admin column with default FALSE
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- 2. RLS policy: prevent users from updating their own is_admin field
-- Only service_role (bypasses RLS) can modify is_admin
CREATE OR REPLACE FUNCTION prevent_is_admin_self_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- If is_admin is being changed and the caller is not service_role, block it
    IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
        IF current_setting('role', true) != 'service_role' THEN
            RAISE EXCEPTION 'Only service_role can modify is_admin';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_is_admin_protection ON profiles;
CREATE TRIGGER enforce_is_admin_protection
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION prevent_is_admin_self_update();

-- Revoke execute on the trigger function from non-service roles
REVOKE EXECUTE ON FUNCTION prevent_is_admin_self_update() FROM authenticated, anon;

-- 3. Set existing admin user
UPDATE profiles SET is_admin = TRUE WHERE id = '61599829-2889-47eb-920c-c0214989313a';
