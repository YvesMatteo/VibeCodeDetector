import { NextResponse, type NextRequest } from 'next/server';
import {
  generateApiKey,
  hashApiKey,
  keyPrefix,
  getServiceClient,
  validateScopes,
  isValidDomain,
  isValidIpOrCidr,
  type Scope,
} from '@/lib/api-keys';
import { resolveAuth, requireScope } from '@/lib/api-auth';

const MAX_KEYS_PER_USER = 10;
const DEFAULT_EXPIRY_DAYS = 90;

// ---------------------------------------------------------------------------
// POST /api/keys — Create a new API key
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const { context, error: authError } = await resolveAuth(req);
    if (authError || !context) return authError!;

    const scopeError = requireScope(context, 'keys:manage');
    if (scopeError) return scopeError;

    const userId = context.userId;

    const supabase = getServiceClient();

    const body = await req.json();
    const {
      name = 'Default',
      scopes = ['scan:read'] as string[],
      allowed_domains,
      allowed_ips,
      expires_in_days = DEFAULT_EXPIRY_DAYS,
    } = body;

    // Validate name
    if (typeof name !== 'string' || name.length < 1 || name.length > 64) {
      return NextResponse.json({ error: 'Name must be 1-64 characters' }, { status: 400 });
    }

    // Validate scopes
    if (!Array.isArray(scopes) || scopes.length === 0 || !validateScopes(scopes)) {
      return NextResponse.json({ error: 'Invalid scopes' }, { status: 400 });
    }

    // Validate domains
    if (allowed_domains !== undefined && allowed_domains !== null) {
      if (!Array.isArray(allowed_domains) || !allowed_domains.every(isValidDomain)) {
        return NextResponse.json({ error: 'Invalid allowed_domains' }, { status: 400 });
      }
    }

    // Validate IPs
    if (allowed_ips !== undefined && allowed_ips !== null) {
      if (!Array.isArray(allowed_ips) || !allowed_ips.every(isValidIpOrCidr)) {
        return NextResponse.json({ error: 'Invalid allowed_ips' }, { status: 400 });
      }
    }

    // Validate expiry (1–365 days)
    const expiryDays = Math.floor(Number(expires_in_days));
    if (!Number.isFinite(expiryDays) || expiryDays < 1 || expiryDays > 365) {
      return NextResponse.json(
        { error: 'expires_in_days must be an integer between 1 and 365' },
        { status: 400 }
      );
    }

    // Check key count limit
    const table = supabase.from('api_keys' as any) as any;
    const { count } = await table
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .is('revoked_at', null);

    if ((count ?? 0) >= MAX_KEYS_PER_USER) {
      return NextResponse.json(
        { error: `Maximum ${MAX_KEYS_PER_USER} active keys allowed. Revoke an existing key first.` },
        { status: 400 }
      );
    }

    // Generate key
    const fullKey = generateApiKey();
    const hash = hashApiKey(fullKey);
    const prefix = keyPrefix(fullKey);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    const insertTable = supabase.from('api_keys' as any) as any;
    const { data: keyRow, error: insertError } = await insertTable
      .insert({
        user_id: userId,
        key_hash: hash,
        key_prefix: prefix,
        name,
        scopes: scopes as Scope[],
        allowed_domains: allowed_domains ?? null,
        allowed_ips: allowed_ips ?? null,
        expires_at: expiresAt.toISOString(),
      })
      .select('id, key_prefix, name, scopes, allowed_domains, allowed_ips, expires_at, created_at')
      .single();

    if (insertError) {
      console.error('API key insert error:', insertError);
      return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 });
    }

    // Return the full key ONCE — it will never be shown again
    return NextResponse.json({
      ...(keyRow as any),
      key: fullKey,
      message: 'Save this key now — it will not be shown again.',
    }, { status: 201 });

  } catch (error) {
    console.error('Create key error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// GET /api/keys — List user's API keys (no secrets, just metadata)
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  try {
    const { context, error: authError } = await resolveAuth(req);
    if (authError || !context) return authError!;

    const scopeError = requireScope(context, 'keys:read');
    if (scopeError) return scopeError;

    const supabase = getServiceClient();
    const keysTable = supabase.from('api_keys' as any) as any;
    const { data: keys, error } = await keysTable
      .select('id, key_prefix, name, scopes, allowed_domains, allowed_ips, expires_at, revoked_at, last_used_at, created_at')
      .eq('user_id', context.userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('List keys error:', error);
      return NextResponse.json({ error: 'Failed to list keys' }, { status: 500 });
    }

    return NextResponse.json({ keys });

  } catch (error) {
    console.error('List keys error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
