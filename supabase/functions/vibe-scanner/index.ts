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
            console.error("Missing GEMINI_API_KEY");
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

        // Truncate HTML to avoid token limits (focus on structure, head, and body start)
        const truncatedHtml = html.substring(0, 30000); // Gemini has larger context window

        const prompt = `You are an expert at detecting "vibe-coded" websites — sites built rapidly using AI code generators (V0, Cursor, Lovable, Bolt) or low-code templates with minimal human refinement.

Look for STRONG indicators only:
1. AI generator comments or metadata (e.g. "v0-generated", "cursor-agent", "built with lovable").
2. Unmodified template boilerplate: placeholder text like "Lorem Ipsum", default hero sections with stock copy like "Welcome to our amazing platform".
3. Excessive repetitive utility class patterns with no custom CSS, suggesting pure AI output with zero human styling.
4. Multiple signs of a hastily generated site: broken links, placeholder images, generic "Contact Us" forms with no real backend.

Do NOT flag:
- Professional use of Tailwind CSS, shadcn/ui, or other popular frameworks — these are industry-standard tools used by human developers.
- Clean, well-structured HTML — good structure is a sign of quality, not AI generation.
- Modern design patterns (hero sections, feature grids, testimonials) — these are universal web design conventions.

Return ONLY valid JSON: { "score": number (0-100, where 0 is clearly human-crafted and 100 is definitely AI-generated with no human refinement), "reasoning": string[] }`;

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
                        text: `${prompt}\n\nAnalyze this HTML:\n\n${truncatedHtml}`
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
        if (!Array.isArray(content.reasoning)) {
            content.reasoning = content.reasoning || [];
        }

        // Gemini returns 0-100 where 100 = "definitely AI generated"
        // We invert so 100 = human-crafted (good), 0 = fully AI-generated (bad)
        const aiLikelihood = Math.max(0, Math.min(100, content.score || 0));
        const qualityScore = 100 - aiLikelihood;

        // Only report findings if AI likelihood is significant (>30%)
        const findings = aiLikelihood > 30
            ? content.reasoning.map((r: string, i: number) => ({
                id: `vibe-${i}`,
                severity: aiLikelihood > 80 ? 'high' : aiLikelihood > 50 ? 'medium' : 'low',
                title: 'AI Generation Indicator',
                description: r,
                recommendation: 'Consider adding custom branding, unique content, and human design touches.',
            }))
            : [];

        return new Response(JSON.stringify({
            scannerType: 'vibe_match',
            score: qualityScore,
            aiLikelihood,
            findings,
            scannedAt: new Date().toISOString(),
            url
        }), {
            headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Scanner error:', error);
        return new Response(JSON.stringify({
            scannerType: 'vibe_match',
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
