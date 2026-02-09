-- =============================================================================
-- Performance Migration: Add missing database indexes
-- Created: 2026-02-09
-- =============================================================================

-- Index for dashboard queries that filter scans by user
CREATE INDEX IF NOT EXISTS idx_scans_user_id ON public.scans(user_id);

-- Index for scan list ordering by creation date
CREATE INDEX IF NOT EXISTS idx_scans_created_at ON public.scans(created_at);

-- Index for webhook lookups by Stripe customer ID
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON public.profiles(stripe_customer_id);

-- Index for webhook lookups by Stripe subscription ID
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_subscription_id ON public.profiles(stripe_subscription_id);

-- =============================================================================
-- Unique constraints for Stripe IDs (prevent duplicate customer/subscription mapping)
-- =============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id_unique
  ON public.profiles(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_stripe_subscription_id_unique
  ON public.profiles(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

-- =============================================================================
-- Composite index for the primary dashboard query: user's scans ordered by date
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_scans_user_created
  ON public.scans(user_id, created_at DESC);

-- =============================================================================
-- Data integrity constraints
-- =============================================================================

ALTER TABLE public.scans DROP CONSTRAINT IF EXISTS chk_scan_status;
ALTER TABLE public.scans ADD CONSTRAINT chk_scan_status CHECK (status IN ('pending', 'running', 'completed', 'failed'));

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS chk_profile_plan;
ALTER TABLE public.profiles ADD CONSTRAINT chk_profile_plan CHECK (plan IN ('none', 'starter', 'pro', 'enterprise'));

-- =============================================================================
-- Auto-update updated_at on profiles
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
