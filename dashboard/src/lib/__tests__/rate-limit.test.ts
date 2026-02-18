import { describe, it, expect } from 'vitest';
import {
  getRateLimits,
  RATE_LIMITS,
  API_KEY_PREFIX,
  generateApiKey,
  hashApiKey,
  keyPrefix,
  isValidScope,
  validateScopes,
  isValidDomain,
  isValidIpOrCidr,
} from '@/lib/api-keys';

// ==========================================================================
// getRateLimits — pure function (no DB)
// ==========================================================================
describe('getRateLimits', () => {
  it('returns correct limits for known plans', () => {
    expect(getRateLimits('starter')).toEqual(RATE_LIMITS.starter);
    expect(getRateLimits('pro')).toEqual(RATE_LIMITS.pro);
    expect(getRateLimits('max')).toEqual(RATE_LIMITS.max);
    expect(getRateLimits('none')).toEqual(RATE_LIMITS.none);
  });

  it('falls back to "none" limits for unknown plan names', () => {
    expect(getRateLimits('unknown_plan')).toEqual(RATE_LIMITS.none);
    expect(getRateLimits('')).toEqual(RATE_LIMITS.none);
  });

  it('starter < pro < max for perKey limits', () => {
    expect(RATE_LIMITS.starter.perKey).toBeLessThan(RATE_LIMITS.pro.perKey);
    expect(RATE_LIMITS.pro.perKey).toBeLessThan(RATE_LIMITS.max.perKey);
  });
});

// ==========================================================================
// API key generation helpers — pure functions
// ==========================================================================
describe('generateApiKey', () => {
  it('starts with the expected prefix', () => {
    const key = generateApiKey();
    expect(key.startsWith(API_KEY_PREFIX)).toBe(true);
  });

  it('has correct total length (prefix + 32 hex chars)', () => {
    const key = generateApiKey();
    expect(key.length).toBe(API_KEY_PREFIX.length + 32);
  });

  it('generates unique keys on each call', () => {
    const keys = new Set(Array.from({ length: 20 }, () => generateApiKey()));
    expect(keys.size).toBe(20);
  });
});

describe('hashApiKey', () => {
  it('returns a 64-char hex string (SHA-256)', () => {
    const hash = hashApiKey('cvd_live_test123');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces consistent hashes for the same input', () => {
    const a = hashApiKey('cvd_live_abc');
    const b = hashApiKey('cvd_live_abc');
    expect(a).toBe(b);
  });

  it('produces different hashes for different inputs', () => {
    const a = hashApiKey('cvd_live_key1');
    const b = hashApiKey('cvd_live_key2');
    expect(a).not.toBe(b);
  });
});

describe('keyPrefix', () => {
  it('extracts prefix + first 8 chars of the random part', () => {
    const key = 'cvd_live_a1b2c3d4e5f6g7h8';
    expect(keyPrefix(key)).toBe('cvd_live_a1b2c3d4');
  });
});

// ==========================================================================
// Scope validation — pure functions
// ==========================================================================
describe('isValidScope', () => {
  it('returns true for known scopes', () => {
    expect(isValidScope('scan:read')).toBe(true);
    expect(isValidScope('scan:write')).toBe(true);
    expect(isValidScope('keys:read')).toBe(true);
    expect(isValidScope('keys:manage')).toBe(true);
  });

  it('returns false for unknown scopes', () => {
    expect(isValidScope('admin:all')).toBe(false);
    expect(isValidScope('')).toBe(false);
  });
});

describe('validateScopes', () => {
  it('returns true when all scopes are valid', () => {
    expect(validateScopes(['scan:read', 'scan:write'])).toBe(true);
  });

  it('returns false when any scope is invalid', () => {
    expect(validateScopes(['scan:read', 'bad:scope'])).toBe(false);
  });

  it('returns true for empty array', () => {
    expect(validateScopes([])).toBe(true);
  });
});

// ==========================================================================
// Domain & IP validation — pure functions
// ==========================================================================
describe('isValidDomain', () => {
  it('accepts valid domains', () => {
    expect(isValidDomain('example.com')).toBe(true);
    expect(isValidDomain('sub.example.com')).toBe(true);
    expect(isValidDomain('my-site.co.uk')).toBe(true);
  });

  it('rejects domains with invalid characters', () => {
    expect(isValidDomain('example .com')).toBe(false);
    expect(isValidDomain('exam!ple.com')).toBe(false);
  });
});

describe('isValidIpOrCidr', () => {
  it('accepts valid IPv4 addresses', () => {
    expect(isValidIpOrCidr('192.168.1.1')).toBe(true);
    expect(isValidIpOrCidr('10.0.0.0')).toBe(true);
  });

  it('accepts valid CIDR notation', () => {
    expect(isValidIpOrCidr('192.168.1.0/24')).toBe(true);
    expect(isValidIpOrCidr('10.0.0.0/8')).toBe(true);
  });

  it('rejects invalid IPs', () => {
    expect(isValidIpOrCidr('999.999.999.999')).toBe(false);
    expect(isValidIpOrCidr('abc.def.ghi.jkl')).toBe(false);
  });

  it('rejects invalid CIDR masks', () => {
    expect(isValidIpOrCidr('10.0.0.0/33')).toBe(false);
    expect(isValidIpOrCidr('10.0.0.0/abc')).toBe(false);
  });

  it('rejects multiple slashes', () => {
    expect(isValidIpOrCidr('10.0.0.0/8/16')).toBe(false);
  });
});
