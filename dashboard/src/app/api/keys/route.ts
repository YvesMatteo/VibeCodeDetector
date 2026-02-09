import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  generateApiKey,
  hashApiKey,
  keyPrefix,
  validateScopes,
  isValidDomain,
  isValidIpOrCidr,
  type Scope,
} from '@/lib/api-keys';

const MAX_KEYS_PER_USER = 10;
const DEFAULT_EXPIRY_DAYS = 90;

// ---------------------------------------------------------------------------
// POST /api/keys — Create a new API key
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    // Check key count limit
    const { count } = await supabase
      .from('api_keys' as any)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
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
    expiresAt.setDate(expiresAt.getDate() + (expires_in_days || DEFAULT_EXPIRY_DAYS));

    const { data: keyRow, error: insertError } = await supabase
      .from('api_keys' as any)
      .insert({
        user_id: user.id,
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
      ...keyRow,
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

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: keys, error } = await supabase
      .from('api_keys' as any)
      .select('id, key_prefix, name, scopes, allowed_domains, allowed_ips, expires_at, revoked_at, last_used_at, created_at')
      .eq('user_id', user.id)
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
