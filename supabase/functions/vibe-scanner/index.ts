import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: CORS_HEADERS });
    }

    try {
        const { targetUrl } = await req.json();

        if (!targetUrl) {
            throw new Error("targetUrl is required");
        }

        if (!GEMINI_API_KEY) {
            console.error("Missing GEMINI_API_KEY");
            return new Response(JSON.stringify({
                error: "Server configuration error: Missing AI credentials",
                score: 0
            }), {
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
                status: 500
            });
        }

        // Fetch page content
        const response = await fetch(targetUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch target URL: ${response.statusText}`);
        }
        const html = await response.text();

        // Truncate HTML to avoid token limits (focus on structure, head, and body start)
        const truncatedHtml = html.substring(0, 30000); // Gemini has larger context window

        const prompt = `You are an expert at detecting "vibe-coded" websites - sites built rapidly using AI agents (like V0, Cursor, Lovable) or templates. 
    Analyze this HTML for:
    1. "shadcn/ui" or "tailwind" class abuse typical of AI.
    2. Generic "Lorem Ipsum" or placeholder text.
    3. Comments like "v0-generated" or "cursor-agent".
    4. Generic/stock structure.
    
    Return ONLY valid JSON: { "score": number (0-100, where 100 is definitely AI generated), "reasoning": string[] }`;

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

        const completion = await fetch(geminiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
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

        return new Response(JSON.stringify({
            scannerType: 'vibe-match',
            score: content.score,
            findings: content.reasoning.map((r: string, i: number) => ({
                id: `vibe-${i}`,
                severity: content.score > 70 ? 'high' : 'medium',
                title: 'AI Generation Indicator',
                description: r,
                recommendation: 'Ensure human review of generated code/design.'
            })),
            scannedAt: new Date().toISOString(),
            url: targetUrl
        }), {
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return new Response(JSON.stringify({
            scannerType: 'vibe-match',
            error: errorMessage,
            score: 0,
            findings: []
        }), {
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
            status: 500
        });
    }
});
