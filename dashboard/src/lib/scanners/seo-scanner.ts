/**
 * SEO Scanner using Google PageSpeed Insights API
 * This uses the same Lighthouse engine but runs on Google's servers
 * Free API - no key required for basic usage (rate limited)
 */

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

interface PageSpeedResult {
    lighthouseResult: {
        categories: {
            seo?: { score: number };
            performance?: { score: number };
            accessibility?: { score: number };
            'best-practices'?: { score: number };
        };
        audits: Record<string, {
            title: string;
            description: string;
            score: number | null;
            displayValue?: string;
        }>;
    };
}

export async function runSEOScan(url: string): Promise<SEOScanResult> {
    const startTime = Date.now();

    // Ensure URL has protocol
    const targetUrl = url.startsWith('http') ? url : `https://${url}`;

    // Call Google PageSpeed Insights API (free, no API key required for basic usage)
    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(targetUrl)}&category=seo&category=performance&category=accessibility&category=best-practices&strategy=desktop`;

    const response = await fetch(apiUrl);

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`PageSpeed API error: ${response.status} - ${errorText}`);
    }

    const data: PageSpeedResult = await response.json();
    const lhr = data.lighthouseResult;

    // Extract scores (0-100)
    const scores = {
        seo: Math.round((lhr.categories.seo?.score ?? 0) * 100),
        performance: Math.round((lhr.categories.performance?.score ?? 0) * 100),
        accessibility: Math.round((lhr.categories.accessibility?.score ?? 0) * 100),
        bestPractices: Math.round((lhr.categories['best-practices']?.score ?? 0) * 100),
    };

    // Extract key audits for SEO
    const seoAuditIds = [
        'viewport', 'document-title', 'meta-description', 'http-status-code',
        'link-text', 'crawlable-anchors', 'is-crawlable', 'robots-txt',
        'hreflang', 'canonical', 'structured-data', 'font-size', 'tap-targets'
    ];

    const audits = seoAuditIds
        .filter(id => lhr.audits[id])
        .map(id => {
            const audit = lhr.audits[id];
            return {
                title: audit.title,
                score: audit.score,
                description: audit.description,
                displayValue: audit.displayValue,
            };
        });

    // Generate recommendations from failed audits
    const recommendations: SEOScanResult['recommendations'] = [];

    for (const [, audit] of Object.entries(lhr.audits)) {
        if (audit.score !== null && audit.score < 1) {
            let impact: 'critical' | 'high' | 'medium' | 'low' = 'low';
            if (audit.score === 0) impact = 'critical';
            else if (audit.score < 0.5) impact = 'high';
            else if (audit.score < 0.9) impact = 'medium';

            recommendations.push({
                title: audit.title,
                description: audit.description,
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
}
