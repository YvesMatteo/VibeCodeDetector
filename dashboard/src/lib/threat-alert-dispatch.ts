import { createClient as createServiceClient } from '@supabase/supabase-js';
import { getResend } from '@/lib/resend';
import { threatAlertTemplate } from '@/lib/email-templates';

function getServiceClient() {
    return createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
}

const FROM_EMAIL = 'CheckVibe <alerts@checkvibe.dev>';

// Cooldowns per alert frequency
const COOLDOWN_MINUTES: Record<string, number> = {
    immediate: 5,
    hourly: 60,
    daily: 1440, // 24h
};

/**
 * Check if a threat alert is due for a given project, send email if so.
 * Called by the cron job every 5 minutes.
 */
export async function dispatchThreatAlerts(projectId: string): Promise<{ sent: boolean; eventCount?: number }> {
    const supabase = getServiceClient();

    // Fetch threat settings for this project
    const { data: settings } = await supabase
        .from('threat_settings' as any)
        .select('*, projects!inner(name, user_id)')
        .eq('project_id', projectId)
        .eq('enabled', true)
        .single();

    if (!settings) return { sent: false };

    const alertEmail = settings.alert_email;
    if (!alertEmail) return { sent: false };

    const frequency = settings.alert_frequency || 'daily';
    const cooldownMinutes = COOLDOWN_MINUTES[frequency] || 1440;

    // Check last alert send time
    const { data: lastAlert } = await supabase
        .from('threat_alert_log' as any)
        .select('sent_at')
        .eq('project_id', projectId)
        .order('sent_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (lastAlert) {
        const lastSent = new Date(lastAlert.sent_at);
        const minutesSince = (Date.now() - lastSent.getTime()) / (1000 * 60);
        if (minutesSince < cooldownMinutes) return { sent: false };
    }

    // Determine the "since" window — either last alert or cooldown window
    const sinceTime = lastAlert
        ? new Date(lastAlert.sent_at).toISOString()
        : new Date(Date.now() - cooldownMinutes * 60 * 1000).toISOString();

    // Count new events since last alert
    const { count } = await supabase
        .from('threat_events' as any)
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .gte('created_at', sinceTime);

    if (!count || count === 0) return { sent: false };

    // Get stats for the email
    const { data: stats } = await supabase
        .rpc('get_threat_stats', { p_project_id: projectId, p_since: sinceTime });

    const statsObj = stats || {
        total_events: count,
        critical_count: 0,
        high_count: 0,
        medium_count: 0,
        unique_ips: 0,
        top_attack_type: 'unknown',
    };

    const appUrl = process.env.NEXT_PUBLIC_APP_URL
        || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://checkvibe.dev');
    const dashboardUrl = `${appUrl}/dashboard/projects/${projectId}/threats`;

    const project = (settings as any).projects;
    const projectName = project?.name || 'Your project';

    const template = threatAlertTemplate({
        projectName,
        eventCount: statsObj.total_events || count,
        criticalCount: statsObj.critical_count || 0,
        highCount: statsObj.high_count || 0,
        mediumCount: statsObj.medium_count || 0,
        topAttackType: statsObj.top_attack_type || 'unknown',
        uniqueIps: statsObj.unique_ips || 0,
        dashboardUrl,
    });

    try {
        const resend = getResend();
        await resend.emails.send({
            from: FROM_EMAIL,
            replyTo: 'support@checkvibe.dev',
            to: alertEmail,
            subject: template.subject,
            html: template.html,
            headers: {
                'List-Unsubscribe': '<mailto:support@checkvibe.dev?subject=unsubscribe>',
                'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
            },
        });

        // Log the alert
        await supabase
            .from('threat_alert_log' as any)
            .insert({
                project_id: projectId,
                alert_type: frequency,
                event_count: count,
            });

        return { sent: true, eventCount: count };
    } catch (err: any) {
        console.error(`Threat alert email failed for project ${projectId}:`, err.message);
        return { sent: false };
    }
}
