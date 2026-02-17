import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';
import { validateCurrency } from '@/lib/currency';
import { checkCsrf } from '@/lib/csrf';
import { checkRateLimit } from '@/lib/rate-limit';

if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('Missing STRIPE_SECRET_KEY environment variable');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-01-28.clover',
});

const PLANS: Record<string, { productId: string; amountMonthly: number; amountAnnual: number; domains: number; scans: number; name: string }> = {
    starter: { productId: 'prod_Tww4QtoLP4LGh4', amountMonthly: 1900, amountAnnual: 15960, domains: 1, scans: 5, name: 'Starter' },
    pro: { productId: 'prod_Tww4j1OR1ONDTJ', amountMonthly: 3900, amountAnnual: 32760, domains: 3, scans: 20, name: 'Pro' },
    max: { productId: 'prod_Tww4oXvwj9PmsN', amountMonthly: 7900, amountAnnual: 66360, domains: 10, scans: 75, name: 'Max' },
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

        const { plan, billing = 'monthly', currency: rawCurrency = 'usd' } = await req.json();

        const planConfig = PLANS[plan];
        if (!planConfig) {
            return new NextResponse('Invalid plan', { status: 400 });
        }

        const currency = validateCurrency(rawCurrency);

        // Reuse existing Stripe customer if available
        const { data: profile } = await supabase
            .from('profiles')
            .select('stripe_customer_id')
            .eq('id', user.id)
            .single();

        const isAnnual = billing === 'annual';
        const interval: 'month' | 'year' = isAnnual ? 'year' : 'month';
        const unitAmount = isAnnual ? planConfig.amountAnnual : planConfig.amountMonthly;

        const allowedOrigins = [
            process.env.NEXT_PUBLIC_SITE_URL,
            ...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000', 'http://localhost:3001'] : []),
        ].filter(Boolean) as string[];
        const requestOrigin = req.headers.get('origin');
        const origin = allowedOrigins.includes(requestOrigin || '') ? requestOrigin! : allowedOrigins[0]!;

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency,
                        product: planConfig.productId,
                        unit_amount: unitAmount,
                        recurring: {
                            interval,
                        },
                    },
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${origin}/dashboard?success=true`,
            cancel_url: `${origin}/dashboard/credits?canceled=true`,
            metadata: {
                userId: user.id,
                plan,
                billing_interval: interval,
                plan_domains: planConfig.domains.toString(),
                plan_scans_limit: planConfig.scans.toString(),
            },
            subscription_data: {
                metadata: {
                    userId: user.id,
                    plan,
                    billing_interval: interval,
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
        const errMsg = err instanceof Error ? err.message : String(err);
        const errStack = err instanceof Error ? err.stack : '';
        console.error('Stripe Checkout Error:', errMsg, errStack);
        return NextResponse.json({ error: 'Internal Error', debug: errMsg }, { status: 500 });
    }
}
