import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  PLANS_BY_PRICE_ID,
  VALID_PLANS,
  resolvePlanByPriceId,
  resolvePlanByMetadata,
  isValidUUID,
} from '@/lib/stripe-plans';

// ---------------------------------------------------------------------------
// Mock setup for the webhook route's external dependencies
// ---------------------------------------------------------------------------



// The "admin" Supabase client mock
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock object has dynamic shape
let supabaseMock: any;

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => supabaseMock,
}));

// Stripe mock
const mockConstructEvent = vi.fn();
const mockListLineItems = vi.fn();
const mockRetrieveSubscription = vi.fn();

vi.mock('stripe', () => {
  return {
    default: class StripeMock {
      webhooks = { constructEvent: mockConstructEvent };
      checkout = { sessions: { listLineItems: mockListLineItems } };
      subscriptions = { retrieve: mockRetrieveSubscription };
    },
  };
});

// next/headers mock
vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue({
    get: (name: string) => {
      if (name === 'stripe-signature') return 'test_sig_123';
      return null;
    },
  }),
}));

// next/server mock
vi.mock('next/server', () => ({
  NextResponse: class {
    body: string | null;
    status: number;
    constructor(body: string | null, init?: { status?: number }) {
      this.body = body;
      this.status = init?.status ?? 200;
    }
  },
}));

// Set required env vars before importing the route
process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_fake';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TEST_USER_ID = '61599829-2889-47eb-920c-c0214989313a';

/**
 * Builds a minimal fake Stripe event for testing.
 */
