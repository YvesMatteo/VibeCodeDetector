---
<<<<<<< Updated upstream
name: Stripe Billing Integration
description: Manage Stripe products, prices, subscriptions, and payment links for VibeCheck pricing tiers
---

# Stripe Billing Integration

This skill provides guidance for integrating Stripe billing with VibeCheck's pricing tiers.

## VibeCheck Pricing Tiers

| Tier | Price | Scans/Month | Key Features |
|------|-------|-------------|--------------|
| **Free** | $0 | 3 | Basic security, SEO overview |
| **Starter** | $29/month | 25 | Full security, API leak detection, PDF reports |
| **Professional** | $79/month | 100 | Legal compliance, AI detection, 3 competitors |
| **Enterprise** | $199/month | Unlimited | White-label, unlimited competitors, 5 seats |

## Setting Up Products

### Create Products for Each Tier

```tool
mcp_stripe_create_product
name: VibeCheck Starter
description: 25 scans/month with full security scanner, complete SEO audit, and API key leak detection
```

### Create Prices

```tool
mcp_stripe_create_price
product: <product_id>
unit_amount: 2900  # $29.00 in cents
currency: usd
```

## Managing Subscriptions

### List All Subscriptions

```tool
mcp_stripe_list_subscriptions
limit: 10
```

### List Customer Subscriptions

```tool
mcp_stripe_list_subscriptions
customer: <customer_id>
```

### Cancel a Subscription

```tool
mcp_stripe_cancel_subscription
subscription: <subscription_id>
```

### Update Subscription (Change Tier)

```tool
mcp_stripe_update_subscription
subscription: <subscription_id>
items: [
  {"id": "<existing_item_id>", "deleted": true},
  {"price": "<new_price_id>"}
]
proration_behavior: create_prorations
```

## Payment Links

Create payment links for easy checkout:

```tool
mcp_stripe_create_payment_link
price: <price_id>
quantity: 1
redirect_url: https://vibecheck.app/dashboard?session={CHECKOUT_SESSION_ID}
```

## Customer Management

### Create a Customer

```tool
mcp_stripe_create_customer
name: <customer_name>
email: <customer_email>
```

### List Customers

```tool
mcp_stripe_list_customers
limit: 10
email: <optional_email_filter>
```

## Invoicing

### Create an Invoice

```tool
mcp_stripe_create_invoice
customer: <customer_id>
days_until_due: 7
```

### Add Invoice Items

```tool
mcp_stripe_create_invoice_item
customer: <customer_id>
price: <price_id>
invoice: <invoice_id>
```

### Finalize Invoice

```tool
mcp_stripe_finalize_invoice
invoice: <invoice_id>
```

## Coupons and Discounts

### Create a Percentage Coupon

```tool
mcp_stripe_create_coupon
name: Launch Special 20% Off
percent_off: 20
duration: repeating
duration_in_months: 3
```

### Create an Amount Coupon

```tool
mcp_stripe_create_coupon
name: $10 Off First Month
amount_off: 1000  # $10.00 in cents
currency: USD
duration: once
```

## Refunds

```tool
mcp_stripe_create_refund
payment_intent: <payment_intent_id>
amount: <optional_partial_amount_in_cents>
```

## Checking Balance

```tool
mcp_stripe_retrieve_balance
```

## Subscription Tier Mapping

When syncing with Supabase, map Stripe price IDs to tier names:

```typescript
const TIER_MAPPING = {
  'price_xxx_free': { tier: 'free', scansLimit: 3 },
  'price_xxx_starter': { tier: 'starter', scansLimit: 25 },
  'price_xxx_professional': { tier: 'professional', scansLimit: 100 },
  'price_xxx_enterprise': { tier: 'enterprise', scansLimit: -1 }, // unlimited
};
```

## Webhook Events to Handle

Configure webhooks for these events:

1. `customer.subscription.created` - Create/update user profile
2. `customer.subscription.updated` - Update tier and limits
3. `customer.subscription.deleted` - Revert to free tier
4. `invoice.payment_succeeded` - Reset monthly scan count
5. `invoice.payment_failed` - Send notification, grace period

## Documentation Reference

For implementation questions:

