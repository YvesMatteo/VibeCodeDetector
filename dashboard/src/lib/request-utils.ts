import { NextRequest, NextResponse } from 'next/server';

/**
 * Extract the client IP from request headers.
 * Checks x-forwarded-for (first hop), x-real-ip, falls back to 0.0.0.0.
 */
export function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    '0.0.0.0'
  );
}

/**
 * Create a consistent JSON error response.
 */
export function apiError(message: string, status: number, code?: string): NextResponse {
  return NextResponse.json(
    code ? { error: message, code } : { error: message },
    { status }
  );
}
