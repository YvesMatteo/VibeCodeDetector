'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Zap, Crown, Mail } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { detectCurrency, formatPrice, type CurrencyCode } from '@/lib/currency';

const pricingPlans = [
    {
        id: 'starter',
        name: 'Starter',
        priceMonthly: 19,
        priceAnnualPerMonth: 15.20,
        description: 'For solo makers',
        domains: 1,
        scans: 5,
        features: ['1 project', '5 scans/month', 'Full scan suite', 'PDF export'],
        highlighted: false,
    },
    {
        id: 'pro',
        name: 'Pro',
        priceMonthly: 39,
        priceAnnualPerMonth: 31.20,
        description: 'For growing projects',
        domains: 3,
        scans: 20,
        features: ['3 projects', '20 scans/month', 'Full scan suite', 'Priority support'],
        highlighted: true,
        badge: 'Most Popular',
    },
    {
        id: 'enterprise',
        name: 'Enterprise',
        priceMonthly: 89,
        priceAnnualPerMonth: 71.20,
        description: 'For teams & agencies',
        domains: 10,
        scans: 75,
        features: ['10 projects', '75 scans/month', 'Full scan suite', 'Dedicated support'],
        highlighted: false,
    },
    {
        id: 'max',
        name: 'Max',
        priceMonthly: null,
        priceAnnualPerMonth: null,
        description: 'For large organizations',
        domains: null,
        scans: null,
        features: ['Unlimited projects', 'Custom scan volume', 'SLA guarantee', 'Account manager'],
        highlighted: false,
        isContact: true,
    },
];

