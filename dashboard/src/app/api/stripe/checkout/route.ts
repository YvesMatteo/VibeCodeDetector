import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('Missing STRIPE_SECRET_KEY environment variable');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-01-28.clover',
});

const PLANS: Record<string, { price: number; domains: number; scans: number; name: string }> = {
    starter: { price: 1900, domains: 1, scans: 5, name: 'Starter' },
    pro: { price: 3900, domains: 3, scans: 20, name: 'Pro' },
    enterprise: { price: 8900, domains: 10, scans: 75, name: 'Enterprise' },
};

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const { plan, currency = 'usd' } = await req.json();

        const planConfig = PLANS[plan];
        if (!planConfig) {
            return new NextResponse('Invalid plan', { status: 400 });
        }

        const allowedCurrencies = ['usd', 'chf', 'gbp', 'eur'];
        const selectedCurrency = allowedCurrencies.includes(currency.toLowerCase())
            ? currency.toLowerCase()
            : 'usd';

        const allowedOrigins = [
            process.env.NEXT_PUBLIC_SITE_URL,
            'http://localhost:3000',
            'http://localhost:3001',
        ].filter(Boolean);
        const requestOrigin = req.headers.get('origin');
        const origin = allowedOrigins.includes(requestOrigin || '') ? requestOrigin! : allowedOrigins[0]!;

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: selectedCurrency,
                        product_data: {
                            name: `CheckVibe ${planConfig.name}`,
                            description: `${planConfig.domains} domain${planConfig.domains > 1 ? 's' : ''}, ${planConfig.scans} scans/month`,
                        },
                        unit_amount: planConfig.price,
                        recurring: { interval: 'month' },
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
                plan_domains: planConfig.domains.toString(),
                plan_scans_limit: planConfig.scans.toString(),
            },
            subscription_data: {
                metadata: {
                    userId: user.id,
                    plan,
                    plan_domains: planConfig.domains.toString(),
                    plan_scans_limit: planConfig.scans.toString(),
                },
            },
            customer_email: user.email,
        });

        return NextResponse.json({ sessionId: session.id, url: session.url });
    } catch (err: unknown) {
        console.error('Stripe Checkout Error:', err);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
