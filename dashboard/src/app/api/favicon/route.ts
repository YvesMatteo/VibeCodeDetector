import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';

const FALLBACK_ICON = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAAKRJREFUWEft' +
    'ljEOgCAQBOf/j7a2tlZWGAke3B4LRRRjYcJVLMPs3cEB/TiA/fkZYAWyDN8yCTPbAPgBOEr6pnZK' +
    'ALd09ZVkwh0ASZO0pz8nQCLZAbimu2RdPAAcJUUBymV+BHhK2hUDuKSrz+EZIGOV6wBc09U3JWAE' +
    'yDJ8S8QA8lau3oBzuoaPYASyDF8BMYB8la+Ac7o+fAsm/A/wf8EKsAIjwA1DCy0hPuLVqgAAAABJ' +
    'RU5ErkJggg==',
    'base64'
);

export async function GET(req: NextRequest) {
    // Rate limit: 30 favicon requests per minute per IP (public endpoint)
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
        ?? req.headers.get('x-real-ip') ?? '0.0.0.0';
    const rlFav = await checkRateLimit(`favicon:${ip}`, 30, 60);
    if (!rlFav.allowed) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const domain = req.nextUrl.searchParams.get('domain');
    if (!domain) {
        return NextResponse.json({ error: 'Missing domain' }, { status: 400 });
    }

    if (!/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(domain)) {
        return NextResponse.json({ error: 'Invalid domain' }, { status: 400 });
    }

    // Block internal/private hostnames to prevent SSRF
    const lowerDomain = domain.toLowerCase();
    if (lowerDomain === 'localhost' || lowerDomain.endsWith('.local') || lowerDomain.endsWith('.internal') ||
        lowerDomain.endsWith('.corp') || lowerDomain.endsWith('.home') || lowerDomain.endsWith('.lan') ||
        /^(10|127|172\.(1[6-9]|2[0-9]|3[01])|192\.168)\./.test(domain)) {
        return NextResponse.json({ error: 'Invalid domain' }, { status: 400 });
    }

    const sz = req.nextUrl.searchParams.get('sz') || '64';
    const headers = {
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    };

    // Try Google's favicon service first (most reliable for known domains)
    try {
        const googleUrl = `https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${encodeURIComponent(domain)}&size=${sz}`;
        const res = await fetch(googleUrl, {
            signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
            const buffer = await res.arrayBuffer();
            // Google returns a tiny default globe icon when it doesn't know the site —
            // check if it's a real favicon (> 200 bytes usually means real)
            if (buffer.byteLength > 200) {
                return new NextResponse(buffer, {
                    headers: {
                        ...headers,
                        'Content-Type': res.headers.get('content-type') || 'image/png',
                    },
                });
            }
        }
    } catch { /* fall through */ }

    // Try fetching /favicon.ico directly from the domain
    try {
        const res = await fetch(`https://${domain}/favicon.ico`, {
            signal: AbortSignal.timeout(5000),
            redirect: 'follow',
        });
        if (res.ok) {
            const ct = res.headers.get('content-type') || '';
            if (ct.includes('image') || ct.includes('icon') || ct.includes('octet-stream')) {
                const buffer = await res.arrayBuffer();
                if (buffer.byteLength > 0) {
                    return new NextResponse(buffer, {
                        headers: {
                            ...headers,
                            'Content-Type': ct.includes('icon') ? 'image/x-icon' : ct,
                        },
                    });
                }
            }
        }
    } catch { /* fall through */ }

    // Return a default globe icon
    return new NextResponse(FALLBACK_ICON, {
        headers: {
            ...headers,
            'Content-Type': 'image/png',
        },
    });
}
