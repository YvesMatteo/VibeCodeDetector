'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle } from 'lucide-react';
import { detectCurrency, formatPrice, type CurrencyCode } from '@/lib/currency';
import { FREE_PLAN_CONFIG, PLAN_CONFIG } from '@/lib/plan-config';

const pricingTiers = [
  {
    name: FREE_PLAN_CONFIG.name,
    priceMonthly: FREE_PLAN_CONFIG.priceMonthly,
    priceAnnualPerMonth: FREE_PLAN_CONFIG.priceAnnualPerMonth,
    description: 'Try it out',
    features: [`${FREE_PLAN_CONFIG.projects} project`, `${FREE_PLAN_CONFIG.scans} scans/mo`, FREE_PLAN_CONFIG.monitoringLabel, 'Issue overview', 'Blurred details'],
    cta: 'Get Started Free',
    highlighted: false,
    isFree: true,
  },
  {
    name: PLAN_CONFIG.starter.name,
    priceMonthly: PLAN_CONFIG.starter.priceMonthly,
    priceAnnualPerMonth: PLAN_CONFIG.starter.priceAnnualPerMonth,
    description: 'For solo makers',
    features: [`${PLAN_CONFIG.starter.projects} project`, `${PLAN_CONFIG.starter.scans} scans/mo`, `${PLAN_CONFIG.starter.apiKeys} API key`, PLAN_CONFIG.starter.monitoringLabel, '35 security checks', 'Full history'],
    cta: 'Get Started',
    highlighted: true,
    badgeText: 'Most Popular',
  },
  {
    name: PLAN_CONFIG.pro.name,
    priceMonthly: PLAN_CONFIG.pro.priceMonthly,
    priceAnnualPerMonth: PLAN_CONFIG.pro.priceAnnualPerMonth,
    description: 'For growing projects',
    features: [`${PLAN_CONFIG.pro.projects} projects`, `${PLAN_CONFIG.pro.scans} scans/mo`, `${PLAN_CONFIG.pro.apiKeys} API keys`, PLAN_CONFIG.pro.monitoringLabel, '35 security checks', 'Priority support'],
    cta: 'Get Started',
    highlighted: false,
  },
  {
    name: PLAN_CONFIG.max.name,
    priceMonthly: PLAN_CONFIG.max.priceMonthly,
    priceAnnualPerMonth: PLAN_CONFIG.max.priceAnnualPerMonth,
    description: 'For teams & agencies',
    features: [`${PLAN_CONFIG.max.projects} projects`, `${PLAN_CONFIG.max.scans.toLocaleString()} scans/mo`, `${PLAN_CONFIG.max.apiKeys} API keys`, PLAN_CONFIG.max.monitoringLabel, '35 security checks', 'Dedicated support'],
    cta: 'Get Started',
    highlighted: true,
    badgeText: 'Best Value',
    badgeColor: 'bg-emerald-500',
  },
];

export function PricingSection() {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
  const [currency] = useState<CurrencyCode>(() => detectCurrency());

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

  return (
    <section
      id="slide-pricing"
      className="relative z-10 px-4 sm:px-6 lg:px-8 pt-2 sm:pt-4 pb-20 sm:pb-28"
    >
      <div className="max-w-7xl mx-auto relative z-10 w-full">
        <div className="text-center mb-6 sm:mb-8">
          <Badge variant="secondary" className="mb-4 bg-sky-400/10 border-sky-400/20 text-sky-300">
            Pricing
          </Badge>
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-heading font-medium mb-4 tracking-tight text-white">
            Simple, <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-sky-200 to-sky-400 animate-gradient-flow">Transparent</span> Pricing
          </h2>
          <p className="text-sm sm:text-xl text-zinc-400 max-w-2xl mx-auto mb-4 sm:mb-6">
            Flexible plans for every team size. Cancel anytime.
          </p>

          {/* Billing Toggle */}
          <div
            ref={toggleRef}
            className="relative inline-flex items-center rounded-full border border-white/[0.06] bg-white/[0.01] p-1"
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
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-emerald-500/10 text-emerald-400'
                }`}>
                -30%
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 max-w-[340px] sm:max-w-5xl mx-auto">
          {pricingTiers.map((tier) => (
            <div key={tier.name} className="h-full">
              <div className={`relative h-full flex flex-col rounded-xl border transition-all duration-300 ${tier.highlighted
                ? tier.name === 'Max'
                  ? 'bg-zinc-900/60 border-emerald-400/30 shadow-[0_0_30px_-10px_rgba(52,211,153,0.2)]'
                  : 'bg-zinc-900/60 border-sky-400/30 shadow-[0_0_30px_-10px_rgba(59,130,246,0.2)]'
                : 'bg-zinc-900/40 border-white/5 [@media(hover:hover)]:hover:border-white/10'
                }`}>
                {tier.highlighted && tier.badgeText && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                    <div className={`${tier.badgeColor || 'bg-sky-500'} text-[10px] font-bold px-3 py-1 rounded-full text-white shadow-lg uppercase tracking-wider whitespace-nowrap`}>
                      {tier.badgeText}
                    </div>
                  </div>
                )}
                <div className="p-6 border-b border-white/5">
                  <h3 className="text-lg font-medium text-white">{tier.name}</h3>
                  <p className="text-sm text-zinc-400 mt-1">{tier.description}</p>
                  <div className="mt-4">
                    {'isFree' in tier && tier.isFree ? (
                      <span className="text-4xl font-bold text-white tracking-tight">Free</span>
                    ) : billing === 'annual' ? (
                      <div className="flex flex-col">
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-bold text-white tracking-tight">{formatPrice(tier.priceAnnualPerMonth!, currency)}</span>
                          <span className="text-zinc-500 text-sm font-normal">/mo</span>
                        </div>
                        <span className="text-zinc-500 text-sm line-through mt-1">{formatPrice(tier.priceMonthly!, currency)}/mo</span>
                        <span className="text-zinc-500 text-xs mt-1">Billed as {formatPrice(tier.priceAnnualPerMonth! * 12, currency)}/year</span>
                      </div>
                    ) : (
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold text-white tracking-tight">{formatPrice(tier.priceMonthly!, currency)}</span>
                        <span className="text-zinc-500 text-sm font-normal">/mo</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-6 flex-1 flex flex-col">
                  <ul className="space-y-3 mb-8 flex-1">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <CheckCircle className={`h-5 w-5 shrink-0 ${tier.highlighted ? (tier.name === 'Max' ? 'text-emerald-400' : 'text-sky-400') : 'text-zinc-500'}`} />
                        <span className="text-sm text-zinc-300">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {'isFree' in tier && tier.isFree ? (
                    <Button
                      className="w-full bg-white/5 border-white/10 hover:bg-white/10 text-white"
                      variant="outline"
                      asChild
                    >
                      <Link href="/signup">{tier.cta}</Link>
                    </Button>
                  ) : (
                    <Button
                      className={`w-full ${tier.highlighted
                        ? tier.name === 'Max'
                          ? 'bg-emerald-500 hover:bg-emerald-400 text-white border-0 shadow-lg shadow-emerald-400/20'
                          : 'bg-sky-500 hover:bg-sky-400 text-white border-0 shadow-lg shadow-sky-400/20'
                        : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'
                        }`}
                      variant={tier.highlighted ? 'default' : 'outline'}
                      asChild
                    >
                      <Link href={`/signup?plan=${tier.name.toLowerCase()}`}>{tier.cta}</Link>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
