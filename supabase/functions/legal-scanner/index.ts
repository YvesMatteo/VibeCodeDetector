import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { validateTargetUrl, validateScannerAuth, getCorsHeaders } from "../_shared/security.ts";
import { callGemini } from "../_shared/gemini.ts";

const PROMPT = `You are a Legal Compliance Auditor for websites. Analyze the extracted page text below.

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

function jsonResponse(data: unknown, req: Request, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
}

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: getCorsHeaders(req) });
    }

    if (!validateScannerAuth(req)) {
        return jsonResponse({ error: "Unauthorized" }, req, 401);
    }

    try {
        const body = await req.json();
        const validation = validateTargetUrl(body.targetUrl);
        if (!validation.valid) {
            return jsonResponse({ error: validation.error }, req, 400);
        }
        const url = validation.url!;

        // ── Fetch page content ───────────────────────────────────
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15_000);
        let response: Response;
        try {
            response = await fetch(url, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (compatible; CheckVibeBot/1.0; +https://checkvibe.dev)",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "Accept-Language": "en-US,en;q=0.5",
                },
                signal: controller.signal,
                redirect: "follow",
            });
        } catch (fetchErr: any) {
            clearTimeout(timer);
            const msg = fetchErr.name === "AbortError"
                ? "Timed out fetching the target site (15s)"
                : `Could not reach the target site: ${fetchErr.message}`;
            return jsonResponse({
                scannerType: "legal",
                score: 50,
                findings: [{ title: "Site unreachable", severity: "low", description: msg }],
                scannedAt: new Date().toISOString(),
                url,
            }, req);
        }
        clearTimeout(timer);

        if (!response.ok) {
            return jsonResponse({
                scannerType: "legal",
                score: 50,
                findings: [{ title: "Site returned an error", severity: "low", description: `HTTP ${response.status} ${response.statusText}. Could not analyze legal compliance.` }],
                scannedAt: new Date().toISOString(),
                url,
            }, req);
        }

        const html = await response.text();
        const cleanText = html
            .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gm, "")
            .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gm, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .substring(0, 15_000); // 15k chars is plenty for legal analysis

        // ── Call Gemini (with retries + timeout) ─────────────────
        const result = await callGemini({
            prompt: PROMPT,
            content: `Analyze this site content:\n\n${cleanText}`,
        });

        if (!result.ok) {
            console.error("Legal scanner Gemini error:", result.error);
            // AI analysis failed — return degraded result with manual review recommendation
            return jsonResponse({
                scannerType: "legal",
                score: 50,
                findings: [{ title: "Legal analysis unavailable", description: "AI-powered legal analysis could not be completed. Manual review recommended.", severity: "medium" }],
                scannedAt: new Date().toISOString(),
                url,
            }, req);
        }

        const content = result.data;

        // Validate AI response structure
        const score = typeof content.score === "number" && content.score >= 0 && content.score <= 100
            ? content.score
            : 100;
        const findings = Array.isArray(content.findings) ? content.findings : [];

        return jsonResponse({
            scannerType: "legal",
            score,
            findings,
            scannedAt: new Date().toISOString(),
            url,
        }, req);

    } catch (error: any) {
        console.error("Legal scanner error:", error);
        // Internal errors — return degraded result with manual review recommendation
        return jsonResponse({
            scannerType: "legal",
            score: 50,
            findings: [{ title: "Legal analysis unavailable", description: "AI-powered legal analysis could not be completed. Manual review recommended.", severity: "medium" }],
            scannedAt: new Date().toISOString(),
        }, req);
    }
});
