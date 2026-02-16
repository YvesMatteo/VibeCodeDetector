import { NextRequest, NextResponse } from 'next/server';

/**
 * CSRF protection via origin validation.
 * Skips check for API key auth (stateless, no cookies = no CSRF risk).
 * Returns a 403 NextResponse if the check fails, or null if it passes.
 */
export function checkCsrf(req: NextRequest): NextResponse | null {
  // API key auth is stateless — CSRF doesn't apply
  const isApiKeyAuth = req.headers.get('authorization')?.startsWith('Bearer cvd_live_');
  if (isApiKeyAuth) return null;

  const origin = req.headers.get('origin');
  const host = req.headers.get('host') || '';

  // Require origin header on mutating requests
  if (!origin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const originHost = new URL(origin).host;
    if (originHost === host || originHost.startsWith('localhost')) {
      return null;
    }
  } catch {
    // Malformed origin header
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
