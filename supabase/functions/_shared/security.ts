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

export function getCorsHeaders(req: Request): Record<string, string> {
  const allowedOrigins = [
    Deno.env.get('ALLOWED_ORIGIN') || 'https://checkvibe.online',
  ];
  const origin = req.headers.get('Origin') || '';
  // Only set CORS header if origin matches
  const allowOrigin = allowedOrigins.includes(origin) ? origin : '';

  return {
    ...(allowOrigin ? { 'Access-Control-Allow-Origin': allowOrigin } : {}),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-scanner-key',
  };
}
