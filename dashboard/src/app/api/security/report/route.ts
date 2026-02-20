import { NextResponse } from 'next/server';

/**
 * Network Error Logging (NEL) / Reporting API endpoint.
 * Referenced by Report-To header in next.config.ts.
 * Accepts browser-submitted reports and logs them.
 */
export async function POST(req: Request) {
    try {
        const reports = await req.json();

        if (Array.isArray(reports)) {
            for (const report of reports) {
                console.warn('[NEL Report]', JSON.stringify({
                    type: report.type,
                    url: report.url,
                    body: report.body,
                }));
            }
        }

        return new NextResponse(null, { status: 204 });
    } catch {
        return new NextResponse(null, { status: 400 });
    }
}
