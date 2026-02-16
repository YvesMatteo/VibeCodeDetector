-- Rename 'enterprise' plan to 'max' in CHECK constraint and migrate existing users
-- Step 1: Drop old constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS chk_profile_plan;

-- Step 2: Migrate existing enterprise users to max (BEFORE adding new constraint)
UPDATE profiles SET plan = 'max' WHERE plan = 'enterprise';

-- Step 3: Add new constraint that allows 'max' instead of 'enterprise'
ALTER TABLE profiles ADD CONSTRAINT chk_profile_plan CHECK (plan IN ('none', 'starter', 'pro', 'max'));
