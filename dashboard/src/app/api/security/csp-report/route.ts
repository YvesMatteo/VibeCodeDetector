import { NextResponse } from 'next/server';

/**
 * CSP Violation Report endpoint.
 * Referenced by Content-Security-Policy report-uri directive in next.config.ts.
 * Accepts browser-submitted CSP violation reports (JSON) and logs them.
 */
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const report = body?.['csp-report'] || body;

        if (report?.['blocked-uri'] || report?.blockedURL) {
            console.warn('[CSP Violation]', JSON.stringify({
                blockedUri: report['blocked-uri'] || report.blockedURL,
                violatedDirective: report['violated-directive'] || report.effectiveDirective,
                documentUri: report['document-uri'] || report.documentURL,
            }));
        }

        return new NextResponse(null, { status: 204 });
    } catch {
        return new NextResponse(null, { status: 400 });
    }
}
