/**
 * Stripe plan definitions and price-to-plan mapping logic.
 * Extracted from the webhook handler so it can be unit-tested independently.
 */

export interface PlanInfo {
  plan: string;
  domains: number;
  scans: number;
}

/**
 * Maps every known Stripe price ID to its corresponding plan, domain limit, and scan limit.
 * Includes current prices, annual variants, and legacy price IDs.
 */
export const PLANS_BY_PRICE_ID: Record<string, PlanInfo> = {
  // Starter
  'price_1Sz2CgLRbxIsl4HLE7jp6ecZ': { plan: 'starter', domains: 1, scans: 30 },  // monthly
  'price_1T1G35LRbxIsl4HLq1Geq4Ov': { plan: 'starter', domains: 1, scans: 30 },  // annual (30% off)
  'price_1Sz2CiLRbxIsl4HLDkUzXZXs': { plan: 'starter', domains: 1, scans: 30 },  // annual (legacy 20%)
  // Pro
  'price_1Sz2CjLRbxIsl4HLbs2LEaw0': { plan: 'pro', domains: 3, scans: 155 },      // monthly
  'price_1T1G36LRbxIsl4HLcxaSjnej': { plan: 'pro', domains: 3, scans: 155 },      // annual (30% off)
  'price_1Sz2ClLRbxIsl4HLrXX3IxAf': { plan: 'pro', domains: 3, scans: 155 },      // annual (legacy 20%)
  // Max (formerly Enterprise)
  'price_1T1G99LRbxIsl4HLzT5TNktI': { plan: 'max', domains: 10, scans: 3000 },     // monthly $79
  'price_1T1G99LRbxIsl4HLfsEV74xC': { plan: 'max', domains: 10, scans: 3000 },     // annual (30% off)
  'price_1Sz2CnLRbxIsl4HL2XFxYOmP': { plan: 'max', domains: 10, scans: 3000 },     // legacy monthly $89
  'price_1T1G36LRbxIsl4HLk68EVav3': { plan: 'max', domains: 10, scans: 3000 },     // legacy annual
  'price_1Sz2CoLRbxIsl4HL1uhpaBEp': { plan: 'max', domains: 10, scans: 3000 },     // legacy annual
};

/**
 * The set of valid plan names and their associated limits.
 * Used for metadata fallback validation.
 */
export const VALID_PLANS: Record<string, { domains: number; scans: number }> = {
  starter: { domains: 1, scans: 30 },
  pro: { domains: 3, scans: 155 },
  max: { domains: 10, scans: 3000 },
};

/**
 * Resolves a Stripe price ID to a PlanInfo object.
 * Returns null if the price ID is unknown.
 */
export function resolvePlanByPriceId(priceId: string): PlanInfo | null {
  return PLANS_BY_PRICE_ID[priceId] ?? null;
}

/**
 * Validates and resolves a plan name from metadata against known plans.
 * Returns null if the plan name is invalid or not provided.
 */
export function resolvePlanByMetadata(planName: string | undefined | null): PlanInfo | null {
  if (!planName || !VALID_PLANS[planName]) {
    return null;
  }
  return {
    plan: planName,
    domains: VALID_PLANS[planName].domains,
    scans: VALID_PLANS[planName].scans,
  };
}

/**
 * UUID v4 regex for validating userId from webhook metadata.
 */
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates that a string is a well-formed UUID v4.
 */
export function isValidUUID(value: string | undefined | null): boolean {
  if (!value) return false;
  return UUID_REGEX.test(value);
}
