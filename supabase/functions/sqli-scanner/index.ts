import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { validateTargetUrl, validateScannerAuth, getCorsHeaders } from "../_shared/security.ts";

/**
 * SQL Injection Scanner v2
 * Detects SQL injection vulnerabilities via:
 * 1. Error-based detection (multiple payloads: single/double quote, backslash, parenthesis)
 * 2. Blind boolean-based detection (AND 1=1 vs AND 1=2)
 * 3. Tautology detection (OR 1=1--)
 * 4. UNION-based detection (column enumeration)
 * 5. Time-based blind detection (SLEEP / pg_sleep / WAITFOR)
 * 6. Stacked query detection (semicolon injection)
 * 7. Encoding bypass probes (URL-encoded, double-encoded)
 * 8. NoSQL injection detection (MongoDB operator injection)
 * 9. Information disclosure patterns
 * 10. WAF detection (blocked response analysis)
 *
 * Safety rules:
 * - Only non-destructive read-only payloads
 * - Never attempts data extraction or modification
 * - 5-second timeout per probe, 2s delay max for time-based
 * - Max 10 injection points tested per scan
 * - Probes run in parallel within each parameter for speed
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
    { pattern: /MariaDB server version/i, engine: 'MySQL' },

    // PostgreSQL
    { pattern: /ERROR:\s+syntax error at or near/i, engine: 'PostgreSQL' },
    { pattern: /pg_query/i, engine: 'PostgreSQL' },
    { pattern: /PSQLException/i, engine: 'PostgreSQL' },
    { pattern: /org\.postgresql/i, engine: 'PostgreSQL' },
    { pattern: /unterminated quoted string at or near/i, engine: 'PostgreSQL' },
    { pattern: /invalid input syntax for type/i, engine: 'PostgreSQL' },

    // SQLite
    { pattern: /SQLite3::/i, engine: 'SQLite' },
    { pattern: /SQLITE_ERROR/i, engine: 'SQLite' },
    { pattern: /sqlite3\.OperationalError/i, engine: 'SQLite' },
    { pattern: /unrecognized token/i, engine: 'SQLite' },
    { pattern: /near ".*": syntax error/i, engine: 'SQLite' },

    // Microsoft SQL Server
    { pattern: /Unclosed quotation mark/i, engine: 'MSSQL' },
    { pattern: /mssql_query/i, engine: 'MSSQL' },
    { pattern: /ODBC SQL Server Driver/i, engine: 'MSSQL' },
    { pattern: /SqlException/i, engine: 'MSSQL' },
    { pattern: /Microsoft OLE DB Provider for SQL Server/i, engine: 'MSSQL' },
    { pattern: /Incorrect syntax near/i, engine: 'MSSQL' },
    { pattern: /SQL Server.*?error/i, engine: 'MSSQL' },

    // Oracle
    { pattern: /ORA-0\d{4}/i, engine: 'Oracle' },
    { pattern: /oracle\.jdbc/i, engine: 'Oracle' },
    { pattern: /quoted string not properly terminated/i, engine: 'Oracle' },
    { pattern: /PLS-\d{5}/i, engine: 'Oracle' },

    // Modern frameworks
    { pattern: /django\.db\.utils\./i, engine: 'Django/PostgreSQL' },
    { pattern: /ProgrammingError at \//i, engine: 'Django' },
    { pattern: /OperationalError at \//i, engine: 'Django' },
    { pattern: /SQLSTATE\[\w+\]/i, engine: 'PDO/PHP' },
    { pattern: /PDOException/i, engine: 'PDO/PHP' },
    { pattern: /Illuminate\\Database\\QueryException/i, engine: 'Laravel' },
    { pattern: /SQLSTATE.*?syntax error or access violation/i, engine: 'Laravel/PDO' },
    { pattern: /ActiveRecord::StatementInvalid/i, engine: 'Rails' },
    { pattern: /PG::SyntaxError/i, engine: 'Rails/PostgreSQL' },
    { pattern: /Mysql2::Error/i, engine: 'Rails/MySQL' },
    { pattern: /SequelizeDatabaseError/i, engine: 'Sequelize/Node.js' },
    { pattern: /error: (syntax error|relation .* does not exist)/i, engine: 'Node.js/PostgreSQL' },
    { pattern: /knex.*?error/i, engine: 'Knex.js' },
    { pattern: /prisma.*?error/i, engine: 'Prisma' },
    { pattern: /TypeORMError/i, engine: 'TypeORM' },
    { pattern: /MongoServerError/i, engine: 'MongoDB' },

    // General / multi-engine
    { pattern: /SQL syntax.*?error/i, engine: 'Unknown' },
    { pattern: /sql error/i, engine: 'Unknown' },
    { pattern: /database error/i, engine: 'Unknown' },
    { pattern: /query failed/i, engine: 'Unknown' },
    { pattern: /unterminated quoted string/i, engine: 'Unknown' },
    { pattern: /JDBC[A-Za-z]*Exception/i, engine: 'Unknown' },
    { pattern: /Dynamic SQL Error/i, engine: 'Unknown' },
    { pattern: /column .* does not exist/i, engine: 'Unknown' },
    { pattern: /Unknown column/i, engine: 'Unknown' },
    { pattern: /supplied argument is not a valid/i, engine: 'Unknown' },
];

// ---------------------------------------------------------------------------
// NoSQL error / injection patterns
// ---------------------------------------------------------------------------

const NOSQL_ERROR_PATTERNS: Array<{ pattern: RegExp; engine: string }> = [
    { pattern: /MongoError/i, engine: 'MongoDB' },
    { pattern: /MongoServerError/i, engine: 'MongoDB' },
    { pattern: /BSON field/i, engine: 'MongoDB' },
    { pattern: /\$[a-z]+.*?is not allowed/i, engine: 'MongoDB' },
    { pattern: /CastError:.*?ObjectId/i, engine: 'MongoDB/Mongoose' },
    { pattern: /ValidationError:.*?Path/i, engine: 'MongoDB/Mongoose' },
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
    type: 'url_param' | 'form_input' | 'common_param';
    name: string;
    action: string;
    method: 'GET' | 'POST';
    otherParams: Record<string, string>;
}

interface FormInfo {
    action: string;
    method: string;
    inputs: Array<{ name: string; value: string }>;
}

interface ProbeResult {
    body: string;
    status: number;
    length: number;
    elapsed: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_INJECTABLE_POINTS = 10;
const PROBE_TIMEOUT_MS = 5000;
const USER_AGENT = 'CheckVibe-Scanner/2.0';
const TIME_DELAY_SEC = 2;
const TIME_THRESHOLD_MS = 1500; // flag if response takes 1.5s+ longer than baseline

// Common parameter names to test even if not found in page HTML
const COMMON_PARAMS = [
    'id', 'page', 'search', 'q', 'query', 'keyword',
    'user', 'name', 'email', 'sort', 'order', 'filter',
    'category', 'type', 'action', 'redirect', 'url',
    'file', 'path', 'lang', 'token', 'ref',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function truncateEvidence(text: string, maxLen = 200): string {
    if (text.length <= maxLen) return text;
    return text.substring(0, maxLen) + '...';
}

function findSqlErrors(body: string): { pattern: string; engine: string } | null {
    for (const { pattern, engine } of SQL_ERROR_PATTERNS) {
        const match = body.match(pattern);
        if (match) {
            return { pattern: match[0], engine };
        }
    }
    return null;
}

function findNoSqlErrors(body: string): { pattern: string; engine: string } | null {
    for (const { pattern, engine } of NOSQL_ERROR_PATTERNS) {
        const match = body.match(pattern);
        if (match) {
            return { pattern: match[0], engine };
        }
    }
    return null;
}

/**
 * Send a probe and measure response time.
 */
