import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { dispatchThreatAlerts } from '@/lib/threat-alert-dispatch';

/**
 * Cron endpoint for dispatching threat alert emails.
 * Called by Vercel Cron Jobs every 5 minutes.
 *
 * Flow:
 * 1. Authenticate via CRON_SECRET Bearer token
 * 2. Query all enabled threat_settings
 * 3. For each, check if alert is due and dispatch email
 */

function getServiceClient() {
    return createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
}

export const maxDuration = 60;

interface ThreatSettingRow {
    project_id: string;
}

export async function GET(req: NextRequest) {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || cronSecret.length < 16) {
        console.error('CRON_SECRET is not configured or too short');
        return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getServiceClient();

    // Fetch all enabled threat settings
    const { data: settings, error } = await supabase
        .from('threat_settings' as never)
        .select('project_id')
        .eq('enabled', true) as { data: ThreatSettingRow[] | null; error: unknown };

    if (error) {
        console.error('Failed to query threat settings:', error);
        return NextResponse.json({ error: 'Query failed' }, { status: 500 });
    }

    if (!settings || settings.length === 0) {
        return NextResponse.json({ message: 'No threat settings enabled', processed: 0 });
    }

    // Process projects in parallel batches to avoid 60s timeout
    const BATCH_SIZE = 10;
    const results: { projectId: string; sent: boolean; eventCount?: number }[] = [];

    for (let i = 0; i < settings.length; i += BATCH_SIZE) {
        const batch = settings.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.allSettled(
            batch.map(async (s) => {
                const result = await dispatchThreatAlerts(s.project_id);
                return { projectId: s.project_id, ...result };
            })
        );

        for (const r of batchResults) {
            if (r.status === 'fulfilled') {
                results.push(r.value);
            } else {
                const msg = r.reason instanceof Error ? r.reason.message : String(r.reason);
                console.error(`Threat alert dispatch failed:`, msg);
                results.push({ projectId: 'unknown', sent: false });
            }
        }
    }

    const sentCount = results.filter((r) => r.sent).length;

    return NextResponse.json({
        message: `Processed ${results.length} projects, sent ${sentCount} alerts`,
        processed: results.length,
        sent: sentCount,
        results,
    });
}
