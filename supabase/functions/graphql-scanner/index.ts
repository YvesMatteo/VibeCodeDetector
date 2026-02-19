import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { validateTargetUrl, validateScannerAuth, getCorsHeaders } from "../_shared/security.ts";

interface Finding {
    id: string;
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
    title: string;
    description: string;
    recommendation: string;
    evidence?: string;
}

interface ScanResult {
    scannerType: string;
    score: number;
    findings: Finding[];
    checksRun: number;
    scannedAt: string;
    url: string;
}

// Helper to fetch with timeout
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 8000): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            headers: {
                'User-Agent': 'CheckVibe-GraphQLScanner/1.0 (+https://checkvibe.dev)',
                ...(options.headers || {})
            }
        });
        return response;
    } finally {
        clearTimeout(id);
    }
}

async function testIntrospection(endpoint: URL): Promise<boolean> {
    try {
        const res = await fetchWithTimeout(endpoint.href, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: "{ __schema { types { name } } }" })
        }, 5000);

        if (res.ok) {
            const data = await res.json();
            return !!(data?.data?.__schema?.types);
        }
    } catch { /* skip */ }
    return false;
}

async function testQueryDepth(endpoint: URL): Promise<boolean> {
    try {
        // Deep nested query
        let query = "{ __type(name: \"String\") { name fields { type { fields { type { fields { type { name } } } } } } } }";
        const res = await fetchWithTimeout(endpoint.href, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query })
        }, 5000);

        if (res.ok) {
            // A 200 OK without errors indicates the depth query was accepted
            const data = await res.json();
            if (!data.errors) return true;
        }
    } catch { /* skip */ }
    return false;
}

Deno.serve(async (req: Request) => {
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

        const targetUrl = validation.url!;
        const interceptedApiCalls: string[] = body.interceptedApiCalls || [];
        const baseUrl = new URL(targetUrl);

        const findings: Finding[] = [];
        let score = 100;
        let checksRun = 0;

        // 1. Discover GraphQL endpoints
        const potentialEndpoints = new Set<string>();
        for (const callUrl of interceptedApiCalls) {
            if (callUrl.toLowerCase().includes('graphql')) {
                potentialEndpoints.add(callUrl);
            }
        }

        // Fallback common endpoints if none found dynamically
        if (potentialEndpoints.size === 0) {
            ['/graphql', '/api/graphql', '/v1/graphql'].forEach(p => {
                try { potentialEndpoints.add(new URL(p, baseUrl).href); } catch { }
            });
        }

        let graphqlFound = false;

        for (const endpointStr of potentialEndpoints) {
            let endpointUrl: URL;
            try {
                endpointUrl = new URL(endpointStr);
                // ensure same origin or subdomain to avoid attacking random third parties
                if (!endpointUrl.hostname.endsWith(baseUrl.hostname)) continue;
            } catch { continue; }

            // Quick check if it really is GraphQL
            checksRun++;
            let isGraphQLEndpoint = false;
            try {
                const checkRes = await fetchWithTimeout(endpointUrl.href, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query: "{ __typename }" })
                }, 3000);

                if (checkRes.ok || checkRes.status === 400) {
                    const text = await checkRes.text();
                    if (text.includes('__typename') || text.includes('GraphQL') || text.includes('syntax error')) {
                        isGraphQLEndpoint = true;
                        graphqlFound = true;
                    }
                }
            } catch { /* skip */ }

            if (!isGraphQLEndpoint) continue;

            // Run Introspection Check
            checksRun++;
            const hasIntrospection = await testIntrospection(endpointUrl);
            if (hasIntrospection) {
                findings.push({
                    id: 'graphql-introspection-enabled',
                    severity: 'high',
                    title: 'GraphQL Introspection Query Enabled',
                    description: `The GraphQL endpoint at ${endpointUrl.pathname} allows introspection queries. This exposes your entire GraphQL schema (all types, queries, and mutations) to attackers.`,
                    recommendation: 'Disable GraphQL introspection in production environments. Most GraphQL engines have a simple configuration flag to disable it.'
                });
                score -= 30;
            }

            // Run Query Depth Limit Check
            checksRun++;
            const allowsDeepQueries = await testQueryDepth(endpointUrl);
            if (allowsDeepQueries) {
                findings.push({
                    id: 'graphql-no-depth-limit',
                    severity: 'medium',
                    title: 'GraphQL Missing Query Depth Limit',
                    description: `The GraphQL endpoint at ${endpointUrl.pathname} accepts deeply nested queries. Attackers can exploit this to cause Denial of Service (DoS) by requesting complex nested relationships.`,
                    recommendation: 'Implement a query depth limit (e.g., max depth of 5-7) using middleware for your GraphQL server.'
                });
                score -= 15;
            }
        }

        if (!graphqlFound && interceptedApiCalls.length > 0) {
            findings.push({
                id: 'no-graphql-detected',
                severity: 'info',
                title: 'No GraphQL Endpoints Detected',
                description: 'No active GraphQL API endpoints were detected during the scan.',
                recommendation: 'No action needed.'
            });
        }

        score = Math.max(0, Math.min(100, score));

        return new Response(JSON.stringify({
            scannerType: 'graphql',
            score,
            findings,
            checksRun,
            scannedAt: new Date().toISOString(),
            url: targetUrl,
        } satisfies ScanResult), {
            headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('GraphQL scanner error:', error);
        return new Response(
            JSON.stringify({
                scannerType: 'graphql',
                score: 0,
                error: 'Scan failed. Please try again.',
                findings: [],
                checksRun: 0,
                scannedAt: new Date().toISOString(),
                url: '',
            }),
            {
                status: 500,
                headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
            },
        );
    }
});
