import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import {
    resolvePlanByPriceId,
    resolvePlanByMetadata,
    isValidUUID,
    type PlanInfo,
} from '@/lib/stripe-plans';

if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('Missing STRIPE_SECRET_KEY environment variable');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-01-28.clover' as Stripe.LatestApiVersion,
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

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

    // Idempotency check: see if event was already fully processed
    const { data: existing } = await supabase
        .from('processed_webhook_events')
        .select('event_id')
        .eq('event_id', event.id)
        .maybeSingle();

    if (existing) {
        return new NextResponse(null, { status: 200 });
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;

        if (!userId || !isValidUUID(userId)) {
            console.error('Invalid userId in webhook metadata:', userId);
            return new NextResponse(null, { status: 500 });
        }

        // M3: Verify payment was actually completed
        if (session.payment_status !== 'paid') {
            console.warn('Checkout session not paid, skipping activation:', session.payment_status);
            return new NextResponse(null, { status: 200 });
        }

        // Re-derive plan from the actual price ID, not just metadata
        let planInfo: PlanInfo | null = null;
        try {
            const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
            const priceId = lineItems.data[0]?.price?.id;
            if (priceId) {
                planInfo = resolvePlanByPriceId(priceId);
            }
        } catch (err) {
            console.warn('Could not fetch line items for price verification:', err);
        }

        // Fall back to metadata only if price lookup fails, but validate against known plans
        if (!planInfo) {
            planInfo = resolvePlanByMetadata(session.metadata?.plan);
            if (planInfo) {
                console.warn(`Fell back to metadata for plan derivation: ${planInfo.plan} (validated against known plans)`);
            }
        }

        if (planInfo) {
            // Get actual billing period from Stripe
            let periodStart = new Date().toISOString();
            if (session.subscription) {
                try {
                    const sub = await stripe.subscriptions.retrieve(session.subscription as string);
                    periodStart = new Date(((sub as unknown as { current_period_start: number }).current_period_start) * 1000).toISOString();
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
                        stripe_customer_id: (typeof session.customer === 'string' ? session.customer : session.customer?.id) ?? null,
                        stripe_subscription_id: (typeof session.subscription === 'string' ? session.subscription : session.subscription?.id) ?? null,
                    })
                    .eq('id', userId);

                if (error) throw error;
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

                const { error: updateError } = await supabase
                    .from('profiles')
                    .update({
                        plan_scans_used: 0,
                        plan_period_start: invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : new Date().toISOString(),
                    })
                    .eq('id', profile.id);

                if (updateError) {
                    console.error('Error resetting scan counter:', updateError);
                    return new NextResponse('Error resetting scan counter', { status: 500 });
                }
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
                    const { error: updateError } = await supabase
                        .from('profiles')
                        .update({ plan_scans_limit: 0 })
                        .eq('id', profile.id);

                    if (updateError) {
                        console.error('Error restricting plan for payment failure:', updateError);
                        return new NextResponse('Error restricting plan', { status: 500 });
                    }
                }
            } catch (error) {
                console.error('Error handling payment failure:', error);
                return new NextResponse('Error handling payment failure', { status: 500 });
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
                const { error: updateError } = await supabase
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

                if (updateError) {
                    console.error('Error deactivating plan:', updateError);
                    return new NextResponse('Error deactivating plan', { status: 500 });
                }
            }
        } catch (error) {
            console.error('Error deactivating plan:', error);
            return new NextResponse('Error deactivating plan', { status: 500 });
        }
    }

    else if (event.type === 'customer.subscription.updated') {
        const subscription = event.data.object as Stripe.Subscription;
        const metadata = subscription.metadata;

        let planInfo: PlanInfo | null = null;

        // Check price ID first (more reliable than metadata for portal changes)
        const items = (subscription as unknown as { items?: { data?: Array<{ price?: { id?: string } }> } }).items?.data;
        if (items?.length > 0) {
            const priceId = items[0].price?.id;
            if (priceId) {
                planInfo = resolvePlanByPriceId(priceId);
            }
        }

        // Fall back to metadata only if price lookup fails, validate against known plans
        if (!planInfo && metadata?.plan) {
            planInfo = resolvePlanByMetadata(metadata.plan);
            if (planInfo) {
                console.warn(`Fell back to metadata for subscription.updated plan: ${metadata.plan} (validated)`);
            }
        }

        // Handle non-active subscription states
        const subStatus = subscription.status;
        if (subStatus === 'past_due' || subStatus === 'unpaid' || subStatus === 'paused' || subStatus === 'incomplete' || subStatus === 'canceled') {
            try {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('stripe_subscription_id', subscription.id)
                    .single();

                if (profile) {
                    const { error: updateError } = await supabase
                        .from('profiles')
                        .update({ plan_scans_limit: 0 })
                        .eq('id', profile.id);

                    if (updateError) {
                        console.error('Error restricting plan for non-active subscription:', updateError);
                        return new NextResponse('Error restricting plan', { status: 500 });
                    }
                }
            } catch (error) {
                console.error('Error restricting plan for non-active subscription:', error);
                return new NextResponse('Error restricting plan', { status: 500 });
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
                    const { error: updateError } = await supabase
                        .from('profiles')
                        .update({
                            plan: planInfo.plan,
                            plan_domains: planInfo.domains,
                            plan_scans_limit: planInfo.scans,
                        })
                        .eq('id', profile.id);

                    if (updateError) {
                        console.error('Error updating plan:', updateError);
                        return new NextResponse('Error updating plan', { status: 500 });
                    }
                }
            } catch (error) {
                console.error('Error updating plan:', error);
                return new NextResponse('Error updating plan', { status: 500 });
            }
        }
    } else {
        console.warn(`Unhandled webhook event type: ${event.type}`);
    }

    // Mark event as processed AFTER business logic succeeds
    // This ensures failed activations get retried by Stripe
    const { error: markError } = await supabase
        .from('processed_webhook_events')
        .upsert(
            { event_id: event.id, event_type: event.type },
            { onConflict: 'event_id', ignoreDuplicates: true }
        );

    if (markError) {
        console.error('Failed to mark event as processed:', markError);
        // Still return 200 since business logic succeeded
    }

    return new NextResponse(null, { status: 200 });
}
