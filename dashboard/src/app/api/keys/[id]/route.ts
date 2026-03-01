import { NextResponse, type NextRequest } from 'next/server';
import { getServiceClient, validateScopes, isValidDomain, isValidIpOrCidr, type Scope } from '@/lib/api-keys';
import { resolveAuth, requireScope } from '@/lib/api-auth';
import { checkCsrf } from '@/lib/csrf';
import { checkRateLimit } from '@/lib/rate-limit';

// ---------------------------------------------------------------------------
// DELETE /api/keys/[id] — Revoke or permanently delete an API key
//   ?permanent=true  → hard delete (only if already revoked or expired)
//   default          → soft revoke
// ---------------------------------------------------------------------------

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // CSRF protection (skipped for API key auth)
    const csrfError = checkCsrf(req);
    if (csrfError) return csrfError;

    const { id } = await params;
    const { context, error: authError } = await resolveAuth(req);
    if (authError || !context) return authError!;

    const scopeError = requireScope(context, 'keys:manage');
    if (scopeError) return scopeError;

    // Rate limit: 10 key deletions per minute per user
    const rlDel = await checkRateLimit(`keys-del:${context.userId}`, 10, 60);
    if (!rlDel.allowed) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const permanent = req.nextUrl.searchParams.get('permanent') === 'true';
    const supabase = getServiceClient();
    const table = supabase.from('api_keys');

    if (permanent) {
      // Only allow permanent deletion of inactive keys (revoked or expired)
      const { data: existing } = await table
        .select('id, revoked_at, expires_at')
        .eq('id', id)
        .eq('user_id', context.userId)
        .single();

      if (!existing) {
        return NextResponse.json({ error: 'Key not found' }, { status: 404 });
      }

      const isRevoked = !!existing.revoked_at;
      const isExpired = existing.expires_at && new Date(existing.expires_at) < new Date();

      if (!isRevoked && !isExpired) {
        return NextResponse.json(
          { error: 'Only revoked or expired keys can be permanently deleted' },
          { status: 400 },
        );
      }

      // Clean up rate_limit_windows for this key (uses text identifier, no FK)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC not in generated types
      await (supabase.rpc as any)('cleanup_api_key_artifacts', { p_key_id: id });

      const { error } = await table
        .delete()
        .eq('id', id)
        .eq('user_id', context.userId);

      if (error) {
        return NextResponse.json({ error: 'Failed to delete key' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'API key permanently deleted' });
    }

    // Soft revoke
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
    // CSRF protection (skipped for API key auth)
    const csrfError = checkCsrf(req);
    if (csrfError) return csrfError;

    const { id } = await params;
    const { context, error: authError } = await resolveAuth(req);
    if (authError || !context) return authError!;

    const scopeError = requireScope(context, 'keys:manage');
    if (scopeError) return scopeError;

    // Rate limit: 10 key updates per minute per user
    const rlPatch = await checkRateLimit(`keys-patch:${context.userId}`, 10, 60);
    if (!rlPatch.allowed) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

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

    // ── Privilege escalation prevention ──────────────────────────────────
    // When updating via API key auth, the updated fields cannot exceed
    // the parent key's permissions.
    if (context.keyId) {
      // Scopes: updated scopes must be a subset of parent key's scopes
      if (updates.scopes) {
        const parentScopes = context.scopes ?? [];
        const escalatedScopes = (updates.scopes as string[]).filter(s => !parentScopes.includes(s as Scope));
        if (escalatedScopes.length > 0) {
          return NextResponse.json(
            { error: `Cannot grant scopes not present on parent key: ${escalatedScopes.join(', ')}` },
            { status: 403 }
          );
        }
      }

      // Domains: if parent key has domain restrictions, updated domains must be a subset
      if (context.keyAllowedDomains && context.keyAllowedDomains.length > 0) {
        if (updates.allowed_domains !== undefined) {
          if (!updates.allowed_domains || !Array.isArray(updates.allowed_domains) || updates.allowed_domains.length === 0) {
            return NextResponse.json(
              { error: 'Parent key has domain restrictions. Updated key must specify allowed_domains as a subset.' },
              { status: 403 }
            );
          }
          const parentDomainsLower = context.keyAllowedDomains.map((d: string) => d.toLowerCase());
          const invalidDomains = (updates.allowed_domains as string[]).filter((d: string) => !parentDomainsLower.includes(d.toLowerCase()));
          if (invalidDomains.length > 0) {
            return NextResponse.json(
              { error: `Updated domains must be a subset of parent key's domains. Invalid: ${invalidDomains.join(', ')}` },
              { status: 403 }
            );
          }
        }
      }

      // IPs: if parent key has IP restrictions, updated IPs must be a subset
      if (context.keyAllowedIps && context.keyAllowedIps.length > 0) {
        if (updates.allowed_ips !== undefined) {
          if (!updates.allowed_ips || !Array.isArray(updates.allowed_ips) || updates.allowed_ips.length === 0) {
            return NextResponse.json(
              { error: 'Parent key has IP restrictions. Updated key must specify allowed_ips as a subset.' },
              { status: 403 }
            );
          }
          const invalidIps = (updates.allowed_ips as string[]).filter((ip: string) => !context.keyAllowedIps!.includes(ip));
          if (invalidIps.length > 0) {
            return NextResponse.json(
              { error: `Updated IPs must be a subset of parent key's IPs. Invalid: ${invalidIps.join(', ')}` },
              { status: 403 }
            );
          }
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // Only update active (non-revoked) keys
    const table2 = supabase.from('api_keys');
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
