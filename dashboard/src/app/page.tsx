'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  ArrowRight,
  AlertTriangle,
  Menu,
} from 'lucide-react';
import * as motion from 'framer-motion/client';
import { useMotionValue, useSpring } from 'framer-motion';
import { CountUp } from '@/components/ui/count-up';

import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet';
import { useState, useEffect, useCallback, useRef, type MouseEvent } from 'react';
import { detectCurrency, formatPrice, type CurrencyCode } from '@/lib/currency';
import { createClient } from '@/lib/supabase/client';
import { SilkBackground } from '@/components/ui/silk-background';
import { SupportedTools } from '@/components/ui/supported-tools';
import { FeatureRoadmap } from '@/components/ui/feature-roadmap';
const pricingTiers = [
  {
    name: 'Free',
    priceMonthly: 0,
    priceAnnualPerMonth: 0,
    description: 'Try it out',
    features: ['1 project', '3 scans/month', 'Issue overview', 'Blurred details'],
    cta: 'Get Started Free',
    highlighted: false,
    isFree: true,
  },
  {
    name: 'Starter',
    priceMonthly: 19,
    priceAnnualPerMonth: 13.30,
    description: 'For solo makers',
    features: ['1 project', '5 scans/month', 'Full scan suite', 'Scan history'],
    cta: 'Get Started',
    highlighted: true,
    badgeText: 'Most Popular',
  },
  {
    name: 'Pro',
    priceMonthly: 39,
    priceAnnualPerMonth: 27.30,
    description: 'For growing projects',
    features: ['3 projects', '20 scans/month', 'Full scan suite', 'Priority support'],
    cta: 'Get Started',
    highlighted: false,
  },
  {
    name: 'Max',
    priceMonthly: 79,
    priceAnnualPerMonth: 55.30,
    description: 'For teams & agencies',
    features: ['10 projects', '75 scans/month', 'Full scan suite', 'Dedicated support'],
    cta: 'Get Started',
    highlighted: true,
    badgeText: 'Best Value',
    badgeColor: 'bg-emerald-500',
  },
];

const stats = [
  { value: '35', label: 'Security Scanners' },
  { value: '100+', label: 'API Key Patterns' },
  { value: '150+', label: 'Security Checks' },
  { value: '<30s', label: 'Average Scan Time' },
];


