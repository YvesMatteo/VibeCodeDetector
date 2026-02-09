import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
    apiVersion: '2026-01-28.clover', // @ts-ignore
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

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
    } catch (err: any) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
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

        if (metadata?.plan) {
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
                            plan: metadata.plan,
                            plan_domains: parseInt(metadata.plan_domains || '0', 10),
                            plan_scans_limit: parseInt(metadata.plan_scans_limit || '0', 10),
                        })
                        .eq('id', profile.id);

                    console.log(`Updated plan to '${metadata.plan}' for user ${profile.id}`);
                }
            } catch (error) {
                console.error('Error updating plan:', error);
            }
        }
    }

    return new NextResponse(null, { status: 200 });
}
