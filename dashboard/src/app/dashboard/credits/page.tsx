'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Crown, Minus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { detectCurrency, formatPrice, type CurrencyCode } from '@/lib/currency';
import { toast } from 'sonner';

const pricingPlans = [
    {
        id: 'free',
        name: 'Free',
        priceMonthly: 0,
        priceAnnualPerMonth: 0,
        description: 'Try it out',
        domains: 1,
        scans: 3,
        features: ['1 project', '3 scans/month', 'Issue overview', 'Blurred finding details'],
        highlighted: false,
        isFree: true,
    },
    {
        id: 'starter',
        name: 'Starter',
        priceMonthly: 19,
        priceAnnualPerMonth: 13.30,
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
        priceAnnualPerMonth: 27.30,
        description: 'For growing projects',
        domains: 3,
        scans: 20,
        features: ['3 projects', '20 scans/month', 'Full scan suite', 'Priority support'],
        highlighted: false,
    },
    {
        id: 'max',
        name: 'Max',
        priceMonthly: 79,
        priceAnnualPerMonth: 55.30,
        description: 'For teams & agencies',
        domains: 10,
        scans: 75,
        features: ['10 projects', '75 scans/month', 'Full scan suite', 'Dedicated support'],
        highlighted: false,
    },
];

const comparisonFeatures = [
    { name: 'Projects', free: '1', starter: '1', pro: '3', max: '10' },
    { name: 'Scans per month', free: '3', starter: '5', pro: '20', max: '75' },
    { name: 'Full finding details', free: false, starter: true, pro: true, max: true },
    { name: 'Full scan suite (30 scanners)', free: true, starter: true, pro: true, max: true },
    { name: 'PDF export', free: false, starter: true, pro: true, max: true },
    { name: 'AI fix suggestions', free: false, starter: true, pro: true, max: true },
    { name: 'API access', free: false, starter: false, pro: true, max: true },
    { name: 'Priority support', free: false, starter: false, pro: true, max: true },
    { name: 'Dedicated support', free: false, starter: false, pro: false, max: true },
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

    // Sliding pill refs
    const toggleRef = useRef<HTMLDivElement>(null);
    const monthlyRef = useRef<HTMLButtonElement>(null);
    const annualRef = useRef<HTMLButtonElement>(null);
    const [pillStyle, setPillStyle] = useState({ left: 0, width: 0 });

    const updatePill = useCallback(() => {
        const activeRef = billing === 'monthly' ? monthlyRef : annualRef;
        const container = toggleRef.current;
        if (activeRef.current && container) {
            const containerRect = container.getBoundingClientRect();
            const activeRect = activeRef.current.getBoundingClientRect();
            setPillStyle({
                left: activeRect.left - containerRect.left,
                width: activeRect.width,
            });
        }
    }, [billing]);

    useEffect(() => {
        updatePill();
    }, [updatePill]);

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
            toast.error('Something went wrong. Please try again.');
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
                toast.error('No active subscription found. Choose a plan below to get started.');
                setError('No active subscription found. Choose a plan below to get started.');
                return;
            }

            if (!res.ok) throw new Error('Portal failed');

            const { url } = await res.json();
            if (url) window.location.href = url;
        } catch (err) {
            console.error('Portal error:', err);
            toast.error('Something went wrong. Please try again.');
            setError('Something went wrong. Please try again.');
        } finally {
            setPortalLoading(false);
        }
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <div className="flex flex-col items-center text-center mb-12">
                <h1 className="text-2xl sm:text-4xl font-heading font-medium mb-4 tracking-tight text-white">
                    Simple, transparent plans
                </h1>
                <p className="text-base sm:text-lg text-zinc-500 max-w-2xl mb-6">
                    Choose a plan that fits your needs. Upgrade or downgrade anytime.
                </p>

                {/* Billing Toggle */}
                <div
                    ref={toggleRef}
                    className="relative inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.02] p-1"
                >
                    {/* Sliding pill */}
                    <div
                        className="absolute top-1 rounded-full bg-white transition-all duration-300 ease-out"
                        style={{ left: pillStyle.left, width: pillStyle.width, height: 'calc(100% - 8px)' }}
                    />
                    <button
                        ref={monthlyRef}
                        onClick={() => setBilling('monthly')}
                        className={`relative z-10 px-4 sm:px-5 py-2 rounded-full text-sm font-medium transition-colors duration-300 ${billing === 'monthly'
                            ? 'text-zinc-900'
                            : 'text-zinc-500 hover:text-white'
                            }`}
                    >
                        Monthly
                    </button>
                    <button
                        ref={annualRef}
                        onClick={() => setBilling('annual')}
                        className={`relative z-10 px-4 sm:px-5 py-2 rounded-full text-sm font-medium transition-colors duration-300 flex items-center gap-1.5 sm:gap-2 ${billing === 'annual'
                            ? 'text-zinc-900'
                            : 'text-zinc-500 hover:text-white'
                            }`}
                    >
                        Annual
                        <span className={`text-[10px] sm:text-xs font-semibold px-1.5 sm:px-2 py-0.5 rounded-full transition-colors duration-300 ${billing === 'annual'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-emerald-500/10 text-emerald-400'
                            }`}>
                            -30%
                        </span>
                    </button>
                </div>
            </div>

            {/* Current plan banner */}
            {scansLimit > 0 && (
                <div className="mb-8 p-4 rounded-xl border border-white/[0.08] bg-white/[0.02] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Crown className="h-5 w-5 text-zinc-400" />
                        <div>
                            <p className="text-white font-medium">
                                Current plan: <span className="capitalize">{currentPlan === 'none' ? 'Free' : currentPlan}</span>
                            </p>
                            <p className="text-sm text-zinc-500">
                                {scansUsed}/{scansLimit} scans used &middot; {domainsUsed}/{domainsLimit} projects
                            </p>
                        </div>
                    </div>
                    {currentPlan !== 'none' && (
                        <Button
                            variant="outline"
                            className="bg-transparent border-white/[0.08] hover:bg-white/[0.04] text-white"
                            onClick={handleManageSubscription}
                            disabled={portalLoading}
                        >
                            {portalLoading ? 'Loading...' : 'Manage Subscription'}
                        </Button>
                    )}
                </div>
            )}

            {/* Desktop comparison table */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-white/[0.08]">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="border-b border-white/[0.04]">
                            <th className="text-left p-5 text-sm font-medium text-zinc-500 w-[240px]">Features</th>
                            {pricingPlans.map((plan) => {
                                const isCurrent = plan.id === 'free' ? currentPlan === 'none' : currentPlan === plan.id;
                                return (
                                    <th key={plan.id} className="p-5 text-center min-w-[180px]">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg font-medium text-white">{plan.name}</span>
                                                {plan.highlighted && (
                                                    <Badge className="bg-white text-zinc-900 border-0 px-2 py-0.5 text-[10px] font-medium">
                                                        Popular
                                                    </Badge>
                                                )}
                                                {isCurrent && (
                                                    <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 px-2 py-0.5 text-[10px]">
                                                        Current
                                                    </Badge>
                                                )}
                                            </div>
                                            <div>
                                                {'isFree' in plan && plan.isFree ? (
                                                    <span className="text-2xl font-heading font-bold text-white">Free</span>
                                                ) : billing === 'annual' ? (
                                                    <div className="flex flex-col items-center">
                                                        <div className="flex items-baseline gap-1">
                                                            <span className="text-2xl font-heading font-bold text-white">
                                                                {formatPrice(plan.priceAnnualPerMonth!, currency)}
                                                            </span>
                                                            <span className="text-zinc-500 text-xs">/mo</span>
                                                        </div>
                                                        <span className="text-zinc-600 text-xs line-through">{formatPrice(plan.priceMonthly!, currency)}/mo</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-baseline gap-1">
                                                        <span className="text-2xl font-heading font-bold text-white">{formatPrice(plan.priceMonthly!, currency)}</span>
                                                        <span className="text-zinc-500 text-xs">/mo</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {comparisonFeatures.map((feature, idx) => (
                            <tr
                                key={feature.name}
                                className={`border-b border-white/[0.04] ${idx % 2 === 0 ? 'bg-white/[0.01]' : ''}`}
                            >
                                <td className="p-4 pl-5 text-sm text-zinc-400">{feature.name}</td>
                                {(['free', 'starter', 'pro', 'max'] as const).map((planKey) => {
                                    const value = feature[planKey];
                                    return (
                                        <td key={planKey} className="p-4 text-center">
                                            {typeof value === 'boolean' ? (
                                                value ? (
                                                    <CheckCircle className="h-4 w-4 text-emerald-400 mx-auto" />
                                                ) : (
                                                    <Minus className="h-4 w-4 text-zinc-700 mx-auto" />
                                                )
                                            ) : (
                                                <span className="text-sm text-zinc-300">{value}</span>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="border-t border-white/[0.06]">
                            <td className="p-5" />
                            {pricingPlans.map((plan) => {
                                const isCurrent = plan.id === 'free' ? currentPlan === 'none' : currentPlan === plan.id;
                                return (
                                    <td key={plan.id} className="p-5 text-center">
                                        {'isFree' in plan && plan.isFree ? (
                                            <Button
                                                size="lg"
                                                className="w-full bg-transparent border-white/[0.06] text-zinc-600"
                                                variant="outline"
                                                disabled
                                            >
                                                {isCurrent ? 'Current Plan' : 'Free'}
                                            </Button>
                                        ) : isCurrent ? (
                                            <Button
                                                size="lg"
                                                className="w-full bg-transparent border-white/[0.06] text-zinc-600"
                                                variant="outline"
                                                disabled
                                            >
                                                Current Plan
                                            </Button>
                                        ) : (
                                            <Button
                                                size="lg"
                                                className={`w-full ${plan.highlighted
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
                                                    'Subscribe'
                                                )}
                                            </Button>
                                        )}
                                    </td>
                                );
                            })}
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* Mobile card layout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 md:hidden">
                {pricingPlans.map((plan) => {
                    const isCurrent = plan.id === 'free' ? currentPlan === 'none' : currentPlan === plan.id;

                    return (
                        <Card
                            key={plan.id}
                            className={`relative transition-colors flex flex-col ${plan.highlighted
                                ? 'bg-white/[0.04] border-white/[0.12]'
                                : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.10]'
                                }`}
                        >
                            {plan.highlighted && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                                    <Badge className="bg-white text-zinc-900 border-0 px-3 py-1 text-xs font-medium">
                                        Popular
                                    </Badge>
                                </div>
                            )}
                            {isCurrent && (
                                <div className="absolute -top-3 right-4 z-20">
                                    <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 px-3 py-1">
                                        Current
                                    </Badge>
                                </div>
                            )}
                            <CardHeader className="pb-4 text-center">
                                <CardTitle className="text-lg font-medium text-white">{plan.name}</CardTitle>
                                <CardDescription className="text-zinc-500">{plan.description}</CardDescription>
                                <div className="mt-6">
                                    {'isFree' in plan && plan.isFree ? (
                                        <span className="text-3xl font-heading font-bold text-white">Free</span>
                                    ) : billing === 'annual' ? (
                                        <div className="flex flex-col items-center">
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-4xl md:text-5xl font-heading font-bold text-white">
                                                    {formatPrice(plan.priceAnnualPerMonth!, currency)}
                                                </span>
                                                <span className="text-zinc-500 text-sm">/mo</span>
                                            </div>
                                            <span className="text-zinc-600 text-sm line-through mt-1">{formatPrice(plan.priceMonthly!, currency)}/mo</span>
                                            <span className="text-zinc-600 text-xs mt-1">billed annually</span>
                                        </div>
                                    ) : (
                                        <>
                                            <span className="text-4xl md:text-5xl font-heading font-bold text-white">{formatPrice(plan.priceMonthly!, currency)}</span>
                                            <span className="text-zinc-500 text-sm">/mo</span>
                                        </>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col">
                                <ul className="space-y-3.5 mb-8 flex-1 px-1">
                                    {plan.features.map((feature) => (
                                        <li key={feature} className="flex items-center gap-3">
                                            <CheckCircle className="h-4 w-4 text-zinc-600 shrink-0" />
                                            <span className="text-sm text-zinc-400">{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                {'isFree' in plan && plan.isFree ? (
                                    <Button
                                        size="lg"
                                        className="w-full bg-transparent border-white/[0.06] text-zinc-600"
                                        variant="outline"
                                        disabled
                                    >
                                        {isCurrent ? 'Current Plan' : 'Free'}
                                    </Button>
                                ) : isCurrent ? (
                                    <Button
                                        size="lg"
                                        className="w-full bg-transparent border-white/[0.06] text-zinc-600"
                                        variant="outline"
                                        disabled
                                    >
                                        Current Plan
                                    </Button>
                                ) : (
                                    <Button
                                        size="lg"
                                        className={`w-full ${plan.highlighted
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
                                            'Subscribe'
                                        )}
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <div className="mt-16 text-center">
                <p className="text-sm text-zinc-600">
                    Secure payment via Stripe. All major credit cards accepted. Cancel anytime.
                </p>
            </div>
        </div>
    );
}
