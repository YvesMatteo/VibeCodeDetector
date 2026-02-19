import crypto from 'crypto';
import { createClient as createServiceClient } from '@supabase/supabase-js';

function getServiceClient() {
    return createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
}

interface WebhookPayload {
    event: string;
    project_id: string;
    scan_id: string;
    url: string;
    overall_score: number;
    issues: { critical: number; high: number; medium: number; low: number };
    timestamp: string;
}

function signPayload(payload: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

function countIssuesBySeverity(results: Record<string, any>): { critical: number; high: number; medium: number; low: number } {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const key of Object.keys(results)) {
        const scanner = results[key];
        if (scanner?.findings && Array.isArray(scanner.findings)) {
            for (const f of scanner.findings) {
                const sev = (f.severity || '').toLowerCase();
                if (sev === 'critical') counts.critical++;
                else if (sev === 'high') counts.high++;
                else if (sev === 'medium') counts.medium++;
                else if (sev === 'low') counts.low++;
            }
        }
    }
    return counts;
}

/**
 * Fire-and-forget: dispatch webhooks for a completed scan.
 * Call this after a scan is marked completed.
 */
export async function dispatchWebhooks(opts: {
    projectId: string;
    scanId: string;
    url: string;
    overallScore: number;
    results: Record<string, any>;
}): Promise<void> {
    try {
        const supabase = getServiceClient();

        const { data: webhooks } = await supabase
            .from('project_webhooks')
            .select('id, url, events, secret, enabled')
            .eq('project_id', opts.projectId)
            .eq('enabled', true);

        if (!webhooks || webhooks.length === 0) return;

        const issues = countIssuesBySeverity(opts.results);
        const payload: WebhookPayload = {
            event: 'scan.completed',
            project_id: opts.projectId,
            scan_id: opts.scanId,
            url: opts.url,
            overall_score: opts.overallScore,
            issues,
            timestamp: new Date().toISOString(),
        };

        const body = JSON.stringify(payload);

        const deliveries = webhooks
            .filter(wh => wh.events.includes('scan.completed'))
            .map(async (wh) => {
                const signature = signPayload(body, wh.secret);
                try {
                    const controller = new AbortController();
                    const timeout = setTimeout(() => controller.abort(), 10000);

                    const res = await fetch(wh.url, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CheckVibe-Signature': signature,
                            'X-CheckVibe-Event': 'scan.completed',
                        },
                        body,
                        signal: controller.signal,
                    }).finally(() => clearTimeout(timeout));

                    // Update last_triggered status (fire-and-forget)
                    await supabase
                        .from('project_webhooks')
                        .update({
                            last_triggered_at: new Date().toISOString(),
                            last_status: res.status,
                            updated_at: new Date().toISOString(),
                        })
                        .eq('id', wh.id);
                } catch (err: any) {
                    console.error(`Webhook delivery failed for ${wh.url}:`, err.message);
                    await supabase
                        .from('project_webhooks')
                        .update({
                            last_triggered_at: new Date().toISOString(),
                            last_status: 0,
                            updated_at: new Date().toISOString(),
                        })
                        .eq('id', wh.id);
                }
            });

        await Promise.allSettled(deliveries);
    } catch (err) {
        console.error('Webhook dispatch error:', err);
    }
}
