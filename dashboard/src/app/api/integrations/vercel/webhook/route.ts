import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { resolveAppUrl } from '@/lib/schedule-utils';
import { decrypt } from '@/lib/encryption';

/**
 * Vercel Deploy Hook Webhook Receiver
 *
 * Receives deployment events from Vercel and triggers a CheckVibe scan.
 * Authentication: HMAC-SHA1 signature verification via x-vercel-signature header.
 *
 * Flow:
 * 1. Verify signature against stored webhook_secret
 * 2. Match deployment URL to a CheckVibe project
 * 3. Trigger an internal scan via POST /api/scan (same pattern as cron)
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
        // Read raw body for signature verification
        const rawBody = await req.text();
        const signature = req.headers.get('x-vercel-signature');

        if (!signature) {
            return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
        }

        let payload: any;
        try {
            payload = JSON.parse(rawBody);
        } catch {
            return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
        }

        // We need to find which integration this belongs to.
        // Vercel sends the deployment URL in the payload — match it to a project.
        const deploymentUrl = payload.payload?.deployment?.url
            || payload.payload?.url
            || payload.url;
        const deploymentId = payload.payload?.deployment?.id
            || payload.payload?.id
            || payload.id;
        const eventType = payload.type;

        // Only process deployment.succeeded events
        if (eventType !== 'deployment.succeeded' && eventType !== 'deployment-ready') {
            return NextResponse.json({ message: 'Event type ignored', type: eventType });
        }

        if (!deploymentId) {
            return NextResponse.json({ error: 'Missing deployment ID' }, { status: 400 });
        }

        const supabase = getServiceClient();

        // Find all enabled vercel integrations and try to match by signature
        const { data: integrations, error: intError } = await supabase
            .from('vercel_integrations')
            .select('id, project_id, user_id, webhook_secret, enabled')
            .eq('enabled', true);

        if (intError || !integrations || integrations.length === 0) {
            return NextResponse.json({ error: 'No active integrations found' }, { status: 404 });
        }

        // Verify signature against each integration's secret until we find a match
        let matchedIntegration: any = null;
        for (const integration of integrations) {
            const expectedSig = crypto
                .createHmac('sha1', integration.webhook_secret)
                .update(rawBody)
                .digest('hex');

            const sigBuffer = Buffer.from(signature, 'hex');
            const expectedBuffer = Buffer.from(expectedSig, 'hex');
            if (sigBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
                matchedIntegration = integration;
                break;
            }
        }

        if (!matchedIntegration) {
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }

        // Rate limit: 30 deployments per minute per integration
        const { data: recentCount } = await supabase
            .from('vercel_deployments')
            .select('id', { count: 'exact', head: true })
            .eq('integration_id', matchedIntegration.id)
            .gte('created_at', new Date(Date.now() - 60_000).toISOString());

        if (recentCount && (recentCount as any).length > 30) {
            return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
        }

        // Idempotency: check if this deployment was already processed
        const { data: existingDeploy } = await supabase
            .from('vercel_deployments')
            .select('id')
            .eq('vercel_deployment_id', deploymentId)
            .maybeSingle();

        if (existingDeploy) {
            return NextResponse.json({ message: 'Deployment already processed', deploymentId });
        }

        // Extract git metadata
        const gitBranch = payload.payload?.deployment?.meta?.githubCommitRef
            || payload.payload?.meta?.githubCommitRef
            || null;
        const gitCommitSha = payload.payload?.deployment?.meta?.githubCommitSha
            || payload.payload?.meta?.githubCommitSha
            || null;
        const fullUrl = deploymentUrl ? `https://${deploymentUrl}` : null;

        // Insert deployment record (without scan_id yet)
        const { data: deployment, error: deployInsertErr } = await supabase
            .from('vercel_deployments')
            .insert({
                integration_id: matchedIntegration.id,
                vercel_deployment_id: deploymentId,
                deployment_url: fullUrl,
                git_branch: gitBranch,
                git_commit_sha: gitCommitSha,
            })
            .select('id')
            .single();

        if (deployInsertErr) {
            console.error('Failed to insert vercel deployment:', deployInsertErr);
            return NextResponse.json({ error: 'Failed to record deployment' }, { status: 500 });
        }

        // Fetch project config to build scan request
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
            console.error('CRON_SECRET not configured for vercel webhook');
            return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
        }

        const appUrl = resolveAppUrl();

        // Trigger scan via internal fetch (same pattern as scheduled-scans cron)
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
                .from('vercel_deployments')
                .update({ scan_id: scanId })
                .eq('id', (deployment as any).id);

            // Update integration's last deployment info
            await supabase
                .from('vercel_integrations')
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
        console.error('Vercel webhook error:', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
