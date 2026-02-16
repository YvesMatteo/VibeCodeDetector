// SSRF Protection: validate URL is not targeting internal/private networks
export function isPrivateOrReservedIP(hostname: string): boolean {
  // Check hostname patterns (not full DNS resolution, but catches common cases)
  const privatePatterns = [
    /^localhost$/i,
    /^127\.\d+\.\d+\.\d+$/,
    /^10\.\d+\.\d+\.\d+$/,
    /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/,
    /^192\.168\.\d+\.\d+$/,
    /^169\.254\.\d+\.\d+$/,
    /^0\.0\.0\.0$/,
    /^\[::1\]$/,
    /^::1$/,
    /^fc00:/i,
    /^fd00:/i,
    /^fe80:/i,
    /^100\.(6[4-9]|[7-9]\d|1[0-2]\d|127)\.\d+\.\d+$/, // CGNAT
  ];
  return privatePatterns.some(p => p.test(hostname));
}

export function validateTargetUrl(targetUrl: unknown): { valid: boolean; url?: string; error?: string } {
  if (!targetUrl || typeof targetUrl !== 'string') {
    return { valid: false, error: 'targetUrl is required and must be a string' };
  }
  if (targetUrl.length > 2048) {
    return { valid: false, error: 'targetUrl exceeds maximum length of 2048 characters' };
  }

  const urlStr = targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`;

  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { valid: false, error: 'Only http and https protocols are allowed' };
  }

  if (parsed.username || parsed.password) {
    return { valid: false, error: 'URLs with credentials are not allowed' };
  }

  if (isPrivateOrReservedIP(parsed.hostname)) {
    return { valid: false, error: 'URLs targeting private/internal networks are not allowed' };
  }

  return { valid: true, url: urlStr };
}

export function validateScannerAuth(req: Request): boolean {
  const authKey = req.headers.get('x-scanner-key');
  const expectedKey = Deno.env.get('SCANNER_SECRET_KEY');
  if (!expectedKey || !authKey) return false; // Fail closed if not configured
  // Constant-time comparison to prevent timing attacks
  if (authKey.length !== expectedKey.length) return false;
  const encoder = new TextEncoder();
  const a = encoder.encode(authKey);
  const b = encoder.encode(expectedKey);
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

// ---------------------------------------------------------------------------
// SPA Catch-All Detection
// ---------------------------------------------------------------------------
// Many modern sites (Next.js, Framer, React Router) return 200 for ANY path,
// serving the same HTML shell. This causes massive false positives when
// scanners probe paths like /backup.sql, /wp-json/wp/v2/, /login etc.
// This utility detects catch-all behavior by comparing a random probe against
// the homepage response.

export interface SpaCheckResult {
  isCatchAll: boolean;
  /** Fingerprint (trimmed hash) of the catch-all page, if detected */
  pageFingerprint?: string;
}

/**
 * Detect if a site serves a catch-all response (SPA).
 * Compares the homepage body length against a random nonsense path.
 * If both return 200 with the same length (within 5%), it's a catch-all.
 */
export async function detectSpaCatchAll(
  targetUrl: string,
  homepageLength: number,
  fetchFn: (url: string, opts?: RequestInit) => Promise<Response>,
): Promise<SpaCheckResult> {
  try {
    const randomSlug = `_cv_probe_${Math.random().toString(36).slice(2, 10)}`;
    const probeUrl = new URL(`/${randomSlug}`, targetUrl).href;
    const res = await fetchFn(probeUrl, { method: 'GET' });
    if (res.status !== 200) return { isCatchAll: false };
    const probeBody = await res.text();
    const probeLen = probeBody.length;
    // If both are within 5% of each other and Content-Type is HTML, it's catch-all
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('text/html')) return { isCatchAll: false };
    const diff = Math.abs(probeLen - homepageLength);
    const maxLen = Math.max(probeLen, homepageLength, 1);
    if (diff / maxLen < 0.05) {
      return { isCatchAll: true, pageFingerprint: String(probeLen) };
    }
    return { isCatchAll: false };
  } catch {
    return { isCatchAll: false };
  }
}

/**
 * Quick check: does this specific probe path return the catch-all page?
 * Use after detecting SPA to validate individual probe results.
 */
export function looksLikeCatchAllResponse(
  contentType: string | null,
  bodyLength: number,
  catchAllLength: number,
): boolean {
  if (!contentType?.includes('text/html')) return false;
  const diff = Math.abs(bodyLength - catchAllLength);
  const maxLen = Math.max(bodyLength, catchAllLength, 1);
  return diff / maxLen < 0.05;
}

export function getCorsHeaders(req: Request): Record<string, string> {
  // Support comma-separated list via ALLOWED_ORIGINS env, fall back to production domain
  const originsEnv = Deno.env.get('ALLOWED_ORIGINS') || Deno.env.get('ALLOWED_ORIGIN') || '';
  const allowedOrigins = originsEnv
    ? originsEnv.split(',').map(o => o.trim()).filter(Boolean)
    : ['https://checkvibe.dev'];

  const origin = req.headers.get('Origin') || '';
  const allowOrigin = allowedOrigins.includes(origin) ? origin : '';

  return {
    ...(allowOrigin ? { 'Access-Control-Allow-Origin': allowOrigin } : {}),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-scanner-key',
  };
}
