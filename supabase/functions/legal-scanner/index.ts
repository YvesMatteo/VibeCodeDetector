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
            .substring(0, 30000); // Gemini has larger context

        const prompt = `You are a Legal Compliance Auditor for websites.
    Analyze the webpage text for:
    1. Absolute/risky claims (e.g., "100% secure", "Best in the world", "Guaranteed returns").
    2. Missing legal pages mentioned (Privacy Policy, Terms).
    3. Regulatory non-compliance hints (e.g. collecting data without consent mentions).

    Return ONLY valid JSON: {
        "score": number (0-100, where 100 is perfectly compliant/safe),
        "findings": [ { "title": string, "severity": "high"|"medium"|"low", "description": string } ]
    }`;

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

        const completion = await fetch(geminiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
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
