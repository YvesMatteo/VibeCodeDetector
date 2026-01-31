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
        // Use a regex to strip script/style tags for cleaner text analysis
        const cleanText = html.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gm, "")
            .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gm, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .substring(0, 15000); // Truncate

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
                        content: `You are a Legal Compliance Auditor for websites.
                    Analyze the webpage text for:
                    1. Absolute/risky claims (e.g., "100% secure", "Best in the world", "Guaranteed returns").
                    2. Missing legal pages mentioned (Privacy Policy, Terms).
                    3. Regulatory non-compliance hints (e.g. collecting data without consent mentions).

                    Return JSON: { 
                        "score": number (0-100, where 100 is perfectly compliant/safe), 
                        "findings": [ { "title": string, "severity": "high"|"medium"|"low", "description": string } ] 
                    }`
                    },
                    {
                        role: "user",
                        content: `Analyze this site content:\n\n${cleanText}`
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
            scannerType: 'legal-scanner',
            score: content.score,
            findings: content.findings,
            scannedAt: new Date().toISOString(),
            url: targetUrl
        }), {
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return new Response(JSON.stringify({
            scannerType: 'legal-scanner',
            error: errorMessage,
            score: 0,
            findings: []
        }), {
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
            status: 500
        });
    }
});
