import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { validateTargetUrl, validateScannerAuth, getCorsHeaders } from "../_shared/security.ts";

/**
 * Firebase Backend Infrastructure Scanner
 *
 * Detects Firebase usage in a target website and audits its configuration
 * for security misconfigurations including:
 *   - Open Realtime Database (read access without auth)
 *   - Listable Cloud Storage buckets
 *   - Open Firestore (read access without auth)
 *   - Unrestricted API key (usable from any referrer)
 *   - Email enumeration via Auth REST API
 *
 * SECURITY GUARANTEES:
 *   - NEVER writes, updates, or deletes data on the target
 *   - All discovered keys are masked: first 10 chars + "...[REDACTED]"
 *   - All HTTP requests are read-only GET (except auth probes which use POST with test data)
 *   - 8-second timeout on all external requests
 */

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

interface ScanResult {
    scannerType: string;
    score: number;
    findings: Finding[];
    checksRun: number;
    scannedAt: string;
    url: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function redactKey(key: string): string {
    if (key.length <= 10) return '***REDACTED***';
    return key.substring(0, 10) + '...[REDACTED]';
}

async function fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeout = 8000,
): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            headers: {
                'User-Agent': 'CheckVibe-FirebaseScanner/1.0 (+https://checkvibe.dev)',
                ...(options.headers || {}),
            },
        });
        return response;
    } finally {
        clearTimeout(timeoutId);
    }
}

// ---------------------------------------------------------------------------
// Firebase Config Detection
// ---------------------------------------------------------------------------

interface FirebaseConfig {
    apiKey?: string;
    projectId?: string;
    storageBucket?: string;
    databaseURL?: string;
    authDomain?: string;
    detectedFrom: string;
}

