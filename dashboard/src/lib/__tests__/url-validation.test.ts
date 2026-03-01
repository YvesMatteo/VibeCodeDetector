import { describe, it, expect } from 'vitest';
import { isPrivateHostname, validateTargetUrl } from '@/lib/url-validation';

// ==========================================================================
// isPrivateHostname
// ==========================================================================
describe('isPrivateHostname', () => {
  it('blocks localhost', () => {
    expect(isPrivateHostname('localhost')).toBe(true);
    expect(isPrivateHostname('LOCALHOST')).toBe(true);
  });

  it('blocks 127.x.x.x loopback range', () => {
    expect(isPrivateHostname('127.0.0.1')).toBe(true);
    expect(isPrivateHostname('127.255.255.255')).toBe(true);
  });

  it('blocks 10.x.x.x private range', () => {
    expect(isPrivateHostname('10.0.0.1')).toBe(true);
    expect(isPrivateHostname('10.255.255.255')).toBe(true);
  });

  it('blocks 172.16-31.x.x private range', () => {
    expect(isPrivateHostname('172.16.0.1')).toBe(true);
    expect(isPrivateHostname('172.31.255.255')).toBe(true);
  });

  it('does not block 172.15.x.x or 172.32.x.x', () => {
    expect(isPrivateHostname('172.15.0.1')).toBe(false);
    expect(isPrivateHostname('172.32.0.1')).toBe(false);
  });

  it('blocks 192.168.x.x private range', () => {
    expect(isPrivateHostname('192.168.0.1')).toBe(true);
    expect(isPrivateHostname('192.168.255.255')).toBe(true);
  });

  it('blocks link-local 169.254.x.x', () => {
    expect(isPrivateHostname('169.254.1.1')).toBe(true);
  });

  it('blocks 0.x.x.x range', () => {
    expect(isPrivateHostname('0.0.0.0')).toBe(true);
  });

  it('blocks IPv6 loopback ::1', () => {
    expect(isPrivateHostname('::1')).toBe(true);
    expect(isPrivateHostname('[::1]')).toBe(true);
  });

  it('blocks IPv6 link-local (fe80:)', () => {
    expect(isPrivateHostname('fe80:1::1')).toBe(true);
    expect(isPrivateHostname('[fe80:1::1')).toBe(true);
  });

  it('blocks IPv6 unique-local (fc00:, fdxx:)', () => {
    expect(isPrivateHostname('fc00:1::1')).toBe(true);
    expect(isPrivateHostname('fd12:abcd::1')).toBe(true);
  });

  it('blocks pure numeric hostname (decimal IP encoding)', () => {
    expect(isPrivateHostname('2130706433')).toBe(true); // 127.0.0.1 in decimal
  });

  it('blocks hex-encoded hostname', () => {
    expect(isPrivateHostname('0x7f000001')).toBe(true);
  });

  it('allows normal public hostnames', () => {
    expect(isPrivateHostname('example.com')).toBe(false);
    expect(isPrivateHostname('checkvibe.dev')).toBe(false);
    expect(isPrivateHostname('8.8.8.8')).toBe(false);
  });
});

// ==========================================================================
// validateTargetUrl
// ==========================================================================
describe('validateTargetUrl', () => {
  it('rejects empty/null/undefined input', () => {
    expect(validateTargetUrl('')).toEqual({ valid: false, error: 'URL is required' });
    expect(validateTargetUrl(null as any)).toEqual({ valid: false, error: 'URL is required' });
    expect(validateTargetUrl(undefined as any)).toEqual({ valid: false, error: 'URL is required' });
  });

  it('rejects URLs exceeding 2048 characters', () => {
    const longUrl = 'https://example.com/' + 'a'.repeat(2048);
    const result = validateTargetUrl(longUrl);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toBe('URL exceeds maximum length');
  });

  it('auto-prepends https:// to bare domains', () => {
    const result = validateTargetUrl('example.com');
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.parsed.protocol).toBe('https:');
      expect(result.parsed.hostname).toBe('example.com');
    }
  });

  it('accepts valid http and https URLs', () => {
    expect(validateTargetUrl('https://example.com').valid).toBe(true);
    expect(validateTargetUrl('http://example.com').valid).toBe(true);
  });

  it('treats non-http scheme as bare domain (prepends https://)', () => {
    // validateTargetUrl only checks url.startsWith('http') to decide whether to
    // prepend https://. "ftp://example.com" does NOT start with "http", so it
    // becomes "https://ftp://example.com" which parses as https: protocol.
    // This test documents that behaviour.
    const result = validateTargetUrl('ftp://example.com');
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.parsed.protocol).toBe('https:');
    }
  });

  it('rejects malformed URLs', () => {
    const result = validateTargetUrl('http://');
    expect(result.valid).toBe(false);
  });

  // SSRF prevention
  it('rejects localhost URLs (SSRF)', () => {
    const result = validateTargetUrl('http://localhost:8080/admin');
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toBe('Internal URLs are not allowed');
  });

  it('rejects 127.0.0.1 URLs (SSRF)', () => {
    const result = validateTargetUrl('http://127.0.0.1/secret');
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toBe('Internal URLs are not allowed');
  });

  it('rejects 10.x.x.x private IPs (SSRF)', () => {
    const result = validateTargetUrl('http://10.0.0.1/internal');
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toBe('Internal URLs are not allowed');
  });

  it('rejects 192.168.x.x private IPs (SSRF)', () => {
    const result = validateTargetUrl('http://192.168.1.1/router');
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.error).toBe('Internal URLs are not allowed');
  });

  it('returns the parsed URL on success', () => {
    const result = validateTargetUrl('https://checkvibe.dev/scan');
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.parsed.hostname).toBe('checkvibe.dev');
      expect(result.parsed.pathname).toBe('/scan');
    }
  });
});
