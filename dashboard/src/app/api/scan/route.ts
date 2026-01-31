import { NextRequest, NextResponse } from 'next/server';
import { runSEOScan } from '@/lib/scanners/seo-scanner';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
    try {
        const { url, scanTypes } = await request.json();

        if (!url) {
            return NextResponse.json(
                { error: 'URL is required' },
                { status: 400 }
            );
        }

        // Get user session (optional - for saving to DB)
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        // Run SEO scan
        const seoResult = await runSEOScan(url);

        // Calculate overall score
        const overallScore = Math.round(
            (seoResult.scores.seo +
                seoResult.scores.performance +
                seoResult.scores.accessibility +
                seoResult.scores.bestPractices) / 4
        );

        // Save to database if user is authenticated
        let scanId = null;
        if (user) {
            const { data: scan, error: scanError } = await supabase
                .from('scans')
                .insert({
                    user_id: user.id,
                    target_url: url,
                    status: 'completed',
                    scan_types: scanTypes || ['seo'],
                    overall_score: overallScore,
                })
                .select()
                .single();

            if (!scanError && scan) {
                scanId = scan.id;

                // Save detailed results
                await supabase.from('scan_results').insert({
                    scan_id: scanId,
                    scanner_type: 'seo',
                    score: seoResult.scores.seo,
                    findings: {
                        scores: seoResult.scores,
                        audits: seoResult.audits,
                    },
                    recommendations: seoResult.recommendations,
                });
            }
        }

        return NextResponse.json({
            success: true,
            scanId,
            url: seoResult.url,
            overallScore,
            scores: seoResult.scores,
            recommendations: seoResult.recommendations,
            scanDuration: seoResult.scanDuration,
        });
    } catch (error) {
        console.error('Scan error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Scan failed' },
            { status: 500 }
        );
    }
}
