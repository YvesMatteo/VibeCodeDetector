import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { runSEOScan } from '@/lib/scanners/seo-scanner';

const VALID_SCAN_TYPES = ['security', 'api_keys', 'seo', 'legal', 'threat_intelligence'] as const;

export async function POST(req: NextRequest) {
    try {
        // ==========================================
        // CSRF / ORIGIN CHECK
        // ==========================================
        const origin = req.headers.get('origin');
        const host = req.headers.get('host') || '';
        if (!origin) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        const originHost = new URL(origin).host;
        const isSameHost = originHost === host;
        const isLocalhost = originHost.startsWith('localhost');
        if (!isSameHost && !isLocalhost) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { url, scanTypes } = body;

        // ==========================================
        // URL VALIDATION
        // ==========================================
        if (!url || typeof url !== 'string') {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }
        if (url.length > 2048) {
            return NextResponse.json({ error: 'URL exceeds maximum length' }, { status: 400 });
        }
        const targetUrl = url.startsWith('http') ? url : `https://${url}`;
        let parsedUrl: URL;
        try {
            parsedUrl = new URL(targetUrl);
        } catch {
            return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
        }
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
            return NextResponse.json({ error: 'Only http/https URLs are allowed' }, { status: 400 });
        }
        // SSRF protection
        const privatePatterns = [
            /^localhost$/i, /^127\.\d+\.\d+\.\d+$/, /^10\.\d+\.\d+\.\d+$/,
            /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/, /^192\.168\.\d+\.\d+$/,
            /^169\.254\.\d+\.\d+$/, /^0\.0\.0\.0$/, /^\[?::1\]?$/,
        ];
        if (privatePatterns.some(p => p.test(parsedUrl.hostname))) {
            return NextResponse.json({ error: 'Internal URLs are not allowed' }, { status: 400 });
        }

        // ==========================================
        // SCAN TYPES VALIDATION
        // ==========================================
        if (scanTypes !== undefined) {
            if (!Array.isArray(scanTypes) || !scanTypes.every((t: unknown) => typeof t === 'string' && (VALID_SCAN_TYPES as readonly string[]).includes(t))) {
                return NextResponse.json({ error: 'Invalid scanTypes' }, { status: 400 });
            }
        }

        // ==========================================
        // ATOMIC SCAN USAGE & DOMAIN CHECKS
        // ==========================================
        const domain = parsedUrl.hostname;

        // First, handle domain registration atomically
        const { data: domainResult, error: domainError } = await supabase
            .rpc('register_scan_domain', { p_user_id: user.id, p_domain: domain });

        if (domainError) {
            console.error('Domain registration error:', domainError);
            return NextResponse.json({ error: 'Failed to verify domain' }, { status: 500 });
        }

        if (domainResult && domainResult.length > 0 && !domainResult[0].success) {
            return NextResponse.json({
                error: `Domain limit reached. Your plan allows ${domainResult[0].allowed_domains?.length || 0} domains.`,
                code: 'DOMAIN_LIMIT_REACHED',
            }, { status: 402 });
        }

        // Atomic scan usage increment
        const { data: usageResult, error: usageError } = await supabase
            .rpc('increment_scan_usage', { p_user_id: user.id });

        if (usageError) {
            console.error('Usage increment error:', usageError);
            return NextResponse.json({ error: 'Failed to check scan usage' }, { status: 500 });
        }

        if (usageResult && usageResult.length > 0 && !usageResult[0].success) {
            const hasNoPlan = usageResult[0].plan === 'none' || usageResult[0].plan_scans_limit === 0;
            return NextResponse.json({
                error: hasNoPlan
                    ? 'A plan is required to run scans. Subscribe to get started.'
                    : `Monthly scan limit reached (${usageResult[0].plan_scans_used}/${usageResult[0].plan_scans_limit}). Upgrade your plan for more scans.`,
                code: hasNoPlan ? 'PLAN_REQUIRED' : 'SCAN_LIMIT_REACHED',
            }, { status: 402 });
        }

        // ==========================================
        // RUN SCANNERS
        // ==========================================

        const results: Record<string, any> = {};
        const scannerPromises: Promise<void>[] = [];

        const SCANNER_TIMEOUT_MS = 30000; // 30 second timeout per scanner

        function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), SCANNER_TIMEOUT_MS);
            return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timeout));
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        const scannerSecretKey = process.env.SCANNER_SECRET_KEY || '';
        const { data: { user: validatedUser } } = await supabase.auth.getUser();
        const accessToken = validatedUser ? (await supabase.auth.getSession()).data.session?.access_token : undefined;

        // 1. Security Headers Scanner (Edge Function)
        scannerPromises.push(
            fetchWithTimeout(`${supabaseUrl}/functions/v1/security-headers-scanner`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken || supabaseAnonKey}`,
                    'x-scanner-key': scannerSecretKey,
                },
                body: JSON.stringify({ targetUrl }),
            })
                .then(res => res.json())
                .then(data => { results.security = data; })
                .catch(err => { results.security = { error: err.message, score: 0 }; })
        );

        // 2. API Key Scanner (Edge Function)
        scannerPromises.push(
            fetchWithTimeout(`${supabaseUrl}/functions/v1/api-key-scanner`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken || supabaseAnonKey}`,
                    'x-scanner-key': scannerSecretKey,
                },
                body: JSON.stringify({ targetUrl }),
            })
                .then(res => res.json())
                .then(data => { results.api_keys = data; })
                .catch(err => { results.api_keys = { error: err.message, score: 0 }; })
        );

        // 3. Legal Scanner (Edge Function)
        scannerPromises.push(
            fetchWithTimeout(`${supabaseUrl}/functions/v1/legal-scanner`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken || supabaseAnonKey}`,
                    'x-scanner-key': scannerSecretKey,
                },
                body: JSON.stringify({ targetUrl }),
            })
                .then(res => res.json())
                .then(data => { results.legal = data; })
                .catch(err => { results.legal = { error: err.message, score: 0 }; })
        );

        // 4. SEO Scanner (Local Lib)
        try {
            scannerPromises.push(
                Promise.resolve(runSEOScan(targetUrl))
                    .then(data => { results.seo = data; })
                    .catch(err => { results.seo = { error: err.message, score: 0 }; })
            );
        } catch (e) {
            console.error('SEO Scanner not available:', e);
        }

        // 5. Threat Intelligence Scanner (Edge Function)
        scannerPromises.push(
            fetchWithTimeout(`${supabaseUrl}/functions/v1/threat-scanner`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken || supabaseAnonKey}`,
                    'x-scanner-key': scannerSecretKey,
                },
                body: JSON.stringify({ targetUrl }),
            })
                .then(res => res.json())
                .then(data => { results.threat_intelligence = data; })
                .catch(err => { results.threat_intelligence = { error: err.message, score: 0 }; })
        );

        // Wait for all
        await Promise.all(scannerPromises);

        // Calculate Overall Score using weighted average
        const SCANNER_WEIGHTS: Record<string, number> = {
            security: 0.30,
            api_keys: 0.25,
            threat_intelligence: 0.20,
            seo: 0.15,
            legal: 0.10,
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
        return NextResponse.json({ error: 'An internal error occurred' }, { status: 500 });
    }
}