async function sendProbe(
    point: InjectablePoint,
    payload: string,
): Promise<ProbeResult | null> {
    try {
        const params = new URLSearchParams(point.otherParams);
        params.set(point.name, payload);
        const start = Date.now();

        if (point.method === 'GET') {
            const probeUrl = `${point.action}?${params.toString()}`;
            const response = await fetchWithTimeout(probeUrl, { method: 'GET' });
            let body = await response.text();
            if (body.length > 1_000_000) body = body.substring(0, 1_000_000);
            return { body, status: response.status, length: body.length, elapsed: Date.now() - start };
        } else {
            const response = await fetchWithTimeout(point.action, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: params.toString(),
            });
            let body = await response.text();
            if (body.length > 1_000_000) body = body.substring(0, 1_000_000);
            return { body, status: response.status, length: body.length, elapsed: Date.now() - start };
        }
    } catch {
        return null;
    }
}

/**
 * Send a raw GET probe with a pre-built URL (for encoding bypass tests).
 */
async function sendRawProbe(url: string): Promise<ProbeResult | null> {
    try {
        const start = Date.now();
        const response = await fetchWithTimeout(url, { method: 'GET' });
        const body = await response.text();
        return { body, status: response.status, length: body.length, elapsed: Date.now() - start };
    } catch {
        return null;
    }
}

