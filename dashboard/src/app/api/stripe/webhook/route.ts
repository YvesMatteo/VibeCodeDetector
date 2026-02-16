import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('Missing STRIPE_SECRET_KEY environment variable');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-01-28.clover' as Stripe.LatestApiVersion,
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const PLANS_BY_PRICE_ID: Record<string, { plan: string; domains: number; scans: number }> = {
    // Starter
    'price_1Sz2CgLRbxIsl4HLE7jp6ecZ': { plan: 'starter', domains: 1, scans: 5 },  // monthly
    'price_1T1G35LRbxIsl4HLq1Geq4Ov': { plan: 'starter', domains: 1, scans: 5 },  // annual (30% off)
    'price_1Sz2CiLRbxIsl4HLDkUzXZXs': { plan: 'starter', domains: 1, scans: 5 },  // annual (legacy 20%)
    // Pro
    'price_1Sz2CjLRbxIsl4HLbs2LEaw0': { plan: 'pro', domains: 3, scans: 20 },      // monthly
    'price_1T1G36LRbxIsl4HLcxaSjnej': { plan: 'pro', domains: 3, scans: 20 },      // annual (30% off)
    'price_1Sz2ClLRbxIsl4HLrXX3IxAf': { plan: 'pro', domains: 3, scans: 20 },      // annual (legacy 20%)
    // Max (formerly Enterprise)
    'price_1T1G99LRbxIsl4HLzT5TNktI': { plan: 'max', domains: 10, scans: 75 },       // monthly $79
    'price_1T1G99LRbxIsl4HLfsEV74xC': { plan: 'max', domains: 10, scans: 75 },       // annual (30% off)
    'price_1Sz2CnLRbxIsl4HL2XFxYOmP': { plan: 'max', domains: 10, scans: 75 },       // legacy monthly $89
    'price_1T1G36LRbxIsl4HLk68EVav3': { plan: 'max', domains: 10, scans: 75 },       // legacy annual
    'price_1Sz2CoLRbxIsl4HL1uhpaBEp': { plan: 'max', domains: 10, scans: 75 },       // legacy annual
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getSupabaseAdmin() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
}

