import crypto from 'crypto';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { countIssuesBySeverity } from '@/lib/scan-utils';
import { resolveAndValidateUrl } from '@/lib/url-validation';

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

/**
 * Fire-and-forget: dispatch webhooks for a completed scan.
 * Call this after a scan is marked completed.
 */
export async function dispatchWebhooks(opts: {
    projectId: string;
    scanId: string;
    url: string;
    overallScore: number;
    results: Record<string, unknown>;
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
            .filter(wh => (wh.events as string[]).includes('scan.completed'))
            .map(async (wh) => {
                // DNS rebinding protection: re-validate webhook URL before delivery
                const dnsCheck = await resolveAndValidateUrl(wh.url as string);
                if (!dnsCheck.valid) {
                    console.error(`Webhook SSRF blocked for ${String(wh.url)}: ${dnsCheck.error}`);
                    await supabase
                        .from('project_webhooks')
                        .update({
                            last_triggered_at: new Date().toISOString(),
                            last_status: 0,
                            updated_at: new Date().toISOString(),
                        })
                        .eq('id', wh.id);
                    return;
                }

                const signature = signPayload(body, wh.secret as string);
                try {
                    const controller = new AbortController();
                    const timeout = setTimeout(() => controller.abort(), 10000);

                    const res = await fetch(wh.url as string, {
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
                } catch (err: unknown) {
                    const message = err instanceof Error ? err.message : String(err);
                    console.error(`Webhook delivery failed for ${String(wh.url)}:`, message);
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
