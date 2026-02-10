import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { validateTargetUrl, validateScannerAuth, getCorsHeaders } from "../_shared/security.ts";

/**
 * SQL Injection Scanner
 * Passively detects SQL injection vulnerabilities by:
 * 1. Checking for existing SQL error messages in page responses
 * 2. Extracting forms and URL parameters as injectable points
 * 3. Sending safe single-quote payloads to detect error-based SQLi
 * 4. Comparing response lengths for blind SQLi detection
 *
 * Safety rules:
 * - Only non-destructive read-only payloads (single quote, AND/OR boolean)
 * - Never attempts data extraction or modification
 * - 5-second timeout per probe request
 * - Max 10 injection points tested per scan
 * - Only injects into parameter values, never into URL paths
 */

// ---------------------------------------------------------------------------
// SQL error patterns grouped by database engine
// ---------------------------------------------------------------------------

const SQL_ERROR_PATTERNS: Array<{ pattern: RegExp; engine: string }> = [
    // MySQL
    { pattern: /You have an error in your SQL syntax/i, engine: 'MySQL' },
    { pattern: /mysql_fetch/i, engine: 'MySQL' },
    { pattern: /Warning:\s*mysql/i, engine: 'MySQL' },
    { pattern: /MySQLSyntaxErrorException/i, engine: 'MySQL' },
    { pattern: /com\.mysql\.jdbc/i, engine: 'MySQL' },
    { pattern: /MySQL server version for the right syntax/i, engine: 'MySQL' },

    // PostgreSQL
    { pattern: /ERROR:\s+syntax error at or near/i, engine: 'PostgreSQL' },
    { pattern: /pg_query/i, engine: 'PostgreSQL' },
    { pattern: /PSQLException/i, engine: 'PostgreSQL' },
    { pattern: /org\.postgresql/i, engine: 'PostgreSQL' },
    { pattern: /unterminated quoted string at or near/i, engine: 'PostgreSQL' },

    // SQLite
    { pattern: /SQLite3::/i, engine: 'SQLite' },
    { pattern: /SQLITE_ERROR/i, engine: 'SQLite' },
    { pattern: /sqlite3\.OperationalError/i, engine: 'SQLite' },
    { pattern: /unrecognized token/i, engine: 'SQLite' },

    // Microsoft SQL Server
    { pattern: /Unclosed quotation mark/i, engine: 'MSSQL' },
    { pattern: /mssql_query/i, engine: 'MSSQL' },
    { pattern: /ODBC SQL Server Driver/i, engine: 'MSSQL' },
    { pattern: /SqlException/i, engine: 'MSSQL' },
    { pattern: /Microsoft OLE DB Provider for SQL Server/i, engine: 'MSSQL' },
    { pattern: /Incorrect syntax near/i, engine: 'MSSQL' },

    // Oracle
    { pattern: /ORA-0\d{4}/i, engine: 'Oracle' },
    { pattern: /oracle\.jdbc/i, engine: 'Oracle' },
    { pattern: /quoted string not properly terminated/i, engine: 'Oracle' },
    { pattern: /PLS-\d{5}/i, engine: 'Oracle' },

    // General / multi-engine
    { pattern: /SQL syntax.*?error/i, engine: 'Unknown' },
    { pattern: /sql error/i, engine: 'Unknown' },
    { pattern: /database error/i, engine: 'Unknown' },
    { pattern: /query failed/i, engine: 'Unknown' },
    { pattern: /unterminated quoted string/i, engine: 'Unknown' },
    { pattern: /JDBC[A-Za-z]*Exception/i, engine: 'Unknown' },
    { pattern: /Dynamic SQL Error/i, engine: 'Unknown' },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Finding {
    id: string;
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
    title: string;
    description: string;
    recommendation: string;
    evidence?: string;
}

interface InjectablePoint {
    type: 'url_param' | 'form_input';
    name: string;
    /** The full URL to send the probe to */
    action: string;
    method: 'GET' | 'POST';
    /** Other parameters to include in the request (with original values) */
    otherParams: Record<string, string>;
}

interface FormInfo {
    action: string;
    method: string;
    inputs: Array<{ name: string; value: string }>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MAX_INJECTABLE_POINTS = 10;
const PROBE_TIMEOUT_MS = 5000;
const USER_AGENT = 'CheckVibe-Scanner/2.0';

/**
 * Fetch with a timeout and a safe User-Agent header.
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = PROBE_TIMEOUT_MS): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
        const headers = new Headers(options.headers || {});
        if (!headers.has('User-Agent')) {
            headers.set('User-Agent', USER_AGENT);
        }
        return await fetch(url, {
            ...options,
            signal: controller.signal,
            headers,
            redirect: 'follow',
        });
    } finally {
        clearTimeout(timeoutId);
    }
}

/**
 * Truncate a string for evidence display. We keep it short to avoid leaking
 * large amounts of page content.
 */
function truncateEvidence(text: string, maxLen = 200): string {
    if (text.length <= maxLen) return text;
    return text.substring(0, maxLen) + '...';
}

/**
 * Check a response body for SQL error messages.
 * Returns the first match found or null.
 */
function findSqlErrors(body: string): { pattern: string; engine: string } | null {
    for (const { pattern, engine } of SQL_ERROR_PATTERNS) {
        const match = body.match(pattern);
        if (match) {
            return { pattern: match[0], engine };
        }
    }
    return null;
}

/**
 * Parse <form> elements out of raw HTML using regex.
 * Since Deno edge functions don't have a DOM parser, we use careful regex
 * extraction.
 */
function extractForms(html: string, baseUrl: string): FormInfo[] {
    const forms: FormInfo[] = [];
    // Match opening <form> tag to closing </form>
    const formRegex = /<form\b([^>]*)>([\s\S]*?)<\/form>/gi;
    let formMatch;

    while ((formMatch = formRegex.exec(html)) !== null) {
        const attrs = formMatch[1];
        const innerHtml = formMatch[2];

        // Extract action attribute
        const actionMatch = attrs.match(/action\s*=\s*["']([^"']*)["']/i);
        let action = actionMatch ? actionMatch[1] : '';

        // Resolve relative action URLs
        if (!action || action === '#' || action === '') {
            action = baseUrl;
        } else if (action.startsWith('//')) {
            action = 'https:' + action;
        } else if (action.startsWith('/')) {
            const base = new URL(baseUrl);
            action = base.origin + action;
        } else if (!action.startsWith('http')) {
            try {
                action = new URL(action, baseUrl).href;
            } catch {
                action = baseUrl;
            }
        }

        // Extract method attribute
        const methodMatch = attrs.match(/method\s*=\s*["']([^"']*)["']/i);
        const method = (methodMatch ? methodMatch[1] : 'GET').toUpperCase();

        // Extract input fields
        const inputs: Array<{ name: string; value: string }> = [];
        const inputRegex = /<input\b([^>]*)>/gi;
        let inputMatch;

        while ((inputMatch = inputRegex.exec(innerHtml)) !== null) {
            const inputAttrs = inputMatch[1];

            // Skip submit/button/image/reset/file types
            const typeMatch = inputAttrs.match(/type\s*=\s*["']([^"']*)["']/i);
            const inputType = typeMatch ? typeMatch[1].toLowerCase() : 'text';
            if (['submit', 'button', 'image', 'reset', 'file', 'hidden', 'checkbox', 'radio'].includes(inputType)) {
                // Still include hidden fields as context params, but don't inject into them
                if (inputType === 'hidden') {
                    const nameMatch = inputAttrs.match(/name\s*=\s*["']([^"']*)["']/i);
                    const valueMatch = inputAttrs.match(/value\s*=\s*["']([^"']*)["']/i);
                    if (nameMatch) {
                        inputs.push({ name: nameMatch[1], value: valueMatch ? valueMatch[1] : '' });
                    }
                }
                continue;
            }

            const nameMatch = inputAttrs.match(/name\s*=\s*["']([^"']*)["']/i);
            const valueMatch = inputAttrs.match(/value\s*=\s*["']([^"']*)["']/i);
            if (nameMatch) {
                inputs.push({ name: nameMatch[1], value: valueMatch ? valueMatch[1] : 'test' });
            }
        }

        // Also extract <select> fields
        const selectRegex = /<select\b([^>]*)>[\s\S]*?<\/select>/gi;
        let selectMatch;
        while ((selectMatch = selectRegex.exec(innerHtml)) !== null) {
            const selectAttrs = selectMatch[0];
            const nameMatch = selectAttrs.match(/name\s*=\s*["']([^"']*)["']/i);
            if (nameMatch) {
                // Get first option value
                const optionMatch = selectAttrs.match(/<option\b[^>]*value\s*=\s*["']([^"']*)["']/i);
                inputs.push({ name: nameMatch[1], value: optionMatch ? optionMatch[1] : '1' });
            }
        }

        // Also extract <textarea> fields
        const textareaRegex = /<textarea\b([^>]*)>/gi;
        let textareaMatch;
        while ((textareaMatch = textareaRegex.exec(innerHtml)) !== null) {
            const textareaAttrs = textareaMatch[1];
            const nameMatch = textareaAttrs.match(/name\s*=\s*["']([^"']*)["']/i);
            if (nameMatch) {
                inputs.push({ name: nameMatch[1], value: 'test' });
            }
        }

        if (inputs.length > 0) {
            forms.push({ action, method, inputs });
        }
    }

    return forms;
}

/**
 * Build the list of injectable points from URL params and form inputs.
 */
function collectInjectablePoints(targetUrl: string, forms: FormInfo[]): InjectablePoint[] {
    const points: InjectablePoint[] = [];

    // 1. URL query parameters
    try {
        const parsed = new URL(targetUrl);
        for (const [name] of parsed.searchParams) {
            const otherParams: Record<string, string> = {};
            for (const [k, v] of parsed.searchParams) {
                if (k !== name) otherParams[k] = v;
            }
            points.push({
                type: 'url_param',
                name,
                action: parsed.origin + parsed.pathname,
                method: 'GET',
                otherParams,
            });
        }
    } catch {
        // If URL parsing fails, skip URL params
    }

    // 2. Form inputs (only injectable text-like inputs)
    for (const form of forms) {
        for (const input of form.inputs) {
            const otherParams: Record<string, string> = {};
            for (const other of form.inputs) {
                if (other.name !== input.name) {
                    otherParams[other.name] = other.value;
                }
            }
            points.push({
                type: 'form_input',
                name: input.name,
                action: form.action,
                method: form.method === 'POST' ? 'POST' : 'GET',
                otherParams,
            });
        }
    }

    // Deduplicate by name + action + method
    const seen = new Set<string>();
    const unique: InjectablePoint[] = [];
    for (const point of points) {
        const key = `${point.method}:${point.action}:${point.name}`;
        if (!seen.has(key)) {
            seen.add(key);
            unique.push(point);
        }
    }

    // Cap at MAX_INJECTABLE_POINTS
    return unique.slice(0, MAX_INJECTABLE_POINTS);
}

/**
 * Send a probe request with the given payload injected into the target parameter.
 * Returns the response body text and status code.
 */
async function sendProbe(
    point: InjectablePoint,
    payload: string,
): Promise<{ body: string; status: number; length: number } | null> {
    try {
        const params = new URLSearchParams(point.otherParams);
        params.set(point.name, payload);

        if (point.method === 'GET') {
            const probeUrl = `${point.action}?${params.toString()}`;
            const response = await fetchWithTimeout(probeUrl, { method: 'GET' });
            const body = await response.text();
            return { body, status: response.status, length: body.length };
        } else {
            // POST with form-encoded body
            const response = await fetchWithTimeout(point.action, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params.toString(),
            });
            const body = await response.text();
            return { body, status: response.status, length: body.length };
        }
    } catch {
        // Timeout or network error — silently skip
        return null;
    }
}

/**
 * Test a single injectable point for SQL injection vulnerabilities.
 * Returns any findings discovered.
 */
async function testInjectionPoint(
    point: InjectablePoint,
    findingIndex: number,
): Promise<{ findings: Finding[]; checksRun: number }> {
    const findings: Finding[] = [];
    let checksRun = 0;
    const pointLabel = `${point.type === 'url_param' ? 'URL parameter' : 'form input'} "${point.name}"`;

    // -----------------------------------------------------------------------
    // Test 1: Single quote (error-based detection)
    // -----------------------------------------------------------------------
    checksRun++;
    const singleQuoteResult = await sendProbe(point, "1'");
    if (singleQuoteResult) {
        const errorMatch = findSqlErrors(singleQuoteResult.body);
        if (errorMatch) {
            findings.push({
                id: `sqli-error-${findingIndex}-${point.name}`,
                severity: 'critical',
                title: `Error-Based SQL Injection in ${pointLabel}`,
                description: `Injecting a single quote into ${pointLabel} at ${point.action} triggered a ${errorMatch.engine} SQL error. This strongly indicates the parameter is vulnerable to SQL injection, allowing attackers to read, modify, or delete database contents.`,
                recommendation: `Use parameterized queries (prepared statements) for all database queries involving this parameter. Never concatenate user input directly into SQL strings. Apply input validation as a defense-in-depth measure.`,
                evidence: truncateEvidence(errorMatch.pattern),
            });
        }
    }

    // -----------------------------------------------------------------------
    // Test 2: Blind boolean-based SQLi
    // Send "1 AND 1=1" (true) and "1 AND 1=2" (false). If responses differ
    // significantly in length, the parameter may be injectable.
    // -----------------------------------------------------------------------
    checksRun++;
    const trueResult = await sendProbe(point, '1 AND 1=1');
    const falseResult = await sendProbe(point, '1 AND 1=2');

    if (trueResult && falseResult) {
        const lengthDiff = Math.abs(trueResult.length - falseResult.length);
        const maxLen = Math.max(trueResult.length, falseResult.length, 1);
        const diffRatio = lengthDiff / maxLen;

        // Only flag if the length difference is significant (>5% and at least 50 chars)
        // and neither response contains a SQL error (which would already be caught above)
        if (diffRatio > 0.05 && lengthDiff > 50) {
            const alreadyFoundError = findings.some(f => f.id.startsWith('sqli-error'));
            if (!alreadyFoundError) {
                findings.push({
                    id: `sqli-blind-${findingIndex}-${point.name}`,
                    severity: 'high',
                    title: `Possible Blind SQL Injection in ${pointLabel}`,
                    description: `Boolean-based blind SQL injection may be possible in ${pointLabel} at ${point.action}. Sending "1 AND 1=1" vs "1 AND 1=2" produced responses with a ${lengthDiff}-byte difference (${(diffRatio * 100).toFixed(1)}% variance), suggesting the SQL condition is being evaluated by the database.`,
                    recommendation: `Use parameterized queries (prepared statements) for all database queries involving this parameter. Investigate whether the application is incorporating user input into SQL WHERE clauses without proper sanitization.`,
                    evidence: `True condition response: ${trueResult.length} bytes, False condition response: ${falseResult.length} bytes (delta: ${lengthDiff} bytes)`,
                });
            }
        }
    }

    // -----------------------------------------------------------------------
    // Test 3: OR-based tautology test
    // "1 OR 1=1--" is a classic tautology. If it returns significantly more
    // content than a normal request, data may be leaking.
    // -----------------------------------------------------------------------
    checksRun++;
    const normalResult = await sendProbe(point, '1');
    const orResult = await sendProbe(point, '1 OR 1=1--');

    if (normalResult && orResult) {
        const lengthDiff = orResult.length - normalResult.length;
        const maxLen = Math.max(normalResult.length, 1);
        const growthRatio = lengthDiff / maxLen;

        // If the OR tautology returns significantly more content (>20% growth and 200+ extra bytes)
        if (growthRatio > 0.20 && lengthDiff > 200) {
            const alreadyFound = findings.some(f =>
                f.id.startsWith('sqli-error') || f.id.startsWith('sqli-blind')
            );
            if (!alreadyFound) {
                findings.push({
                    id: `sqli-tautology-${findingIndex}-${point.name}`,
                    severity: 'high',
                    title: `Possible SQL Injection via Tautology in ${pointLabel}`,
                    description: `Injecting "1 OR 1=1--" into ${pointLabel} at ${point.action} caused the response to grow by ${lengthDiff} bytes (${(growthRatio * 100).toFixed(1)}% increase), suggesting a SQL tautology is returning extra rows from the database.`,
                    recommendation: `Use parameterized queries (prepared statements) for all database queries. The OR 1=1 tautology bypasses WHERE clause conditions, which can expose unauthorized data.`,
                    evidence: `Normal response: ${normalResult.length} bytes, Tautology response: ${orResult.length} bytes (delta: +${lengthDiff} bytes)`,
                });
            }
        }

        // Also check if the tautology response contains SQL errors
        if (orResult) {
            const errorMatch = findSqlErrors(orResult.body);
            if (errorMatch) {
                const alreadyFoundError = findings.some(f => f.id.startsWith('sqli-error'));
                if (!alreadyFoundError) {
                    findings.push({
                        id: `sqli-error-or-${findingIndex}-${point.name}`,
                        severity: 'critical',
                        title: `Error-Based SQL Injection in ${pointLabel} (OR payload)`,
                        description: `Injecting "1 OR 1=1--" into ${pointLabel} at ${point.action} triggered a ${errorMatch.engine} SQL error, confirming the parameter is vulnerable to SQL injection.`,
                        recommendation: `Use parameterized queries (prepared statements) for all database queries involving this parameter.`,
                        evidence: truncateEvidence(errorMatch.pattern),
                    });
                }
            }
        }
    }

    return { findings, checksRun };
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: getCorsHeaders(req) });
    }

    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        });
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
        const targetUrl = validation.url!;

        const findings: Finding[] = [];
        let score = 100;
        let checksRun = 0;

        // -----------------------------------------------------------------
        // Step 1: Fetch the initial page and check for existing SQL errors
        // -----------------------------------------------------------------
        let initialHtml = '';
        try {
            const initialResponse = await fetchWithTimeout(targetUrl, { method: 'GET' }, 10000);
            initialHtml = await initialResponse.text();
            checksRun++;

            const existingError = findSqlErrors(initialHtml);
            if (existingError) {
                findings.push({
                    id: 'sqli-existing-error-0',
                    severity: 'medium',
                    title: 'SQL Error Message Visible on Page',
                    description: `The page at ${targetUrl} already displays a ${existingError.engine} SQL error message without any injection. This indicates a misconfiguration or bug that leaks database implementation details, which aids attackers in crafting SQL injection attacks.`,
                    recommendation: `Configure custom error pages and disable detailed error output in production. Set display_errors=off (PHP), custom error handlers (Node.js), or equivalent for your framework. Never expose raw SQL errors to end users.`,
                    evidence: truncateEvidence(existingError.pattern),
                });
            }
        } catch {
            // If we cannot fetch the page at all, return a minimal result
            return new Response(JSON.stringify({
                scannerType: 'sqli',
                score: 0,
                checksRun: 1,
                findings: [{
                    id: 'sqli-fetch-failed',
                    severity: 'info',
                    title: 'Unable to Fetch Target Page',
                    description: `Could not retrieve the page at ${targetUrl}. The site may be unreachable, blocking automated requests, or experiencing downtime.`,
                    recommendation: 'Verify the URL is correct and the site is accessible.',
                }],
                scannedAt: new Date().toISOString(),
                url: targetUrl,
            }), {
                headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
            });
        }

        // -----------------------------------------------------------------
        // Step 2: Extract injectable points (URL params + form inputs)
        // -----------------------------------------------------------------
        const forms = extractForms(initialHtml, targetUrl);
        const injectablePoints = collectInjectablePoints(targetUrl, forms);

        if (injectablePoints.length === 0) {
            // No parameters to test — add an informational note
            findings.push({
                id: 'sqli-no-params',
                severity: 'info',
                title: 'No Injectable Parameters Detected',
                description: `No URL query parameters or form inputs were found on ${targetUrl}. The scanner could not test for SQL injection because there are no input vectors on this page. This does not guarantee the site is free from SQL injection — other endpoints, APIs, or pages may be vulnerable.`,
                recommendation: 'Consider scanning individual pages with query parameters or form fields for more thorough coverage. API endpoints accepting JSON or other data formats should be tested separately.',
            });
        }

        // -----------------------------------------------------------------
        // Step 3: Test each injectable point
        // -----------------------------------------------------------------
        for (let i = 0; i < injectablePoints.length; i++) {
            const point = injectablePoints[i];
            const result = await testInjectionPoint(point, i);
            findings.push(...result.findings);
            checksRun += result.checksRun;
        }

        // -----------------------------------------------------------------
        // Step 4: Check for error-based information disclosure patterns
        // that are not SQL-specific but aid SQLi attacks
        // -----------------------------------------------------------------
        checksRun++;
        const infoDisclosurePatterns = [
            { pattern: /stack\s*trace/i, title: 'Stack Trace Exposed' },
            { pattern: /Traceback \(most recent call last\)/i, title: 'Python Traceback Exposed' },
            { pattern: /at\s+[\w$.]+\([\w/.]+:\d+:\d+\)/i, title: 'Application Stack Trace Exposed' },
            { pattern: /DB_HOST|DB_PASSWORD|DB_NAME|DATABASE_URL/i, title: 'Database Configuration Exposed' },
        ];

        for (const { pattern, title } of infoDisclosurePatterns) {
            if (pattern.test(initialHtml)) {
                findings.push({
                    id: `sqli-info-disclosure-${title.toLowerCase().replace(/\s+/g, '-')}`,
                    severity: 'medium',
                    title,
                    description: `The page response contains ${title.toLowerCase()} information that could help an attacker understand the application's database architecture and craft targeted SQL injection payloads.`,
                    recommendation: 'Disable verbose error output and stack traces in production. Use a centralized logging system and display generic error messages to end users.',
                    evidence: truncateEvidence(initialHtml.match(pattern)?.[0] || ''),
                });
            }
        }

        // -----------------------------------------------------------------
        // Step 5: Calculate score
        // -----------------------------------------------------------------
        for (const finding of findings) {
            switch (finding.severity) {
                case 'critical':
                    score -= 40;
                    break;
                case 'high':
                    score -= 25;
                    break;
                case 'medium':
                    score -= 15;
                    break;
                case 'low':
                    score -= 5;
                    break;
                // 'info' findings do not affect the score
            }
        }

        return new Response(JSON.stringify({
            scannerType: 'sqli',
            score: Math.max(0, Math.min(100, score)),
            checksRun,
            findings,
            scannedAt: new Date().toISOString(),
            url: targetUrl,
        }), {
            headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Scanner error:', error);
        return new Response(JSON.stringify({
            scannerType: 'sqli',
            score: 0,
            error: 'Scan failed. Please try again.',
            findings: [],
            metadata: {},
        }), {
            headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});
