/**
 * CheckVibe Threat Detection Snippet
 * Embeddable client-side script that detects common web attacks
 * and reports them to the CheckVibe API.
 *
 * Usage:
 * <script src="https://checkvibe.dev/sdk/cv-threat.min.js"
 *         data-token="cvt_<project_id>_<random>" async defer></script>
 */

(function () {
    "use strict";

    // ---------------------------------------------------------------------------
    // Config
    // ---------------------------------------------------------------------------

    const INGEST_URL = "https://vlffoepzknlbyxhkmwmn.supabase.co/functions/v1/threat-ingest";
    const BATCH_INTERVAL_MS = 5000;
    const MAX_QUEUE_SIZE = 200;
    const MAX_BATCH_SIZE = 50;

    // Find our script tag and read the token
    const scripts = document.querySelectorAll("script[data-token]");
    let TOKEN = "";
    for (let i = 0; i < scripts.length; i++) {
        const t = (scripts[i] as HTMLScriptElement).getAttribute("data-token");
        if (t && t.startsWith("cvt_")) {
            TOKEN = t;
            break;
        }
    }
    if (!TOKEN) return; // No valid token found, silently exit

    // ---------------------------------------------------------------------------
    // Event queue
    // ---------------------------------------------------------------------------

    interface ThreatEvent {
        type: string;
        severity: string;
        path: string;
        payload?: string;
        metadata?: Record<string, unknown>;
        timestamp: string;
    }

    const queue: ThreatEvent[] = [];

    function enqueue(evt: Omit<ThreatEvent, "path" | "timestamp">) {
        if (queue.length >= MAX_QUEUE_SIZE) return;
        queue.push({
            ...evt,
            path: location.pathname + location.search,
            timestamp: new Date().toISOString(),
        });
    }

    function flush() {
        if (queue.length === 0) return;
        const batch = queue.splice(0, MAX_BATCH_SIZE);
        const payload = JSON.stringify({ token: TOKEN, events: batch });

        // Prefer sendBeacon for reliability during page unload
        if (navigator.sendBeacon) {
            const blob = new Blob([payload], { type: "application/json" });
            navigator.sendBeacon(INGEST_URL, blob);
        } else {
            // Fallback to fetch fire-and-forget
            try {
                fetch(INGEST_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: payload,
                    keepalive: true,
                }).catch(() => {});
            } catch (_) {}
        }
    }

    // Periodic flush
    setInterval(flush, BATCH_INTERVAL_MS);

    // Flush on page unload
    if (typeof document !== "undefined") {
        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "hidden") flush();
        });
        window.addEventListener("pagehide", flush);
    }

    // ---------------------------------------------------------------------------
    // Detection: XSS
    // ---------------------------------------------------------------------------

    const XSS_PATTERNS = [
        /<script[\s>]/i,
        /javascript\s*:/i,
        /on(error|load|click|mouseover|focus|blur)\s*=/i,
        /<iframe[\s>]/i,
        /<img[^>]+onerror/i,
        /document\.(cookie|write|location)/i,
        /eval\s*\(/i,
        /\balert\s*\(/i,
        /\bString\.fromCharCode/i,
        /&#x?[0-9a-f]+;/i,
    ];

    function checkXss(value: string): boolean {
        return XSS_PATTERNS.some((p) => p.test(value));
    }

    // Check URL parameters and hash
    function scanUrlForXss() {
        const params = new URLSearchParams(location.search);
        params.forEach((val, key) => {
            if (checkXss(val)) {
                enqueue({
                    type: "xss",
                    severity: "critical",
                    payload: `param[${key}]=${val.slice(0, 200)}`,
                });
            }
        });

        if (location.hash && checkXss(decodeURIComponent(location.hash))) {
            enqueue({
                type: "xss",
                severity: "high",
                payload: `hash=${location.hash.slice(0, 200)}`,
            });
        }
    }

    // ---------------------------------------------------------------------------
    // Detection: SQL Injection
    // ---------------------------------------------------------------------------

    const SQLI_PATTERNS = [
        /UNION\s+(ALL\s+)?SELECT/i,
        /OR\s+1\s*=\s*1/i,
        /['"];?\s*DROP\s/i,
        /SLEEP\s*\(/i,
        /BENCHMARK\s*\(/i,
        /WAITFOR\s+DELAY/i,
        /;\s*SELECT\s/i,
        /--\s*$/,
        /\/\*.*\*\//,
        /'\s+OR\s+'/i,
    ];

    function checkSqli(value: string): boolean {
        return SQLI_PATTERNS.some((p) => p.test(value));
    }

    function scanUrlForSqli() {
        const params = new URLSearchParams(location.search);
        params.forEach((val, key) => {
            if (checkSqli(val)) {
                enqueue({
                    type: "sqli",
                    severity: "critical",
                    payload: `param[${key}]=${val.slice(0, 200)}`,
                });
            }
        });
    }

    // ---------------------------------------------------------------------------
    // Detection: Path Traversal
    // ---------------------------------------------------------------------------

    const PATH_TRAVERSAL_PATTERNS = [
        /\.\.\//,
        /\.\.%2[fF]/,
        /\/etc\/passwd/i,
        /\/etc\/shadow/i,
        /\/proc\/self/i,
        /\/windows\/system32/i,
    ];

    function scanUrlForPathTraversal() {
        const fullUrl = location.href;
        for (const p of PATH_TRAVERSAL_PATTERNS) {
            if (p.test(fullUrl)) {
                enqueue({
                    type: "path_traversal",
                    severity: "high",
                    payload: fullUrl.slice(0, 300),
                });
                return; // One event per page load
            }
        }
    }

    // ---------------------------------------------------------------------------
    // Detection: Bot / Headless browser
    // ---------------------------------------------------------------------------

    function scanForBots() {
        const signals: string[] = [];

        if ((navigator as any).webdriver) signals.push("webdriver=true");
        if (!(window as any).chrome && /Chrome/.test(navigator.userAgent)) signals.push("phantom_chrome");
        if ((window as any)._phantom || (window as any).__nightmare) signals.push("phantom_nightmare");
        if (!navigator.languages || navigator.languages.length === 0) signals.push("no_languages");

        if (signals.length >= 2) {
            enqueue({
                type: "bot",
                severity: "medium",
                payload: signals.join(", "),
                metadata: { userAgent: navigator.userAgent },
            });
        }
    }

    // ---------------------------------------------------------------------------
    // Detection: Brute Force (login form submissions)
    // ---------------------------------------------------------------------------

    const loginSubmissions: number[] = [];
    const BRUTE_FORCE_THRESHOLD = 5;
    const BRUTE_FORCE_WINDOW_MS = 60000;

    function monitorForms() {
        document.addEventListener("submit", (e) => {
            const form = e.target as HTMLFormElement;
            if (!form || !form.querySelector) return;

            // Only track forms with password fields (login/signup)
            const hasPassword = form.querySelector('input[type="password"]');
            if (!hasPassword) return;

            const now = Date.now();
            loginSubmissions.push(now);

            // Remove submissions outside the window
            while (loginSubmissions.length > 0 && loginSubmissions[0] < now - BRUTE_FORCE_WINDOW_MS) {
                loginSubmissions.shift();
            }

            if (loginSubmissions.length > BRUTE_FORCE_THRESHOLD) {
                enqueue({
                    type: "brute_force",
                    severity: "high",
                    payload: `${loginSubmissions.length} login attempts in 60s`,
                    metadata: { action: form.action?.slice(0, 200) },
                });
            }

            // Also check form inputs for XSS/SQLi
            const inputs = form.querySelectorAll("input:not([type=password]):not([type=hidden])");
            inputs.forEach((el) => {
                const val = (el as HTMLInputElement).value;
                if (val && checkXss(val)) {
                    enqueue({
                        type: "xss",
                        severity: "critical",
                        payload: `form_input=${val.slice(0, 200)}`,
                    });
                }
                if (val && checkSqli(val)) {
                    enqueue({
                        type: "sqli",
                        severity: "critical",
                        payload: `form_input=${val.slice(0, 200)}`,
                    });
                }
            });
        }, true);
    }

    // ---------------------------------------------------------------------------
    // Detection: CSRF (cross-origin form submissions)
    // ---------------------------------------------------------------------------

    function monitorCsrf() {
        document.addEventListener("submit", (e) => {
            const form = e.target as HTMLFormElement;
            if (!form || !form.action) return;

            try {
                const formOrigin = new URL(form.action).origin;
                if (formOrigin !== location.origin) {
                    // Check if form has a CSRF token field
                    const hasCsrfToken = form.querySelector(
                        'input[name*="csrf"], input[name*="token"], input[name*="_token"], input[name*="authenticity"]'
                    );
                    if (!hasCsrfToken) {
                        enqueue({
                            type: "csrf",
                            severity: "high",
                            payload: `cross-origin form submit to ${formOrigin}`,
                        });
                    }
                }
            } catch (_) {}
        }, true);
    }

    // ---------------------------------------------------------------------------
    // Initialize
    // ---------------------------------------------------------------------------

    try {
        scanUrlForXss();
        scanUrlForSqli();
        scanUrlForPathTraversal();
        scanForBots();
        monitorForms();
        monitorCsrf();
    } catch (_) {
        // Never break the host page
    }
})();
