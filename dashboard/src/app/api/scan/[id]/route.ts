import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveAuth, requireScope, logApiKeyUsage } from '@/lib/api-auth';
import { getServiceClient } from '@/lib/api-keys';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Validate scan ID format (UUID v4)
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
            return NextResponse.json({ error: 'Invalid scan ID' }, { status: 400 });
        }

        const { context: auth, error: authError } = await resolveAuth(req);
        if (authError) return authError;
        if (!auth) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
            ?? req.headers.get('x-real-ip')
            ?? '0.0.0.0';

        const scopeError = requireScope(auth, 'scan:read');
        if (scopeError) {
            logApiKeyUsage({ keyId: auth.keyId, userId: auth.userId, endpoint: `/api/scan/${id}`, method: 'GET', ip, statusCode: 403 });
            return scopeError;
        }

        const supabase = auth.keyId ? getServiceClient() : await createClient();

        const { data: scan, error: queryError } = await supabase
            .from('scans')
            .select('*')
            .eq('id', id)
            .eq('user_id', auth.userId)
            .single();

        if (queryError || !scan) {
            logApiKeyUsage({ keyId: auth.keyId, userId: auth.userId, endpoint: `/api/scan/${id}`, method: 'GET', ip, statusCode: 404 });
            return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
        }

        logApiKeyUsage({ keyId: auth.keyId, userId: auth.userId, endpoint: `/api/scan/${id}`, method: 'GET', ip, statusCode: 200 });

        return NextResponse.json(scan);
    } catch (error) {
        console.error('Get scan error:', error);
        return NextResponse.json({ error: 'An internal error occurred' }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
            return NextResponse.json({ error: 'Invalid scan ID' }, { status: 400 });
        }

        const { context: auth, error: authError } = await resolveAuth(req);
        if (authError) return authError;
        if (!auth) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
            ?? req.headers.get('x-real-ip')
            ?? '0.0.0.0';

        const scopeError = requireScope(auth, 'scan:write');
        if (scopeError) {
            logApiKeyUsage({ keyId: auth.keyId, userId: auth.userId, endpoint: `/api/scan/${id}`, method: 'DELETE', ip, statusCode: 403 });
            return scopeError;
        }

        const supabase = auth.keyId ? getServiceClient() : await createClient();

        const { data, error: deleteError } = await supabase
            .from('scans')
            .delete()
            .eq('id', id)
            .eq('user_id', auth.userId)
            .select('id');

        if (deleteError) {
            console.error('Delete scan error:', deleteError);
            logApiKeyUsage({ keyId: auth.keyId, userId: auth.userId, endpoint: `/api/scan/${id}`, method: 'DELETE', ip, statusCode: 500 });
            return NextResponse.json({ error: 'Failed to delete scan' }, { status: 500 });
        }

        if (!data || data.length === 0) {
            logApiKeyUsage({ keyId: auth.keyId, userId: auth.userId, endpoint: `/api/scan/${id}`, method: 'DELETE', ip, statusCode: 404 });
            return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
        }

        logApiKeyUsage({ keyId: auth.keyId, userId: auth.userId, endpoint: `/api/scan/${id}`, method: 'DELETE', ip, statusCode: 200 });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete scan error:', error);
        return NextResponse.json({ error: 'An internal error occurred' }, { status: 500 });
    }
}
