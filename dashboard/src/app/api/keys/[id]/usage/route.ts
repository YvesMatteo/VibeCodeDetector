import { NextResponse, type NextRequest } from 'next/server';
import { getServiceClient } from '@/lib/api-keys';
import { resolveAuth, requireScope } from '@/lib/api-auth';

// ---------------------------------------------------------------------------
// GET /api/keys/[id]/usage — Get usage stats for a specific API key
// ---------------------------------------------------------------------------

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { context, error: authError } = await resolveAuth(req);
    if (authError || !context) return authError!;

    const scopeError = requireScope(context, 'keys:read');
    if (scopeError) return scopeError;

    const supabase = getServiceClient();

    // Verify key belongs to user
    const keyTable = supabase.from('api_keys' as any) as any;
    const { data: key } = await keyTable
      .select('id')
      .eq('id', id)
      .eq('user_id', context.userId)
      .single();

    if (!key) {
      return NextResponse.json({ error: 'Key not found' }, { status: 404 });
    }

    // Parse query params for pagination
    const searchParams = req.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Get recent usage logs
    const logTable = supabase.from('api_key_usage_log' as any) as any;
    const { data: logs, error, count } = await logTable
      .select('endpoint, method, ip_address, status_code, created_at', { count: 'exact' })
      .eq('key_id', id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Usage log query error:', error);
      return NextResponse.json({ error: 'Failed to fetch usage logs' }, { status: 500 });
    }

    return NextResponse.json({
      logs: logs ?? [],
      total: count ?? 0,
      limit,
      offset,
    });

  } catch (error) {
    console.error('Usage query error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
