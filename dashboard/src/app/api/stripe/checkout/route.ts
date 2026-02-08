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

        const { package: packageId, currency = 'usd' } = await req.json();

        let priceAmount = 0;
        let credits = 0;
        let productName = '';

        // Pricing logic
        // Single Analysis: 29
        // 3 Analyses: 49
        // 5 Analyses: 79
        switch (packageId) {
            case 1:
                priceAmount = 2900; // $29.00
                credits = 1;
                productName = 'Single Vibe Analysis';
                break;
            case 3:
                priceAmount = 4900; // $49.00
                credits = 3;
                productName = '3 Vibe Analyses Pack';
                break;
            case 5:
                priceAmount = 7900; // $79.00
                credits = 5;
                productName = '5 Vibe Analyses Pack';
                break;
            default:
                return new NextResponse('Invalid package', { status: 400 });
        }

        // Supported currencies: usd, chf, gbp, eur
        // We strictly use the same numerical amount for simplicity as requested: "$29, 29 CHF, 29 GBP, 29 EUR"
        const allowedCurrencies = ['usd', 'chf', 'gbp', 'eur'];
        const selectedCurrency = allowedCurrencies.includes(currency.toLowerCase())
            ? currency.toLowerCase()
            : 'usd';

        const origin = req.headers.get('origin') || 'http://localhost:3000';

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: selectedCurrency,
                        product_data: {
                            name: productName,
                            description: `${credits} analysis credit${credits > 1 ? 's' : ''}`,
                        },
                        unit_amount: priceAmount,
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${origin}/dashboard?success=true`,
            cancel_url: `${origin}/dashboard/credits?canceled=true`,
            metadata: {
                userId: user.id,
                credits: credits.toString(),
            },
            customer_email: user.email,
        });

        return NextResponse.json({ sessionId: session.id, url: session.url });
    } catch (err: any) {
        console.error('Stripe Checkout Error:', err);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
