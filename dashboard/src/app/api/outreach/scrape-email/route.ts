import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const OWNER_EMAIL = 'vibecodedetector@gmail.com';

// Pages to check for contact emails (in order of priority)
const CONTACT_PATHS = ['', '/contact', '/about', '/team', '/support', '/impressum', '/legal'];

// Patterns to ignore (noreply, generic, tracking, etc.)
const IGNORE_PATTERNS = [
    /noreply/i, /no-reply/i, /donotreply/i, /mailer-daemon/i,
    /notifications?@/i, /newsletter@/i, /unsubscribe/i,
    /example\.com/i, /test@/i, /sentry/i, /tracking/i,
    /wixpress\.com/i, /mailchimp/i, /sendgrid/i,
];

function extractEmails(html: string): string[] {
    const emails = new Set<string>();

    // 1. mailto: links (highest confidence)
    const mailtoRegex = /mailto:([^\s"'?&]+)/gi;
    let match;
    while ((match = mailtoRegex.exec(html)) !== null) {
        const email = decodeURIComponent(match[1]).trim().toLowerCase();
        if (email.includes('@') && !email.includes('{{')) emails.add(email);
    }

    // 2. Email patterns in visible text and attributes
    const emailRegex = /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g;
    while ((match = emailRegex.exec(html)) !== null) {
        const email = match[0].toLowerCase();
        // Skip if it looks like a file extension or template variable
        if (email.endsWith('.png') || email.endsWith('.jpg') || email.endsWith('.svg') ||
            email.endsWith('.css') || email.endsWith('.js') || email.endsWith('.woff') ||
            email.includes('{{') || email.includes('{%')) continue;
        emails.add(email);
    }

    // Filter out ignore patterns
    return Array.from(emails).filter(email =>
        !IGNORE_PATTERNS.some(pattern => pattern.test(email))
    );
}

function scoreEmail(email: string): number {
    let score = 0;
    const local = email.split('@')[0];

    // Prefer personal-looking emails
    if (/^(hi|hello|hey|info|contact|team|founders?)@/i.test(email)) score += 3;
    if (/^[a-z]+\.[a-z]+@/i.test(local)) score += 5; // first.last pattern
    if (/^[a-z]{2,}@/i.test(local) && local.length < 15) score += 2; // short personal name
    if (/^(support|help|admin|billing|sales)@/i.test(email)) score += 1;
    // Deprioritize generic
    if (/^(privacy|legal|abuse|postmaster|webmaster)@/i.test(email)) score -= 2;

    return score;
}

export async function POST(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.email !== OWNER_EMAIL) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { url } = await req.json();

    if (!url) {
        return NextResponse.json({ error: 'Missing URL' }, { status: 400 });
    }

    const allEmails = new Map<string, { email: string; source: string; score: number }>();

    // Try fetching multiple pages
    for (const path of CONTACT_PATHS) {
        try {
            const targetUrl = new URL(path, url).toString();
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 8000);

            const res = await fetch(targetUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; CheckVibeBot/1.0; +https://checkvibe.dev)',
                    'Accept': 'text/html,application/xhtml+xml',
                },
                signal: controller.signal,
                redirect: 'follow',
            });
            clearTimeout(timeout);

            if (!res.ok) continue;

            const html = await res.text();
            const found = extractEmails(html);

            for (const email of found) {
                const existing = allEmails.get(email);
                const score = scoreEmail(email);
                if (!existing || score > existing.score) {
                    allEmails.set(email, { email, source: path || '/', score });
                }
            }
        } catch {
            // Skip failed pages
            continue;
        }
    }

    // Sort by score descending
    const results = Array.from(allEmails.values())
        .sort((a, b) => b.score - a.score)
        .map(({ email, source }) => ({ email, source }));

    return NextResponse.json({ emails: results });
}
