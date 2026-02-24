import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { resolveAppUrl } from '@/lib/schedule-utils';
import { decrypt } from '@/lib/encryption';

/**
 * Netlify Deploy Hook Webhook Receiver
 *
 * Receives deployment events from Netlify and triggers a CheckVibe scan.
 * Authentication: JWT signature verification via X-Webhook-Signature header.
 *
 * Flow:
 * 1. Verify HMAC-SHA256 signature against stored webhook_secret
 * 2. Match to a CheckVibe integration
 * 3. Trigger an internal scan via POST /api/scan
 * 4. Store deployment metadata for audit trail
 */

function getServiceClient() {
    return createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
}

export const maxDuration = 60;

export async function POST(req: NextRequest) {
    try {
        const rawBody = await req.text();
        const signature = req.headers.get('x-webhook-signature');

        if (!signature) {
            return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
        }

        let payload: any;
        try {
            payload = JSON.parse(rawBody);
        } catch {
            return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
        }

        // Netlify sends state in different formats depending on the hook type
        const state = payload.state || payload.status;
        const deploymentId = payload.id || payload.deploy_id;

        // Only process successful deployments
        if (state !== 'ready' && state !== 'success') {
            return NextResponse.json({ message: 'Event state ignored', state });
        }

        if (!deploymentId) {
            return NextResponse.json({ error: 'Missing deployment ID' }, { status: 400 });
        }

        const supabase = getServiceClient();

        // Find all enabled netlify integrations and verify signature
        const { data: integrations, error: intError } = await supabase
            .from('netlify_integrations')
            .select('id, project_id, user_id, webhook_secret, enabled')
            .eq('enabled', true);

        if (intError || !integrations || integrations.length === 0) {
            return NextResponse.json({ error: 'No active integrations found' }, { status: 404 });
        }

        // Verify HMAC-SHA256 signature against each integration's secret
        let matchedIntegration: any = null;
        for (const integration of integrations) {
            const expectedSig = crypto
                .createHmac('sha256', integration.webhook_secret)
                .update(rawBody)
                .digest('hex');

            if (signature === expectedSig) {
                matchedIntegration = integration;
                break;
            }
        }

        if (!matchedIntegration) {
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }

        // Rate limit: max 1 scan per 10 minutes per integration
        const { data: recentDeploys } = await supabase
            .from('netlify_deployments')
            .select('id')
            .eq('integration_id', matchedIntegration.id)
            .gte('created_at', new Date(Date.now() - 10 * 60_000).toISOString());

        if (recentDeploys && recentDeploys.length > 0) {
            return NextResponse.json({
                message: 'Rate limited: max 1 scan per 10 minutes per project',
                deploymentId,
            });
        }

        // Idempotency: check if this deployment was already processed
        const { data: existingDeploy } = await supabase
            .from('netlify_deployments')
            .select('id')
            .eq('netlify_deployment_id', deploymentId)
            .maybeSingle();

        if (existingDeploy) {
            return NextResponse.json({ message: 'Deployment already processed', deploymentId });
        }

        const deploymentUrl = payload.ssl_url || payload.url || payload.deploy_ssl_url || null;

        // Insert deployment record
        const { data: deployment, error: deployInsertErr } = await supabase
            .from('netlify_deployments')
            .insert({
                integration_id: matchedIntegration.id,
                netlify_deployment_id: deploymentId,
                deployment_url: deploymentUrl,
            })
            .select('id')
            .single();

        if (deployInsertErr) {
            console.error('Failed to insert netlify deployment:', deployInsertErr);
            return NextResponse.json({ error: 'Failed to record deployment' }, { status: 500 });
        }

        // Fetch project config
        const { data: project } = await supabase
            .from('projects')
            .select('id, url, github_repo, backend_type, backend_url, supabase_pat, user_id')
            .eq('id', matchedIntegration.project_id)
            .single();

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        // Check scan usage
        const { data: usageResult } = await supabase
            .rpc('increment_scan_usage', { p_user_id: project.user_id });

        if (usageResult?.[0] && !usageResult[0].success) {
            return NextResponse.json({
                message: 'Scan limit reached, deployment recorded but scan not triggered',
                deploymentId,
            });
        }

        // Build scan request
        const scanBody: Record<string, any> = {
            url: project.url,
            projectId: project.id,
            backendType: project.backend_type || 'none',
            backendUrl: project.backend_url || '',
        };

        if (project.github_repo) scanBody.githubRepo = project.github_repo;
        if (project.supabase_pat) {
            try {
                scanBody.supabasePAT = decrypt(project.supabase_pat);
            } catch {
                scanBody.supabasePAT = project.supabase_pat;
            }
        }

        const cronSecret = process.env.CRON_SECRET;
        if (!cronSecret || cronSecret.length < 16) {
            console.error('CRON_SECRET not configured for netlify webhook');
            return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
        }

        const appUrl = resolveAppUrl();

        // Trigger scan
        const scanRes = await fetch(`${appUrl}/api/scan`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-cron-secret': cronSecret,
            },
            body: JSON.stringify(scanBody),
        });

        let scanId: string | null = null;
        if (scanRes.ok) {
            const text = await scanRes.text();
            const firstLine = text.split('\n')[0];
            try {
                const parsed = JSON.parse(firstLine);
                scanId = parsed.scanId || null;
            } catch { /* ignore parse error */ }
        }

        // Update deployment record with scan ID
        if (scanId) {
            await supabase
                .from('netlify_deployments')
                .update({ scan_id: scanId })
                .eq('id', (deployment as any).id);

            await supabase
                .from('netlify_integrations')
                .update({
                    last_deployment_at: new Date().toISOString(),
                    last_scan_id: scanId,
                })
                .eq('id', matchedIntegration.id);
        }

        return NextResponse.json({
            message: 'Scan triggered',
            deploymentId,
            scanId,
        });
    } catch (error) {
        console.error('Netlify webhook error:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
