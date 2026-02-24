import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const OWNER_EMAIL = 'vibecodedetector@gmail.com';
const MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'];

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
2. One sentence complimenting their product — be specific about what they do based on the URL, make it genuine
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
- Use • for bullet points, not - or *`;

    // Try each model with fallback
    let lastError = '';
    for (const modelName of MODELS) {
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
            console.error(`Gemini ${modelName} error:`, lastError);
            // Try next model
            continue;
        }
    }

    return NextResponse.json(
        { error: `All Gemini models failed. Last error: ${lastError}` },
        { status: 500 },
    );
}
