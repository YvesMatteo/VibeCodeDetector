import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// ---------------------------------------------------------------------------
// GET /api/keys/[id]/usage — Get usage stats for a specific API key
// ---------------------------------------------------------------------------

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify key belongs to user
    const { data: key } = await supabase
      .from('api_keys' as any)
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (!key) {
      return NextResponse.json({ error: 'Key not found' }, { status: 404 });
    }

    // Parse query params for pagination
    const searchParams = req.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // Get recent usage logs
    const { data: logs, error, count } = await supabase
      .from('api_key_usage_log' as any)
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
