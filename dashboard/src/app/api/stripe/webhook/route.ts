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

const PLANS_BY_AMOUNT: Record<number, { plan: string; domains: number; scans: number }> = {
    1900: { plan: 'starter', domains: 1, scans: 5 },
    3900: { plan: 'pro', domains: 3, scans: 20 },
    8900: { plan: 'enterprise', domains: 10, scans: 75 },
};

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

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const plan = session.metadata?.plan;
        const planDomains = parseInt(session.metadata?.plan_domains || '0', 10);
        const planScansLimit = parseInt(session.metadata?.plan_scans_limit || '0', 10);

        if (userId && plan) {
            try {
                const { error } = await supabase
                    .from('profiles')
                    .update({
                        plan,
                        plan_domains: planDomains,
                        plan_scans_limit: planScansLimit,
                        plan_scans_used: 0,
                        plan_period_start: new Date().toISOString(),
                        stripe_customer_id: session.customer as string,
                        stripe_subscription_id: session.subscription as string,
                    })
                    .eq('id', userId);

                if (error) throw error;
                console.log(`Activated plan '${plan}' for user ${userId}`);
            } catch (error) {
                console.error('Error activating plan:', error);
                return new NextResponse('Error activating plan', { status: 500 });
            }
        }
    }

    if (event.type === 'invoice.paid') {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = (invoice as any).subscription as string;

        if (subscriptionId) {
            try {
                // Find user by subscription ID and reset monthly scans
                const { data: profile, error: fetchError } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('stripe_subscription_id', subscriptionId)
                    .single();

                if (fetchError || !profile) {
                    console.warn('No profile found for subscription:', subscriptionId);
                    return new NextResponse(null, { status: 200 });
                }

                await supabase
                    .from('profiles')
                    .update({
                        plan_scans_used: 0,
                        plan_period_start: new Date().toISOString(),
                    })
                    .eq('id', profile.id);

                console.log(`Monthly reset for user ${profile.id}`);
            } catch (error) {
                console.error('Error resetting monthly scans:', error);
            }
        }
    }

    if (event.type === 'customer.subscription.deleted') {
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

    if (event.type === 'customer.subscription.updated') {
        const subscription = event.data.object as Stripe.Subscription;
        const metadata = subscription.metadata;

        // Resolve plan from metadata (set via subscription_data) or fall back to price amount
        let planInfo: { plan: string; domains: number; scans: number } | null = null;

        if (metadata?.plan) {
            planInfo = {
                plan: metadata.plan,
                domains: parseInt(metadata.plan_domains || '0', 10),
                scans: parseInt(metadata.plan_scans_limit || '0', 10),
            };
        } else {
            // Fallback: resolve from the subscription's current price amount
            const items = (subscription as any).items?.data;
            if (items?.length > 0) {
                const amount = items[0].price?.unit_amount;
                if (amount && PLANS_BY_AMOUNT[amount]) {
                    planInfo = PLANS_BY_AMOUNT[amount];
                }
            }
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
    }

    return new NextResponse(null, { status: 200 });
}
