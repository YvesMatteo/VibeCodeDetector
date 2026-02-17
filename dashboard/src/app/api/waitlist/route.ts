import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import crypto, { createHmac } from 'crypto';
import { getServiceClient } from '@/lib/api-keys';

// ---------------------------------------------------------------------------
// In-memory rate limiting: 5 failed passcode attempts per 15 min per IP
// ---------------------------------------------------------------------------
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) {
    if (now >= entry.resetAt) rateLimitMap.delete(key);
  }
}, 5 * 60 * 1000).unref?.();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now >= entry.resetAt) return false;
  return entry.count >= MAX_FAILURES;
}

function recordFailure(ip: string): void {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now >= entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
  } else {
    entry.count++;
  }
}

// ---------------------------------------------------------------------------
// Constant-time passcode comparison
// ---------------------------------------------------------------------------
function verifyPasscode(input: string): boolean {
  const expected = process.env.WAITLIST_PASSCODE;
  if (!expected) return false;
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------
const verifySchema = z.object({
  action: z.literal('verify'),
  passcode: z.string().min(1),
});

const signupSchema = z.object({
  action: z.literal('signup'),
  email: z.string().email('Please enter a valid email address'),
});

// ---------------------------------------------------------------------------
// GET handler — validates bypass token, sets cookie, redirects to /
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 });
  }

  const secret = process.env.COOKIE_SIGNING_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!secret) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  // Token format: <hmac>:<timestamp>
  const lastColon = token.lastIndexOf(':');
  if (lastColon === -1) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
  }
  const hmacPart = token.slice(0, lastColon);
  const tsPart = token.slice(lastColon + 1);
  const ts = parseInt(tsPart, 10);
  if (isNaN(ts)) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
  }

  // Check token is within 60 seconds
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > 60) {
    return NextResponse.json({ error: 'Token expired' }, { status: 401 });
  }

  // Verify HMAC
  const expected = createHmac('sha256', secret).update(`bypass:${ts}`).digest('hex');
  if (hmacPart !== expected) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  // Set cookie and redirect to landing page
  const signature = createHmac('sha256', secret).update('cv-access=1').digest('hex');
  const url = req.nextUrl.clone();
  url.pathname = '/';
  url.search = '';
  const res = NextResponse.redirect(url);
  res.cookies.set('cv-access', `1:${signature}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
      req.headers.get('x-real-ip') ??
      '0.0.0.0';

    const body = await req.json().catch(() => null);
    if (!body || !body.action) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // ---- Verify passcode → set bypass cookie ----
    if (body.action === 'verify') {
      if (isRateLimited(ip)) {
        return NextResponse.json(
          { error: 'Too many attempts. Please try again later.' },
          { status: 429 }
        );
      }

      const parsed = verifySchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
      }

      if (!verifyPasscode(parsed.data.passcode)) {
        recordFailure(ip);
        return NextResponse.json({ error: 'Invalid access code' }, { status: 401 });
      }

      // Generate a short-lived bypass token (valid for 60 seconds)
      // The client will redirect to GET /api/waitlist?token=<token> which sets
      // the cookie via a navigation response (more reliable than Set-Cookie from fetch)
      const secret = process.env.COOKIE_SIGNING_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
      if (!secret) {
        console.error('No signing secret available (COOKIE_SIGNING_SECRET or SUPABASE_SERVICE_ROLE_KEY)');
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
      }
      const ts = Math.floor(Date.now() / 1000);
      const token = createHmac('sha256', secret).update(`bypass:${ts}`).digest('hex') + ':' + ts;
      return NextResponse.json({ ok: true, token });
    }

    // ---- Signup → save email ----
    if (body.action === 'signup') {
      const parsed = signupSchema.safeParse(body);
      if (!parsed.success) {
        const firstError = parsed.error.issues[0]?.message ?? 'Invalid request';
        return NextResponse.json({ error: firstError }, { status: 400 });
      }

      const supabase = getServiceClient();
      const userAgent = req.headers.get('user-agent') ?? '';

      const { error: insertError } = await (supabase.from('waitlist_emails' as any) as any).insert({
        email: parsed.data.email.toLowerCase().trim(),
        ip_address: ip,
        user_agent: userAgent,
      });

      // Unique constraint → already on waitlist (return success, no info leak)
      if (insertError && insertError.code !== '23505') {
        console.error('Waitlist insert error:', insertError);
        return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error('Waitlist route error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
