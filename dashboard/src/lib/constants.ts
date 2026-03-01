/** Severity levels used throughout the codebase */
export const SEVERITY = {
  critical: 'critical',
  high: 'high',
  medium: 'medium',
  low: 'low',
  info: 'info',
} as const;

export type Severity = (typeof SEVERITY)[keyof typeof SEVERITY];

/** Scan statuses */
export const SCAN_STATUS = {
  pending: 'pending',
  running: 'running',
  completed: 'completed',
  failed: 'failed',
} as const;

export type ScanStatus = (typeof SCAN_STATUS)[keyof typeof SCAN_STATUS];

/** Dismissal reasons */
export const DISMISSAL_REASON = {
  false_positive: 'false_positive',
  accepted_risk: 'accepted_risk',
  not_applicable: 'not_applicable',
  will_fix_later: 'will_fix_later',
} as const;

export type DismissalReason = (typeof DISMISSAL_REASON)[keyof typeof DISMISSAL_REASON];

/** Dismissal scopes */
export const DISMISSAL_SCOPE = {
  project: 'project',
  scan: 'scan',
} as const;

export type DismissalScope = (typeof DISMISSAL_SCOPE)[keyof typeof DISMISSAL_SCOPE];

/** Plan names */
export const PLAN = {
  none: 'none',
  starter: 'starter',
  pro: 'pro',
  max: 'max',
} as const;

export type Plan = (typeof PLAN)[keyof typeof PLAN];

/**
 * Owner email used for admin-gated features (server-side routes).
 * Reads OWNER_EMAIL env var at runtime; falls back to support address.
 */
export const OWNER_EMAIL = process.env.OWNER_EMAIL || 'support@checkvibe.dev';

/**
 * Owner email for client-side components (must use NEXT_PUBLIC_ prefix).
 * Reads NEXT_PUBLIC_OWNER_EMAIL env var; falls back to support address.
 */
export const OWNER_EMAIL_CLIENT = process.env.NEXT_PUBLIC_OWNER_EMAIL || 'support@checkvibe.dev';

// PLAN_LIMITS removed — use plan-config.ts as the single source of truth for plan limits.
