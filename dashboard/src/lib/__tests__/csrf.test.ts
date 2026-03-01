/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase custom tables & dynamic scanner results */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { checkCsrf } from '@/lib/csrf';

/**
 * Minimal mock for NextRequest — only the headers used by checkCsrf.
 */
function makeRequest(headers: Record<string, string>) {
  return {
    headers: {
      get(name: string) {
        return headers[name.toLowerCase()] ?? null;
      },
    },
  } as any; // cast to NextRequest
}

// We need to mock NextResponse.json since it's imported from next/server
vi.mock('next/server', () => ({
  NextResponse: {
    json(body: any, init?: { status?: number }) {
      return { body, status: init?.status ?? 200 };
    },
  },
}));

describe('checkCsrf', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // -----------------------------------------------------------------------
  // API key auth bypass
  // -----------------------------------------------------------------------
  it('skips CSRF check for API key auth (Bearer cvd_live_...)', () => {
    const req = makeRequest({
      authorization: 'Bearer cvd_live_abc123',
    });
    expect(checkCsrf(req)).toBeNull();
  });

  // -----------------------------------------------------------------------
  // Missing origin
  // -----------------------------------------------------------------------
  it('rejects requests without an origin header', () => {
    const req = makeRequest({ host: 'checkvibe.dev' });
    const res = checkCsrf(req);
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
  });

  // -----------------------------------------------------------------------
  // Same-origin match
  // -----------------------------------------------------------------------
  it('allows same-origin requests (origin host matches host header)', () => {
    const req = makeRequest({
      origin: 'https://checkvibe.dev',
      host: 'checkvibe.dev',
    });
    expect(checkCsrf(req)).toBeNull();
  });

  it('allows same-origin with port', () => {
    const req = makeRequest({
      origin: 'https://checkvibe.dev:3000',
      host: 'checkvibe.dev:3000',
    });
    expect(checkCsrf(req)).toBeNull();
  });

  // -----------------------------------------------------------------------
  // Cross-origin rejection
  // -----------------------------------------------------------------------
  it('rejects cross-origin requests', () => {
    const req = makeRequest({
      origin: 'https://evil.com',
      host: 'checkvibe.dev',
    });
    const res = checkCsrf(req);
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
  });

  // -----------------------------------------------------------------------
  // Localhost bypass in development
  // -----------------------------------------------------------------------
  it('allows localhost origin in development mode', () => {
    vi.stubEnv('NODE_ENV', 'development');

    const req = makeRequest({
      origin: 'http://localhost:3000',
      host: 'localhost:3000',
    });
    expect(checkCsrf(req)).toBeNull();
  });

  it('allows bare localhost (no port) in development mode', () => {
    vi.stubEnv('NODE_ENV', 'development');

    const req = makeRequest({
      origin: 'http://localhost',
      host: 'some-other-host.dev',
    });
    expect(checkCsrf(req)).toBeNull();
  });

  it('rejects localhost origin in production mode', () => {
    vi.stubEnv('NODE_ENV', 'production');

    const req = makeRequest({
      origin: 'http://localhost:3000',
      host: 'checkvibe.dev',
    });
    const res = checkCsrf(req);
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
  });

  // -----------------------------------------------------------------------
  // Malformed origin
  // -----------------------------------------------------------------------
  it('rejects malformed origin header', () => {
    const req = makeRequest({
      origin: 'not-a-valid-url',
      host: 'checkvibe.dev',
    });
    const res = checkCsrf(req);
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
  });
});