// ---------------------------------------------------------------------------
// HTML parsing helpers
// ---------------------------------------------------------------------------

function extractForms(html: string, baseUrl: string): FormInfo[] {
    const forms: FormInfo[] = [];
    const formRegex = /<form\b([^>]*)>([\s\S]*?)<\/form>/gi;
    let formMatch;

    while ((formMatch = formRegex.exec(html)) !== null) {
        const attrs = formMatch[1];
        const innerHtml = formMatch[2];

        const actionMatch = attrs.match(/action\s*=\s*["']([^"']*)["']/i);
        let action = actionMatch ? actionMatch[1] : '';

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

        const methodMatch = attrs.match(/method\s*=\s*["']([^"']*)["']/i);
        const method = (methodMatch ? methodMatch[1] : 'GET').toUpperCase();

        const inputs: Array<{ name: string; value: string }> = [];
        const inputRegex = /<input\b([^>]*)>/gi;
        let inputMatch;

        while ((inputMatch = inputRegex.exec(innerHtml)) !== null) {
            const inputAttrs = inputMatch[1];
            const typeMatch = inputAttrs.match(/type\s*=\s*["']([^"']*)["']/i);
            const inputType = typeMatch ? typeMatch[1].toLowerCase() : 'text';
            if (['submit', 'button', 'image', 'reset', 'file', 'hidden', 'checkbox', 'radio'].includes(inputType)) {
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

        const selectRegex = /<select\b([^>]*)>[\s\S]*?<\/select>/gi;
        let selectMatch;
        while ((selectMatch = selectRegex.exec(innerHtml)) !== null) {
            const selectAttrs = selectMatch[0];
            const nameMatch = selectAttrs.match(/name\s*=\s*["']([^"']*)["']/i);
            if (nameMatch) {
                const optionMatch = selectAttrs.match(/<option\b[^>]*value\s*=\s*["']([^"']*)["']/i);
                inputs.push({ name: nameMatch[1], value: optionMatch ? optionMatch[1] : '1' });
            }
        }

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

function collectInjectablePoints(targetUrl: string, forms: FormInfo[]): InjectablePoint[] {
    const points: InjectablePoint[] = [];
    const seenNames = new Set<string>();

    // 1. URL query parameters
    try {
        const parsed = new URL(targetUrl);
        for (const [name] of parsed.searchParams) {
            seenNames.add(name.toLowerCase());
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
        // skip
    }

    // 2. Form inputs
    for (const form of forms) {
        for (const input of form.inputs) {
            seenNames.add(input.name.toLowerCase());
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

    // 3. Common parameter names not already found
    try {
        const parsed = new URL(targetUrl);
        const baseAction = parsed.origin + parsed.pathname;
        for (const param of COMMON_PARAMS) {
            if (!seenNames.has(param)) {
                points.push({
                    type: 'common_param',
                    name: param,
                    action: baseAction,
                    method: 'GET',
                    otherParams: {},
                });
            }
        }
    } catch {
        // skip
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

    return unique.slice(0, MAX_INJECTABLE_POINTS);
}

// ---------------------------------------------------------------------------
// WAF detection
// ---------------------------------------------------------------------------

function detectWaf(results: (ProbeResult | null)[]): boolean {
    const blockedCodes = [403, 406, 429, 503];
    let blockedCount = 0;
    let totalValid = 0;
    for (const r of results) {
        if (!r) continue;
        totalValid++;
        if (blockedCodes.includes(r.status)) blockedCount++;
        // Check for WAF-specific body patterns
        if (/access denied|blocked|firewall|waf|cloudflare|sucuri|akamai|incapsula|imperva/i.test(r.body)) {
            blockedCount++;
        }
    }
    return totalValid > 0 && blockedCount / totalValid > 0.5;
}

// ---------------------------------------------------------------------------
// Test a single injectable point (all techniques, parallelized)
// ---------------------------------------------------------------------------

async function testInjectionPoint(
    point: InjectablePoint,
    idx: number,
): Promise<{ findings: Finding[]; checksRun: number; probeResults: (ProbeResult | null)[] }> {
    const findings: Finding[] = [];
    const allProbeResults: (ProbeResult | null)[] = [];
    let checksRun = 0;
    const label = `${point.type === 'url_param' ? 'URL parameter' : point.type === 'form_input' ? 'form input' : 'common parameter'} "${point.name}"`;

    // -----------------------------------------------------------------------
    // Phase 1: Error-based detection (4 payloads in parallel)
    // -----------------------------------------------------------------------
    checksRun++;
    const errorPayloads = [
        { payload: "1'", desc: 'single quote' },
        { payload: '1"', desc: 'double quote' },
        { payload: '1\\', desc: 'backslash' },
        { payload: '1)', desc: 'closing parenthesis' },
    ];

    const errorResults = await Promise.all(
        errorPayloads.map(p => sendProbe(point, p.payload))
    );
    allProbeResults.push(...errorResults);

    let errorFound = false;
    for (let i = 0; i < errorPayloads.length; i++) {
        const result = errorResults[i];
        if (!result) continue;
        const errorMatch = findSqlErrors(result.body);
        if (errorMatch && !errorFound) {
            errorFound = true;
            findings.push({
                id: `sqli-error-${idx}-${point.name}`,
                severity: 'critical',
                title: `Error-Based SQL Injection in ${label}`,
                description: `Injecting a ${errorPayloads[i].desc} into ${label} at ${point.action} triggered a ${errorMatch.engine} SQL error. This confirms the parameter is vulnerable to SQL injection, allowing attackers to read, modify, or delete database contents.`,
                recommendation: `Use parameterized queries (prepared statements) for all database queries involving this parameter. Never concatenate user input directly into SQL strings.`,
                evidence: truncateEvidence(errorMatch.pattern),
            });
        }
    }

    // -----------------------------------------------------------------------
    // Phase 2: Boolean blind + Tautology + Baseline (in parallel)
    // -----------------------------------------------------------------------
    checksRun += 2;
    const [trueResult, falseResult, normalResult, orResult] = await Promise.all([
        sendProbe(point, '1 AND 1=1'),
        sendProbe(point, '1 AND 1=2'),
        sendProbe(point, '1'),
        sendProbe(point, '1 OR 1=1--'),
    ]);
    allProbeResults.push(trueResult, falseResult, normalResult, orResult);

    // Boolean blind analysis
    if (trueResult && falseResult) {
        const lengthDiff = Math.abs(trueResult.length - falseResult.length);
        const maxLen = Math.max(trueResult.length, falseResult.length, 1);
        const diffRatio = lengthDiff / maxLen;

        if (diffRatio > 0.05 && lengthDiff > 500 && !errorFound) {
            findings.push({
                id: `sqli-blind-${idx}-${point.name}`,
                severity: 'high',
                title: `Possible Blind SQL Injection in ${label}`,
                description: `Boolean-based blind SQL injection may be possible in ${label} at ${point.action}. Sending "1 AND 1=1" vs "1 AND 1=2" produced responses with a ${lengthDiff}-byte difference (${(diffRatio * 100).toFixed(1)}% variance), suggesting the SQL condition is being evaluated.`,
                recommendation: `Use parameterized queries for all database queries involving this parameter.`,
                evidence: `True: ${trueResult.length}b, False: ${falseResult.length}b (delta: ${lengthDiff}b)`,
            });
        }
    }

    // Tautology analysis
    if (normalResult && orResult) {
        const lengthDiff = orResult.length - normalResult.length;
        const maxLen = Math.max(normalResult.length, 1);
        const growthRatio = lengthDiff / maxLen;

        if (growthRatio > 0.20 && lengthDiff > 200 && !errorFound && !findings.some(f => f.id.startsWith('sqli-blind'))) {
            findings.push({
                id: `sqli-tautology-${idx}-${point.name}`,
                severity: 'high',
                title: `Possible SQL Injection via Tautology in ${label}`,
                description: `Injecting "1 OR 1=1--" into ${label} at ${point.action} caused the response to grow by ${lengthDiff} bytes (${(growthRatio * 100).toFixed(1)}%), suggesting a SQL tautology is returning extra rows.`,
                recommendation: `Use parameterized queries. The OR 1=1 tautology bypasses WHERE clause conditions.`,
                evidence: `Normal: ${normalResult.length}b, Tautology: ${orResult.length}b (delta: +${lengthDiff}b)`,
            });
        }

        // Check tautology response for errors too
        if (orResult) {
            const errorMatch = findSqlErrors(orResult.body);
            if (errorMatch && !errorFound) {
                errorFound = true;
                findings.push({
                    id: `sqli-error-or-${idx}-${point.name}`,
                    severity: 'critical',
                    title: `Error-Based SQL Injection in ${label} (OR payload)`,
                    description: `Injecting "1 OR 1=1--" into ${label} at ${point.action} triggered a ${errorMatch.engine} SQL error.`,
                    recommendation: `Use parameterized queries for all database queries involving this parameter.`,
                    evidence: truncateEvidence(errorMatch.pattern),
                });
            }
        }
    }

    // -----------------------------------------------------------------------
    // Phase 3: UNION-based detection (try 1-5 columns)
    // -----------------------------------------------------------------------
    checksRun++;
    const unionPayloads = [
        '1 UNION SELECT NULL--',
        '1 UNION SELECT NULL,NULL--',
        '1 UNION SELECT NULL,NULL,NULL--',
        '1 UNION SELECT NULL,NULL,NULL,NULL--',
        '1 UNION SELECT NULL,NULL,NULL,NULL,NULL--',
    ];

    const unionResults = await Promise.all(
        unionPayloads.map(p => sendProbe(point, p))
    );
    allProbeResults.push(...unionResults);

    let unionDetected = false;
    for (let i = 0; i < unionPayloads.length; i++) {
        const result = unionResults[i];
        if (!result || unionDetected) continue;

        // UNION success: response differs from normal AND doesn't contain SQL error
        // about wrong column count (which actually confirms SQL is being parsed!)
        const hasColumnError = /number of columns|SELECTs have different number|UNION.*?select.*?different/i.test(result.body);
        const hasSqlError = findSqlErrors(result.body);

        if (hasColumnError && !errorFound) {
            // Column mismatch error = SQL is being parsed = injectable!
            errorFound = true;
            unionDetected = true;
            findings.push({
                id: `sqli-union-${idx}-${point.name}`,
                severity: 'critical',
                title: `UNION-Based SQL Injection in ${label}`,
                description: `UNION SELECT injection into ${label} at ${point.action} triggered a column count mismatch error, confirming the SQL query is executed with user input. An attacker can enumerate the correct column count and extract data from other tables.`,
                recommendation: `Use parameterized queries. UNION-based SQLi allows full database data extraction.`,
                evidence: truncateEvidence(result.body.match(/number of columns|SELECTs have different|UNION.*?select.*?different/i)?.[0] || `UNION with ${i + 1} column(s) triggered error`),
            });
        } else if (!hasSqlError && normalResult && Math.abs(result.length - normalResult.length) > 500) {
            // Response changed significantly with UNION — possible data leak
            // Threshold is 500 bytes to avoid false positives from URL param reflection
            // in HTML meta tags, canonical URLs, etc. (typically ~100-200 bytes)
            // Also verify the extra content doesn't look like reflected HTML
            const payloadLen = unionPayloads[i].length;
            const sizeDelta = Math.abs(result.length - normalResult.length);
            const isLikelyReflection = sizeDelta < payloadLen * 3;
            if (!errorFound && !isLikelyReflection && !findings.some(f => f.id.includes('union'))) {
                unionDetected = true;
                findings.push({
                    id: `sqli-union-data-${idx}-${point.name}`,
                    severity: 'high',
                    title: `Possible UNION SQL Injection in ${label}`,
                    description: `UNION SELECT NULL with ${i + 1} column(s) into ${label} at ${point.action} changed the response by ${sizeDelta} bytes. This may indicate data from additional tables is being returned.`,
                    recommendation: `Use parameterized queries. Investigate whether UNION payloads affect query results.`,
                    evidence: `Normal: ${normalResult?.length || '?'}b, UNION(${i + 1} cols): ${result.length}b`,
                });
            }
        }
    }

    // -----------------------------------------------------------------------
    // Phase 4: Time-based blind detection
    // -----------------------------------------------------------------------
    checksRun++;
    const baselineElapsed = normalResult?.elapsed || 0;
    const timePayloads = [
        `1' AND SLEEP(${TIME_DELAY_SEC})--`,                        // MySQL
        `1'; SELECT pg_sleep(${TIME_DELAY_SEC})--`,                  // PostgreSQL
        `1'; WAITFOR DELAY '00:00:0${TIME_DELAY_SEC}'--`,           // MSSQL
        `1' AND (SELECT * FROM (SELECT SLEEP(${TIME_DELAY_SEC}))a)--`, // MySQL subquery
    ];

    // Run time payloads one at a time to measure elapsed accurately
    let timeDetected = false;
    for (const payload of timePayloads) {
        if (timeDetected) break;
        const result = await sendProbe(point, payload);
        allProbeResults.push(result);
        if (!result) continue;

        const extraTime = result.elapsed - baselineElapsed;
        if (extraTime >= TIME_THRESHOLD_MS) {
            timeDetected = true;
            const dbHint = payload.includes('SLEEP') ? 'MySQL' :
                payload.includes('pg_sleep') ? 'PostgreSQL' :
                    payload.includes('WAITFOR') ? 'MSSQL' : 'Unknown';
            findings.push({
                id: `sqli-time-${idx}-${point.name}`,
                severity: 'critical',
                title: `Time-Based Blind SQL Injection in ${label}`,
                description: `Injecting a ${dbHint} time-delay payload into ${label} at ${point.action} caused the response to take ${result.elapsed}ms (baseline: ${baselineElapsed}ms, delta: +${extraTime}ms). This strongly indicates the SQL delay function executed, confirming blind SQL injection.`,
                recommendation: `Use parameterized queries. Time-based blind SQLi allows attackers to extract data one bit at a time by observing response delays.`,
                evidence: `Baseline: ${baselineElapsed}ms, Delayed: ${result.elapsed}ms (payload: ${payload.substring(0, 40)}...)`,
            });
        }
    }

    // -----------------------------------------------------------------------
    // Phase 5: Stacked query detection
    // -----------------------------------------------------------------------
    checksRun++;
    const stackedResult = await sendProbe(point, "1; SELECT 1--");
    allProbeResults.push(stackedResult);

    if (stackedResult) {
        const errorMatch = findSqlErrors(stackedResult.body);
        if (errorMatch && !errorFound) {
            findings.push({
                id: `sqli-stacked-${idx}-${point.name}`,
                severity: 'high',
                title: `Stacked Query Injection Detected in ${label}`,
                description: `Injecting a semicolon-separated query into ${label} at ${point.action} triggered a ${errorMatch.engine} SQL error. The application may allow stacked queries, which could enable an attacker to execute arbitrary SQL commands.`,
                recommendation: `Use parameterized queries and ensure your database driver disables multi-statement execution if not needed.`,
                evidence: truncateEvidence(errorMatch.pattern),
            });
        }
    }

    // -----------------------------------------------------------------------
    // Phase 6: Encoding bypass (only if previous tests didn't find critical)
    // -----------------------------------------------------------------------
    if (!errorFound && point.method === 'GET') {
        checksRun++;
        try {
            const parsed = new URL(point.action);
            const otherParamStr = new URLSearchParams(point.otherParams).toString();
            const base = otherParamStr
                ? `${parsed.origin}${parsed.pathname}?${otherParamStr}&`
                : `${parsed.origin}${parsed.pathname}?`;

            // URL-encoded single quote: %27
            const encodedUrl = `${base}${encodeURIComponent(point.name)}=1%27`;
            // Double-encoded single quote: %2527
            const doubleEncodedUrl = `${base}${encodeURIComponent(point.name)}=1%2527`;

            const [encodedResult, doubleResult] = await Promise.all([
                sendRawProbe(encodedUrl),
                sendRawProbe(doubleEncodedUrl),
            ]);
            allProbeResults.push(encodedResult, doubleResult);

            for (const [result, desc] of [[encodedResult, 'URL-encoded'], [doubleResult, 'double-URL-encoded']] as const) {
                if (!result) continue;
                const errorMatch = findSqlErrors(result.body);
                if (errorMatch) {
                    errorFound = true;
                    findings.push({
                        id: `sqli-encoding-${idx}-${point.name}`,
                        severity: 'critical',
                        title: `SQL Injection via ${desc} Payload in ${label}`,
                        description: `A ${desc} single-quote payload bypassed input filtering in ${label} at ${point.action} and triggered a ${errorMatch.engine} SQL error. This indicates the application decodes URL-encoded input before using it in SQL queries without parameterization.`,
                        recommendation: `Use parameterized queries. URL encoding should not be relied upon as a defense against SQL injection.`,
                        evidence: truncateEvidence(errorMatch.pattern),
                    });
                    break;
                }
            }
        } catch {
            // skip encoding tests on URL parse failure
        }
    }

    return { findings, checksRun, probeResults: allProbeResults };
}

// ---------------------------------------------------------------------------
// NoSQL injection tests
// ---------------------------------------------------------------------------

async function testNoSqlInjection(
    targetUrl: string,
    initialHtml: string,
): Promise<{ findings: Finding[]; checksRun: number }> {
    const findings: Finding[] = [];
    let checksRun = 0;

    // Check initial page for NoSQL errors
    checksRun++;
    const existingNoSql = findNoSqlErrors(initialHtml);
    if (existingNoSql) {
        findings.push({
            id: 'nosql-existing-error',
            severity: 'medium',
            title: `${existingNoSql.engine} Error Message Visible`,
            description: `The page already displays a ${existingNoSql.engine} error message, revealing the NoSQL database technology in use.`,
            recommendation: `Configure custom error pages. Never expose raw database errors to end users.`,
            evidence: truncateEvidence(existingNoSql.pattern),
        });
    }

    // Test MongoDB operator injection on URL params
    try {
        const parsed = new URL(targetUrl);
        const params = Array.from(parsed.searchParams.entries());
        if (params.length > 0) {
            checksRun++;
            // Test first param with MongoDB operator injection
            const [testParam] = params[0];
            const baseUrl = parsed.origin + parsed.pathname;

            // MongoDB $ne operator injection: param[$ne]=1
            const nosqlUrl = `${baseUrl}?${testParam}[$ne]=`;
            const nosqlResult = await sendRawProbe(nosqlUrl);
            if (nosqlResult) {
                const noSqlError = findNoSqlErrors(nosqlResult.body);
                if (noSqlError) {
                    findings.push({
                        id: `nosql-operator-injection-${testParam}`,
                        severity: 'high',
                        title: `NoSQL Operator Injection in "${testParam}"`,
                        description: `Injecting a MongoDB $ne operator into "${testParam}" triggered a ${noSqlError.engine} error. The application may be vulnerable to NoSQL injection, allowing attackers to bypass authentication or extract data.`,
                        recommendation: `Sanitize user input and validate data types. Use MongoDB query builders that prevent operator injection. Never pass raw user input into query objects.`,
                        evidence: truncateEvidence(noSqlError.pattern),
                    });
                }

                // Check if response differs significantly (auth bypass)
                const normalResult = await sendRawProbe(`${baseUrl}?${testParam}=1`);
                if (normalResult && nosqlResult.length > normalResult.length + 200) {
                    findings.push({
                        id: `nosql-bypass-${testParam}`,
                        severity: 'high',
                        title: `Possible NoSQL Auth Bypass in "${testParam}"`,
                        description: `MongoDB $ne operator in "${testParam}" returned ${nosqlResult.length - normalResult.length} extra bytes, suggesting it bypassed a filter or returned unauthorized data.`,
                        recommendation: `Use explicit type checking and query builders. Validate that query parameters are the expected type (string, number) before using them in database queries.`,
                        evidence: `Normal: ${normalResult.length}b, $ne injection: ${nosqlResult.length}b`,
                    });
                }
            }
        }
    } catch {
        // skip
    }

    return { findings, checksRun };
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
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
        // Step 1: Fetch the initial page
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
                    description: `The page at ${targetUrl} already displays a ${existingError.engine} SQL error without any injection. This leaks database implementation details.`,
                    recommendation: `Configure custom error pages and disable detailed error output in production.`,
                    evidence: truncateEvidence(existingError.pattern),
                });
            }
        } catch {
            return new Response(JSON.stringify({
                scannerType: 'sqli',
                score: 0,
                checksRun: 1,
                findings: [{
                    id: 'sqli-fetch-failed',
                    severity: 'info',
                    title: 'Unable to Fetch Target Page',
                    description: `Could not retrieve ${targetUrl}. The site may be unreachable or blocking automated requests.`,
                    recommendation: 'Verify the URL is correct and the site is accessible.',
                }],
                scannedAt: new Date().toISOString(),
                url: targetUrl,
            }), {
                headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
            });
        }

        // -----------------------------------------------------------------
        // Step 2: Extract injectable points (URL + forms + common params)
        // -----------------------------------------------------------------
        const forms = extractForms(initialHtml, targetUrl);
        const injectablePoints = collectInjectablePoints(targetUrl, forms);

        if (injectablePoints.length === 0) {
            findings.push({
                id: 'sqli-no-params',
                severity: 'info',
                title: 'No Injectable Parameters Detected',
                description: `No URL query parameters, form inputs, or common parameter names produced testable injection points on ${targetUrl}. Other endpoints or APIs may still be vulnerable.`,
                recommendation: 'Scan individual pages with query parameters or form fields. API endpoints should be tested separately.',
            });
        }

        // -----------------------------------------------------------------
        // Step 3: Test each injectable point (all techniques)
        // -----------------------------------------------------------------
        const allProbeResults: (ProbeResult | null)[] = [];
        for (let i = 0; i < injectablePoints.length; i++) {
            const point = injectablePoints[i];
            const result = await testInjectionPoint(point, i);
            findings.push(...result.findings);
            checksRun += result.checksRun;
            allProbeResults.push(...result.probeResults);
        }

        // -----------------------------------------------------------------
        // Step 4: NoSQL injection tests
        // -----------------------------------------------------------------
        const noSqlResult = await testNoSqlInjection(targetUrl, initialHtml);
        findings.push(...noSqlResult.findings);
        checksRun += noSqlResult.checksRun;

        // -----------------------------------------------------------------
        // Step 5: WAF detection
        // -----------------------------------------------------------------
        checksRun++;
        const wafDetected = detectWaf(allProbeResults);
        if (wafDetected) {
            findings.push({
                id: 'sqli-waf-detected',
                severity: 'info',
                title: 'Web Application Firewall Detected',
                description: `A WAF appears to be blocking injection payloads (many responses returned 403/406 or contained WAF signatures). Scanner results may be incomplete as payloads are being filtered. The presence of a WAF adds defense-in-depth but should not be the sole protection against SQL injection.`,
                recommendation: 'WAFs provide valuable protection but can be bypassed. Ensure parameterized queries are used at the application level as the primary defense.',
            });
        }

        // -----------------------------------------------------------------
        // Step 6: Information disclosure patterns
        // -----------------------------------------------------------------
        checksRun++;
        const infoDisclosurePatterns = [
            { pattern: /stack\s*trace/i, title: 'Stack Trace Exposed' },
            { pattern: /Traceback \(most recent call last\)/i, title: 'Python Traceback Exposed' },
            { pattern: /at\s+[\w$.]+\([\w/.]+:\d+:\d+\)/i, title: 'Application Stack Trace Exposed' },
            { pattern: /DB_HOST|DB_PASSWORD|DB_NAME|DATABASE_URL/i, title: 'Database Configuration Exposed' },
            { pattern: /SQLCONNECTIONSTRING|CONNECTIONSTRING/i, title: 'Connection String Exposed' },
            { pattern: /server version:.*?(mysql|mariadb|postgresql|microsoft sql)/i, title: 'Database Version Exposed' },
            { pattern: /phpinfo\(\)/i, title: 'PHP Info Page Detected' },
            { pattern: /DJANGO_SETTINGS_MODULE|SECRET_KEY\s*=/i, title: 'Framework Configuration Exposed' },
            { pattern: /\.env\s+file|dotenv/i, title: 'Environment File Reference Exposed' },
        ];

        for (const { pattern, title } of infoDisclosurePatterns) {
            if (pattern.test(initialHtml)) {
                findings.push({
                    id: `sqli-info-disclosure-${title.toLowerCase().replace(/\s+/g, '-')}`,
                    severity: 'medium',
                    title,
                    description: `The page response contains ${title.toLowerCase()} information that helps attackers understand the application's database architecture.`,
                    recommendation: 'Disable verbose error output and stack traces in production. Use centralized logging.',
                    evidence: truncateEvidence(initialHtml.match(pattern)?.[0] || ''),
                });
            }
        }

        // -----------------------------------------------------------------
        // Step 7: Calculate score
        // -----------------------------------------------------------------
        for (const finding of findings) {
            switch (finding.severity) {
                case 'critical': score -= 40; break;
                case 'high': score -= 25; break;
                case 'medium': score -= 15; break;
                case 'low': score -= 5; break;
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
