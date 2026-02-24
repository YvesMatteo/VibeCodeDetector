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

    const prompt = `You are writing a cold outreach email for CheckVibe (checkvibe.dev), a security scanning platform for vibe-coded startups.

I scanned this website: ${projectUrl}
I found ${issueCount} security issues:
- Critical: ${severityBreakdown.critical}
- High: ${severityBreakdown.high}
- Medium: ${severityBreakdown.medium}
- Low: ${severityBreakdown.low}

Here are the actual findings:
${findingsSummary}

Write a concise, friendly, non-threatening cold email to the founder/developer of this website. The email should:
1. Open with a compliment about their product (reference the URL)
2. Mention that you ran a free security scan and found ${issueCount} issues, including ${severityBreakdown.critical} critical and ${severityBreakdown.high} high severity ones
3. Give 2-3 specific examples of the most important findings (use plain language, not technical jargon)
4. Mention that these are just the surface-level checks — connecting their backend (Supabase, Firebase, Convex) and GitHub repository would reveal much deeper vulnerabilities like leaked secrets, insecure database rules, dependency CVEs, and more
5. Include a soft CTA to check out their free report at checkvibe.dev or reply to discuss
6. End the email with exactly this sign-off (on its own lines):

Kind regards,
Yves Romano
Founder of checkvibe.dev

7. Keep it under 200 words
8. Tone: helpful, not salesy. Like a fellow developer looking out for them.
9. DO NOT use subject line prefix. Just write the subject on the first line, then a blank line, then the body.

Format:
Subject line on line 1
(blank line)
Email body`;

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
