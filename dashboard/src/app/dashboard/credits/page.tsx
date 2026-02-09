'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Zap, Crown, Mail } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const pricingPlans = [
    {
        id: 'starter',
        name: 'Starter',
        priceMonthly: 19,
        priceAnnualPerMonth: 15.20,
        description: 'For solo makers',
        domains: 1,
        scans: 5,
        features: ['1 domain', '5 scans/month', 'All 6 scanners', 'PDF export'],
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
        features: ['3 domains', '20 scans/month', 'All 6 scanners', 'Priority support'],
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
        features: ['10 domains', '75 scans/month', 'All 6 scanners', 'Dedicated support'],
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
        features: ['Unlimited domains', 'Custom scan volume', 'SLA guarantee', 'Account manager'],
        highlighted: false,
        isContact: true,
    },
];

export default function CreditsPage() {
    const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
    const [loading, setLoading] = useState<string | null>(null);
    const [portalLoading, setPortalLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [currentPlan, setCurrentPlan] = useState<string>('none');
    const [scansUsed, setScansUsed] = useState(0);
    const [scansLimit, setScansLimit] = useState(0);
    const [domainsUsed, setDomainsUsed] = useState(0);
    const [domainsLimit, setDomainsLimit] = useState(0);

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
                body: JSON.stringify({ plan: planId, currency: 'usd', billing }),
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
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <div className="flex flex-col items-center text-center mb-12">
                <Badge variant="secondary" className="mb-4 bg-purple-500/10 border-purple-500/20 text-purple-300">
                    Pricing
                </Badge>
                <h1 className="text-3xl sm:text-4xl font-heading font-medium mb-4 tracking-tight text-white">
                    Simple, <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Transparent</span> Plans
                </h1>
                <p className="text-xl text-zinc-400 max-w-2xl mb-6">
                    Choose a plan that fits your needs. Upgrade or downgrade anytime.
                </p>

                {/* Billing Toggle */}
                <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 p-1">
                    <button
                        onClick={() => setBilling('monthly')}
                        className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                            billing === 'monthly'
                                ? 'bg-white text-black shadow-sm'
                                : 'text-zinc-400 hover:text-white'
                        }`}
                    >
                        Monthly
                    </button>
                    <button
                        onClick={() => setBilling('annual')}
                        className={`px-5 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                            billing === 'annual'
                                ? 'bg-white text-black shadow-sm'
                                : 'text-zinc-400 hover:text-white'
                        }`}
                    >
                        Annual
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            billing === 'annual'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-green-500/10 text-green-400'
                        }`}>
                            Save 20%
                        </span>
                    </button>
                </div>
            </div>

            {error && <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm mb-8">{error}</div>}

            {/* Current plan banner */}
            {currentPlan !== 'none' && (
                <div className="mb-8 p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Crown className="h-5 w-5 text-blue-400" />
                        <div>
                            <p className="text-white font-medium">
                                Current plan: <span className="capitalize">{currentPlan}</span>
                            </p>
                            <p className="text-sm text-zinc-400">
                                {scansUsed}/{scansLimit} scans used &middot; {domainsUsed}/{domainsLimit} domains registered
                            </p>
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        className="bg-white/5 border-white/10 hover:bg-white/10 text-white"
                        onClick={handleManageSubscription}
                        disabled={portalLoading}
                    >
                        {portalLoading ? 'Loading...' : 'Manage Subscription'}
                    </Button>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {pricingPlans.map((plan) => {
                    const isCurrent = currentPlan === plan.id;

                    return (
                        <Card
                            key={plan.id}
                            className={`relative transition-all duration-300 flex flex-col ${plan.highlighted
                                ? 'bg-zinc-900/60 border-blue-500/30 sm:scale-105 z-10 shadow-[0_0_30px_-10px_rgba(59,130,246,0.2)]'
                                : 'bg-zinc-900/40 border-white/5 hover:border-white/10'
                                }`}
                        >
                            {plan.highlighted && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                                    <Badge className="bg-gradient-to-r from-[#749CFF] to-[#A5B4FC] text-white border-0 px-4 py-1">
                                        {plan.badge}
                                    </Badge>
                                </div>
                            )}
                            {isCurrent && (
                                <div className="absolute -top-3 right-4 z-20">
                                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30 px-3 py-1">
                                        Current
                                    </Badge>
                                </div>
                            )}
                            <CardHeader className="pb-4 text-center">
                                <CardTitle className="text-xl font-medium">{plan.name}</CardTitle>
                                <CardDescription className="text-muted-foreground">{plan.description}</CardDescription>
                                <div className="mt-6">
                                    {plan.isContact ? (
                                        <span className="text-3xl font-heading font-bold gradient-text">Custom</span>
                                    ) : billing === 'annual' ? (
                                        <div className="flex flex-col items-center">
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-4xl md:text-5xl font-heading font-bold gradient-text">
                                                    ${plan.priceAnnualPerMonth!.toFixed(2)}
                                                </span>
                                                <span className="text-zinc-400 text-sm">/mo</span>
                                            </div>
                                            <span className="text-zinc-500 text-sm line-through mt-1">${plan.priceMonthly}/mo</span>
                                            <span className="text-zinc-500 text-xs mt-1">billed annually</span>
                                        </div>
                                    ) : (
                                        <>
                                            <span className="text-4xl md:text-5xl font-heading font-bold gradient-text">${plan.priceMonthly}</span>
                                            <span className="text-zinc-400 text-sm">/mo</span>
                                        </>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col">
                                <ul className="space-y-4 mb-8 flex-1 px-2">
                                    {plan.features.map((feature) => (
                                        <li key={feature} className="flex items-center gap-3">
                                            <div className="rounded-full bg-green-500/10 p-1">
                                                <CheckCircle className="h-4 w-4 text-green-400" />
                                            </div>
                                            <span className="text-sm text-muted-foreground">{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                {plan.isContact ? (
                                    <Button
                                        size="lg"
                                        className="w-full bg-white/5 border-white/10 hover:bg-white/10 text-white"
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
                                        className="w-full bg-white/5 border-white/10 text-zinc-500"
                                        variant="outline"
                                        disabled
                                    >
                                        Current Plan
                                    </Button>
                                ) : (
                                    <Button
                                        size="lg"
                                        className={`w-full ${plan.highlighted
                                            ? 'shimmer-button bg-gradient-to-r from-[#749CFF] to-[#A5B4FC] hover:from-[#749CFF] hover:to-[#A5B4FC] border-0 text-white'
                                            : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'
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
                                                <Zap className="h-4 w-4" />
                                            </span>
                                        )}
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <div className="mt-16 text-center">
                <p className="text-sm text-muted-foreground">
                    Secure payment via Stripe. All major credit cards accepted. Cancel anytime.
                </p>
            </div>
        </div>
    );
}
