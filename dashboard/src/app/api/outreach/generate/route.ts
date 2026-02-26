import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const OWNER_EMAIL = 'vibecodedetector@gmail.com';
const MODELS = ['gemini-2.0-flash'];
const MAX_RETRIES = 1; // Keep low — Vercel Hobby has 60s function timeout

function parseRetryDelay(errMsg: string): number {
    const match = errMsg.match(/retry in ([\d.]+)s/i);
    const delay = match ? Math.ceil(parseFloat(match[1])) * 1000 : 35000;
    return Math.min(delay, 40000); // Cap at 40s to stay within Vercel's 60s timeout
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/** Fetch homepage and extract title + meta description + h1 for company context */
async function scrapeCompanyContext(url: string): Promise<string> {
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,*/*',
            },
            signal: controller.signal,
            redirect: 'follow',
        });
        clearTimeout(timer);
        if (!res.ok) return '';
        const html = (await res.text()).slice(0, 200_000);

        const parts: string[] = [];

        // Title
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch) parts.push(`Page title: "${titleMatch[1].trim()}"`);

        // Meta description
        const descMatch = html.match(/<meta[^>]*name\s*=\s*["']description["'][^>]*content\s*=\s*["']([^"']+)["']/i)
            || html.match(/<meta[^>]*content\s*=\s*["']([^"']+)["'][^>]*name\s*=\s*["']description["']/i);
        if (descMatch) parts.push(`Description: "${descMatch[1].trim()}"`);

        // OG description (fallback)
        if (!descMatch) {
            const ogMatch = html.match(/<meta[^>]*property\s*=\s*["']og:description["'][^>]*content\s*=\s*["']([^"']+)["']/i)
                || html.match(/<meta[^>]*content\s*=\s*["']([^"']+)["'][^>]*property\s*=\s*["']og:description["']/i);
            if (ogMatch) parts.push(`Description: "${ogMatch[1].trim()}"`);
        }

        // First h1
        const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
        if (h1Match) parts.push(`Main heading: "${h1Match[1].trim()}"`);

        return parts.join('\n');
    } catch {
        return '';
    }
}

export async function POST(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user || user.email !== OWNER_EMAIL) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { scanResults, projectUrl, issueCount, severityBreakdown } = await req.json();

    if (!scanResults || !projectUrl) {
        return NextResponse.json({ error: 'Missing scan data' }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // Fetch company context from homepage (title, description, h1)
    const companyContext = await scrapeCompanyContext(projectUrl);

    // Build a summary of findings for the prompt
    const findingsSummary = Object.entries(scanResults as Record<string, any>)
        .filter(([, v]) => v && !v.skipped && Array.isArray(v.findings) && v.findings.length > 0)
        .map(([scanner, result]) => {
            const findings = (result as any).findings
                .filter((f: any) => f.severity?.toLowerCase() !== 'info')
                .map((f: any) => `  - [${f.severity?.toUpperCase()}] ${f.title}`);
            return findings.length > 0 ? `${scanner}:\n${findings.join('\n')}` : null;
        })
        .filter(Boolean)
        .join('\n\n');

    // Extract the domain name from the URL for the subject line
    let domain = projectUrl;
    try { domain = new URL(projectUrl).hostname.replace(/^www\./, ''); } catch {}

    // Build dynamic severity summary — only mention non-zero counts
    const sevParts: string[] = [];
    if (severityBreakdown.critical > 0) sevParts.push(`${severityBreakdown.critical} critical`);
    if (severityBreakdown.high > 0) sevParts.push(`${severityBreakdown.high} high-severity`);
    if (severityBreakdown.medium > 0) sevParts.push(`${severityBreakdown.medium} medium`);
    if (severityBreakdown.low > 0) sevParts.push(`${severityBreakdown.low} low`);
    const topSeverity = sevParts[0] || `${issueCount}`; // e.g. "3 high-severity"
    const severitySummary = sevParts.slice(0, 2).join(' and '); // e.g. "3 high-severity and 5 medium"

    const prompt = `You are writing a cold outreach email for CheckVibe (checkvibe.dev), a security scanner for modern web apps.

I scanned this website: ${projectUrl}
${companyContext ? `\nHere is what their website says about themselves:\n${companyContext}\n` : ''}
I found ${issueCount} security issues:
${severityBreakdown.critical > 0 ? `- Critical: ${severityBreakdown.critical}` : ''}
${severityBreakdown.high > 0 ? `- High: ${severityBreakdown.high}` : ''}
${severityBreakdown.medium > 0 ? `- Medium: ${severityBreakdown.medium}` : ''}
${severityBreakdown.low > 0 ? `- Low: ${severityBreakdown.low}` : ''}

Here are the actual findings:
${findingsSummary}

Write an email following this EXACT structure and tone. Match this style closely:

SUBJECT LINE FORMAT: "Found ${topSeverity} vulnerabilities on ${domain} — full report inside"

BODY STRUCTURE:
1. "Hi there," (greeting)
2. One sentence complimenting their product — use the website info above (title, description, heading) to understand what they actually do, and compliment something specific about their product. Do NOT guess or make things up — only reference what the website says.
3. "I'm building a security scanner for modern web apps (checkvibe.dev), and I ran a free scan on your site to test it. Thought you'd want to see what came up — ${issueCount} issues total, including ${severitySummary} findings."
4. "A few that stood out:" followed by exactly 3 bullet points (use •) picking the MOST impactful findings. Explain each in plain language showing the real-world risk (e.g. "could let an attacker access or wipe your database", "leaving it open to brute-force attacks", "meaning anyone could spoof emails from your domain"). Do NOT use technical jargon.
5. "These are just from a surface-level URL scan. Connecting your GitHub repo or backend (Supabase, Firebase, etc.) would uncover deeper issues like leaked secrets, insecure database rules, and dependency vulnerabilities."
6. "Happy to share the full report — no strings attached. Just reply and I'll send it over."
7. Sign off with exactly:

Best,
Yves Romano
Founder, checkvibe.dev

RULES:
- Keep it under 200 words
- Tone: developer-to-developer, helpful, NOT salesy
- NEVER mention "0 critical" or any severity with 0 count. Only mention severities that have issues.
- DO NOT include "Subject:" prefix on the subject line
- Subject line on line 1, blank line, then the body
- Use • for bullet points, not - or *
- Do NOT add any unsubscribe text or footer — that is handled separately
- The subject line must feel personal, not like a mass campaign. Avoid ALL CAPS words and exclamation marks.`;

    // Try each model with fallback + retry on 429
    let lastError = '';
    for (const modelName of MODELS) {
        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent(prompt);
                const emailText = result.response.text();

                // Parse subject and body
                const lines = emailText.trim().split('\n');
                const subject = lines[0].replace(/^Subject:\s*/i, '').trim();
                const bodyStart = lines.findIndex((l, i) => i > 0 && l.trim() !== '');
                const body = lines.slice(bodyStart).join('\n').trim();

                return NextResponse.json({ subject, body, raw: emailText, model: modelName });
            } catch (err: any) {
                lastError = err?.message || String(err);
                const is429 = lastError.includes('429') || lastError.includes('quota') || lastError.includes('Too Many Requests');

                if (is429 && attempt < MAX_RETRIES) {
                    const delay = parseRetryDelay(lastError);
                    console.log(`Gemini ${modelName} rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
                    await sleep(delay);
                    continue;
                }

                console.error(`Gemini ${modelName} error (attempt ${attempt}):`, lastError);
                break; // move to next model
            }
        }
    }

    return NextResponse.json(
        { error: `All Gemini models failed. Last error: ${lastError}` },
        { status: 500 },
    );
}
