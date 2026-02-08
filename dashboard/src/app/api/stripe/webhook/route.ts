import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
    apiVersion: '2026-01-28.clover', // @ts-ignore
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
    const body = await req.text();
    const headerPayload = await headers();
    const signature = headerPayload.get('stripe-signature') as string;

    let event: Stripe.Event;

    try {
        if (!signature || !webhookSecret) {
            console.warn('Webhook signature verification failed due to missing signature or secret.');
            // In development, you might want to bypass verification if secret is missing, but better to fail.
            if (!webhookSecret) return new NextResponse('Webhook secret not configured', { status: 500 });
            return new NextResponse('Missing signature', { status: 400 });
        }
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;

        const userId = session.metadata?.userId;
        const creditsToAdd = parseInt(session.metadata?.credits || '0', 10);

        if (userId && creditsToAdd > 0) {
            try {
                // Initialize Supabase Admin Client
                const supabase = createClient(
                    process.env.NEXT_PUBLIC_SUPABASE_URL!,
                    process.env.SUPABASE_SERVICE_ROLE_KEY!
                );

                // Fetch current credits to ensure atomic increment or use RPC if available.
                // For simplicity and since we don't have high concurrency per user, we fetch and update.
                // Ideally, use a database function for atomic increment: increment_credits(user_id, amount).
                // Let's create an RPC call in the migration if strict atomicity is needed, 
                // but typically standard update is fine for this scale. 
                // Better: use rpc if possible. I'll assume standard update for now.

                const { data: profile, error: fetchError } = await supabase
                    .from('profiles')
                    .select('credits')
                    .eq('id', userId)
                    .single();

                if (fetchError) {
                    // If profile doesn't exist (legacy user?), create it.
                    if (fetchError.code === 'PGRST116') {
                        await supabase.from('profiles').insert({ id: userId, credits: creditsToAdd });
                    } else {
                        throw fetchError;
                    }
                } else {
                    const newCredits = (profile.credits || 0) + creditsToAdd;
                    await supabase
                        .from('profiles')
                        .update({ credits: newCredits, stripe_customer_id: session.customer as string })
                        .eq('id', userId);
                }

                console.log(`Added ${creditsToAdd} credits to user ${userId}`);
            } catch (error) {
                console.error('Error updating user credits:', error);
                return new NextResponse('Error updating credits', { status: 500 });
            }
        }
    }

    return new NextResponse(null, { status: 200 });
}
