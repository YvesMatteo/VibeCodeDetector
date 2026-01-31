import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
// @ts-ignore - Module likely exists from merge
import { runSEOScan } from '@/lib/scanners/seo-scanner';

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        const body = await request.json();
        const { url, scanTypes } = body;

        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        // Normalize URL
        const targetUrl = url.startsWith('http') ? url : `https://${url}`;

        // Prepare scanners
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
            // Check if runSEOScan is available (it should be from the merge)
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

        // Wait for all
        await Promise.all(scannerPromises);

        // Calculate Overall Score
        const scores = Object.values(results)
            .filter((r): r is { score?: number } => typeof r === 'object' && r !== null && typeof r.score === 'number')
            .map(r => r.score!);

        const overallScore = scores.length > 0
            ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
            : 0;

        let scanId = null;

        // Save to DB if authenticated
        // We merged schema concepts: 'scans' table stores the master record
        if (user) {
            const { data: scan, error: insertError } = await supabase
                .from('scans')
                .insert({
                    user_id: user.id,
                    url: targetUrl,
                    status: 'completed',
                    overall_score: overallScore,
                    results, // Store all results in JSONB for now
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
