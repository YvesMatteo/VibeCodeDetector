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

  // Cron service auth is server-to-server — CSRF doesn't apply
  const cronSecret = req.headers.get('x-cron-secret');
  if (cronSecret && process.env.CRON_SECRET && cronSecret === process.env.CRON_SECRET) return null;

  const origin = req.headers.get('origin');
  const host = req.headers.get('host') || '';

  // Require origin header on mutating requests
  if (!origin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const originHost = new URL(origin).host;
    // Allow same-origin requests
    if (originHost === host) {
      return null;
    }
    // Allow localhost only in development
    if (process.env.NODE_ENV === 'development' && (originHost === 'localhost' || /^localhost:\d+$/.test(originHost))) {
      return null;
    }
  } catch {
    // Malformed origin header
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