export default function HomePage() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setCurrency(detectCurrency());
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user) setIsLoggedIn(true);
    });
  }, []);

  // Detect touch device — disable tilt on mobile (no hover)
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    setIsTouch('ontouchstart' in window || window.matchMedia('(pointer: coarse)').matches);
  }, []);

  // Card tilt — follows cursor position over the terminal card (desktop only)
  const cardRotateX = useMotionValue(0);
  const cardRotateY = useMotionValue(0);
  const smoothCardRotateX = useSpring(cardRotateX, { stiffness: 200, damping: 25 });
  const smoothCardRotateY = useSpring(cardRotateY, { stiffness: 200, damping: 25 });

  const handleCardMouseMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (isTouch) return;
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - left) / width - 0.5;
    const y = (e.clientY - top) / height - 0.5;
    cardRotateX.set(-y * 12);
    cardRotateY.set(x * 12);
  }, [isTouch, cardRotateX, cardRotateY]);

  const handleCardMouseLeave = useCallback(() => {
    cardRotateX.set(0);
    cardRotateY.set(0);
  }, [cardRotateX, cardRotateY]);

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

  // No scroll-triggered animations — everything visible immediately

  return (
    <div className="min-h-screen bg-[#0E0E10] overflow-x-hidden">
      {/* Prismatic ribbon background — fixed behind all slides */}
      <SilkBackground />

      {/* Navigation */}
      <nav aria-label="Main navigation" className="fixed top-4 w-full z-50 flex justify-center pointer-events-none px-4">
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="bg-[#1C1C1E]/80 backdrop-blur-md border border-white/10 rounded-full px-6 py-3 flex items-center gap-4 sm:gap-8 shadow-2xl pointer-events-auto transition-all duration-300 hover:border-white/20 hover:scale-[1.01]"
        >
          <div className="flex items-center gap-2 pr-5 border-r border-white/10">
            <Image src="/logo-composite.png" alt="CheckVibe Logo" width={140} height={28} className="w-auto h-7 object-contain" />
          </div>
          <div className="hidden md:flex items-center gap-8 text-[15px] font-medium text-zinc-400">
            <a href="#slide-features" className="hover:text-white transition-colors">Features</a>
            <a href="#slide-pricing" className="hover:text-white transition-colors">Pricing</a>
            <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
            {!isLoggedIn && <Link href="/login" className="hover:text-white transition-colors">Login</Link>}
          </div>
          <Button asChild className="hidden md:inline-flex bg-white text-black hover:bg-zinc-200 rounded-full px-6 py-2.5 text-[15px] font-medium transition-all shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)]">
            <Link href={isLoggedIn ? '/dashboard' : '/signup'}>{isLoggedIn ? 'Dashboard' : 'Get Started'}</Link>
          </Button>
          <button
            onClick={() => setMobileNavOpen(true)}
            className="md:hidden p-2.5 -m-1 rounded-lg text-zinc-400 hover:text-white transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
        </motion.div>
      </nav>

      {/* Mobile Nav Drawer */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="right" className="w-[70vw] max-w-64 bg-[#1C1C1E] border-white/10 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="flex flex-col gap-1 p-6 pt-12">
            <a href="#slide-features" onClick={() => setMobileNavOpen(false)} className="py-3 text-sm font-medium text-zinc-400 hover:text-white transition-colors border-b border-white/5">Features</a>
            <a href="#slide-pricing" onClick={() => setMobileNavOpen(false)} className="py-3 text-sm font-medium text-zinc-400 hover:text-white transition-colors border-b border-white/5">Pricing</a>
            <Link href="/blog" onClick={() => setMobileNavOpen(false)} className="py-3 text-sm font-medium text-zinc-400 hover:text-white transition-colors border-b border-white/5">Blog</Link>
            {!isLoggedIn && <Link href="/login" onClick={() => setMobileNavOpen(false)} className="py-3 text-sm font-medium text-zinc-400 hover:text-white transition-colors border-b border-white/5">Login</Link>}
            <div className="mt-4">
              <Button asChild className="w-full bg-white text-black hover:bg-zinc-200 rounded-full font-medium">
                <Link href={isLoggedIn ? '/dashboard' : '/signup'}>{isLoggedIn ? 'Dashboard' : 'Get Started'}</Link>
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>


      {/* ======================== SLIDE 1: HERO + DEMO ======================== */}
      <section
        id="slide-hero"
        className="min-h-[100dvh] flex flex-col items-center justify-center relative z-10 px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-8 sm:pb-12"
      >


        <div className="max-w-5xl mx-auto text-center relative z-10 flex flex-col items-center gap-4 sm:gap-6 w-full flex-1 justify-center -mt-10 sm:-mt-16">


          {/* H1 Typography */}
          <h1 className="font-heading text-[26px] leading-[1.08] min-[400px]:text-[32px] sm:text-[48px] md:text-[64px] tracking-[-0.02em] text-white flex flex-col items-center gap-0 sm:gap-1 w-full">
            <span className="block overflow-hidden">
              <motion.span
                initial={{ y: 100 }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
                className="block"
              >
                The <span className="italic text-white/50">#1 Fullstack</span> security scanner
              </motion.span>
            </span>
            <span className="block overflow-hidden">
              <motion.span
                initial={{ y: 100 }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                className="block"
              >
                for <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-sky-200 to-sky-400 animate-gradient-flow bg-[length:200%_auto]">vibecoded</span> Websites
              </motion.span>
            </span>
          </h1>

          {/* Subtext */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-sm sm:text-lg text-zinc-400 max-w-2xl mx-auto px-2"
          >
            35 security scanners. One click. Exposed API keys, SQL injection, XSS, and more.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="flex flex-col sm:flex-row gap-3 justify-center items-center"
          >
            <Button size="lg" asChild className="h-12 px-6 sm:px-8 rounded-xl bg-gradient-to-b from-white to-zinc-200 text-black shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] hover:scale-[1.02] transition-transform text-base font-semibold border-0">
              <Link href={isLoggedIn ? '/dashboard' : '/signup'}>
                {isLoggedIn ? 'Dashboard' : 'Start Scanning'}
              </Link>
            </Button>
            <div className="flex items-center gap-4 text-sm font-medium text-white/90">
              <div className="h-px w-10 bg-white/20" />
              <span>Free plan available</span>
              <div className="h-px w-10 bg-white/20" />
            </div>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3 sm:gap-8 w-full max-w-4xl mt-2"
          >
            {stats.map((stat, i) => (
              <div key={i} className="flex flex-col items-center justify-center text-center min-w-0">
                <div className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-0.5 flex items-baseline">
                  {stat.value.includes('<') && <span className="mr-0.5 text-base sm:text-xl text-zinc-400">&lt;</span>}
                  <CountUp
                    to={parseInt(stat.value.replace(/\D/g, ''))}
                    className="bg-clip-text text-transparent bg-gradient-to-b from-white to-white/50"
                  />
                  {stat.value.includes('+') && <span className="ml-0.5 text-base sm:text-xl text-zinc-400">+</span>}
                  {stat.value.includes('s') && <span className="ml-0.5 text-base sm:text-xl text-zinc-400">s</span>}
                </div>
                <div className="text-[10px] sm:text-xs text-zinc-500 font-medium uppercase tracking-wide sm:tracking-wider">{stat.label}</div>
              </div>
            ))}
          </motion.div>

          {/* Terminal card — compact */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6, duration: 0.8, ease: 'easeOut' }}
            className="relative w-full max-w-4xl group mt-2"
            style={isTouch ? undefined : { perspective: 800 }}
            aria-hidden="true"
          >
            <motion.div
              style={isTouch ? undefined : { rotateX: smoothCardRotateX, rotateY: smoothCardRotateY }}
              onMouseMove={handleCardMouseMove}
              onMouseLeave={handleCardMouseLeave}
              className="relative bg-[#1C1C1E] border border-white/10 rounded-xl overflow-hidden shadow-2xl h-[160px] min-[400px]:h-[200px] sm:h-[260px] md:h-[320px] w-full flex flex-col"
            >
              {/* Header */}
              <div className="h-8 sm:h-10 border-b border-white/5 bg-white/5 flex items-center px-3 sm:px-4 justify-between">
                <div className="flex gap-1.5 sm:gap-2">
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-500/20" />
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-yellow-500/20" />
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-500/20" />
                </div>
                <div className="text-[10px] sm:text-xs text-zinc-500 font-mono">analysis_result.json</div>
              </div>

              {/* Code Content & Scanner */}
              <div className="relative p-2.5 sm:p-5 font-mono text-[8px] min-[400px]:text-[9px] sm:text-sm overflow-hidden flex-1 bg-[#0E0E10]">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px]" />

                <div className="space-y-0.5 sm:space-y-1 relative z-10 opacity-80 overflow-hidden">
                  <div className="flex gap-2 sm:gap-4"><span className="text-zinc-600">01</span> <span className="text-sky-400">export</span> <span className="text-cyan-400">default</span> <span className="text-sky-400">function</span> <span className="text-yellow-200">PaymentHandler</span>() {'{'}</div>
                  <div className="flex gap-2 sm:gap-4"><span className="text-zinc-600">02</span>   <span className="text-zinc-400">// TODO: Refactor this later</span></div>
                  <div className="flex gap-2 sm:gap-4"><span className="text-zinc-600">03</span>   <span className="text-sky-400">const</span> <span className="text-cyan-200">stripeKey</span> = <span className="text-green-300">&quot;sk_live_EXAMPLE_KEY...&quot;</span>;</div>
                  <div className="flex gap-2 sm:gap-4"><span className="text-zinc-600">04</span>   <span className="text-sky-400">const</span> <span className="text-cyan-200">headers</span> = {'{'}</div>
                  <div className="flex gap-2 sm:gap-4"><span className="text-zinc-600">05</span>     <span className="text-green-300">&quot;Authorization&quot;</span>: <span className="text-green-300">`Bearer ${'{'}stripeKey{'}'}`</span></div>
                  <div className="flex gap-2 sm:gap-4"><span className="text-zinc-600">06</span>   {'}'};</div>
                  <div className="flex gap-2 sm:gap-4"><span className="text-zinc-600">07</span>   <span className="text-sky-400">await</span> <span className="text-cyan-400">fetch</span>(<span className="text-green-300">&quot;/api/charge&quot;</span>, {'{'} <span className="text-cyan-200">method</span>: <span className="text-green-300">&quot;POST&quot;</span>, <span className="text-cyan-200">headers</span> {'}'});</div>
                  <div className="flex gap-2 sm:gap-4"><span className="text-zinc-600">08</span> {'}'}</div>
                  <div className="flex gap-2 sm:gap-4"><span className="text-zinc-600">09</span> <span className="text-sky-400">export</span> <span className="text-sky-400">const</span> <span className="text-cyan-200">config</span> = {'{'} <span className="text-green-300">&quot;cors&quot;</span>: <span className="text-orange-300">false</span> {'}'};</div>
                </div>

                {/* Scanning Beam */}
                <motion.div
                  animate={{ top: ['0%', '100%', '0%'] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                  className="absolute left-0 right-0 h-[2px] bg-sky-400/50 shadow-[0_0_20px_2px_rgba(59,130,246,0.5)] z-20 overflow-visible"
                >
                  <div className="absolute right-2 sm:right-4 -top-3 bg-sky-400 text-[9px] sm:text-xs text-white px-1.5 sm:px-2 py-0.5 rounded font-mono font-medium tracking-wide shadow-lg shadow-sky-400/30 whitespace-nowrap">SCANNING</div>
                </motion.div>

                <motion.div
                  animate={{ top: ['-10%', '90%', '-10%'] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                  className="absolute left-0 right-0 h-16 bg-gradient-to-b from-sky-400/10 to-transparent z-10 pointer-events-none"
                />

                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: [0, 1, 1, 0, 0] }}
                  transition={{ duration: 4, repeat: Infinity, times: [0.1, 0.2, 0.45, 0.5, 1] }}
                  className="absolute top-[16px] min-[400px]:top-[20px] sm:top-[50px] right-2 min-[400px]:right-3 sm:right-8 bg-red-500/10 border border-red-500/50 text-red-400 px-1.5 min-[400px]:px-2 sm:px-3 py-0.5 min-[400px]:py-1 sm:py-1.5 rounded-lg backdrop-blur-md flex items-center gap-1 min-[400px]:gap-1.5 sm:gap-2 shadow-xl z-30 max-w-[120px] min-[400px]:max-w-[180px] sm:max-w-none"
                >
                  <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4 text-red-500 shrink-0" />
                  <div className="min-w-0 overflow-hidden">
                    <div className="text-[8px] min-[400px]:text-[9px] sm:text-xs font-bold truncate">Exposed Stripe Key</div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: [0, 1, 1, 0, 0] }}
                  transition={{ duration: 4, repeat: Infinity, times: [0.6, 0.7, 0.9, 0.95, 1] }}
                  className="absolute top-[45px] min-[400px]:top-[55px] sm:top-[140px] md:top-[200px] right-2 min-[400px]:right-3 sm:right-8 bg-yellow-500/10 border border-yellow-500/50 text-yellow-400 px-1.5 min-[400px]:px-2 sm:px-3 py-0.5 min-[400px]:py-1 sm:py-1.5 rounded-lg backdrop-blur-md flex items-center gap-1 min-[400px]:gap-1.5 sm:gap-2 shadow-xl z-30 max-w-[120px] min-[400px]:max-w-[180px] sm:max-w-none"
                >
                  <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500 shrink-0" />
                  <div className="min-w-0 overflow-hidden">
                    <div className="text-[8px] min-[400px]:text-[9px] sm:text-xs font-bold truncate">CORS Misconfigured</div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ======================== SLIDE 1.5: PRICING ======================== */}
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
                  : 'bg-zinc-900/40 border-white/5 hover:border-white/10'
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

      {/* ======================== SLIDE 3: FEATURES ======================== */}
      <section
        id="slide-features"
        className="relative z-10 px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-20 sm:pb-28"
      >

        <div className="max-w-7xl mx-auto relative z-10 w-full">
          <div className="text-center mb-10 sm:mb-14">
            <Badge variant="secondary" className="mb-4 bg-sky-500/10 border-sky-500/20 text-sky-400">
              Built for Your Stack
            </Badge>
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-heading font-medium mb-4 tracking-tight text-white">
              Integrate the Tools{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-sky-200 to-sky-400 animate-gradient-flow">You Actually Use</span>
            </h2>
            <p className="text-sm sm:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
              Supabase, Firebase, Vercel, Netlify, GitHub — 35 scanners purpose-built for the modern vibe-coded stack. Connect your repo and get results in seconds.
            </p>
          </div>


          <SupportedTools />

          {/* ======================== MCP INTEGRATION ======================== */}
          <div className="max-w-4xl mx-auto relative z-10 w-full mt-0 sm:mt-2 mb-20 sm:mb-28">
            <div className="text-center mb-6 sm:mb-8">
              <h2 className="text-lg sm:text-xl lg:text-2xl font-heading font-medium mb-2.5 tracking-tight text-white flex items-center justify-center gap-2 sm:gap-3">
                Native <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 animate-gradient-flow">MCP Server</span> Support
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl mx-auto leading-relaxed">
                Run CheckVibe directly from your favorite AI code editor or agent using the standard Model Context Protocol. Scan, fix, and verify without leaving your IDE.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 max-w-3xl mx-auto">
              {/* Claude */}
              <div className="flex flex-col items-center justify-center p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-emerald-500/30 hover:bg-emerald-500/5 hover:-translate-y-1 transition-all duration-300 shadow-xl group">
                <div className="w-8 h-8 sm:w-12 sm:h-12 mb-2 sm:mb-3 opacity-80 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <img src="/images/tools/claude.svg" alt="Claude AI" className="w-full h-full object-contain" />
                </div>
                <h3 className="text-base font-medium text-white">Claude</h3>
              </div>

              {/* Cursor */}
              <div className="flex flex-col items-center justify-center p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-white/30 hover:bg-white/5 hover:-translate-y-1 transition-all duration-300 shadow-xl group">
                <div className="w-8 h-8 sm:w-12 sm:h-12 mb-2 sm:mb-3 opacity-80 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl overflow-hidden">
                  <img src="/images/tools/cursor.png" alt="Cursor Editor" className="w-full h-full object-contain" />
                </div>
                <h3 className="text-base font-medium text-white">Cursor</h3>
              </div>

              {/* Antigravity */}
              <div className="flex flex-col items-center justify-center p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-sky-500/30 hover:bg-sky-500/5 hover:-translate-y-1 transition-all duration-300 shadow-xl group">
                <div className="w-8 h-8 sm:w-12 sm:h-12 mb-2 sm:mb-3 opacity-80 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl overflow-hidden">
                  <img src="/images/tools/antigravity.png" alt="Google Antigravity" className="w-full h-full object-contain" />
                </div>
                <h3 className="text-base font-medium text-white">Antigravity</h3>
              </div>
            </div>
          </div>

          <FeatureRoadmap />
        </div>
      </section>


      {/* ======================== SLIDE 5: CTA + FOOTER ======================== */}
      <section
        id="slide-cta"
        className="relative z-10 px-4 sm:px-6 lg:px-8 py-20 sm:py-28"
      >
        {/* Gradient orbs — hidden on small mobile for GPU savings */}
        <div className="hidden sm:block absolute w-64 h-64 top-1/4 left-1/4 bg-sky-500/10 blur-[100px] rounded-full pointer-events-none" aria-hidden="true" />
        <div className="hidden sm:block absolute w-48 h-48 bottom-1/4 right-1/4 bg-sky-400/10 blur-[100px] rounded-full pointer-events-none" aria-hidden="true" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="glass-card shadow-cluely-card rounded-2xl p-6 sm:p-12 bg-white/[0.02] border-white/10">
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-heading font-medium mb-4 tracking-tight text-white">
              Don&apos;t <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-sky-200 to-sky-400 animate-gradient-flow">Ship Vulnerabilities</span>
            </h2>
            <p className="text-base sm:text-xl text-zinc-400 mb-8">
              35 scanners. One click. Know exactly what to fix before you deploy.
            </p>
            <Button size="lg" asChild className="text-base sm:text-lg px-6 sm:px-10 py-5 sm:py-6 shimmer-button bg-gradient-to-r from-sky-500 to-cyan-600 hover:from-sky-400 hover:to-cyan-500 border-0 glow-on-hover text-white">
              <Link href={isLoggedIn ? '/dashboard' : '/signup'}>
                {isLoggedIn ? 'Dashboard' : 'Start Scanning'}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-24 relative z-10">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-center mb-12 text-white">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {[
              { q: 'What is CheckVibe?', a: 'CheckVibe is an AI-powered website security scanner that runs 35 automated checks on your site to detect vulnerabilities like SQL injection, XSS, exposed API keys, misconfigured headers, and more — all in under 60 seconds.' },
              { q: 'How many scanners does CheckVibe have?', a: 'CheckVibe runs 35 security scanners in parallel, covering infrastructure security, application vulnerabilities, secrets exposure, backend-specific checks (Supabase, Firebase, Convex), and hosting provider configurations.' },
              { q: 'Is CheckVibe free to use?', a: 'Yes — the free plan includes 1 project and 3 scans per month with an issue overview. Paid plans start at $19/month for full scan details, history, and more projects.' },
              { q: 'What vulnerabilities does CheckVibe detect?', a: 'CheckVibe detects SQL injection, cross-site scripting (XSS), exposed API keys, CORS misconfigurations, missing security headers, weak SSL/TLS, CSRF vulnerabilities, open redirects, dependency CVEs, DNS issues, and more.' },
              { q: 'How does CheckVibe compare to manual penetration testing?', a: 'CheckVibe complements manual pentesting by providing fast, consistent, and affordable automated scanning. Run 30 checks in under a minute after every deployment — something manual testing can\'t match for frequency and speed.' },
            ].map(({ q, a }) => (
              <details key={q} className="group rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
                <summary className="flex items-center justify-between px-6 py-5 cursor-pointer text-[15px] sm:text-base font-semibold text-white hover:text-sky-400 transition-colors list-none [&::-webkit-details-marker]:hidden">
                  {q}
                  <span className="ml-4 text-zinc-500 group-open:rotate-45 transition-transform text-xl flex shrink-0">+</span>
                </summary>
                <div className="px-6 pb-5 text-sm sm:text-[15px] text-zinc-300 leading-relaxed">
                  {a}
                </div>
              </details>
            ))}
          </div>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'FAQPage',
                mainEntity: [
                  { '@type': 'Question', name: 'What is CheckVibe?', acceptedAnswer: { '@type': 'Answer', text: 'CheckVibe is an AI-powered website security scanner that runs 35 automated checks on your site to detect vulnerabilities like SQL injection, XSS, exposed API keys, misconfigured headers, and more — all in under 60 seconds.' } },
                  { '@type': 'Question', name: 'How many scanners does CheckVibe have?', acceptedAnswer: { '@type': 'Answer', text: 'CheckVibe runs 35 security scanners in parallel, covering infrastructure security, application vulnerabilities, secrets exposure, backend-specific checks (Supabase, Firebase, Convex), and hosting provider configurations.' } },
                  { '@type': 'Question', name: 'Is CheckVibe free to use?', acceptedAnswer: { '@type': 'Answer', text: 'Yes — the free plan includes 1 project and 3 scans per month with an issue overview. Paid plans start at $19/month for full scan details, history, and more projects.' } },
                  { '@type': 'Question', name: 'What vulnerabilities does CheckVibe detect?', acceptedAnswer: { '@type': 'Answer', text: 'CheckVibe detects SQL injection, cross-site scripting (XSS), exposed API keys, CORS misconfigurations, missing security headers, weak SSL/TLS, CSRF vulnerabilities, open redirects, dependency CVEs, DNS issues, and more.' } },
                  { '@type': 'Question', name: 'How does CheckVibe compare to manual penetration testing?', acceptedAnswer: { '@type': 'Answer', text: 'CheckVibe complements manual pentesting by providing fast, consistent, and affordable automated scanning. Run 30 checks in under a minute after every deployment — something manual testing can\'t match for frequency and speed.' } },
                ],
              }),
            }}
          />
        </div>

        {/* Footer */}
        <footer className="w-full pt-12 sm:pt-16 pb-8 relative z-10 safe-bottom mt-12 sm:mt-16">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col items-center gap-4 sm:gap-6 md:flex-row md:justify-between">
              <div className="flex items-center gap-2">
                <Image src="/logo-composite.png" alt="CheckVibe Logo" width={120} height={24} className="w-auto h-6 object-contain" />
              </div>
              <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-6 text-sm text-zinc-400">
                <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
                <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
                <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
                <Link href="/cookies" className="hover:text-white transition-colors">Cookies</Link>
                <a href="mailto:support@checkvibe.dev" className="hover:text-white transition-colors">Contact</a>
              </div>
              <p className="text-muted-foreground text-xs sm:text-sm text-center">
                © {new Date().getFullYear()} CheckVibe
              </p>
            </div>
          </div>
        </footer>
      </section>
    </div>
  );
}
