import { NextResponse, type NextRequest } from 'next/server';
import { getServiceClient, validateScopes, isValidDomain, isValidIpOrCidr } from '@/lib/api-keys';
import { resolveAuth, requireScope } from '@/lib/api-auth';

// ---------------------------------------------------------------------------
// DELETE /api/keys/[id] — Revoke an API key (soft delete)
// ---------------------------------------------------------------------------

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { context, error: authError } = await resolveAuth(req);
    if (authError || !context) return authError!;

    const scopeError = requireScope(context, 'keys:manage');
    if (scopeError) return scopeError;

    const supabase = getServiceClient();
    const table = supabase.from('api_keys' as any) as any;
    const { data, error } = await table
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', context.userId)
      .is('revoked_at', null)
      .select('id')
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Key not found or already revoked' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'API key revoked' });

  } catch (error) {
    console.error('Revoke key error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/keys/[id] — Update key name, scopes, or allowlists
// ---------------------------------------------------------------------------

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { context, error: authError } = await resolveAuth(req);
    if (authError || !context) return authError!;

    const scopeError = requireScope(context, 'keys:manage');
    if (scopeError) return scopeError;

    const supabase = getServiceClient();

    const body = await req.json();
    const updates: Record<string, unknown> = {};

    // Validate and collect updates
    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.length < 1 || body.name.length > 64) {
        return NextResponse.json({ error: 'Name must be 1-64 characters' }, { status: 400 });
      }
      updates.name = body.name;
    }

    if (body.scopes !== undefined) {
      if (!Array.isArray(body.scopes) || body.scopes.length === 0 || !validateScopes(body.scopes)) {
        return NextResponse.json({ error: 'Invalid scopes' }, { status: 400 });
      }
      updates.scopes = body.scopes;
    }

    if (body.allowed_domains !== undefined) {
      if (body.allowed_domains !== null) {
        if (!Array.isArray(body.allowed_domains) || !body.allowed_domains.every(isValidDomain)) {
          return NextResponse.json({ error: 'Invalid allowed_domains' }, { status: 400 });
        }
      }
      updates.allowed_domains = body.allowed_domains;
    }

    if (body.allowed_ips !== undefined) {
      if (body.allowed_ips !== null) {
        if (!Array.isArray(body.allowed_ips) || !body.allowed_ips.every(isValidIpOrCidr)) {
          return NextResponse.json({ error: 'Invalid allowed_ips' }, { status: 400 });
        }
      }
      updates.allowed_ips = body.allowed_ips;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // Only update active (non-revoked) keys
    const table2 = supabase.from('api_keys' as any) as any;
    const { data, error } = await table2
      .update(updates)
      .eq('id', id)
      .eq('user_id', context.userId)
      .is('revoked_at', null)
      .select('id, key_prefix, name, scopes, allowed_domains, allowed_ips, expires_at, created_at')
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Key not found or revoked' }, { status: 404 });
    }

    return NextResponse.json(data);

  } catch (error) {
    console.error('Update key error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
