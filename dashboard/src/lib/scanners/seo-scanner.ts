import lighthouse, { Flags, Result } from 'lighthouse';
import puppeteer from 'puppeteer';

export interface SEOScanResult {
    url: string;
    scores: {
        seo: number;
        performance: number;
        accessibility: number;
        bestPractices: number;
    };
    audits: {
        title: string;
        score: number | null;
        description: string;
        displayValue?: string;
    }[];
    recommendations: {
        title: string;
        description: string;
        impact: 'critical' | 'high' | 'medium' | 'low';
    }[];
    scanDuration: number;
}

export async function runSEOScan(url: string): Promise<SEOScanResult> {
    const startTime = Date.now();

    // Ensure URL has protocol
    const targetUrl = url.startsWith('http') ? url : `https://${url}`;

    // Launch browser
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const flags: Flags = {
        port: Number(new URL(browser.wsEndpoint()).port),
        output: 'json',
        onlyCategories: ['seo', 'performance', 'accessibility', 'best-practices'],
        formFactor: 'desktop',
        screenEmulation: { disabled: true },
    };

    try {
        const result = await lighthouse(targetUrl, flags) as { lhr: Result };
        const lhr = result.lhr;

        // Extract scores (0-100)
        const scores = {
            seo: Math.round((lhr.categories.seo?.score ?? 0) * 100),
            performance: Math.round((lhr.categories.performance?.score ?? 0) * 100),
            accessibility: Math.round((lhr.categories.accessibility?.score ?? 0) * 100),
            bestPractices: Math.round((lhr.categories['best-practices']?.score ?? 0) * 100),
        };

        // Extract key audits
        const seoAudits = lhr.categories.seo?.auditRefs ?? [];
        const audits = seoAudits.slice(0, 15).map((ref) => {
            const audit = lhr.audits[ref.id];
            return {
                title: audit?.title ?? ref.id,
                score: audit?.score,
                description: audit?.description ?? '',
                displayValue: audit?.displayValue,
            };
        });

        // Generate recommendations
        const recommendations: SEOScanResult['recommendations'] = [];

        for (const [id, audit] of Object.entries(lhr.audits)) {
            if (audit.score !== null && audit.score < 1) {
                let impact: 'critical' | 'high' | 'medium' | 'low' = 'low';
                if (audit.score === 0) impact = 'critical';
                else if (audit.score < 0.5) impact = 'high';
                else if (audit.score < 0.9) impact = 'medium';

                recommendations.push({
                    title: audit.title,
                    description: audit.description ?? '',
                    impact,
                });
            }
        }

        // Sort by impact
        const impactOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        recommendations.sort((a, b) => impactOrder[a.impact] - impactOrder[b.impact]);

        return {
            url: targetUrl,
            scores,
            audits,
            recommendations: recommendations.slice(0, 10),
            scanDuration: Date.now() - startTime,
        };
    } finally {
        await browser.close();
    }
}
