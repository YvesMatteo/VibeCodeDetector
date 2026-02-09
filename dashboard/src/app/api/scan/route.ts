import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
// @ts-ignore - Module likely exists from merge
import { runSEOScan } from '@/lib/scanners/seo-scanner';

function extractDomain(url: string): string {
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return url;
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // ==========================================
        // SUBSCRIPTION CHECK
        // ==========================================

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('plan, plan_domains, plan_scans_limit, plan_scans_used, allowed_domains')
            .eq('id', user.id)
            .single();

        if (profileError || !profile) {
            console.error('Profile fetch error:', profileError);
            return NextResponse.json({ error: 'User profile not found.' }, { status: 404 });
        }

        if (profile.plan === 'none') {
            return NextResponse.json({
                error: 'Active subscription required. Please subscribe to a plan.',
                code: 'PLAN_REQUIRED'
            }, { status: 402 });
        }

        if (profile.plan_scans_used >= profile.plan_scans_limit) {
            return NextResponse.json({
                error: `Monthly scan limit reached (${profile.plan_scans_limit}). Upgrade your plan for more scans.`,
                code: 'SCAN_LIMIT_REACHED'
            }, { status: 402 });
        }

        const body = await request.json();
        const { url, scanTypes } = body;

        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        const targetUrl = url.startsWith('http') ? url : `https://${url}`;
        const domain = extractDomain(targetUrl);
        const allowedDomains: string[] = profile.allowed_domains || [];

        // Domain enforcement
        if (!allowedDomains.includes(domain)) {
            if (allowedDomains.length >= profile.plan_domains) {
                return NextResponse.json({
                    error: `Domain limit reached (${profile.plan_domains}). You can only scan: ${allowedDomains.join(', ')}`,
                    code: 'DOMAIN_LIMIT_REACHED'
                }, { status: 402 });
            }

            // Auto-register this domain
            const newDomains = [...allowedDomains, domain];
            await supabase
                .from('profiles')
                .update({ allowed_domains: newDomains })
                .eq('id', user.id);
        }

        // Increment scan usage
        await supabase
            .from('profiles')
            .update({ plan_scans_used: profile.plan_scans_used + 1 })
            .eq('id', user.id);

        // ==========================================
        // RUN SCANNERS
        // ==========================================

        const results: Record<string, any> = {};
        const scannerPromises: Promise<void>[] = [];

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session?.access_token;

        // 1. Security Headers Scanner (Edge Function)
        if (scanTypes?.includes('security') || !scanTypes) {
            scannerPromises.push(
                fetch(`${supabaseUrl}/functions/v1/security-headers-scanner`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken || supabaseAnonKey}`,
                    },
                    body: JSON.stringify({ targetUrl }),
                })
                    .then(res => res.json())
                    .then(data => { results.security = data; })
                    .catch(err => { results.security = { error: err.message, score: 0 }; })
            );
        }

        // 2. API Key Scanner (Edge Function)
        if (scanTypes?.includes('api_keys') || !scanTypes) {
            scannerPromises.push(
                fetch(`${supabaseUrl}/functions/v1/api-key-scanner`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken || supabaseAnonKey}`,
                    },
                    body: JSON.stringify({ targetUrl }),
                })
                    .then(res => res.json())
                    .then(data => { results.api_keys = data; })
                    .catch(err => { results.api_keys = { error: err.message, score: 0 }; })
            );
        }

        // 3. Vibe Match Scanner (Edge Function)
        if (scanTypes?.includes('vibe_match') || !scanTypes) {
            scannerPromises.push(
                fetch(`${supabaseUrl}/functions/v1/vibe-scanner`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken || supabaseAnonKey}`,
                    },
                    body: JSON.stringify({ targetUrl }),
                })
                    .then(res => res.json())
                    .then(data => { results.vibe_match = data; })
                    .catch(err => { results.vibe_match = { error: err.message, score: 0 }; })
            );
        }

        // 4. Legal Scanner (Edge Function)
        if (scanTypes?.includes('legal') || !scanTypes) {
            scannerPromises.push(
                fetch(`${supabaseUrl}/functions/v1/legal-scanner`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken || supabaseAnonKey}`,
                    },
                    body: JSON.stringify({ targetUrl }),
                })
                    .then(res => res.json())
                    .then(data => { results.legal = data; })
                    .catch(err => { results.legal = { error: err.message, score: 0 }; })
            );
        }

        // 5. SEO Scanner (Local Lib)
        if (scanTypes?.includes('seo') || !scanTypes) {
            try {
                scannerPromises.push(
                    Promise.resolve(runSEOScan(targetUrl))
                        .then(data => { results.seo = data; })
                        .catch(err => { results.seo = { error: err.message, score: 0 }; })
                );
            } catch (e) {
                console.error('SEO Scanner not available:', e);
            }
        }

        // 6. Threat Intelligence Scanner (Edge Function)
        if (scanTypes?.includes('threat_intelligence') || !scanTypes) {
            scannerPromises.push(
                fetch(`${supabaseUrl}/functions/v1/threat-scanner`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken || supabaseAnonKey}`,
                    },
                    body: JSON.stringify({ targetUrl }),
                })
                    .then(res => res.json())
                    .then(data => { results.threat_intelligence = data; })
                    .catch(err => { results.threat_intelligence = { error: err.message, score: 0 }; })
            );
        }

        // Wait for all
        await Promise.all(scannerPromises);

        // Calculate Overall Score using weighted average
        const SCANNER_WEIGHTS: Record<string, number> = {
            security: 0.30,
            api_keys: 0.25,
            threat_intelligence: 0.20,
            seo: 0.15,
            legal: 0.05,
            vibe_match: 0.05,
        };

        let weightedSum = 0;
        let totalWeight = 0;

        for (const [key, result] of Object.entries(results)) {
            if (typeof result !== 'object' || result === null) continue;
            const r = result as Record<string, any>;
            if (r.error || typeof r.score !== 'number') continue;

            const weight = SCANNER_WEIGHTS[key] ?? 0.05;
            weightedSum += r.score * weight;
            totalWeight += weight;
        }

        const overallScore = totalWeight > 0
            ? Math.round(weightedSum / totalWeight)
            : 0;

        let scanId = null;

        if (user) {
            const { data: scan, error: insertError } = await supabase
                .from('scans')
                .insert({
                    user_id: user.id,
                    url: targetUrl,
                    status: 'completed',
                    overall_score: overallScore,
                    results,
                    completed_at: new Date().toISOString(),
                })
                .select()
                .single();

            if (!insertError && scan) {
                scanId = scan.id;
            } else {
                console.error('Failed to save scan:', insertError);
            }
        }

        return NextResponse.json({
            success: true,
            scanId,
            url: targetUrl,
            overallScore,
            results,
            completedAt: new Date().toISOString(),
        });

    } catch (error) {
        console.error('Scan error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Scan failed' },
            { status: 500 }
        );
    }
}
