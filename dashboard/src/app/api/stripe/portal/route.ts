import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
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

        const origin = req.headers.get('origin') || 'http://localhost:3000';

        const portalSession = await stripe.billingPortal.sessions.create({
            customer: profile.stripe_customer_id,
            return_url: `${origin}/dashboard/settings`,
        });

        return NextResponse.json({ url: portalSession.url });
    } catch (err: any) {
        console.error('Stripe Portal Error:', err);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