export default function CreditsPage() {
    const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
    const [loading, setLoading] = useState<string | null>(null);
    const [portalLoading, setPortalLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currency, setCurrency] = useState<CurrencyCode>('USD');
    const [currentPlan, setCurrentPlan] = useState<string>('none');
    const [scansUsed, setScansUsed] = useState(0);
    const [scansLimit, setScansLimit] = useState(0);
    const [domainsUsed, setDomainsUsed] = useState(0);
    const [domainsLimit, setDomainsLimit] = useState(0);

    useEffect(() => {
        setCurrency(detectCurrency());
    }, []);

    useEffect(() => {
        async function loadProfile() {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profile } = await supabase
                .from('profiles')
                .select('plan, plan_scans_used, plan_scans_limit, plan_domains, allowed_domains')
                .eq('id', user.id)
                .single();

            if (profile) {
                setCurrentPlan(profile.plan || 'none');
                setScansUsed(profile.plan_scans_used || 0);
                setScansLimit(profile.plan_scans_limit || 0);
                setDomainsUsed(profile.allowed_domains?.length || 0);
                setDomainsLimit(profile.plan_domains || 0);
            }
        }
        loadProfile();
    }, []);

    const handleSubscribe = async (planId: string) => {
        setLoading(planId);
        setError(null);
        try {
            const res = await fetch('/api/stripe/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan: planId, currency: currency.toLowerCase(), billing }),
            });

            if (!res.ok) throw new Error('Checkout failed');

            const { url } = await res.json();
            if (url) window.location.href = url;
        } catch (err) {
            console.error('Subscribe error:', err);
            setError('Something went wrong. Please try again.');
        } finally {
            setLoading(null);
        }
    };

    const handleManageSubscription = async () => {
        setPortalLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/stripe/portal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });

            if (res.status === 404) {
                setError('No active subscription found. Choose a plan below to get started.');
                return;
            }

            if (!res.ok) throw new Error('Portal failed');

            const { url } = await res.json();
            if (url) window.location.href = url;
        } catch (err) {
            console.error('Portal error:', err);
            setError('Something went wrong. Please try again.');
        } finally {
            setPortalLoading(false);
        }
    };

    return (
        <div className="p-5 md:p-10 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-12">
                <h1 className="text-3xl md:text-[42px] font-heading font-semibold tracking-tight text-white leading-[1.1] mb-3">
                    Simple, Transparent<br />
                    Plans.
                </h1>
                <p className="text-zinc-500 text-[15px] max-w-lg mb-8">
                    Choose a plan that fits your needs. Upgrade or downgrade anytime.
                </p>

                {/* Billing Toggle */}
                <div className="inline-flex items-center rounded-xl border border-white/[0.08] bg-white/[0.02] p-1">
                    <button
                        onClick={() => setBilling('monthly')}
                        className={`px-4 sm:px-5 py-2 rounded-lg text-[13px] font-medium transition-all ${
                            billing === 'monthly'
                                ? 'bg-white text-zinc-900'
                                : 'text-zinc-500 hover:text-white'
                        }`}
                    >
                        Monthly
                    </button>
                    <button
                        onClick={() => setBilling('annual')}
                        className={`px-4 sm:px-5 py-2 rounded-lg text-[13px] font-medium transition-all flex items-center gap-1.5 sm:gap-2 ${
                            billing === 'annual'
                                ? 'bg-white text-zinc-900'
                                : 'text-zinc-500 hover:text-white'
                        }`}
                    >
                        Annual
                        <span className={`text-[10px] sm:text-[11px] font-semibold px-1.5 sm:px-2 py-0.5 rounded-md ${
                            billing === 'annual'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-emerald-500/10 text-emerald-400'
                        }`}>
                            -20%
                        </span>
                    </button>
                </div>
            </div>

            {error && <div className="bg-red-500/8 border border-red-500/15 rounded-xl p-3 text-red-400 text-[13px] mb-8">{error}</div>}

            {/* Current plan banner */}
            {currentPlan !== 'none' && (
                <div className="mb-8 px-5 py-4 rounded-xl border border-white/[0.08] bg-white/[0.02] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="h-9 w-9 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0">
                            <Crown className="h-4 w-4 text-zinc-400" />
                        </div>
                        <div>
                            <p className="text-[14px] text-white font-medium">
                                Current plan: <span className="capitalize">{currentPlan}</span>
                            </p>
                            <p className="text-[13px] text-zinc-500">
                                {scansUsed}/{scansLimit} scans used &middot; {domainsUsed}/{domainsLimit} projects
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        className="bg-transparent border-white/[0.08] hover:bg-white/[0.04] text-white rounded-lg text-[13px]"
                        onClick={handleManageSubscription}
                        disabled={portalLoading}
                    >
                        {portalLoading ? 'Loading...' : 'Manage Subscription'}
                    </Button>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {pricingPlans.map((plan) => {
                    const isCurrent = currentPlan === plan.id;

                    return (
                        <div
                            key={plan.id}
                            className={`relative rounded-xl border transition-all flex flex-col p-5 ${plan.highlighted
                                ? 'bg-white/[0.04] border-white/[0.12]'
                                : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.10]'
                                }`}
                        >
                            {plan.highlighted && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                                    <Badge className="bg-white text-zinc-900 border-0 px-3 py-1 text-[11px] font-medium rounded-lg">
                                        {plan.badge}
                                    </Badge>
                                </div>
                            )}
                            {isCurrent && (
                                <div className="absolute -top-3 right-4 z-20">
                                    <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 px-3 py-1 text-[11px] rounded-lg">
                                        Current
                                    </Badge>
                                </div>
                            )}

                            <div className="text-center pb-4">
                                <h3 className="text-[15px] font-medium text-white mb-1">{plan.name}</h3>
                                <p className="text-[12px] text-zinc-500">{plan.description}</p>
                                <div className="mt-5">
                                    {plan.isContact ? (
                                        <span className="text-3xl font-heading font-bold text-white">Custom</span>
                                    ) : billing === 'annual' ? (
                                        <div className="flex flex-col items-center">
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-3xl md:text-4xl font-heading font-bold text-white">
                                                    {formatPrice(plan.priceAnnualPerMonth!, currency)}
                                                </span>
                                                <span className="text-zinc-500 text-[12px]">/mo</span>
                                            </div>
                                            <span className="text-zinc-600 text-[12px] line-through mt-1">{formatPrice(plan.priceMonthly!, currency)}/mo</span>
                                            <span className="text-zinc-600 text-[11px] mt-0.5">billed annually</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-baseline justify-center gap-1">
                                            <span className="text-3xl md:text-4xl font-heading font-bold text-white">{formatPrice(plan.priceMonthly!, currency)}</span>
                                            <span className="text-zinc-500 text-[12px]">/mo</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <ul className="space-y-3 mb-6 flex-1">
                                {plan.features.map((feature) => (
                                    <li key={feature} className="flex items-center gap-2.5">
                                        <CheckCircle className="h-3.5 w-3.5 text-zinc-600 shrink-0" />
                                        <span className="text-[13px] text-zinc-400">{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            {plan.isContact ? (
                                <Button
                                    size="lg"
                                    className="w-full bg-transparent border-white/[0.08] hover:bg-white/[0.04] text-white rounded-lg text-[13px]"
                                    variant="outline"
                                    asChild
                                >
                                    <a href="mailto:hello@checkvibe.dev?subject=CheckVibe Max Plan">
                                        <Mail className="mr-2 h-4 w-4" />
                                        Contact Us
                                    </a>
                                </Button>
                            ) : isCurrent ? (
                                <Button
                                    size="lg"
                                    className="w-full bg-transparent border-white/[0.06] text-zinc-600 rounded-lg text-[13px]"
                                    variant="outline"
                                    disabled
                                >
                                    Current Plan
                                </Button>
                            ) : (
                                <Button
                                    size="lg"
                                    className={`w-full rounded-lg text-[13px] ${plan.highlighted
                                        ? 'bg-white text-zinc-900 hover:bg-zinc-200 border-0'
                                        : 'bg-transparent border-white/[0.08] hover:bg-white/[0.04] text-white'
                                        }`}
                                    variant={plan.highlighted ? 'default' : 'outline'}
                                    onClick={() => handleSubscribe(plan.id)}
                                    disabled={loading !== null}
                                >
                                    {loading === plan.id ? (
                                        <span className="flex items-center gap-2">
                                            <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                            Processing...
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            Subscribe
                                            <Zap className="h-3.5 w-3.5" />
                                        </span>
                                    )}
                                </Button>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="mt-16 text-center">
                <p className="text-[13px] text-zinc-600">
                    Secure payment via Stripe. All major credit cards accepted. Cancel anytime.
                </p>
            </div>
        </div>
    );
}
