import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { validateTargetUrl, validateScannerAuth, getCorsHeaders } from "../_shared/security.ts";

/**
 * Security Headers Scanner
 * Analyzes HTTP response headers for security best practices
 */

const SECURITY_HEADERS = [
    { name: 'Content-Security-Policy', weight: 15, severity: 'medium', description: 'Prevents XSS and injection attacks. Note: many large sites use alternative mitigations like nonce-based scripts or Trusted Types instead of a strict CSP.' },
    { name: 'Strict-Transport-Security', weight: 20, severity: 'high', description: 'Enforces HTTPS connections' },
    { name: 'X-Frame-Options', weight: 10, severity: 'medium', description: 'Prevents clickjacking attacks (superseded by CSP frame-ancestors)' },
    { name: 'X-Content-Type-Options', weight: 10, severity: 'medium', description: 'Prevents MIME-type sniffing' },
    { name: 'Referrer-Policy', weight: 5, severity: 'low', description: 'Controls referrer information' },
    { name: 'Permissions-Policy', weight: 5, severity: 'low', description: 'Controls browser feature access (relatively new header, adoption is still growing)' },
    // X-XSS-Protection intentionally excluded: it's deprecated, modern browsers ignore it,
    // and in some cases it can actually introduce vulnerabilities (Chrome removed it in 2023).
];

interface Finding {
    id: string;
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
    title: string;
    description: string;
    recommendation: string;
    value?: string;
}

interface ScanResult {
    scannerType: string;
    score: number;
    findings: Finding[];
    headers: Record<string, string>;
    scannedAt: string;
    url: string;
}

Deno.serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: getCorsHeaders(req) });
    }

    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        });
    }

    if (!validateScannerAuth(req)) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        });
    }

    try {
        const body = await req.json();
        const validation = validateTargetUrl(body.targetUrl);
        if (!validation.valid) {
            return new Response(JSON.stringify({ error: validation.error }), {
                status: 400,
                headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
            });
        }
        const url = validation.url!;

        // Fetch headers from target
        const response = await fetch(url, {
            method: 'HEAD',
            redirect: 'follow',
        });

        const findings: Finding[] = [];
        let score = 100;
        const headersRecord: Record<string, string> = {};

        // Collect all headers
        response.headers.forEach((value, key) => {
            headersRecord[key.toLowerCase()] = value;
        });

        // Pre-check: does CSP include frame-ancestors? If so, X-Frame-Options is redundant.
        const cspHeader = response.headers.get('Content-Security-Policy');
        const hasFrameAncestors = cspHeader?.toLowerCase().includes('frame-ancestors');

        // Check each security header
        for (const header of SECURITY_HEADERS) {
            const headerValue = response.headers.get(header.name);

            if (!headerValue) {
                // Don't penalize for missing X-Frame-Options if CSP frame-ancestors is set
                if (header.name === 'X-Frame-Options' && hasFrameAncestors) {
                    findings.push({
                        id: `info-${header.name.toLowerCase()}`,
                        severity: 'info',
                        title: `${header.name} not set (covered by CSP)`,
                        description: 'X-Frame-Options is not set, but CSP frame-ancestors directive is present which provides the same protection.',
                        recommendation: 'No action needed — CSP frame-ancestors is the modern replacement.',
                    });
                    continue;
                }

                score -= header.weight;
                findings.push({
                    id: `missing-${header.name.toLowerCase()}`,
                    severity: header.severity as Finding['severity'],
                    title: `Missing ${header.name} header`,
                    description: header.description,
                    recommendation: `Add the ${header.name} header to your server response.`,
                });
            } else {
                // Header exists - check for weak configurations
                if (header.name === 'Strict-Transport-Security') {
                    const maxAge = parseInt(headerValue.match(/max-age=(\d+)/)?.[1] ?? '0');
                    if (maxAge < 31536000) {
                        score -= 5;
                        findings.push({
                            id: 'weak-hsts',
                            severity: 'medium',
                            title: 'Weak HSTS max-age',
                            description: 'HSTS max-age should be at least 1 year (31536000 seconds).',
                            recommendation: 'Set max-age=31536000 or higher.',
                            value: headerValue,
                        });
                    }
                }

                if (header.name === 'X-Frame-Options') {
                    if (!['DENY', 'SAMEORIGIN'].includes(headerValue.toUpperCase())) {
                        score -= 5;
                        findings.push({
                            id: 'weak-xfo',
                            severity: 'low',
                            title: 'Weak X-Frame-Options value',
                            description: 'X-Frame-Options should be DENY or SAMEORIGIN.',
                            recommendation: 'Set X-Frame-Options to DENY or SAMEORIGIN.',
                            value: headerValue,
                        });
                    }
                }
            }
        }

        // Check for HTTPS
        if (!url.startsWith('https://')) {
            score -= 25;
            findings.push({
                id: 'no-https',
                severity: 'critical',
                title: 'Site not using HTTPS',
                description: 'The site is not served over HTTPS, exposing users to man-in-the-middle attacks.',
                recommendation: 'Configure your server to use HTTPS with a valid SSL certificate.',
            });
        }

        // Check for cookies without Secure flag
        const setCookie = response.headers.get('Set-Cookie');
        if (setCookie && !setCookie.toLowerCase().includes('secure')) {
            score -= 10;
            findings.push({
                id: 'insecure-cookies',
                severity: 'medium',
                title: 'Cookies without Secure flag',
                description: 'Cookies are being set without the Secure flag.',
                recommendation: 'Add the Secure flag to all cookies.',
                value: setCookie.substring(0, 50) + '...',
            });
        }

        // Only return security-relevant headers, not all headers
        const securityHeaderNames = ['content-security-policy', 'x-frame-options', 'x-content-type-options',
          'strict-transport-security', 'x-xss-protection', 'referrer-policy', 'permissions-policy',
          'cross-origin-opener-policy', 'cross-origin-resource-policy', 'cross-origin-embedder-policy',
          'x-permitted-cross-domain-policies', 'cache-control', 'pragma', 'server', 'x-powered-by'];
        const filteredHeaders: Record<string, string> = {};
        for (const header of securityHeaderNames) {
          if (headersRecord[header]) filteredHeaders[header] = headersRecord[header];
        }

        const result: ScanResult = {
            scannerType: 'security-headers',
            score: Math.max(0, Math.min(100, score)),
            findings,
            headers: filteredHeaders,
            scannedAt: new Date().toISOString(),
            url,
        };

        return new Response(JSON.stringify(result), {
            headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Scanner error:', error);
        return new Response(
            JSON.stringify({
                scannerType: 'security-headers',
                score: 0,
                error: 'Scan failed. Please try again.',
                findings: [],
                metadata: {},
            }),
            {
                status: 500,
                headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
            }
        );
    }
});
