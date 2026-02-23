import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    const domain = req.nextUrl.searchParams.get('domain');
    if (!domain) {
        return NextResponse.json({ error: 'Missing domain' }, { status: 400 });
    }

    // Sanitize domain — only allow valid hostnames
    if (!/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(domain)) {
        return NextResponse.json({ error: 'Invalid domain' }, { status: 400 });
    }

    const sz = req.nextUrl.searchParams.get('sz') || '64';

    try {
        const res = await fetch(
            `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=${sz}`,
            { next: { revalidate: 86400 } } // cache 24h
        );

        if (!res.ok) {
            return new NextResponse(null, { status: 502 });
        }

        const buffer = await res.arrayBuffer();
        const contentType = res.headers.get('content-type') || 'image/png';

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=86400, s-maxage=86400',
            },
        });
    } catch {
        return new NextResponse(null, { status: 502 });
    }
}
