import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

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

        if (!OPENAI_API_KEY) {
            console.error("Missing OPENAI_API_KEY");
            // Fallback or error? For now return a mock/error indicating config missing
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
        // Taking first 15000 chars is usually enough to catch framework classes and meta tags
        const truncatedHtml = html.substring(0, 15000);

        const completion = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    {
                        role: "system",
                        content: `You are an expert at detecting "vibe-coded" websites - sites built rapidly using AI agents (like V0, Cursor, Lovable) or templates. 
                    Analyze the HTML for:
                    1. "shadcn/ui" or "tailwind" class abuse typical of AI.
                    2. Generic "Lorem Ipsum" or placeholder text.
                    3. Comments like "v0-generated" or "cursor-agent".
                    4. Generic/stock structure.
                    
                    Return JSON: { "score": number (0-100, where 100 is definitely AI generated), "reasoning": string[] }`
                    },
                    {
                        role: "user",
                        content: `Analyze this HTML:\n\n${truncatedHtml}`
                    }
                ],
                response_format: { type: "json_object" }
            })
        });

        const aiRes = await completion.json();

        if (aiRes.error) {
            throw new Error(aiRes.error.message);
        }

        const content = JSON.parse(aiRes.choices[0].message.content);

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
