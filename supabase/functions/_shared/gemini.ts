/**
 * Shared Gemini API client with retry logic, timeouts, and thinking disabled.
 * Used by legal-scanner and any future Gemini-based scanners.
 */

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const MODEL = "gemini-2.5-flash";
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_TIMEOUT_MS = 25_000;
const MAX_RETRIES = 2;
const RETRY_DELAYS_MS = [1_000, 2_500];

interface GeminiOptions {
    /** System prompt / instruction */
    prompt: string;
    /** User content to analyze */
    content: string;
    /** Timeout in ms (default: 25000) */
    timeoutMs?: number;
    /** Max retries on transient errors (default: 2) */
    maxRetries?: number;
}

interface GeminiResult {
    ok: true;
    data: any;
    raw: string;
}

interface GeminiError {
    ok: false;
    error: string;
    retryable: boolean;
}

type GeminiResponse = GeminiResult | GeminiError;

/**
 * Call Gemini API with structured JSON output, retries, and timeouts.
 * Thinking is disabled (thinkingBudget: 0) for speed and lower token usage.
 */
export async function callGemini(opts: GeminiOptions): Promise<GeminiResponse> {
    if (!GEMINI_API_KEY) {
        return { ok: false, error: "Missing GEMINI_API_KEY", retryable: false };
    }

    const timeout = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const maxRetries = opts.maxRetries ?? MAX_RETRIES;

    const url = `${BASE_URL}/${MODEL}:generateContent`;
    const body = JSON.stringify({
        contents: [{
            parts: [{ text: `${opts.prompt}\n\n${opts.content}` }],
        }],
        generationConfig: {
            responseMimeType: "application/json",
            thinkingConfig: { thinkingBudget: 0 },
        },
    });

    let lastError = "";

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        if (attempt > 0) {
            const delay = RETRY_DELAYS_MS[attempt - 1] ?? 2_500;
            await new Promise(r => setTimeout(r, delay));
        }

        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), timeout);

            const res = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-goog-api-key": GEMINI_API_KEY,
                },
                body,
                signal: controller.signal,
            });

            clearTimeout(timer);

            // Retryable HTTP errors
            if (res.status === 429 || res.status >= 500) {
                lastError = `Gemini API returned ${res.status}`;
                const errBody = await res.text().catch(() => "");
                console.error(`Gemini attempt ${attempt + 1}/${maxRetries + 1}: ${res.status}`, errBody.substring(0, 200));
                continue; // retry
            }

            if (!res.ok) {
                const errBody = await res.text().catch(() => "");
                return { ok: false, error: `Gemini API ${res.status}: ${errBody.substring(0, 200)}`, retryable: false };
            }

            const aiRes = await res.json();

            if (aiRes.error) {
                return { ok: false, error: aiRes.error.message, retryable: false };
            }

            // Handle safety blocks or empty responses
            const candidate = aiRes.candidates?.[0];
            if (!candidate || candidate.finishReason === "SAFETY") {
                return { ok: false, error: "AI safety filters blocked analysis", retryable: false };
            }

            const rawText = candidate.content?.parts?.[0]?.text;
            if (!rawText) {
                lastError = "Empty response from Gemini";
                continue; // retry on empty
            }

            // Parse JSON — handle markdown code blocks too
            let parsed: any;
            try {
                parsed = JSON.parse(rawText);
            } catch {
                const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
                if (jsonMatch) {
                    try {
                        parsed = JSON.parse(jsonMatch[1].trim());
                    } catch {
                        lastError = "Failed to parse Gemini JSON (code block)";
                        continue; // retry
                    }
                } else {
                    lastError = "Failed to parse Gemini response as JSON";
                    continue; // retry
                }
            }

            return { ok: true, data: parsed, raw: rawText };

        } catch (err: any) {
            if (err.name === "AbortError") {
                lastError = `Gemini request timed out (${timeout}ms)`;
                console.error(`Gemini attempt ${attempt + 1}/${maxRetries + 1}: timeout`);
                continue; // retry on timeout
            }
            lastError = err.message || "Unknown fetch error";
            continue; // retry on network errors
        }
    }

    return { ok: false, error: lastError, retryable: true };
}
