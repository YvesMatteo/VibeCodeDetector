import { getServiceClient, getRateLimits } from './api-keys';

export interface RateLimitResult {
  allowed: boolean;
  currentCount: number;
  limitMax: number;
  resetAt: string; // ISO timestamp
}

/**
 * Check rate limit using the Postgres sliding window function.
 * Returns rate limit info; caller decides what to do if `allowed` is false.
 */
export async function checkRateLimit(
  identifier: string,
  maxRequests: number,
  windowSeconds: number = 60
): Promise<RateLimitResult> {
  const supabase = getServiceClient();

  const { data, error } = await supabase.rpc('check_rate_limit', {
    p_identifier: identifier,
    p_max_requests: maxRequests,
    p_window_seconds: windowSeconds,
  } as any) as {
    data: Array<{ allowed: boolean; current_count: number; limit_max: number; reset_at: string }> | null;
    error: any;
  };

  if (error) {
    console.error('Rate limit check failed:', error);
    // Fail open — allow the request but log the error
    return { allowed: true, currentCount: 0, limitMax: maxRequests, resetAt: new Date().toISOString() };
  }

  const row = data?.[0];
  if (!row) {
    return { allowed: true, currentCount: 0, limitMax: maxRequests, resetAt: new Date().toISOString() };
  }

  return {
    allowed: row.allowed,
    currentCount: row.current_count,
    limitMax: row.limit_max,
    resetAt: new Date(row.reset_at).toISOString(),
  };
}

/**
 * Run all applicable rate limits for an API key request.
 * Returns the most restrictive result (if any are denied, request is denied).
 */
export async function checkAllRateLimits(opts: {
  keyId?: string;
  userId: string;
  ip: string;
  plan: string;
}): Promise<{ allowed: boolean; headers: Record<string, string>; result: RateLimitResult }> {
  const limits = getRateLimits(opts.plan);
  const checks: Promise<{ type: string; result: RateLimitResult }>[] = [];

  // Per-key limit (only if using API key auth)
  if (opts.keyId) {
    checks.push(
      checkRateLimit(`key:${opts.keyId}`, limits.perKey).then(r => ({ type: 'key', result: r }))
    );
  }

  // Per-user aggregate limit
  checks.push(
    checkRateLimit(`user:${opts.userId}`, limits.perUser).then(r => ({ type: 'user', result: r }))
  );

  // Per-IP limit
  checks.push(
    checkRateLimit(`ip:${opts.ip}`, limits.perIp).then(r => ({ type: 'ip', result: r }))
  );

  const results = await Promise.all(checks);

  // Find the most restrictive result
  const denied = results.find(r => !r.result.allowed);
  const primary = denied ?? results[0];

  // Use the key-level or user-level result for headers (whichever is most relevant)
  const headerSource = results.find(r => r.type === 'key')?.result
    ?? results.find(r => r.type === 'user')?.result
    ?? primary.result;

  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(headerSource.limitMax),
    'X-RateLimit-Remaining': String(Math.max(0, headerSource.limitMax - headerSource.currentCount)),
    'X-RateLimit-Reset': headerSource.resetAt,
  };

  if (!primary.result.allowed) {
    headers['Retry-After'] = '60';
  }

  return {
    allowed: !denied,
    headers,
    result: primary.result,
  };
}
