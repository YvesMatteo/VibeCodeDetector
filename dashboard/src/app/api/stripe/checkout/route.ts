import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';
import { checkCsrf } from '@/lib/csrf';
import { checkRateLimit } from '@/lib/rate-limit';

if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('Missing STRIPE_SECRET_KEY environment variable');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-01-28.clover',
});

const PLANS: Record<string, {
    productId: string;
    priceMonthly: string;
    priceAnnual: string;
    domains: number;
    scans: number;
    name: string
}> = {
    starter: { productId: 'prod_Tww4QtoLP4LGh4', priceMonthly: 'price_1Sz2CgLRbxIsl4HLE7jp6ecZ', priceAnnual: 'price_1T1G35LRbxIsl4HLq1Geq4Ov', domains: 1, scans: 30, name: 'Starter' },
    pro: { productId: 'prod_Tww4j1OR1ONDTJ', priceMonthly: 'price_1Sz2CjLRbxIsl4HLbs2LEaw0', priceAnnual: 'price_1T1G36LRbxIsl4HLcxaSjnej', domains: 3, scans: 155, name: 'Pro' },
    max: { productId: 'prod_Tww4oXvwj9PmsN', priceMonthly: 'price_1T1G99LRbxIsl4HLzT5TNktI', priceAnnual: 'price_1T1G99LRbxIsl4HLfsEV74xC', domains: 10, scans: 3000, name: 'Max' },
};

export async function POST(req: NextRequest) {
    try {
        const csrfError = checkCsrf(req);
        if (csrfError) return csrfError;

        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        // Rate limit: 5 checkout creations per minute per user
        const rl = await checkRateLimit(`checkout:${user.id}`, 5);
        if (!rl.allowed) {
            return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
        }

        const { plan, billing = 'monthly' } = await req.json();

        const planConfig = PLANS[plan];
        if (!planConfig) {
            return new NextResponse('Invalid plan', { status: 400 });
        }

        // Reuse existing Stripe customer if available
        const { data: profile } = await supabase
            .from('profiles')
            .select('stripe_customer_id')
            .eq('id', user.id)
            .single();

        // Check for existing active subscription — redirect to portal for plan changes
        if (profile?.stripe_customer_id) {
            const { data: existingProfile } = await supabase
                .from('profiles')
                .select('stripe_subscription_id')
                .eq('id', user.id)
                .single();

            if (existingProfile?.stripe_subscription_id) {
                return NextResponse.json(
                    { error: 'You already have an active subscription. Use the billing portal to change plans.', code: 'EXISTING_SUBSCRIPTION' },
                    { status: 409 }
                );
            }
        }

        const isAnnual = billing === 'annual';
        const priceId = isAnnual ? planConfig.priceAnnual : planConfig.priceMonthly;

        const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || '').trim();
        const allowedOrigins = [
            siteUrl,
            ...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000', 'http://localhost:3001'] : []),
        ].filter(Boolean) as string[];
        const requestOrigin = req.headers.get('origin');
        if (!requestOrigin || !allowedOrigins.includes(requestOrigin)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        const origin = requestOrigin;

        const session = await stripe.checkout.sessions.create({
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            allow_promotion_codes: true,
            success_url: `${origin}/dashboard?success=true`,
            cancel_url: `${origin}/dashboard/credits?canceled=true`,
            metadata: {
                userId: user.id,
                plan,
                billing_interval: isAnnual ? 'year' : 'month',
                plan_domains: planConfig.domains.toString(),
                plan_scans_limit: planConfig.scans.toString(),
            },
            subscription_data: {
                metadata: {
                    userId: user.id,
                    plan,
                    billing_interval: isAnnual ? 'year' : 'month',
                    plan_domains: planConfig.domains.toString(),
                    plan_scans_limit: planConfig.scans.toString(),
                },
            },
            ...(profile?.stripe_customer_id
                ? { customer: profile.stripe_customer_id }
                : { customer_email: user.email }),
        });

        return NextResponse.json({ sessionId: session.id, url: session.url });
    } catch (err: unknown) {
        console.error('Stripe Checkout Error:', err);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
