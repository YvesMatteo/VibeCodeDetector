'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Zap, Crown, Globe, BarChart3, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

const pricingPlans = [
    {
        id: 'starter',
        name: 'Starter',
        price: '19',
        period: '/mo',
        description: 'For solo makers',
        domains: 1,
        scans: 5,
        features: ['1 domain', '5 scans/month', 'All 6 scanners', 'PDF export'],
        highlighted: false,
    },
    {
        id: 'pro',
        name: 'Pro',
        price: '39',
        period: '/mo',
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
        price: '89',
        period: '/mo',
        description: 'For teams & agencies',
        domains: 10,
        scans: 75,
        features: ['10 domains', '75 scans/month', 'All 6 scanners', 'Dedicated support'],
        highlighted: false,
    },
    {
        id: 'max',
        name: 'Max',
        price: 'Custom',
        period: '',
        description: 'For large organizations',
        domains: null,
        scans: null,
        features: ['Unlimited domains', 'Custom scan volume', 'SLA guarantee', 'Account manager'],
        highlighted: false,
        isContact: true,
    },
];

export default function CreditsPage() {
    const [loading, setLoading] = useState<string | null>(null);
    const [portalLoading, setPortalLoading] = useState(false);
    const [currentPlan, setCurrentPlan] = useState<string>('none');
    const [scansUsed, setScansUsed] = useState(0);
    const [scansLimit, setScansLimit] = useState(0);
    const [domainsUsed, setDomainsUsed] = useState(0);
    const [domainsLimit, setDomainsLimit] = useState(0);
    const router = useRouter();

    useEffect(() => {
        async function loadProfile() {
            const supabase = createBrowserClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            );
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
        try {
            const res = await fetch('/api/stripe/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan: planId, currency: 'usd' }),
            });

            if (!res.ok) throw new Error('Checkout failed');

            const { url } = await res.json();
            if (url) window.location.href = url;
        } catch (error) {
            console.error('Subscribe error:', error);
            alert('Something went wrong. Please try again.');
        } finally {
            setLoading(null);
        }
    };

    const handleManageSubscription = async () => {
        setPortalLoading(true);
        try {
            const res = await fetch('/api/stripe/portal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });

            if (!res.ok) throw new Error('Portal failed');

            const { url } = await res.json();
            if (url) window.location.href = url;
        } catch (error) {
            console.error('Portal error:', error);
            alert('Something went wrong. Please try again.');
        } finally {
            setPortalLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex flex-col items-center text-center mb-12">
                <Badge variant="secondary" className="mb-4 bg-purple-500/10 border-purple-500/20 text-purple-300">
                    Pricing
                </Badge>
                <h1 className="text-3xl sm:text-4xl font-heading font-medium mb-4 tracking-tight text-white">
                    Simple, <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Monthly</span> Plans
                </h1>
                <p className="text-xl text-zinc-400 max-w-2xl">
                    Choose a plan that fits your needs. Upgrade or downgrade anytime.
                </p>
            </div>

            {/* Current plan banner */}
            {currentPlan !== 'none' && (
                <div className="mb-8 p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 flex items-center justify-between">
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

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {pricingPlans.map((plan) => {
                    const isCurrent = currentPlan === plan.id;

                    return (
                        <Card
                            key={plan.id}
                            className={`relative transition-all duration-300 flex flex-col ${plan.highlighted
                                ? 'bg-zinc-900/60 border-blue-500/30 scale-105 z-10 shadow-[0_0_30px_-10px_rgba(59,130,246,0.2)]'
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
                                    ) : (
                                        <>
                                            <span className="text-5xl font-heading font-bold gradient-text">${plan.price}</span>
                                            <span className="text-zinc-400 text-sm">{plan.period}</span>
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
