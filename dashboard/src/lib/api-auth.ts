import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hashApiKey, getServiceClient, type Scope } from './api-keys';
import { checkAllRateLimits } from './rate-limit';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuthenticatedContext {
  userId: string;
  /** Set if authenticated via API key */
  keyId?: string;
  scopes?: Scope[];
  keyAllowedDomains?: string[] | null;
  keyAllowedIps?: string[] | null;
  plan: string;
  planScansUsed: number;
  planScansLimit: number;
  planDomains: number;
  userAllowedDomains: string[];
}

export interface AuthResult {
  context: AuthenticatedContext | null;
  error: NextResponse | null;
}

// ---------------------------------------------------------------------------
// Resolve auth: session cookie OR `Authorization: Bearer cvd_live_...` header
// ---------------------------------------------------------------------------

export async function resolveAuth(req: NextRequest): Promise<AuthResult> {
  const authHeader = req.headers.get('authorization');
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
    ?? req.headers.get('x-real-ip')
    ?? '0.0.0.0';

  // ── API Key auth ──────────────────────────────────────────────────────
  if (authHeader?.startsWith('Bearer cvd_live_')) {
    const apiKey = authHeader.slice('Bearer '.length);
    const keyHash = hashApiKey(apiKey);
    const supabase = getServiceClient();

    const { data, error } = await supabase.rpc('validate_api_key', { p_key_hash: keyHash } as any) as {
      data: Array<{
        key_id: string;
        user_id: string;
        scopes: Scope[];
        allowed_domains: string[] | null;
        allowed_ips: string[] | null;
        plan: string;
        plan_scans_used: number;
        plan_scans_limit: number;
        plan_domains: number;
        user_allowed_domains: string[];
      }> | null;
      error: any;
    };

    if (error || !data || data.length === 0) {
      return {
        context: null,
        error: NextResponse.json(
          { error: 'Invalid or expired API key' },
          { status: 401 }
        ),
      };
    }

    const row = data[0];

    // IP allowlist check
    if (row.allowed_ips && row.allowed_ips.length > 0) {
      if (!row.allowed_ips.includes(ip)) {
        return {
          context: null,
          error: NextResponse.json(
            { error: 'Request from unauthorized IP address' },
            { status: 403 }
          ),
        };
      }
    }

    // Rate limit check
    const rateLimit = await checkAllRateLimits({
      keyId: row.key_id,
      userId: row.user_id,
      ip,
      plan: row.plan,
    });

    if (!rateLimit.allowed) {
      return {
        context: null,
        error: NextResponse.json(
          { error: 'Rate limit exceeded' },
          { status: 429, headers: rateLimit.headers }
        ),
      };
    }

    return {
      context: {
        userId: row.user_id,
        keyId: row.key_id,
        scopes: row.scopes,
        keyAllowedDomains: row.allowed_domains,
        keyAllowedIps: row.allowed_ips,
        plan: row.plan,
        planScansUsed: row.plan_scans_used,
        planScansLimit: row.plan_scans_limit,
        planDomains: row.plan_domains,
        userAllowedDomains: row.user_allowed_domains ?? [],
      },
      error: null,
    };
  }

  // ── Session auth (existing flow) ──────────────────────────────────────
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return {
      context: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  // Fetch profile for plan info
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, plan_scans_used, plan_scans_limit, plan_domains, allowed_domains')
    .eq('id', user.id)
    .single();

  // Rate limit for session-based users (per-user + per-IP, no key)
  const rateLimit = await checkAllRateLimits({
    userId: user.id,
    ip,
    plan: profile?.plan ?? 'none',
  });

  if (!rateLimit.allowed) {
    return {
      context: null,
      error: NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: rateLimit.headers }
      ),
    };
  }

  return {
    context: {
      userId: user.id,
      plan: profile?.plan ?? 'none',
      planScansUsed: profile?.plan_scans_used ?? 0,
      planScansLimit: profile?.plan_scans_limit ?? 0,
      planDomains: profile?.plan_domains ?? 0,
      userAllowedDomains: profile?.allowed_domains ?? [],
    },
    error: null,
  };
}

// ---------------------------------------------------------------------------
// Scope enforcement helper
// ---------------------------------------------------------------------------

export function requireScope(context: AuthenticatedContext, scope: Scope): NextResponse | null {
  // Session-based auth has all permissions (existing behavior)
  if (!context.keyId) return null;

  if (!context.scopes?.includes(scope)) {
    return NextResponse.json(
      { error: `API key missing required scope: ${scope}` },
      { status: 403 }
    );
  }
  return null;
}

// ---------------------------------------------------------------------------
// Domain enforcement helper
// ---------------------------------------------------------------------------

export function requireDomain(context: AuthenticatedContext, domain: string): NextResponse | null {
  // Only enforce if key has domain restrictions
  if (!context.keyId || !context.keyAllowedDomains || context.keyAllowedDomains.length === 0) {
    return null;
  }

  // Normalize: lowercase + strip trailing dot to prevent bypass via case or FQDN
  const normalizedDomain = domain.toLowerCase().replace(/\.$/, '');
  const normalizedAllowed = context.keyAllowedDomains.map(d => d.toLowerCase().replace(/\.$/, ''));

  if (!normalizedAllowed.includes(normalizedDomain)) {
    return NextResponse.json(
      { error: `API key not authorized for domain: ${domain}` },
      { status: 403 }
    );
  }
  return null;
}

// ---------------------------------------------------------------------------
// Audit log helper (fire-and-forget)
// ---------------------------------------------------------------------------

export function logApiKeyUsage(opts: {
  keyId?: string;
  userId: string;
  endpoint: string;
  method: string;
  ip: string;
  statusCode: number;
}): void {
  // Only log API key usage, not session-based requests
  if (!opts.keyId) return;

  const supabase = getServiceClient();
  const table = supabase.from('api_key_usage_log' as any) as any;
  table.insert({
    key_id: opts.keyId,
    user_id: opts.userId,
    endpoint: opts.endpoint,
    method: opts.method,
    ip_address: opts.ip,
    status_code: opts.statusCode,
  }).then(({ error }: { error: any }) => {
    if (error) console.error('Audit log write failed:', error);
  });
}
