-- Rename 'enterprise' plan to 'max' in CHECK constraint and migrate existing users
-- Drop old constraint and add new one that allows 'max' instead of 'enterprise'
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS chk_profile_plan;
ALTER TABLE profiles ADD CONSTRAINT chk_profile_plan CHECK (plan IN ('none', 'starter', 'pro', 'max'));

-- Migrate existing enterprise users to max
UPDATE profiles SET plan = 'max' WHERE plan = 'enterprise';
