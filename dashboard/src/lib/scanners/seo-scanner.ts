import { load } from 'cheerio';

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

    try {
        // Try Google PageSpeed Insights API first
        const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(targetUrl)}&category=seo&category=performance&category=accessibility&category=best-practices&strategy=desktop`;

        const response = await fetch(apiUrl);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API ${response.status}: ${errorText}`);
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

        // Generate recommendations
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

        const impactOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        recommendations.sort((a, b) => impactOrder[a.impact] - impactOrder[b.impact]);

        return {
            url: targetUrl,
            scores,
            audits,
            recommendations: recommendations.slice(0, 10),
            scanDuration: Date.now() - startTime,
        };

    } catch (apiError) {
        console.warn('PageSpeed API failed, falling back to local analysis:', apiError);
        return runLocalSEOScan(targetUrl, apiError instanceof Error ? apiError.message : String(apiError));
    }
}

async function runLocalSEOScan(url: string, apiErrorMsg: string): Promise<SEOScanResult> {
    const startTime = Date.now();

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch URL (${response.status})`);
        }

        const html = await response.text();
        const $ = load(html);

        let score = 100;
        const audits = [];
        const recommendations: SEOScanResult['recommendations'] = [];

        // 1. Title Tag
        const title = $('title').text().trim();
        if (!title) {
            score -= 20;
            audits.push({ title: 'Document Title', score: 0, description: 'Missing <title> tag.' });
            recommendations.push({ title: 'Add Title Tag', description: 'Add a descriptive <title> tag to the head of your page.', impact: 'critical' });
        } else {
            audits.push({ title: 'Document Title', score: 1, description: 'Title exists', displayValue: title });
            if (title.length < 10) score -= 5;
            if (title.length > 70) score -= 5;
        }

        // 2. Meta Description
        const metaDesc = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content');
        if (!metaDesc) {
            score -= 20;
            audits.push({ title: 'Meta Description', score: 0, description: 'Missing meta description.' });
            recommendations.push({ title: 'Add Meta Description', description: 'Add a <meta name="description"> tag to summarize your page content.', impact: 'high' });
        } else {
            audits.push({ title: 'Meta Description', score: 1, description: 'Meta description exists', displayValue: metaDesc });
            if (metaDesc.length < 50) score -= 5;
            if (metaDesc.length > 320) score -= 5;
        }

        // 3. H1 Heading
        const h1Count = $('h1').length;
        if (h1Count === 0) {
            score -= 15;
            audits.push({ title: 'H1 Heading', score: 0, description: 'No <h1> tag found.' });
            recommendations.push({ title: 'Add H1 Heading', description: 'Ensure the page has exactly one <h1> tag describing the main topic.', impact: 'high' });
        } else if (h1Count > 1) {
            score -= 10;
            audits.push({ title: 'H1 Heading', score: 0.5, description: `Found ${h1Count} <h1> tags.` });
            recommendations.push({ title: 'Fix H1 Usage', description: 'Use only one <h1> tag per page.', impact: 'medium' });
        } else {
            audits.push({ title: 'H1 Heading', score: 1, description: 'Valid H1 tag found', displayValue: $('h1').first().text().trim().substring(0, 50) });
        }

        // 4. Image Alt Texts
        const images = $('img');
        const totalImages = images.length;
        const missingAlt = images.filter((_, el) => !$(el).attr('alt')).length;

        if (totalImages > 0 && missingAlt > 0) {
            const penalty = Math.min(20, (missingAlt / totalImages) * 20);
            score -= penalty;
            audits.push({ title: 'Image Alt Text', score: 1 - (missingAlt / totalImages), description: `${missingAlt} images missing alt text.` });
            recommendations.push({ title: 'Add Image Alt Attribute', description: 'Add descriptive alt text to all images for accessibility and SEO.', impact: 'medium' });
        } else {
            audits.push({ title: 'Image Alt Text', score: 1, description: 'All images have alt text.' });
        }

        // 5. Canonical
        const canonical = $('link[rel="canonical"]').attr('href');
        if (!canonical) {
            score -= 5;
            audits.push({ title: 'Canonical Tag', score: 0, description: 'No canonical tag found.' });
            recommendations.push({ title: 'Add Canonical Tag', description: 'Add a <link rel="canonical"> tag to prevent duplicate content issues.', impact: 'low' });
        } else {
            audits.push({ title: 'Canonical Tag', score: 1, description: 'Canonical tag found.', displayValue: canonical });
        }

        // Ensure score is 0-100
        score = Math.max(0, Math.round(score));

        // Add an info audit about the fallback
        audits.push({
            title: 'Scan Method',
            score: null,
            description: 'Used Local Analysis fallback because PageSpeed API failed.',
            displayValue: `API Error: ${apiErrorMsg.substring(0, 50)}...`
        });

        return {
            url,
            scores: {
                seo: score,
                performance: 0, // Cannot measure locally
                accessibility: 0,
                bestPractices: 0
            },
            audits,
            recommendations,
            scanDuration: Date.now() - startTime
        };

    } catch (localError: any) {
        throw new Error(`Scan failed. API Error: ${apiErrorMsg}. Local Error: ${localError.message}`);
    }
}
