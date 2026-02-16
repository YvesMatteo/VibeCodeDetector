/**
 * Shared URL validation and SSRF protection.
 * Single source of truth for private/reserved IP pattern matching.
 */

const PRIVATE_PATTERNS = [
  /^localhost$/i,
  /^127\.\d+\.\d+\.\d+$/,
  /^10\.\d+\.\d+\.\d+$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/,
  /^192\.168\.\d+\.\d+$/,
  /^169\.254\.\d+\.\d+$/,
  /^0\.\d+\.\d+\.\d+$/,
  /^\[?::1\]?$/,
  /^\[?fe80:/i,
  /^\[?fc00:/i,
  /^\[?fd[0-9a-f]{2}:/i,
  /^\d+$/,     // Pure numeric hostname (decimal IP encoding)
  /^0x/i,      // Hex-encoded IP
];

/** Check if a hostname matches any private/reserved IP pattern. */
export function isPrivateHostname(hostname: string): boolean {
  return PRIVATE_PATTERNS.some(p => p.test(hostname));
}

/**
 * Validate a user-provided URL for safety.
 * Returns the parsed URL on success, or an error message string on failure.
 */
export function validateTargetUrl(url: string): { valid: true; parsed: URL } | { valid: false; error: string } {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL is required' };
  }
  if (url.length > 2048) {
    return { valid: false, error: 'URL exceeds maximum length' };
  }

  const targetUrl = url.startsWith('http') ? url : `https://${url}`;
  let parsed: URL;
  try {
    parsed = new URL(targetUrl);
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { valid: false, error: 'Only http/https URLs are allowed' };
  }

  if (isPrivateHostname(parsed.hostname)) {
    return { valid: false, error: 'Internal URLs are not allowed' };
  }

  return { valid: true, parsed };
}
