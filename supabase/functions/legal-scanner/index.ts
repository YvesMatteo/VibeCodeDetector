import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { validateTargetUrl, validateScannerAuth, getCorsHeaders } from "../_shared/security.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: getCorsHeaders(req) });
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
        const url = validation.url!;

        if (!GEMINI_API_KEY) {
            return new Response(JSON.stringify({
                error: "Server configuration error: Missing AI credentials",
                score: 0
            }), {
                headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
                status: 500
            });
        }

        // Fetch page content
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch target URL: ${response.statusText}`);
        }
        const html = await response.text();
        // Use a regex to strip script/style tags for cleaner text analysis
        const cleanText = html.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gm, "")
            .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gm, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .substring(0, 30000); // Gemini has larger context

        const prompt = `You are a Legal Compliance Auditor for websites. Analyze the extracted page text below.

IMPORTANT SCORING GUIDELINES:
- Start at 100 and only deduct for CLEAR, CONCRETE issues you can point to in the text.
- A site with standard marketing language ("best", "leading", "#1") is NORMAL — do NOT flag common marketing superlatives unless they make specific, verifiable, misleading claims (e.g., "FDA approved" without evidence, "guaranteed 10x returns").
- Legal page links (Privacy Policy, Terms of Service) are typically in the footer. If the page text mentions "Privacy", "Terms", "Legal", or similar words anywhere, assume the site likely has legal pages and do NOT deduct for "missing legal pages".
- Only flag missing legal pages if the site appears to collect user data (has forms, sign-ups, cookies mentions) but has ZERO references to privacy or terms anywhere in the text.
- Cookie consent banners and GDPR compliance are only required for sites targeting EU users — do not assume all sites need them.

WHAT TO CHECK:
1. Genuinely misleading claims — false promises, deceptive guarantees, unsubstantiated health/financial claims.
2. Clear regulatory red flags — collecting sensitive data with no privacy mention, financial services with no disclaimers.
3. Truly missing legal basics — a site with user accounts or payments but absolutely no reference to terms or privacy.

WHAT NOT TO FLAG:
- Standard marketing language and superlatives
- Well-known companies (they have legal teams)
- Pages that simply don't discuss legal topics (like a blog post or product page)

Return ONLY valid JSON: {
    "score": number (0-100, where 100 is no issues found),
    "findings": [ { "title": string, "severity": "high"|"medium"|"low", "description": string } ]
}
If no issues are found, return score 100 and an empty findings array.`;

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;

        const completion = await fetch(geminiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": GEMINI_API_KEY,
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `${prompt}\n\nAnalyze this site content:\n\n${cleanText}`
                    }]
                }],
                generationConfig: {
                    responseMimeType: "application/json"
                }
            })
        });

        const aiRes = await completion.json();

        if (aiRes.error) {
            throw new Error(aiRes.error.message);
        }

        const rawText = aiRes.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) throw new Error("Empty response from Gemini");

        const content = JSON.parse(rawText);

        // Validate AI response structure
        if (typeof content.score !== 'number' || content.score < 0 || content.score > 100) {
            content.score = 50; // Default to neutral on invalid response
        }
        if (!Array.isArray(content.findings)) {
            content.findings = content.findings || [];
        }

        return new Response(JSON.stringify({
            scannerType: 'legal-scanner',
            score: content.score,
            findings: content.findings,
            scannedAt: new Date().toISOString(),
            url
        }), {
            headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Scanner error:', error);
        return new Response(JSON.stringify({
            scannerType: 'legal-scanner',
            score: 0,
            error: 'Scan failed. Please try again.',
            findings: [],
            metadata: {}
        }), {
            headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
            status: 500
        });
    }
});