function makeEvent(
  type: string,
  data: Record<string, unknown>,
  eventId = `evt_test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
) {
  return {
    id: eventId,
    type,
    data: { object: data },
  };
}

/**
 * Creates a fake Request with the given body.
 */
function makeRequest(body = '{}') {
  return {
    text: vi.fn().mockResolvedValue(body),
  } as unknown as Request;
}

// ===========================================================================
// PART 1: Pure function tests (stripe-plans.ts)
// ===========================================================================

describe('stripe-plans — resolvePlanByPriceId', () => {
  // -----------------------------------------------------------------------
  // Starter plan price IDs
  // -----------------------------------------------------------------------
  it('resolves starter monthly price ID', () => {
    const result = resolvePlanByPriceId('price_1Sz2CgLRbxIsl4HLE7jp6ecZ');
    expect(result).toEqual({ plan: 'starter', domains: 1, scans: 30 });
  });

  it('resolves starter annual (30% off) price ID', () => {
    const result = resolvePlanByPriceId('price_1T1G35LRbxIsl4HLq1Geq4Ov');
    expect(result).toEqual({ plan: 'starter', domains: 1, scans: 30 });
  });

  it('resolves starter legacy annual (20% off) price ID', () => {
    const result = resolvePlanByPriceId('price_1Sz2CiLRbxIsl4HLDkUzXZXs');
    expect(result).toEqual({ plan: 'starter', domains: 1, scans: 30 });
  });

  // -----------------------------------------------------------------------
  // Pro plan price IDs
  // -----------------------------------------------------------------------
  it('resolves pro monthly price ID', () => {
    const result = resolvePlanByPriceId('price_1Sz2CjLRbxIsl4HLbs2LEaw0');
    expect(result).toEqual({ plan: 'pro', domains: 3, scans: 155 });
  });

  it('resolves pro annual (30% off) price ID', () => {
    const result = resolvePlanByPriceId('price_1T1G36LRbxIsl4HLcxaSjnej');
    expect(result).toEqual({ plan: 'pro', domains: 3, scans: 155 });
  });

  it('resolves pro legacy annual (20% off) price ID', () => {
    const result = resolvePlanByPriceId('price_1Sz2ClLRbxIsl4HLrXX3IxAf');
    expect(result).toEqual({ plan: 'pro', domains: 3, scans: 155 });
  });

  // -----------------------------------------------------------------------
  // Max plan price IDs
  // -----------------------------------------------------------------------
  it('resolves max monthly price ID', () => {
    const result = resolvePlanByPriceId('price_1T1G99LRbxIsl4HLzT5TNktI');
    expect(result).toEqual({ plan: 'max', domains: 10, scans: 3000 });
  });

  it('resolves max annual (30% off) price ID', () => {
    const result = resolvePlanByPriceId('price_1T1G99LRbxIsl4HLfsEV74xC');
    expect(result).toEqual({ plan: 'max', domains: 10, scans: 3000 });
  });

  it('resolves max legacy monthly ($89) price ID', () => {
    const result = resolvePlanByPriceId('price_1Sz2CnLRbxIsl4HL2XFxYOmP');
    expect(result).toEqual({ plan: 'max', domains: 10, scans: 3000 });
  });

  it('resolves max legacy annual price IDs', () => {
    expect(resolvePlanByPriceId('price_1T1G36LRbxIsl4HLk68EVav3')).toEqual({
      plan: 'max', domains: 10, scans: 3000,
    });
    expect(resolvePlanByPriceId('price_1Sz2CoLRbxIsl4HL1uhpaBEp')).toEqual({
      plan: 'max', domains: 10, scans: 3000,
    });
  });

  // -----------------------------------------------------------------------
  // Unknown price ID
  // -----------------------------------------------------------------------
  it('returns null for unknown price ID', () => {
    expect(resolvePlanByPriceId('price_unknown_xxx')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(resolvePlanByPriceId('')).toBeNull();
  });
});

describe('stripe-plans — resolvePlanByMetadata', () => {
  it('resolves valid "starter" plan name', () => {
    expect(resolvePlanByMetadata('starter')).toEqual({ plan: 'starter', domains: 1, scans: 30 });
  });

  it('resolves valid "pro" plan name', () => {
    expect(resolvePlanByMetadata('pro')).toEqual({ plan: 'pro', domains: 3, scans: 155 });
  });

  it('resolves valid "max" plan name', () => {
    expect(resolvePlanByMetadata('max')).toEqual({ plan: 'max', domains: 10, scans: 3000 });
  });

  it('rejects invalid plan name "enterprise"', () => {
    expect(resolvePlanByMetadata('enterprise')).toBeNull();
  });

  it('rejects invalid plan name "free"', () => {
    expect(resolvePlanByMetadata('free')).toBeNull();
  });

  it('rejects invalid plan name "STARTER" (case-sensitive)', () => {
    expect(resolvePlanByMetadata('STARTER')).toBeNull();
  });

  it('rejects empty string', () => {
    expect(resolvePlanByMetadata('')).toBeNull();
  });

  it('rejects undefined', () => {
    expect(resolvePlanByMetadata(undefined)).toBeNull();
  });

  it('rejects null', () => {
    expect(resolvePlanByMetadata(null)).toBeNull();
  });
});

describe('stripe-plans — isValidUUID', () => {
  it('accepts valid UUID v4', () => {
    expect(isValidUUID('61599829-2889-47eb-920c-c0214989313a')).toBe(true);
  });

  it('accepts uppercase UUID', () => {
    expect(isValidUUID('61599829-2889-47EB-920C-C0214989313A')).toBe(true);
  });

  it('rejects short string', () => {
    expect(isValidUUID('not-a-uuid')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidUUID('')).toBe(false);
  });

  it('rejects undefined', () => {
    expect(isValidUUID(undefined)).toBe(false);
  });

  it('rejects null', () => {
    expect(isValidUUID(null)).toBe(false);
  });
});

describe('stripe-plans — plan limits consistency', () => {
  it('all starter prices map to domains:1, scans:30', () => {
    const starterPrices = Object.entries(PLANS_BY_PRICE_ID).filter(
      ([, info]) => info.plan === 'starter'
    );
    expect(starterPrices.length).toBeGreaterThanOrEqual(2);
    for (const [, info] of starterPrices) {
      expect(info.domains).toBe(1);
      expect(info.scans).toBe(5);
    }
  });

  it('all pro prices map to domains:3, scans:155', () => {
    const proPrices = Object.entries(PLANS_BY_PRICE_ID).filter(
      ([, info]) => info.plan === 'pro'
    );
    expect(proPrices.length).toBeGreaterThanOrEqual(2);
    for (const [, info] of proPrices) {
      expect(info.domains).toBe(3);
      expect(info.scans).toBe(20);
    }
  });

  it('all max prices map to domains:10, scans:3000', () => {
    const maxPrices = Object.entries(PLANS_BY_PRICE_ID).filter(
      ([, info]) => info.plan === 'max'
    );
    expect(maxPrices.length).toBeGreaterThanOrEqual(2);
    for (const [, info] of maxPrices) {
      expect(info.domains).toBe(10);
      expect(info.scans).toBe(75);
    }
  });

  it('VALID_PLANS limits match PLANS_BY_PRICE_ID limits for each tier', () => {
    for (const [planName, limits] of Object.entries(VALID_PLANS)) {
      // Find at least one price ID for this plan
      const match = Object.values(PLANS_BY_PRICE_ID).find((p) => p.plan === planName);
      expect(match).toBeDefined();
      expect(match!.domains).toBe(limits.domains);
      expect(match!.scans).toBe(limits.scans);
    }
  });
});

// ===========================================================================
// PART 2: Integration tests for webhook POST handler
// ===========================================================================

// Dynamic import so the env vars and mocks are set up first.
// We use a lazy require pattern because the route module reads env at import time.
let POST: (req: Request) => Promise<Response>;

beforeEach(async () => {
  vi.resetModules();

  // Re-set env (resetModules clears the module cache, so the route re-reads env)
  process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_fake';
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

  // Reset all mock implementations
  mockConstructEvent.mockReset();
  mockListLineItems.mockReset();
  mockRetrieveSubscription.mockReset();

  // Default Supabase mock: no existing event, successful upsert
  supabaseMock = createDefaultSupabaseMock();

  // Import the route module fresh
  const mod = await import('@/app/api/stripe/webhook/route');
  POST = mod.POST;
});

/**
 * Creates a default Supabase mock where:
 *  - processed_webhook_events lookup returns no existing event
 *  - all update/upsert operations succeed
 *
 * The mock supports multiple .from() calls to the same table by returning
 * fresh chainable objects each time, while recording all operations on a
 * shared tracker for assertion purposes.
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- mock chains require dynamic typing */
function createDefaultSupabaseMock() {
  const mock: any = {};

  // Shared trackers per table for test assertions
  const tables: Record<string, { updateCalls: unknown[]; upsertCalls: unknown[]; selectCalls: unknown[] }> = {};

  function getTracker(table: string) {
    if (!tables[table]) {
      tables[table] = { updateCalls: [], upsertCalls: [], selectCalls: [] };
    }
    return tables[table];
  }

  mock.from = vi.fn((table: string) => {
    const tracker = getTracker(table);

    // Each .from() call returns a fresh chainable builder
    const builder: any = {};

    // select chain: .select(...).eq(...).single()/.maybeSingle()
    builder.select = vi.fn((...args: unknown[]) => {
      tracker.selectCalls.push(args);
      return builder;
    });

    builder.eq = vi.fn().mockReturnValue(builder);

    builder.single = vi.fn().mockResolvedValue(
      table === 'profiles'
        ? { data: { id: TEST_USER_ID }, error: null }
        : { data: null, error: null }
    );

    builder.maybeSingle = vi.fn().mockResolvedValue(
      table === 'processed_webhook_events'
        ? { data: null, error: null }     // event not yet processed
        : { data: null, error: null }
    );

    // update chain: .update({...}).eq(...)
    builder.update = vi.fn((payload: unknown) => {
      tracker.updateCalls.push(payload);
      // Return a new mini-chain that resolves on .eq()
      const updateChain: any = {};
      updateChain.eq = vi.fn().mockResolvedValue({ data: null, error: null });
      return updateChain;
    });

    // upsert: terminal
    builder.upsert = vi.fn((...args: unknown[]) => {
      tracker.upsertCalls.push(args);
      return Promise.resolve({ error: null });
    });

    return builder;
  });

  // Expose the trackers so tests can assert
  mock._tables = tables;
  return mock;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

describe('webhook POST — checkout.session.completed', () => {
  it('activates starter plan from monthly price ID', async () => {
    const eventId = 'evt_starter_monthly_001';
    const event = makeEvent(
      'checkout.session.completed',
      {
        id: 'cs_test_starter',
        metadata: { userId: TEST_USER_ID, plan: 'starter' },
        customer: 'cus_test_123',
        subscription: 'sub_test_123',
      },
      eventId,
    );

    mockConstructEvent.mockReturnValue(event);
    mockListLineItems.mockResolvedValue({
      data: [{ price: { id: 'price_1Sz2CgLRbxIsl4HLE7jp6ecZ' } }],
    });
    mockRetrieveSubscription.mockResolvedValue({
      current_period_start: Math.floor(Date.now() / 1000),
    });

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);

    // Verify profiles table was written to
    const profilesTracker = supabaseMock._tables['profiles'];
    expect(profilesTracker).toBeDefined();
    expect(profilesTracker.updateCalls.length).toBeGreaterThan(0);

    // Verify the update payload contains correct plan info
    const updateCall = profilesTracker.updateCalls[0];
    expect(updateCall.plan).toBe('starter');
    expect(updateCall.plan_domains).toBe(1);
    expect(updateCall.plan_scans_limit).toBe(30);
    expect(updateCall.plan_scans_used).toBe(0);
    expect(updateCall.stripe_customer_id).toBe('cus_test_123');
    expect(updateCall.stripe_subscription_id).toBe('sub_test_123');
  });

  it('activates pro plan from monthly price ID', async () => {
    const event = makeEvent('checkout.session.completed', {
      id: 'cs_test_pro',
      metadata: { userId: TEST_USER_ID, plan: 'pro' },
      customer: 'cus_test_456',
      subscription: 'sub_test_456',
    });

    mockConstructEvent.mockReturnValue(event);
    mockListLineItems.mockResolvedValue({
      data: [{ price: { id: 'price_1Sz2CjLRbxIsl4HLbs2LEaw0' } }],
    });
    mockRetrieveSubscription.mockResolvedValue({
      current_period_start: Math.floor(Date.now() / 1000),
    });

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);

    const updateCall = supabaseMock._tables['profiles'].updateCalls[0];
    expect(updateCall.plan).toBe('pro');
    expect(updateCall.plan_domains).toBe(3);
    expect(updateCall.plan_scans_limit).toBe(155);
  });

  it('activates max plan from monthly price ID', async () => {
    const event = makeEvent('checkout.session.completed', {
      id: 'cs_test_max',
      metadata: { userId: TEST_USER_ID, plan: 'max' },
      customer: 'cus_test_789',
      subscription: 'sub_test_789',
    });

    mockConstructEvent.mockReturnValue(event);
    mockListLineItems.mockResolvedValue({
      data: [{ price: { id: 'price_1T1G99LRbxIsl4HLzT5TNktI' } }],
    });
    mockRetrieveSubscription.mockResolvedValue({
      current_period_start: Math.floor(Date.now() / 1000),
    });

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);

    const updateCall = supabaseMock._tables['profiles'].updateCalls[0];
    expect(updateCall.plan).toBe('max');
    expect(updateCall.plan_domains).toBe(10);
    expect(updateCall.plan_scans_limit).toBe(3000);
  });

  it('activates starter annual plan from annual price ID', async () => {
    const event = makeEvent('checkout.session.completed', {
      id: 'cs_test_starter_annual',
      metadata: { userId: TEST_USER_ID },
      customer: 'cus_test_annual',
      subscription: 'sub_test_annual',
    });

    mockConstructEvent.mockReturnValue(event);
    mockListLineItems.mockResolvedValue({
      data: [{ price: { id: 'price_1T1G35LRbxIsl4HLq1Geq4Ov' } }],
    });
    mockRetrieveSubscription.mockResolvedValue({
      current_period_start: Math.floor(Date.now() / 1000),
    });

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);

    const updateCall = supabaseMock._tables['profiles'].updateCalls[0];
    expect(updateCall.plan).toBe('starter');
    expect(updateCall.plan_domains).toBe(1);
    expect(updateCall.plan_scans_limit).toBe(30);
  });

  it('activates pro annual plan from annual price ID', async () => {
    const event = makeEvent('checkout.session.completed', {
      id: 'cs_test_pro_annual',
      metadata: { userId: TEST_USER_ID },
      customer: 'cus_pro_annual',
      subscription: 'sub_pro_annual',
    });

    mockConstructEvent.mockReturnValue(event);
    mockListLineItems.mockResolvedValue({
      data: [{ price: { id: 'price_1T1G36LRbxIsl4HLcxaSjnej' } }],
    });
    mockRetrieveSubscription.mockResolvedValue({
      current_period_start: Math.floor(Date.now() / 1000),
    });

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);

    const updateCall = supabaseMock._tables['profiles'].updateCalls[0];
    expect(updateCall.plan).toBe('pro');
    expect(updateCall.plan_domains).toBe(3);
    expect(updateCall.plan_scans_limit).toBe(155);
  });

  it('activates max annual plan from annual price ID', async () => {
    const event = makeEvent('checkout.session.completed', {
      id: 'cs_test_max_annual',
      metadata: { userId: TEST_USER_ID },
      customer: 'cus_max_annual',
      subscription: 'sub_max_annual',
    });

    mockConstructEvent.mockReturnValue(event);
    mockListLineItems.mockResolvedValue({
      data: [{ price: { id: 'price_1T1G99LRbxIsl4HLfsEV74xC' } }],
    });
    mockRetrieveSubscription.mockResolvedValue({
      current_period_start: Math.floor(Date.now() / 1000),
    });

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);

    const updateCall = supabaseMock._tables['profiles'].updateCalls[0];
    expect(updateCall.plan).toBe('max');
    expect(updateCall.plan_domains).toBe(10);
    expect(updateCall.plan_scans_limit).toBe(3000);
  });

  it('returns 200 but does not activate when userId is missing', async () => {
    const event = makeEvent('checkout.session.completed', {
      id: 'cs_test_no_user',
      metadata: {},
      customer: 'cus_xxx',
      subscription: 'sub_xxx',
    });

    mockConstructEvent.mockReturnValue(event);

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);

    // profiles.update should NOT have been called
    const profilesTracker = supabaseMock._tables['profiles'];
    if (profilesTracker) {
      expect(profilesTracker.updateCalls.length).toBe(0);
    }
  });

  it('returns 200 but does not activate when userId is not a valid UUID', async () => {
    const event = makeEvent('checkout.session.completed', {
      id: 'cs_test_bad_uuid',
      metadata: { userId: 'not-a-valid-uuid' },
      customer: 'cus_xxx',
      subscription: 'sub_xxx',
    });

    mockConstructEvent.mockReturnValue(event);

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);

    const profilesTracker = supabaseMock._tables['profiles'];
    if (profilesTracker) {
      expect(profilesTracker.updateCalls.length).toBe(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Metadata fallback tests
// ---------------------------------------------------------------------------

describe('webhook POST — metadata fallback validation', () => {
  it('falls back to valid metadata plan when line items fetch fails', async () => {
    const event = makeEvent('checkout.session.completed', {
      id: 'cs_test_fallback_valid',
      metadata: { userId: TEST_USER_ID, plan: 'pro' },
      customer: 'cus_fallback',
      subscription: 'sub_fallback',
    });

    mockConstructEvent.mockReturnValue(event);
    // Line items fetch fails
    mockListLineItems.mockRejectedValue(new Error('Stripe API error'));
    mockRetrieveSubscription.mockResolvedValue({
      current_period_start: Math.floor(Date.now() / 1000),
    });

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);

    const updateCall = supabaseMock._tables['profiles'].updateCalls[0];
    expect(updateCall.plan).toBe('pro');
    expect(updateCall.plan_domains).toBe(3);
    expect(updateCall.plan_scans_limit).toBe(155);
  });

  it('falls back to valid metadata plan when price ID is unknown', async () => {
    const event = makeEvent('checkout.session.completed', {
      id: 'cs_test_fallback_unknown_price',
      metadata: { userId: TEST_USER_ID, plan: 'max' },
      customer: 'cus_fb2',
      subscription: 'sub_fb2',
    });

    mockConstructEvent.mockReturnValue(event);
    mockListLineItems.mockResolvedValue({
      data: [{ price: { id: 'price_unknown_not_in_map' } }],
    });
    mockRetrieveSubscription.mockResolvedValue({
      current_period_start: Math.floor(Date.now() / 1000),
    });

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);

    const updateCall = supabaseMock._tables['profiles'].updateCalls[0];
    expect(updateCall.plan).toBe('max');
    expect(updateCall.plan_domains).toBe(10);
    expect(updateCall.plan_scans_limit).toBe(3000);
  });

  it('rejects invalid metadata plan name and does not activate', async () => {
    const event = makeEvent('checkout.session.completed', {
      id: 'cs_test_fallback_invalid',
      metadata: { userId: TEST_USER_ID, plan: 'enterprise_hacked' },
      customer: 'cus_bad',
      subscription: 'sub_bad',
    });

    mockConstructEvent.mockReturnValue(event);
    // Line items returns unknown price
    mockListLineItems.mockResolvedValue({
      data: [{ price: { id: 'price_unknown' } }],
    });

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);

    // No plan activation should occur — profiles.update should not be called
    const profilesTracker = supabaseMock._tables['profiles'];
    if (profilesTracker) {
      expect(profilesTracker.updateCalls.length).toBe(0);
    }
  });

  it('rejects empty metadata plan and does not activate', async () => {
    const event = makeEvent('checkout.session.completed', {
      id: 'cs_test_fallback_empty',
      metadata: { userId: TEST_USER_ID, plan: '' },
      customer: 'cus_empty',
      subscription: 'sub_empty',
    });

    mockConstructEvent.mockReturnValue(event);
    mockListLineItems.mockResolvedValue({ data: [] });

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);

    const profilesTracker = supabaseMock._tables['profiles'];
    if (profilesTracker) {
      expect(profilesTracker.updateCalls.length).toBe(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Idempotency tests
// ---------------------------------------------------------------------------

describe('webhook POST — idempotency', () => {
  it('skips processing when event was already processed', async () => {
    const eventId = 'evt_already_processed';
    const event = makeEvent(
      'checkout.session.completed',
      {
        id: 'cs_test_idem',
        metadata: { userId: TEST_USER_ID, plan: 'pro' },
        customer: 'cus_idem',
        subscription: 'sub_idem',
      },
      eventId,
    );

    mockConstructEvent.mockReturnValue(event);

    // Override the from() mock so that processed_webhook_events returns an existing record
    const originalFrom = supabaseMock.from;
    supabaseMock.from = vi.fn((table: string) => {
      const builder = originalFrom(table);
      if (table === 'processed_webhook_events') {
        builder.maybeSingle = vi.fn().mockResolvedValue({
          data: { event_id: eventId },
          error: null,
        });
      }
      return builder;
    });

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);

    // profiles.update should NOT have been called
    const profilesTracker = supabaseMock._tables['profiles'];
    if (profilesTracker) {
      expect(profilesTracker.updateCalls.length).toBe(0);
    }

    // listLineItems should not have been called
    expect(mockListLineItems).not.toHaveBeenCalled();
  });

  it('processes new event and marks it as processed', async () => {
    const eventId = 'evt_new_event_123';
    const event = makeEvent(
      'checkout.session.completed',
      {
        id: 'cs_test_new',
        metadata: { userId: TEST_USER_ID, plan: 'starter' },
        customer: 'cus_new',
        subscription: 'sub_new',
      },
      eventId,
    );

    mockConstructEvent.mockReturnValue(event);
    mockListLineItems.mockResolvedValue({
      data: [{ price: { id: 'price_1Sz2CgLRbxIsl4HLE7jp6ecZ' } }],
    });
    mockRetrieveSubscription.mockResolvedValue({
      current_period_start: Math.floor(Date.now() / 1000),
    });

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);

    // Verify the event was marked as processed
    const eventsTracker = supabaseMock._tables['processed_webhook_events'];
    expect(eventsTracker).toBeDefined();
    expect(eventsTracker.upsertCalls.length).toBeGreaterThan(0);
    expect(eventsTracker.upsertCalls[0][0]).toEqual(
      { event_id: eventId, event_type: 'checkout.session.completed' },
    );
    expect(eventsTracker.upsertCalls[0][1]).toEqual(
      { onConflict: 'event_id', ignoreDuplicates: true },
    );
  });
});

// ---------------------------------------------------------------------------
// Signature verification
// ---------------------------------------------------------------------------

describe('webhook POST — signature verification', () => {
  it('returns 400 when Stripe signature verification fails', async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error('Invalid signature');
    });

    const res = await POST(makeRequest());
    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// customer.subscription.deleted
// ---------------------------------------------------------------------------

describe('webhook POST — customer.subscription.deleted', () => {
  it('deactivates plan and resets all fields', async () => {
    const event = makeEvent('customer.subscription.deleted', {
      id: 'sub_deleted_123',
    });

    mockConstructEvent.mockReturnValue(event);

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);

    const profilesTracker = supabaseMock._tables['profiles'];
    expect(profilesTracker).toBeDefined();
    expect(profilesTracker.updateCalls.length).toBeGreaterThan(0);

    const updateCall = profilesTracker.updateCalls[0];
    expect(updateCall.plan).toBe('none');
    expect(updateCall.plan_domains).toBe(1);       // Free tier: 1 domain
    expect(updateCall.plan_scans_limit).toBe(4);    // Free tier: 4 scans
    expect(updateCall.plan_scans_used).toBe(0);
    expect(updateCall.plan_period_start).toBeNull();
    expect(updateCall.stripe_subscription_id).toBeNull();
    expect(updateCall.allowed_domains).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// invoice.payment_failed
// ---------------------------------------------------------------------------

describe('webhook POST — invoice.payment_failed', () => {
  it('restricts scanning by setting plan_scans_limit to 0', async () => {
    const event = makeEvent('invoice.payment_failed', {
      subscription: 'sub_fail_123',
    });

    mockConstructEvent.mockReturnValue(event);

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);

    const profilesTracker = supabaseMock._tables['profiles'];
    expect(profilesTracker).toBeDefined();
    expect(profilesTracker.updateCalls.length).toBeGreaterThan(0);

    const updateCall = profilesTracker.updateCalls[0];
    expect(updateCall.plan_scans_limit).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// customer.subscription.updated
// ---------------------------------------------------------------------------

describe('webhook POST — customer.subscription.updated', () => {
  it('updates plan from subscription item price ID', async () => {
    const event = makeEvent('customer.subscription.updated', {
      id: 'sub_updated_123',
      status: 'active',
      metadata: {},
      items: {
        data: [{ price: { id: 'price_1Sz2CjLRbxIsl4HLbs2LEaw0' } }],
      },
    });

    mockConstructEvent.mockReturnValue(event);

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);

    const profilesTracker = supabaseMock._tables['profiles'];
    expect(profilesTracker).toBeDefined();
    expect(profilesTracker.updateCalls.length).toBeGreaterThan(0);

    const updateCall = profilesTracker.updateCalls[0];
    expect(updateCall.plan).toBe('pro');
    expect(updateCall.plan_domains).toBe(3);
    expect(updateCall.plan_scans_limit).toBe(155);
  });

  it('restricts scanning for past_due subscription status', async () => {
    const event = makeEvent('customer.subscription.updated', {
      id: 'sub_past_due_123',
      status: 'past_due',
      metadata: {},
      items: {
        data: [{ price: { id: 'price_1Sz2CjLRbxIsl4HLbs2LEaw0' } }],
      },
    });

    mockConstructEvent.mockReturnValue(event);

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);

    const profilesTracker = supabaseMock._tables['profiles'];
    expect(profilesTracker).toBeDefined();
    expect(profilesTracker.updateCalls.length).toBeGreaterThan(0);

    const updateCall = profilesTracker.updateCalls[0];
    expect(updateCall.plan_scans_limit).toBe(0);
  });
});