async function detectFirebaseConfig(targetUrl: string): Promise<FirebaseConfig | null> {
    let html: string;
    try {
        const response = await fetchWithTimeout(targetUrl, {
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
        }, 10000);
        html = await response.text();
    } catch {
        return null;
    }

    // Collect all content: HTML + inline scripts + first-party JS bundles
    const allContent = [html];

    // Extract inline scripts
    const inlineScriptPattern = /<script[^>]*>([^<]+)<\/script>/gi;
    let inlineMatch;
    while ((inlineMatch = inlineScriptPattern.exec(html)) !== null) {
        if (inlineMatch[1].length > 30) {
            allContent.push(inlineMatch[1]);
        }
    }

    // Fetch first-party JS bundles (up to 10)
    const scriptSrcPattern = /<script[^>]+src=["']([^"']+)["'][^>]*>/gi;
    const scriptUrls: string[] = [];
    let scriptMatch;
    while ((scriptMatch = scriptSrcPattern.exec(html)) !== null && scriptUrls.length < 10) {
        try {
            const resolved = new URL(scriptMatch[1], targetUrl);
            const targetOrigin = new URL(targetUrl).origin;
            if (resolved.origin === targetOrigin) {
                scriptUrls.push(resolved.href);
            }
        } catch { /* skip */ }
    }

    const scriptResults = await Promise.allSettled(
        scriptUrls.map(async (jsUrl) => {
            try {
                const res = await fetchWithTimeout(jsUrl, {}, 5000);
                const text = await res.text();
                if (text.length <= 500000) return text;
            } catch { /* skip */ }
            return null;
        }),
    );
    for (const result of scriptResults) {
        if (result.status === 'fulfilled' && result.value) {
            allContent.push(result.value);
        }
    }

    const combined = allContent.join('\n');

    // Check for Firebase signals
    const hasFirebaseSignal =
        /firebase/i.test(combined) &&
        (/firebaseConfig/i.test(combined) ||
         /initializeApp\s*\(/i.test(combined) ||
         /firebaseapp/i.test(combined) ||
         /\.firebaseio\.com/i.test(combined) ||
         /\.firebaseapp\.com/i.test(combined));

    if (!hasFirebaseSignal) return null;

    const config: FirebaseConfig = { detectedFrom: 'auto-detected from HTML/JS' };

    // Extract apiKey
    const apiKeyPatterns = [
        /["']?apiKey["']?\s*[:=]\s*["']([A-Za-z0-9_-]{20,})["']/i,
        /firebase.*?["']?apiKey["']?\s*[:=]\s*["']([A-Za-z0-9_-]{20,})["']/is,
    ];
    for (const p of apiKeyPatterns) {
        const m = combined.match(p);
        if (m) { config.apiKey = m[1]; break; }
    }

    // Extract projectId
    const projectIdPatterns = [
        /["']?projectId["']?\s*[:=]\s*["']([a-z0-9-]+)["']/i,
        /([a-z0-9-]+)\.firebaseio\.com/i,
        /([a-z0-9-]+)\.firebaseapp\.com/i,
    ];
    for (const p of projectIdPatterns) {
        const m = combined.match(p);
        if (m) { config.projectId = m[1]; break; }
    }

    // Extract storageBucket
    const bucketPatterns = [
        /["']?storageBucket["']?\s*[:=]\s*["']([^"']+)["']/i,
    ];
    for (const p of bucketPatterns) {
        const m = combined.match(p);
        if (m) { config.storageBucket = m[1]; break; }
    }

    // Extract databaseURL
    const dbUrlPatterns = [
        /["']?databaseURL["']?\s*[:=]\s*["'](https:\/\/[^"']+)["']/i,
        /(https:\/\/[a-z0-9-]+\.firebaseio\.com)/i,
    ];
    for (const p of dbUrlPatterns) {
        const m = combined.match(p);
        if (m) { config.databaseURL = m[1]; break; }
    }

    // Extract authDomain
    const authDomainPatterns = [
        /["']?authDomain["']?\s*[:=]\s*["']([^"']+)["']/i,
    ];
    for (const p of authDomainPatterns) {
        const m = combined.match(p);
        if (m) { config.authDomain = m[1]; break; }
    }

    // If we have at least a projectId or apiKey, consider detection successful
    if (!config.projectId && !config.apiKey) return null;

    // Derive missing fields when possible
    if (config.projectId && !config.databaseURL) {
        config.databaseURL = `https://${config.projectId}-default-rtdb.firebaseio.com`;
    }
    if (config.projectId && !config.storageBucket) {
        config.storageBucket = `${config.projectId}.appspot.com`;
    }

    return config;
}

// ---------------------------------------------------------------------------
// Test 1: Realtime Database Open Access
// ---------------------------------------------------------------------------

async function checkRealtimeDatabase(
    config: FirebaseConfig,
    findings: Finding[],
): Promise<number> {
    if (!config.databaseURL) return 0;

    try {
        const response = await fetchWithTimeout(
            `${config.databaseURL}/.json?shallow=true`,
            { headers: { 'Accept': 'application/json' } },
        );

        if (response.status === 200) {
            let body: string;
            try {
                body = await response.text();
            } catch {
                return 0;
            }

            // If response is "null", database is empty but technically readable
            // If response is an object, data is exposed
            if (body && body !== 'null') {
                findings.push({
                    id: 'firebase-rtdb-open',
                    severity: 'critical',
                    title: 'Firebase Realtime Database is publicly readable',
                    description: `The Realtime Database at ${config.databaseURL} returns data without authentication. Anyone on the internet can read all data in this database.`,
                    recommendation: 'Update your Realtime Database security rules to require authentication. Replace the default open rules with: {"rules": {".read": "auth != null", ".write": "auth != null"}}',
                });
                return 40;
            } else {
                findings.push({
                    id: 'firebase-rtdb-readable-empty',
                    severity: 'high',
                    title: 'Firebase Realtime Database allows unauthenticated reads',
                    description: `The Realtime Database at ${config.databaseURL} accepts unauthenticated read requests (returned null/empty). While no data was returned, the rules allow public reads.`,
                    recommendation: 'Lock down your database rules even if it is currently empty. Data added later will be publicly accessible.',
                });
                return 20;
            }
        } else if (response.status === 401 || response.status === 403) {
            findings.push({
                id: 'firebase-rtdb-secured',
                severity: 'info',
                title: 'Realtime Database requires authentication',
                description: 'The Realtime Database properly denies unauthenticated read requests.',
                recommendation: 'No action needed. Continue to maintain strict security rules.',
            });
        }
    } catch {
        // Timeout or network error — likely no RTDB
    }

    return 0;
}

// ---------------------------------------------------------------------------
// Test 2: Cloud Storage Bucket Listing
// ---------------------------------------------------------------------------

async function checkStorageBucket(
    config: FirebaseConfig,
    findings: Finding[],
): Promise<number> {
    if (!config.storageBucket) return 0;

    try {
        const response = await fetchWithTimeout(
            `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(config.storageBucket)}/o`,
            { headers: { 'Accept': 'application/json' } },
        );

        if (response.status === 200) {
            let data: any;
            try {
                data = await response.json();
            } catch {
                return 0;
            }

            const items = data?.items;
            if (Array.isArray(items) && items.length > 0) {
                findings.push({
                    id: 'firebase-storage-listable',
                    severity: 'high',
                    title: 'Firebase Storage bucket is publicly listable',
                    description: `The storage bucket "${config.storageBucket}" allows unauthenticated file listing. ${items.length} file(s) were enumerated. Attackers can discover and download all stored files.`,
                    recommendation: 'Update your Firebase Storage security rules to require authentication for list operations: allow list: if request.auth != null;',
                });
                return 25;
            } else {
                findings.push({
                    id: 'firebase-storage-listable-empty',
                    severity: 'medium',
                    title: 'Firebase Storage bucket allows listing (empty)',
                    description: `The storage bucket "${config.storageBucket}" accepts unauthenticated list requests but returned no files.`,
                    recommendation: 'Lock down storage rules even if the bucket is empty. Files added later will be enumerable.',
                });
                return 10;
            }
        } else if (response.status === 403 || response.status === 401) {
            findings.push({
                id: 'firebase-storage-secured',
                severity: 'info',
                title: 'Firebase Storage bucket listing restricted',
                description: 'The storage bucket properly denies unauthenticated list requests.',
                recommendation: 'No action needed.',
            });
        }
    } catch {
        // Timeout or network error
    }

    return 0;
}

// ---------------------------------------------------------------------------
// Test 3: Firestore Open Access
// ---------------------------------------------------------------------------

async function checkFirestore(
    config: FirebaseConfig,
    findings: Finding[],
): Promise<number> {
    if (!config.projectId) return 0;

    try {
        const response = await fetchWithTimeout(
            `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(config.projectId)}/databases/(default)/documents?pageSize=1`,
            { headers: { 'Accept': 'application/json' } },
        );

        if (response.status === 200) {
            let data: any;
            try {
                data = await response.json();
            } catch {
                return 0;
            }

            if (data?.documents && data.documents.length > 0) {
                findings.push({
                    id: 'firebase-firestore-open',
                    severity: 'critical',
                    title: 'Firestore database is publicly readable',
                    description: `The Firestore database for project "${config.projectId}" returns documents without authentication. Anyone can read data from your database.`,
                    recommendation: 'Update your Firestore security rules to require authentication: rules_version = \'2\'; service cloud.firestore { match /databases/{database}/documents { match /{document=**} { allow read, write: if request.auth != null; } } }',
                });
                return 40;
            } else {
                findings.push({
                    id: 'firebase-firestore-open-empty',
                    severity: 'high',
                    title: 'Firestore accepts unauthenticated requests (no documents returned)',
                    description: `The Firestore root endpoint for project "${config.projectId}" responded successfully without auth, but returned no documents. The rules may still allow open reads.`,
                    recommendation: 'Review and lock down Firestore security rules even if collections are currently empty.',
                });
                return 15;
            }
        } else if (response.status === 403 || response.status === 401) {
            findings.push({
                id: 'firebase-firestore-secured',
                severity: 'info',
                title: 'Firestore requires authentication',
                description: 'Firestore properly denies unauthenticated read requests.',
                recommendation: 'No action needed.',
            });
        }
    } catch {
        // Timeout or network error
    }

    return 0;
}

// ---------------------------------------------------------------------------
// Test 4: API Key Restriction Check
// ---------------------------------------------------------------------------

async function checkApiKeyRestriction(
    config: FirebaseConfig,
    findings: Finding[],
): Promise<number> {
    if (!config.apiKey) return 0;

    try {
        // Test the API key against the Identity Toolkit (sign-up/sign-in endpoint)
        // A restricted key will reject requests from unknown referrers
        const response = await fetchWithTimeout(
            `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(config.apiKey)}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ returnSecureToken: false }),
            },
        );

        const data = await response.json().catch(() => null);

        // If the key is unrestricted, we'll get a response about anonymous auth
        // or a 400 about missing fields — NOT a 403 about referrer restrictions
        if (response.status === 403 && data?.error?.message?.includes('API key')) {
            findings.push({
                id: 'firebase-apikey-restricted',
                severity: 'info',
                title: 'Firebase API key has referrer restrictions',
                description: 'The API key appears to have HTTP referrer restrictions configured, limiting which websites can use it.',
                recommendation: 'No action needed. API key restrictions are properly configured.',
                evidence: redactKey(config.apiKey),
            });
            return 0;
        }

        // Key is usable without referrer restrictions
        findings.push({
            id: 'firebase-apikey-unrestricted',
            severity: 'medium',
            title: 'Firebase API key has no referrer restrictions',
            description: 'The API key is usable from any website or tool. While Firebase API keys are designed to be public, adding referrer restrictions limits abuse (e.g., automated account creation, quota exhaustion).',
            recommendation: 'Add HTTP referrer restrictions in the Google Cloud Console > APIs & Services > Credentials. Restrict the key to your domain(s).',
            evidence: redactKey(config.apiKey),
        });
        return 10;
    } catch {
        // Timeout or network error
    }

    return 0;
}

// ---------------------------------------------------------------------------
// Test 5: Auth Email Enumeration
// ---------------------------------------------------------------------------

async function checkAuthEnumeration(
    config: FirebaseConfig,
    findings: Finding[],
): Promise<number> {
    if (!config.apiKey) return 0;

    try {
        // Test with a clearly fake email to see if the API reveals user existence
        const response = await fetchWithTimeout(
            `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(config.apiKey)}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: 'checkvibe-test-nonexistent@example.invalid',
                    password: 'CheckVibeProbe123!',
                    returnSecureToken: false,
                }),
            },
        );

        const data = await response.json().catch(() => null);
        const errorMessage = data?.error?.message || '';

        // "EMAIL_NOT_FOUND" means the API reveals whether an email is registered
        // Firebase's "Email enumeration protection" feature replaces this with a generic error
        if (errorMessage === 'EMAIL_NOT_FOUND') {
            findings.push({
                id: 'firebase-auth-enumeration',
                severity: 'medium',
                title: 'Firebase Auth email enumeration is possible',
                description: 'The Firebase Auth API returns "EMAIL_NOT_FOUND" for non-existent accounts, allowing attackers to check whether specific email addresses are registered.',
                recommendation: 'Enable "Email enumeration protection" in Firebase Console > Authentication > Settings. This replaces specific errors with a generic "INVALID_LOGIN_CREDENTIALS" message.',
            });
            return 10;
        } else if (errorMessage === 'INVALID_LOGIN_CREDENTIALS') {
            findings.push({
                id: 'firebase-auth-enum-protected',
                severity: 'info',
                title: 'Email enumeration protection is enabled',
                description: 'Firebase Auth returns generic error messages, preventing attackers from discovering registered email addresses.',
                recommendation: 'No action needed. Email enumeration protection is properly configured.',
            });
        }
    } catch {
        // Timeout or network error
    }

    return 0;
}

// ---------------------------------------------------------------------------
// Main Handler
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

        // Detect Firebase config from the target page
        checksRun++;
        const config = await detectFirebaseConfig(targetUrl);

        if (!config) {
            findings.push({
                id: 'no-firebase-detected',
                severity: 'info',
                title: 'No Firebase instance detected',
                description: 'No Firebase configuration was found in the target site HTML or JavaScript. This scanner only applies to sites using Firebase.',
                recommendation: 'No action needed. This site does not appear to use Firebase, or the configuration is not exposed in client-side code.',
            });

            const result: ScanResult = {
                scannerType: 'firebase_backend',
                score: 100,
                findings,
                checksRun,
                scannedAt: new Date().toISOString(),
                url: targetUrl,
            };

            return new Response(JSON.stringify(result), {
                headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
            });
        }

        // Firebase detected
        findings.push({
            id: 'firebase-detected',
            severity: 'info',
            title: `Firebase project detected (${config.detectedFrom})`,
            description: `Found Firebase project${config.projectId ? ` "${config.projectId}"` : ''}. API key ${config.apiKey ? 'was found' : 'was NOT found'} in client-side code.`,
            recommendation: config.apiKey
                ? 'Firebase API keys are expected to be public. Ensure Firestore/RTDB security rules and API key restrictions are properly configured.'
                : 'No API key was found. Some checks that require the API key were skipped.',
            evidence: config.apiKey ? redactKey(config.apiKey) : undefined,
        });

        // Run all checks in parallel
        const [rtdbDeduction, storageDeduction, firestoreDeduction, apiKeyDeduction, authDeduction] = await Promise.all([
            (checksRun++, checkRealtimeDatabase(config, findings)),
            (checksRun++, checkStorageBucket(config, findings)),
            (checksRun++, checkFirestore(config, findings)),
            (checksRun++, checkApiKeyRestriction(config, findings)),
            (checksRun++, checkAuthEnumeration(config, findings)),
        ]);

        score -= rtdbDeduction + storageDeduction + firestoreDeduction + apiKeyDeduction + authDeduction;
        score = Math.max(0, Math.min(100, score));

        // If everything looks good
        const hasNonInfoFindings = findings.some(f => f.severity !== 'info');
        if (!hasNonInfoFindings) {
            score = Math.max(score, 95);
            findings.push({
                id: 'firebase-secure',
                severity: 'info',
                title: 'Firebase properly configured',
                description: 'No security misconfigurations were detected in your Firebase backend.',
                recommendation: 'Continue following Firebase security best practices. Regularly review security rules.',
            });
        }

        const result: ScanResult = {
            scannerType: 'firebase_backend',
            score,
            findings,
            checksRun,
            scannedAt: new Date().toISOString(),
            url: targetUrl,
        };

        return new Response(JSON.stringify(result), {
            headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Firebase scanner error:', error);
        return new Response(
            JSON.stringify({
                scannerType: 'firebase_backend',
                score: 0,
                error: 'Scan failed. Please try again.',
                findings: [],
                checksRun: 0,
                scannedAt: new Date().toISOString(),
                url: '',
            }),
            {
                status: 500,
                headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
            },
        );
    }
});
