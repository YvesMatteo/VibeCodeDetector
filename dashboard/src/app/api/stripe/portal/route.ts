import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('Missing STRIPE_SECRET_KEY environment variable');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-01-28.clover',
});

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('stripe_customer_id')
            .eq('id', user.id)
            .single();

        if (!profile?.stripe_customer_id) {
            return new NextResponse('No subscription found', { status: 404 });
        }

        const allowedOrigins = [
            process.env.NEXT_PUBLIC_SITE_URL,
            'http://localhost:3000',
            'http://localhost:3001',
        ].filter(Boolean);
        const requestOrigin = req.headers.get('origin');
        const origin = allowedOrigins.includes(requestOrigin || '') ? requestOrigin! : allowedOrigins[0]!;

        const portalSession = await stripe.billingPortal.sessions.create({
            customer: profile.stripe_customer_id,
            return_url: `${origin}/dashboard/settings`,
        });

        return NextResponse.json({ url: portalSession.url });
    } catch (err: unknown) {
        console.error('Stripe Portal Error:', err);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
