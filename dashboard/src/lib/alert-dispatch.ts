import { createClient as createServiceClient } from '@supabase/supabase-js';
import { getResend } from '@/lib/resend';
import {
    scoreDropAlertTemplate,
    newCriticalAlertTemplate,
    scoreBelowAlertTemplate,
} from '@/lib/email-templates';

function getServiceClient() {
    return createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
}

const THROTTLE_HOURS = 24;
const FROM_EMAIL = 'CheckVibe <alerts@checkvibe.dev>';

interface AlertDispatchOpts {
    projectId: string;
    projectName: string;
    projectUrl: string;
    scanId: string;
    currentScore: number;
    previousScore: number | null;
    issues: { critical: number; high: number; medium: number; low: number };
}

/**
 * Fire-and-forget: evaluate alert rules and send email notifications.
 * Call this after a scan is marked completed.
 */
export async function dispatchAlerts(opts: AlertDispatchOpts): Promise<void> {
    try {
        const supabase = getServiceClient();

        const { data: rules } = await supabase
            .from('alert_rules' as any)
            .select('*')
            .eq('project_id', opts.projectId)
            .eq('enabled', true);

        if (!rules || rules.length === 0) return;

        const now = new Date();
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://checkvibe.dev');
        const dashboardUrl = `${appUrl}/dashboard/projects/${opts.projectId}/report`;

        const deliveries = rules.map(async (rule: any) => {
            // 24h throttle check
            if (rule.last_triggered_at) {
                const lastTriggered = new Date(rule.last_triggered_at);
                const hoursSince = (now.getTime() - lastTriggered.getTime()) / (1000 * 60 * 60);
                if (hoursSince < THROTTLE_HOURS) return;
            }

            let template: { subject: string; html: string } | null = null;

            if (rule.type === 'score_drop' && opts.previousScore !== null) {
                const drop = opts.previousScore - opts.currentScore;
                const threshold = rule.threshold ?? 10;
                if (drop >= threshold) {
                    template = scoreDropAlertTemplate({
                        projectName: opts.projectName,
                        previousScore: opts.previousScore,
                        currentScore: opts.currentScore,
                        drop,
                        dashboardUrl,
                    });
                }
            } else if (rule.type === 'new_critical') {
                if (opts.issues.critical > 0) {
                    template = newCriticalAlertTemplate({
                        projectName: opts.projectName,
                        criticalCount: opts.issues.critical,
                        currentScore: opts.currentScore,
                        dashboardUrl,
                    });
                }
            } else if (rule.type === 'score_below') {
                const threshold = rule.threshold ?? 50;
                if (opts.currentScore < threshold) {
                    template = scoreBelowAlertTemplate({
                        projectName: opts.projectName,
                        currentScore: opts.currentScore,
                        threshold,
                        dashboardUrl,
                    });
                }
            }

            if (!template) return;

            const email = rule.notify_email;
            if (!email) return;

            try {
                const resend = getResend();
                await resend.emails.send({
                    from: FROM_EMAIL,
                    replyTo: 'support@checkvibe.dev',
                    to: email,
                    subject: template.subject,
                    html: template.html,
                    text: template.text,
                    headers: {
                        'List-Unsubscribe': '<mailto:support@checkvibe.dev?subject=unsubscribe>',
                        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
                    },
                });

                // Update last_triggered_at
                await supabase
                    .from('alert_rules' as any)
                    .update({ last_triggered_at: now.toISOString() })
                    .eq('id', rule.id);
            } catch (err: any) {
                console.error(`Alert email failed for rule ${rule.id}:`, err.message);
            }
        });

        await Promise.allSettled(deliveries);
    } catch (err) {
        console.error('Alert dispatch error:', err);
    }
}
