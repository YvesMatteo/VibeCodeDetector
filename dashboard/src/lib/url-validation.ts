/**
 * Shared URL validation and SSRF protection.
 * Single source of truth for private/reserved IP pattern matching.
 *
 * Includes DNS rebinding mitigation: resolveAndValidateUrl() resolves
 * the hostname and checks the actual IP address against private ranges.
 */

import dns from 'dns';

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

/** TLDs reserved for internal/private networks. */
const PRIVATE_TLDS = ['.local', '.internal', '.corp', '.home', '.lan'];

/** Check if a hostname matches any private/reserved IP pattern or internal TLD. */
export function isPrivateHostname(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (PRIVATE_TLDS.some(tld => lower.endsWith(tld))) {
    return true;
  }
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

/**
 * Private/reserved IP patterns for resolved addresses.
 * These match the actual IP string returned by dns.lookup().
 */
const PRIVATE_IP_PATTERNS = [
  /^127\.\d+\.\d+\.\d+$/,           // IPv4 loopback
  /^10\.\d+\.\d+\.\d+$/,            // RFC 1918 Class A
  /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/, // RFC 1918 Class B
  /^192\.168\.\d+\.\d+$/,           // RFC 1918 Class C
  /^169\.254\.\d+\.\d+$/,           // Link-local
  /^0\.\d+\.\d+\.\d+$/,             // "This" network
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.\d+\.\d+$/, // CGNAT (RFC 6598)
  /^192\.0\.0\.\d+$/,               // IETF protocol assignments
  /^192\.0\.2\.\d+$/,               // TEST-NET-1
  /^198\.5[01]\.\d+\.\d+$/,         // Benchmarking (RFC 2544)
  /^198\.18\.\d+\.\d+$/,            // Benchmarking (RFC 2544)
  /^203\.0\.113\.\d+$/,             // TEST-NET-3
  /^::1$/,                           // IPv6 loopback
  /^fe80:/i,                         // IPv6 link-local
  /^fc00:/i,                         // IPv6 unique local (ULA)
  /^fd[0-9a-f]{2}:/i,               // IPv6 unique local (ULA)
  /^::$/,                            // IPv6 unspecified
  /^::ffff:127\./i,                  // IPv4-mapped loopback
  /^::ffff:10\./i,                   // IPv4-mapped RFC 1918
  /^::ffff:172\.(1[6-9]|2\d|3[01])\./i, // IPv4-mapped RFC 1918
  /^::ffff:192\.168\./i,            // IPv4-mapped RFC 1918
  /^::ffff:169\.254\./i,            // IPv4-mapped link-local
];

/** Check if a resolved IP address is private/reserved. */
function isPrivateIP(ip: string): boolean {
  return PRIVATE_IP_PATTERNS.some(p => p.test(ip));
}

/**
 * Resolve a URL's hostname via DNS and validate the resolved IP
 * is not private/reserved. This mitigates DNS rebinding attacks where
 * a hostname string passes basic checks but resolves to 127.0.0.1 etc.
 *
 * Should be called AFTER validateTargetUrl() or isPrivateHostname() on
 * async code paths (route handlers) before making any outbound HTTP request.
 */
export async function resolveAndValidateUrl(
  url: string
): Promise<{ valid: true; resolvedIP: string } | { valid: false; error: string }> {
  // Step 1: Run existing string-based hostname checks
  let parsed: URL;
  try {
    parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }

  if (isPrivateHostname(parsed.hostname)) {
    return { valid: false, error: 'Internal URLs are not allowed' };
  }

  // Step 2: Resolve hostname to IP via DNS
  let resolvedIP: string;
  try {
    const result = await dns.promises.lookup(parsed.hostname, { family: 0 });
    resolvedIP = result.address;
  } catch {
    return { valid: false, error: 'Unable to resolve hostname' };
  }

  // Step 3: Check if resolved IP is private/reserved
  if (isPrivateIP(resolvedIP)) {
    return {
      valid: false,
      error: 'URL resolves to a private/reserved IP address',
    };
  }

  return { valid: true, resolvedIP };
}
