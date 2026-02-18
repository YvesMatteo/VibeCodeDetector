import { createClient as createServiceClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import type { Database } from '@/lib/supabase/database.types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const API_KEY_PREFIX = 'cvd_live_';

export const SCOPES = {
  'scan:read': 'Read scan results and history',
  'scan:write': 'Trigger new scans',
  'keys:read': 'List your API keys',
  'keys:manage': 'Create, update, and revoke API keys',
} as const;

export type Scope = keyof typeof SCOPES;

export const ALL_SCOPES = Object.keys(SCOPES) as Scope[];

// ---------------------------------------------------------------------------
// Key Generation & Hashing
// ---------------------------------------------------------------------------

/** Generate a new API key: `cvd_live_<32 hex chars>` */
export function generateApiKey(): string {
  const randomBytes = crypto.randomBytes(16); // 16 bytes = 32 hex chars
  return `${API_KEY_PREFIX}${randomBytes.toString('hex')}`;
}

/** SHA-256 hash of a key for storage */
export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/** Extract display prefix from a full key: `cvd_live_a1b2...` → `cvd_live_a1b2c3d4` */
export function keyPrefix(key: string): string {
  return key.slice(0, API_KEY_PREFIX.length + 8);
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

export function isValidScope(scope: string): scope is Scope {
  return scope in SCOPES;
}

export function validateScopes(scopes: string[]): scopes is Scope[] {
  return scopes.every(isValidScope);
}

/** Validate domain format (basic check) */
export function isValidDomain(domain: string): boolean {
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/i.test(domain);
}

/** Validate IP address or CIDR */
export function isValidIpOrCidr(ip: string): boolean {
  const parts = ip.split('/');
  if (parts.length > 2) return false;

  const octets = parts[0].split('.');
  if (octets.length !== 4) return false;
  for (const octet of octets) {
    if (!/^\d{1,3}$/.test(octet)) return false;
    const num = parseInt(octet, 10);
    if (num < 0 || num > 255) return false;
  }

  if (parts.length === 2) {
    if (!/^\d{1,2}$/.test(parts[1])) return false;
    const mask = parseInt(parts[1], 10);
    if (mask < 0 || mask > 32) return false;
  }

  return true;
}

// ---------------------------------------------------------------------------
// Service role client (for audit log writes and key validation)
// ---------------------------------------------------------------------------

let _serviceClient: ReturnType<typeof createServiceClient<Database>> | null = null;

export function getServiceClient() {
  if (!_serviceClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Missing SUPABASE_URL or SERVICE_ROLE_KEY');
    _serviceClient = createServiceClient<Database>(url, key);
  }
  return _serviceClient;
}

// ---------------------------------------------------------------------------
// Rate limit tiers per plan
// ---------------------------------------------------------------------------

export const RATE_LIMITS = {
  none:       { perKey: 5,   perUser: 10,  perIp: 20 },
  starter:    { perKey: 10,  perUser: 20,  perIp: 20 },
  pro:        { perKey: 30,  perUser: 60,  perIp: 20 },
  max:        { perKey: 100, perUser: 200, perIp: 20 },
} as const;

export type PlanName = keyof typeof RATE_LIMITS;

export function getRateLimits(plan: string) {
  return RATE_LIMITS[plan as PlanName] ?? RATE_LIMITS.none;
}
