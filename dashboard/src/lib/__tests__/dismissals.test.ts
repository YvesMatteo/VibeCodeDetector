import { describe, it, expect } from 'vitest';
import { buildFingerprint, DISMISSAL_REASONS } from '@/lib/dismissals';

describe('buildFingerprint', () => {
  it('produces the expected format: scannerKey::id::severity', () => {
    const fp = buildFingerprint('security_headers', {
      id: 'missing-csp',
      title: 'Missing Content-Security-Policy',
      severity: 'high',
    });
    expect(fp).toBe('security_headers::missing-csp::high');
  });

  it('falls back to title when id is missing', () => {
    const fp = buildFingerprint('ssl_tls', {
      title: 'Certificate expires soon',
      severity: 'medium',
    });
    expect(fp).toBe('ssl_tls::Certificate expires soon::medium');
  });

  it('falls back to title when id is empty string', () => {
    const fp = buildFingerprint('cors', {
      id: '',
      title: 'Wildcard CORS',
      severity: 'critical',
    });
    expect(fp).toBe('cors::Wildcard CORS::critical');
  });

  it('returns consistent results for the same input', () => {
    const input = { id: 'xss-1', title: 'XSS', severity: 'high' } as const;
    const a = buildFingerprint('xss', input);
    const b = buildFingerprint('xss', input);
    expect(a).toBe(b);
  });

  it('produces different fingerprints for different scanners', () => {
    const finding = { id: 'f1', title: 'Issue', severity: 'low' };
    const a = buildFingerprint('scanner_a', finding);
    const b = buildFingerprint('scanner_b', finding);
    expect(a).not.toBe(b);
  });

  it('produces different fingerprints for different severities', () => {
    const finding = { id: 'f1', title: 'Issue', severity: 'low' };
    const a = buildFingerprint('scanner', finding);
    const b = buildFingerprint('scanner', { ...finding, severity: 'high' });
    expect(a).not.toBe(b);
  });
});

describe('DISMISSAL_REASONS', () => {
  it('contains the four expected reason values', () => {
    const values = DISMISSAL_REASONS.map(r => r.value);
    expect(values).toEqual(['false_positive', 'accepted_risk', 'not_applicable', 'will_fix_later']);
  });

  it('each entry has a non-empty label', () => {
    for (const reason of DISMISSAL_REASONS) {
      expect(reason.label.length).toBeGreaterThan(0);
    }
  });
});
