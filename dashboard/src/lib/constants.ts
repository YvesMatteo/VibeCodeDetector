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

/** Plan limits */
export const PLAN_LIMITS: Record<string, { domains: number; scans: number; projects: number; apiKeys: number }> = {
  none: { domains: 0, scans: 0, projects: 0, apiKeys: 0 },
  starter: { domains: 1, scans: 5, projects: 1, apiKeys: 1 },
  pro: { domains: 3, scans: 20, projects: 3, apiKeys: 5 },
  max: { domains: 10, scans: 75, projects: 10, apiKeys: 20 },
};
