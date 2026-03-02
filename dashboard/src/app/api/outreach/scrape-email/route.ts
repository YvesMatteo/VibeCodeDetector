import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { checkCsrf } from '@/lib/csrf';
import { OWNER_EMAIL } from '@/lib/constants';

// ── Ignore patterns ──────────────────────────────────────────────────
const IGNORE_PATTERNS = [
    /noreply/i, /no-reply/i, /no_reply/i, /donotreply/i, /mailer-daemon/i,
    /notifications?@/i, /newsletter@/i, /unsubscribe/i, /bounce/i,
    /example\./i, /exemplu\./i, /test@/i, /sentry\./i, /tracking/i,
    /wixpress\.com/i, /mailchimp/i, /sendgrid/i, /amazonaws/i,
    /cloudflare/i, /google\.com$/i, /facebook\.com$/i, /twitter\.com$/i,
    /github\.com$/i, /sentry\.io$/i, /intercom/i, /zendesk/i,
    /hubspot/i, /mailgun/i, /postmark/i, /sparkpost/i,
    /placeholder/i, /changeme/i, /yourname/i, /youremail/i,
    /user@/i, /email@/i, /name@/i, /you@/i, /someone@/i,
    /abuse@/i, /hostmaster@/i, /postmaster@/i, /dns@/i,
    /registrar/i, /domaincontact/i, /whoisguard/i, /privacyprotect/i,
    /contactprivacy/i, /whoisprivacy/i, /1und1/i, /romag\.com/i,
    /namecheap/i, /godaddy/i, /tucows/i, /enom/i, /dynadot/i,
    /company\.com/i, /domain\.com$/i, /yourdomain/i, /sample/i,
];

const JUNK_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.css', '.js', '.woff', '.woff2', '.ttf', '.map', '.ico'];