```tool
mcp_stripe_search_stripe_documentation
question: <your_integration_question>
language: node
```
=======
name: Stripe Billing
description: Implementing subscription billing with Stripe for VibeCheck's pricing tiers
---

# Stripe Billing for VibeCheck

This skill covers implementing Stripe subscriptions for VibeCheck's tiered pricing model.

## Pricing Tiers Reference

| Tier | Price | Scans/Month | Features |
|------|-------|-------------|----------|
| **Free** | $0 | 3 | Basic security, SEO overview |
| **Starter** | $29/mo | 25 | Full security, complete SEO, PDF reports |
| **Professional** | $79/mo | 100 | + Legal, AI detection, 3 competitors |
| **Enterprise** | $199/mo | Unlimited | + Unlimited competitors, white-label, API |

## Environment Setup

```env
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Price IDs from Stripe Dashboard
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_PROFESSIONAL=price_...
STRIPE_PRICE_ENTERPRISE=price_...
```

## Stripe Client Setup

```typescript
// lib/stripe.ts
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});
```

## Creating Checkout Sessions

```typescript
// app/api/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const PRICE_IDS: Record<string, string> = {
  starter: process.env.STRIPE_PRICE_STARTER!,
  professional: process.env.STRIPE_PRICE_PROFESSIONAL!,
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE!,
};

export async function POST(req: NextRequest) {
  const { tier } = await req.json();
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const priceId = PRICE_IDS[tier];
  if (!priceId) {
    return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
  }
  
  const session = await stripe.checkout.sessions.create({
    customer_email: user.email,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
    metadata: {
      userId: user.id,
      tier,
    },
  });
  
  return NextResponse.json({ sessionId: session.id });
}
```

## Webhook Handler

```typescript
// app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

// Use service role for webhooks (no user context)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TIER_LIMITS: Record<string, number> = {
  starter: 25,
  professional: 100,
  enterprise: 999999, // Unlimited
};

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;
  
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }
  
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const { userId, tier } = session.metadata!;
      
      await supabase
        .from('user_profiles')
        .update({
          subscription_tier: tier,
          scans_limit: TIER_LIMITS[tier],
          stripe_customer_id: session.customer as string,
        })
        .eq('id', userId);
      break;
    }
    
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      // Handle plan changes, upgrades, downgrades
      break;
    }
    
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      
      // Downgrade to free tier
      await supabase
        .from('user_profiles')
        .update({
          subscription_tier: 'free',
          scans_limit: 3,
        })
        .eq('stripe_customer_id', customerId);
      break;
    }
    
    case 'invoice.payment_failed': {
      // Handle failed payment - notify user
      break;
    }
  }
  
  return NextResponse.json({ received: true });
}
```

## Customer Portal

Allow users to manage their subscription:

```typescript
// app/api/billing-portal/route.ts
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('stripe_customer_id')
    .eq('id', user!.id)
    .single();
  
  const session = await stripe.billingPortal.sessions.create({
    customer: profile!.stripe_customer_id,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings`,
  });
  
  return NextResponse.json({ url: session.url });
}
```

## Client-Side Checkout Button

```tsx
// components/pricing/checkout-button.tsx
'use client';

import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export function CheckoutButton({ tier }: { tier: string }) {
  const handleCheckout = async () => {
    const res = await fetch('/api/checkout', {
      method: 'POST',
      body: JSON.stringify({ tier }),
    });
    
    const { sessionId } = await res.json();
    const stripe = await stripePromise;
    await stripe?.redirectToCheckout({ sessionId });
  };
  
  return (
    <button
      onClick={handleCheckout}
      className="w-full py-2 bg-blue-600 text-white rounded-lg"
    >
      Subscribe
    </button>
  );
}
```

## Reset Monthly Scan Counts

Run via cron job at month start:

```typescript
// Scheduled function (e.g., Supabase Edge Function or external cron)
async function resetMonthlyScanCounts() {
  await supabase
    .from('user_profiles')
    .update({ scans_used: 0 })
    .neq('subscription_tier', 'free'); // Only reset paid tiers
}
```

## Testing

Use Stripe test mode and test cards:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- 3D Secure: `4000 0027 6000 3184`
>>>>>>> Stashed changes