export async function POST(req: Request) {
    const body = await req.text();
    const headerPayload = await headers();
    const signature = headerPayload.get('stripe-signature') as string;

    let event: Stripe.Event;

    try {
        if (!signature || !webhookSecret) {
            if (!webhookSecret) return new NextResponse('Webhook secret not configured', { status: 500 });
            return new NextResponse('Missing signature', { status: 400 });
        }
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error(`Webhook signature verification failed: ${message}`);
        return new NextResponse('Webhook verification failed', { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Atomic idempotency check: INSERT and skip if already exists
    const { data: inserted, error: idempotencyError } = await supabase
        .from('processed_webhook_events')
        .upsert(
            { event_id: event.id, event_type: event.type },
            { onConflict: 'event_id', ignoreDuplicates: true }
        )
        .select();

    if (idempotencyError) {
        console.error('Idempotency check failed:', idempotencyError);
        return new NextResponse('Idempotency check failed', { status: 500 });
    }

    // If no rows were returned, the event was already processed
    if (!inserted || inserted.length === 0) {
        console.log(`Event ${event.id} already processed, skipping`);
        return new NextResponse(null, { status: 200 });
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;

        if (!userId || !UUID_REGEX.test(userId)) {
            console.error('Invalid userId in webhook metadata:', userId);
            return new NextResponse(null, { status: 200 });
        }

        // Re-derive plan from the actual price ID, not just metadata
        let planInfo: { plan: string; domains: number; scans: number } | null = null;
        try {
            const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
            const priceId = lineItems.data[0]?.price?.id;
            if (priceId && PLANS_BY_PRICE_ID[priceId]) {
                planInfo = PLANS_BY_PRICE_ID[priceId];
            }
        } catch (err) {
            console.warn('Could not fetch line items for price verification:', err);
        }

        // Fall back to metadata only if price lookup fails
        if (!planInfo) {
            const plan = session.metadata?.plan;
            const planDomains = parseInt(session.metadata?.plan_domains || '0', 10);
            const planScansLimit = parseInt(session.metadata?.plan_scans_limit || '0', 10);
            if (plan) {
                planInfo = { plan, domains: planDomains, scans: planScansLimit };
                console.warn(`Fell back to metadata for plan derivation: ${plan}`);
            }
        }

        if (planInfo) {
            // Get actual billing period from Stripe
            let periodStart = new Date().toISOString();
            if (session.subscription) {
                try {
                    const sub = await stripe.subscriptions.retrieve(session.subscription as string);
                    periodStart = new Date(sub.current_period_start * 1000).toISOString();
                } catch (e) {
                    console.warn('Could not fetch subscription period, using current time:', e);
                }
            }

            try {
                const { error } = await supabase
                    .from('profiles')
                    .update({
                        plan: planInfo.plan,
                        plan_domains: planInfo.domains,
                        plan_scans_limit: planInfo.scans,
                        plan_scans_used: 0,
                        plan_period_start: periodStart,
                        stripe_customer_id: session.customer as string,
                        stripe_subscription_id: session.subscription as string,
                    })
                    .eq('id', userId);

                if (error) throw error;
                console.log(`Activated plan '${planInfo.plan}' for user ${userId}`);
            } catch (error) {
                console.error('Error activating plan:', error);
                return new NextResponse('Error activating plan', { status: 500 });
            }
        }
    }

    else if (event.type === 'invoice.paid') {
        const invoice = event.data.object as Stripe.Invoice;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rawSubscription = (invoice as any).subscription;
        const subscriptionId = typeof rawSubscription === 'string'
            ? rawSubscription
            : rawSubscription?.toString() || '';

        if (subscriptionId) {
            try {
                // Find user by subscription ID and reset monthly scans
                const { data: profile, error: fetchError } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('stripe_subscription_id', subscriptionId)
                    .single();

                if (fetchError) {
                    console.error('Database error looking up subscription:', fetchError);
                    return new NextResponse(null, { status: 500 });
                }
                if (!profile) {
                    console.warn('No profile found for subscription:', subscriptionId);
                    return new NextResponse(null, { status: 200 });
                }

                await supabase
                    .from('profiles')
                    .update({
                        plan_scans_used: 0,
                        plan_period_start: invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : new Date().toISOString(),
                    })
                    .eq('id', profile.id);

                console.log(`Monthly reset for user ${profile.id}`);
            } catch (error) {
                console.error('Error resetting monthly scans:', error);
                return new NextResponse(null, { status: 500 });
            }
        }
    }

    else if (event.type === 'invoice.payment_failed') {
        const invoice = event.data.object as Stripe.Invoice;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rawSubscription = (invoice as any).subscription;
        const subscriptionId = typeof rawSubscription === 'string'
            ? rawSubscription
            : rawSubscription?.toString() || '';

        if (subscriptionId) {
            try {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('stripe_subscription_id', subscriptionId)
                    .single();

                if (profile) {
                    // Restrict scanning while payment is failing.
                    // When Stripe retries successfully, customer.subscription.updated
                    // fires and restores the correct limits from the price amount.
                    await supabase
                        .from('profiles')
                        .update({ plan_scans_limit: 0 })
                        .eq('id', profile.id);

                    console.log(`Payment failed for user ${profile.id} — scanning restricted`);
                }
            } catch (error) {
                console.error('Error handling payment failure:', error);
            }
        }
    }

    else if (event.type === 'customer.subscription.deleted') {
        const subscription = event.data.object as Stripe.Subscription;

        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('id')
                .eq('stripe_subscription_id', subscription.id)
                .single();

            if (profile) {
                await supabase
                    .from('profiles')
                    .update({
                        plan: 'none',
                        plan_domains: 0,
                        plan_scans_limit: 0,
                        plan_scans_used: 0,
                        plan_period_start: null,
                        stripe_subscription_id: null,
                        allowed_domains: [],
                    })
                    .eq('id', profile.id);

                console.log(`Deactivated plan for user ${profile.id}`);
            }
        } catch (error) {
            console.error('Error deactivating plan:', error);
        }
    }

    else if (event.type === 'customer.subscription.updated') {
        const subscription = event.data.object as Stripe.Subscription;
        const metadata = subscription.metadata;

        let planInfo: { plan: string; domains: number; scans: number } | null = null;

        // Check price ID first (more reliable than metadata for portal changes)
        const items = (subscription as any).items?.data;
        if (items?.length > 0) {
            const priceId = items[0].price?.id;
            if (priceId && PLANS_BY_PRICE_ID[priceId]) {
                planInfo = PLANS_BY_PRICE_ID[priceId];
            }
        }

        // Fall back to metadata only if price lookup fails
        if (!planInfo && metadata?.plan) {
            planInfo = {
                plan: metadata.plan,
                domains: parseInt(metadata.plan_domains || '0', 10),
                scans: parseInt(metadata.plan_scans_limit || '0', 10),
            };
            console.warn(`Fell back to metadata for subscription.updated plan: ${metadata.plan}`);
        }

        // Handle non-active subscription states
        const subStatus = subscription.status;
        if (subStatus === 'past_due' || subStatus === 'unpaid' || subStatus === 'paused' || subStatus === 'incomplete') {
            try {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('stripe_subscription_id', subscription.id)
                    .single();

                if (profile) {
                    await supabase
                        .from('profiles')
                        .update({ plan_scans_limit: 0 })
                        .eq('id', profile.id);
                    console.log(`Restricted scanning for user ${profile.id} due to subscription status: ${subStatus}`);
                }
            } catch (error) {
                console.error('Error restricting plan for non-active subscription:', error);
            }
            return new NextResponse(null, { status: 200 });
        }

        if (planInfo) {
            try {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('stripe_subscription_id', subscription.id)
                    .single();

                if (profile) {
                    await supabase
                        .from('profiles')
                        .update({
                            plan: planInfo.plan,
                            plan_domains: planInfo.domains,
                            plan_scans_limit: planInfo.scans,
                        })
                        .eq('id', profile.id);

                    console.log(`Updated plan to '${planInfo.plan}' for user ${profile.id}`);
                }
            } catch (error) {
                console.error('Error updating plan:', error);
            }
        }
    } else {
        console.warn(`Unhandled webhook event type: ${event.type}`);
    }

    return new NextResponse(null, { status: 200 });
}