// ── Email extraction from text ───────────────────────────────────────
function extractEmails(text: string): string[] {
    const emails = new Set<string>();

    // 1. mailto: links (highest confidence)
    for (const m of text.matchAll(/mailto:([^\s"'?&#]+)/gi)) {
        const e = decodeURIComponent(m[1]).trim().toLowerCase();
        if (e.includes('@') && !e.includes('{{')) emails.add(e);
    }

    // 2. data-email / data-contact attributes
    for (const m of text.matchAll(/data-(?:email|contact|mail)\s*=\s*["']([^"']+)["']/gi)) {
        const e = m[1].trim().toLowerCase();
        if (e.includes('@')) emails.add(e);
    }

    // 3. Decode obfuscated emails before regex
    let decoded = text;
    // HTML entities: &#64; = @, &#46; = .
    decoded = decoded.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
    decoded = decoded.replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
    // Common obfuscation: [at] (at) {at} [dot] (dot) {dot}
    decoded = decoded.replace(/\s*[\[({]\s*at\s*[\])}]\s*/gi, '@');
    decoded = decoded.replace(/\s*[\[({]\s*dot\s*[\])}]\s*/gi, '.');
    // Space-padded: "name AT domain DOT com"
    decoded = decoded.replace(/\s+AT\s+/g, '@');
    decoded = decoded.replace(/\s+DOT\s+/g, '.');

    // 4. Standard email regex on decoded text
    for (const m of decoded.matchAll(/\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g)) {
        const e = m[0].toLowerCase();
        if (!JUNK_EXTENSIONS.some(ext => e.endsWith(ext)) && !e.includes('{{') && !e.includes('{%')) {
            emails.add(e);
        }
    }

    // 5. JSON-LD structured data
    for (const m of text.matchAll(/<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
        try {
            const data = JSON.parse(m[1]);
            const extractFromLD = (obj: unknown) => {
                if (!obj || typeof obj !== 'object') return;
                const o = obj as Record<string, unknown>;
                if (typeof o.email === 'string') emails.add(o.email.replace(/^mailto:/i, '').toLowerCase());
                if (o.contactPoint) {
                    const points = Array.isArray(o.contactPoint) ? o.contactPoint : [o.contactPoint];
                    for (const cp of points) {
                        const cpObj = cp as Record<string, unknown>;
                        if (typeof cpObj.email === 'string') emails.add(cpObj.email.replace(/^mailto:/i, '').toLowerCase());
                    }
                }
                if (Array.isArray(obj)) obj.forEach(extractFromLD);
                if (typeof obj === 'object') Object.values(obj).forEach(v => { if (typeof v === 'object') extractFromLD(v); });
            };
            extractFromLD(data);
        } catch { /* invalid JSON-LD */ }
    }

    // 6. Meta tags: og:email, contact:email, author
    for (const m of text.matchAll(/<meta[^>]*(?:name|property)\s*=\s*["'](?:og:email|contact:email|author)["'][^>]*content\s*=\s*["']([^"']+)["']/gi)) {
        const e = m[1].trim().toLowerCase();
        if (e.includes('@')) emails.add(e);
    }
    // Also reversed order (content before name)
    for (const m of text.matchAll(/<meta[^>]*content\s*=\s*["']([^"']+)["'][^>]*(?:name|property)\s*=\s*["'](?:og:email|contact:email|author)["']/gi)) {
        const e = m[1].trim().toLowerCase();
        if (e.includes('@')) emails.add(e);
    }

    return Array.from(emails).filter(e => !IGNORE_PATTERNS.some(p => p.test(e)));
}

// ── Extract social links ─────────────────────────────────────────────
function extractSocialLinks(html: string): { github?: string; twitter?: string; linkedin?: string } {
    const links: { github?: string; twitter?: string; linkedin?: string } = {};

    const githubMatch = html.match(/href\s*=\s*["'](https?:\/\/github\.com\/[a-zA-Z0-9_-]+)\/?["']/i);
    if (githubMatch) links.github = githubMatch[1];

    const twitterMatch = html.match(/href\s*=\s*["'](https?:\/\/(?:twitter|x)\.com\/[a-zA-Z0-9_]+)\/?["']/i);
    if (twitterMatch) links.twitter = twitterMatch[1];

    const linkedinMatch = html.match(/href\s*=\s*["'](https?:\/\/(?:www\.)?linkedin\.com\/(?:company|in)\/[a-zA-Z0-9_-]+)\/?["']/i);
    if (linkedinMatch) links.linkedin = linkedinMatch[1];

    return links;
}

// ── Score emails by relevance ────────────────────────────────────────
function scoreEmail(email: string, source: string, domainMatch: boolean): number {
    let score = 0;
    const local = email.split('@')[0];

    // Domain match bonus
    if (domainMatch) score += 10;

    // Source bonus
    if (source === 'github') score += 8;
    if (source === 'security.txt') score += 6;
    if (source.includes('contact') || source.includes('about')) score += 4;
    if (source === 'dns-soa') score += 3;

    // Personal email patterns
    if (/^[a-z]+\.[a-z]+@/i.test(local)) score += 7;           // first.last
    if (/^[a-z]+@/i.test(local) && local.length <= 10) score += 4; // short name
    if (/^(hi|hello|hey)@/i.test(email)) score += 5;
    if (/^(contact|team|founders?)@/i.test(email)) score += 4;
    if (/^(info)@/i.test(email)) score += 3;
    if (/^(support|help)@/i.test(email)) score += 1;
    if (/^(admin|billing|sales|privacy|legal|abuse|postmaster|webmaster)@/i.test(email)) score -= 1;

    return score;
}

// ── Helpers ──────────────────────────────────────────────────────────
async function fetchWithTimeout(url: string, timeoutMs = 10000): Promise<string | null> {
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
            },
            signal: controller.signal,
            redirect: 'follow',
        });
        clearTimeout(timer);
        if (!res.ok) return null;
        const text = await res.text();
        return text.slice(0, 500_000); // cap at 500KB
    } catch {
        return null;
    }
}

function getDomain(url: string): string {
    try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
}

// ── Strategy A: HTML scraping (expanded paths) ───────────────────────
const CONTACT_PATHS = [
    '', '/contact', '/about', '/team', '/about-us', '/contact-us',
    '/imprint', '/impressum', '/legal', '/privacy',
    '/support', '/company', '/founders',
];

interface EmailResult {
    email: string;
    source: string;
    score: number;
}

async function strategyHtmlScraping(baseUrl: string, domain: string): Promise<EmailResult[]> {
    const results: EmailResult[] = [];

    // Fetch all pages in parallel
    await Promise.all(CONTACT_PATHS.map(async (path) => {
        const targetUrl = new URL(path, baseUrl).toString();
        const html = await fetchWithTimeout(targetUrl);
        if (!html) return;

        const found = extractEmails(html);
        for (const email of found) {
            const domainMatch = email.endsWith(`@${domain}`) || email.includes(domain.split('.')[0]);
            results.push({ email, source: path || '/', score: scoreEmail(email, path, domainMatch) });
        }
    }));

    return results;
}

// ── Strategy B: security.txt + humans.txt ────────────────────────────
async function strategySecurityTxt(baseUrl: string, domain: string): Promise<EmailResult[]> {
    const results: EmailResult[] = [];
    const paths = ['/.well-known/security.txt', '/security.txt', '/humans.txt'];

    await Promise.all(paths.map(async (path) => {
        const text = await fetchWithTimeout(new URL(path, baseUrl).toString(), 4000);
        if (!text) return;

        // security.txt Contact: field
        for (const m of text.matchAll(/^Contact:\s*mailto:(.+)$/gmi)) {
            const email = m[1].trim().toLowerCase();
            if (email.includes('@')) {
                const domainMatch = email.endsWith(`@${domain}`);
                results.push({ email, source: 'security.txt', score: scoreEmail(email, 'security.txt', domainMatch) });
            }
        }

        // Also try general email extraction
        for (const email of extractEmails(text)) {
            const domainMatch = email.endsWith(`@${domain}`);
            results.push({ email, source: path, score: scoreEmail(email, path, domainMatch) });
        }
    }));

    return results;
}

// ── Strategy C: GitHub email extraction ──────────────────────────────
async function strategyGitHub(baseUrl: string, domain: string): Promise<{ emails: EmailResult[]; socialLinks: { github?: string } }> {
    const emails: EmailResult[] = [];
    const socialLinks: { github?: string } = {};

    // First find GitHub links on the site
    const html = await fetchWithTimeout(baseUrl);
    if (!html) return { emails, socialLinks };

    const social = extractSocialLinks(html);
    if (!social.github) return { emails, socialLinks };
    socialLinks.github = social.github;

    const githubPath = new URL(social.github).pathname.replace(/^\//, '').split('/')[0];
    if (!githubPath) return { emails, socialLinks };

    const githubToken = process.env.GITHUB_TOKEN;
    const headers: Record<string, string> = {
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'CheckVibeBot/1.0',
    };
    if (githubToken) headers['Authorization'] = `Bearer ${githubToken}`;

    // Try 1: Get email from GitHub user/org profile
    try {
        const profileRes = await fetchWithTimeout(`https://api.github.com/users/${githubPath}`, 5000);
        if (profileRes) {
            const profile = JSON.parse(profileRes);
            if (profile.email) {
                const email = profile.email.toLowerCase();
                const domainMatch = email.endsWith(`@${domain}`);
                emails.push({ email, source: 'github', score: scoreEmail(email, 'github', domainMatch) });
            }
            // Also check blog field for email
            if (profile.blog && profile.blog.includes('@')) {
                emails.push({ email: profile.blog.toLowerCase(), source: 'github', score: scoreEmail(profile.blog.toLowerCase(), 'github', false) });
            }
        }
    } catch { /* skip */ }

    // Try 2: Get email from recent public commits (events)
    if (emails.length === 0) {
        try {
            const eventsText = await fetchWithTimeout(`https://api.github.com/users/${githubPath}/events/public?per_page=30`, 5000);
            if (eventsText) {
                const events = JSON.parse(eventsText);
                const commitEmails = new Set<string>();
                for (const event of events) {
                    if (event.type === 'PushEvent' && event.payload?.commits) {
                        for (const commit of event.payload.commits) {
                            if (commit.author?.email) {
                                const e = commit.author.email.toLowerCase();
                                if (e.includes('@') && !e.includes('noreply') && !e.includes('users.noreply.github.com')) {
                                    commitEmails.add(e);
                                }
                            }
                        }
                    }
                }
                for (const email of commitEmails) {
                    const domainMatch = email.endsWith(`@${domain}`);
                    emails.push({ email, source: 'github', score: scoreEmail(email, 'github', domainMatch) });
                }
            }
        } catch { /* skip */ }
    }

    // Try 3: Get org members' emails
    if (emails.length === 0) {
        try {
            const membersText = await fetchWithTimeout(`https://api.github.com/orgs/${githubPath}/members?per_page=5`, 5000);
            if (membersText) {
                const members = JSON.parse(membersText);
                for (const member of members.slice(0, 3)) {
                    const profileText = await fetchWithTimeout(`https://api.github.com/users/${member.login}`, 4000);
                    if (profileText) {
                        const profile = JSON.parse(profileText);
                        if (profile.email) {
                            const email = profile.email.toLowerCase();
                            const domainMatch = email.endsWith(`@${domain}`);
                            emails.push({ email, source: 'github', score: scoreEmail(email, 'github', domainMatch) });
                        }
                    }
                }
            }
        } catch { /* skip */ }
    }

    return { emails, socialLinks };
}

// ── Strategy D: DNS SOA record ───────────────────────────────────────
async function strategyDnsSoa(domain: string): Promise<EmailResult[]> {
    const results: EmailResult[] = [];

    try {
        // Use Cloudflare DoH for DNS lookup
        const dohRes = await fetchWithTimeout(
            `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=SOA`,
            4000,
        );
        if (dohRes) {
            // Try parsing as JSON (DoH JSON format)
            // Cloudflare returns JSON when Accept: application/dns-json
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 4000);
            const res = await fetch(
                `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=SOA`,
                {
                    headers: { 'Accept': 'application/dns-json' },
                    signal: controller.signal,
                },
            );
            clearTimeout(timer);
            if (res.ok) {
                const data = await res.json();
                for (const answer of data.Answer || []) {
                    if (answer.type === 6 && answer.data) {
                        // SOA data: "ns1.example.com. admin.example.com. serial refresh retry expire minimum"
                        const parts = answer.data.split(/\s+/);
                        if (parts.length >= 2) {
                            // rname: admin.example.com. → admin@example.com
                            const rname = parts[1].replace(/\.$/, '');
                            const email = rname.replace(/\./, '@'); // first dot becomes @
                            if (email.includes('@') && !IGNORE_PATTERNS.some(p => p.test(email))) {
                                results.push({ email: email.toLowerCase(), source: 'dns-soa', score: scoreEmail(email.toLowerCase(), 'dns-soa', true) });
                            }
                        }
                    }
                }
            }
        }
    } catch { /* skip */ }

    return results;
}

// ── Strategy E: removed ──────────────────────────────────────────────

// ── Strategy F: Sitemap crawl ────────────────────────────────────────
async function strategySitemap(baseUrl: string, domain: string): Promise<EmailResult[]> {
    const results: EmailResult[] = [];

    const sitemapText = await fetchWithTimeout(new URL('/sitemap.xml', baseUrl).toString(), 5000);
    if (!sitemapText) return results;

    // Extract URLs that look like contact/about pages
    const contactPatterns = /contact|about|team|impressum|imprint|kontakt|company|who-we-are/i;
    const urls: string[] = [];
    for (const m of sitemapText.matchAll(/<loc>([^<]+)<\/loc>/gi)) {
        if (contactPatterns.test(m[1])) urls.push(m[1]);
    }

    // Fetch up to 5 pages from sitemap
    await Promise.all(urls.slice(0, 5).map(async (pageUrl) => {
        const html = await fetchWithTimeout(pageUrl);
        if (!html) return;
        for (const email of extractEmails(html)) {
            const domainMatch = email.endsWith(`@${domain}`);
            results.push({ email, source: `sitemap:${new URL(pageUrl).pathname}`, score: scoreEmail(email, 'sitemap', domainMatch) });
        }
    }));

    return results;
}

// ── Strategy G: Google search ────────────────────────────────────────
async function strategyGoogleSearch(domain: string): Promise<EmailResult[]> {
    const results: EmailResult[] = [];

    // Use Google Custom Search or plain search
    const query = encodeURIComponent(`"${domain}" email contact`);
    try {
        const html = await fetchWithTimeout(`https://www.google.com/search?q=${query}&num=5`, 5000);
        if (!html) return results;

        for (const email of extractEmails(html)) {
            const domainMatch = email.endsWith(`@${domain}`) || email.includes(domain.split('.')[0]);
            if (domainMatch) {
                results.push({ email, source: 'google', score: scoreEmail(email, 'google', domainMatch) });
            }
        }
    } catch { /* skip */ }

    return results;
}

// ── Strategy H: WHOIS via RDAP ───────────────────────────────────────
async function strategyWhois(domain: string): Promise<EmailResult[]> {
    const results: EmailResult[] = [];

    try {
        // Use RDAP (successor to WHOIS) — public, no auth needed
        const rdapText = await fetchWithTimeout(`https://rdap.org/domain/${domain}`, 5000);
        if (!rdapText) return results;

        const rdap = JSON.parse(rdapText);

        // Extract emails from vCard entities
        const extractVcardEmails = (entities: unknown[]) => {
            if (!Array.isArray(entities)) return;
            for (const entity of entities) {
                const ent = entity as Record<string, unknown>;
                if (ent.vcardArray) {
                    const vcardArray = ent.vcardArray as unknown[];
                    const vcard = (vcardArray[1] as unknown[]) || [];
                    for (const field of vcard) {
                        const f = field as unknown[];
                        if (f[0] === 'email' && typeof f[3] === 'string') {
                            const email = f[3].toLowerCase();
                            if (!IGNORE_PATTERNS.some(p => p.test(email))) {
                                results.push({ email, source: 'whois', score: scoreEmail(email, 'whois', email.endsWith(`@${domain}`)) });
                            }
                        }
                    }
                }
                // Recurse into nested entities
                if (ent.entities) extractVcardEmails(ent.entities as unknown[]);
            }
        };

        const rdapObj = rdap as Record<string, unknown>;
        if (rdapObj.entities) extractVcardEmails(rdapObj.entities as unknown[]);
    } catch { /* skip */ }

    return results;
}


// ── Main handler ─────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    const csrfError = checkCsrf(req);
    if (csrfError) return csrfError;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.email !== OWNER_EMAIL) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Rate limit: 5 email scrapes per minute
    const rlScrape = await checkRateLimit(`outreach-scrape:${user.id}`, 5, 60);
    if (!rlScrape.allowed) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { url } = await req.json();
    if (!url) {
        return NextResponse.json({ error: 'Missing URL' }, { status: 400 });
    }

    const domain = getDomain(url);
    if (!domain) {
        return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    // Run all strategies in parallel — each has its own timeout, collect whatever finishes
    let allResults: EmailResult[] = [];
    let socialLinks: Record<string, string> = {};

    // Use Promise.allSettled so no single failure kills the whole batch
    const [htmlResult, securityResult, githubResult, dnsResult, sitemapResult, googleResult, whoisResult] = await Promise.allSettled([
        strategyHtmlScraping(url, domain),
        strategySecurityTxt(url, domain),
        strategyGitHub(url, domain),
        strategyDnsSoa(domain),
        strategySitemap(url, domain),
        strategyGoogleSearch(domain),
        strategyWhois(domain),
    ]);

    const collect = (r: PromiseSettledResult<EmailResult[]>) => r.status === 'fulfilled' ? r.value : [];
    allResults = [
        ...collect(htmlResult),
        ...collect(securityResult),
        ...(githubResult.status === 'fulfilled' ? githubResult.value.emails : []),
        ...collect(dnsResult),
        ...collect(sitemapResult),
        ...collect(googleResult),
        ...collect(whoisResult),
    ];

    if (githubResult.status === 'fulfilled' && githubResult.value.socialLinks) {
        socialLinks = { ...socialLinks, ...githubResult.value.socialLinks };
    }

    // Deduplicate: keep highest score per email
    const emailMap = new Map<string, EmailResult>();
    for (const r of allResults) {
        const existing = emailMap.get(r.email);
        if (!existing || r.score > existing.score) {
            emailMap.set(r.email, r);
        }
    }

    // Sort by score descending
    const found = Array.from(emailMap.values())
        .sort((a, b) => b.score - a.score);

    const results = found.map(({ email, source }) => ({ email, source }));

    // Extract social links from homepage HTML (might already have from strategy)
    if (!socialLinks.github) {
        const html = await fetchWithTimeout(url, 3000);
        if (html) {
            const links = extractSocialLinks(html);
            socialLinks = { ...socialLinks, ...links };
        }
    }

    return NextResponse.json({
        emails: results,
        socialLinks,
        strategies: {
            total: results.length,
            found: found.length,
        },
    });
}
