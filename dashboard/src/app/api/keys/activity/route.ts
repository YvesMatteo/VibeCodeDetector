import { NextResponse, type NextRequest } from 'next/server';
import { getServiceClient } from '@/lib/api-keys';
import { createClient } from '@/lib/supabase/server';

// ---------------------------------------------------------------------------
// GET /api/keys/activity — Get recent API activity across all keys for the user
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const searchParams = req.nextUrl.searchParams;
        const limit = Math.min(parseInt(searchParams.get('limit') || '30', 10), 100);

        const svc = getServiceClient();
        const logTable = svc.from('api_key_usage_log');

        // Get recent logs for this user (across all their keys)
        const { data: logs, error } = await logTable
            .select('endpoint, method, ip_address, status_code, created_at, key_id')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Activity log query error:', error);
            return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 });
        }

        // Get key names for display
        const keyTable = svc.from('api_keys');
        const { data: keys } = await keyTable
            .select('id, name, key_prefix')
            .eq('user_id', user.id);

        const keyMap: Record<string, { name: string; prefix: string }> = {};
        for (const k of keys || []) {
            keyMap[k.id] = { name: k.name, prefix: k.key_prefix };
        }

        const enriched = (logs || []).map((log: any) => ({
            ...log,
            key_name: keyMap[log.key_id]?.name || 'Unknown',
            key_prefix: keyMap[log.key_id]?.prefix || '',
        }));

        return NextResponse.json({ logs: enriched });
    } catch (error) {
        console.error('Activity query error:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
