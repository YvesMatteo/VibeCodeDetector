'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  ArrowRight,
  AlertTriangle,
  Mail,
  Menu,
} from 'lucide-react';
import * as motion from "framer-motion/client";
import { useMotionValue, useTransform, useSpring } from "framer-motion";

import { CountUp } from '@/components/ui/count-up';
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet';
import { useState, useEffect, type MouseEvent } from 'react';
import { detectCurrency, formatPrice, type CurrencyCode } from '@/lib/currency';
import { createClient } from '@/lib/supabase/client';

const features = [
  {
    label: '01',
    title: 'Injection & Code Vulnerabilities',
    description: 'SQL injection, XSS, open redirects, and CSRF detection across your live site.',
    accent: 'from-rose-500 to-orange-500',
    accentBorder: 'group-hover:border-rose-500/20',
    includes: ['SQLi', 'XSS', 'Open Redirect', 'CSRF'],
  },
  {
    label: '02',
    title: 'Secrets & Key Detection',
    description: 'API keys, credentials, and secrets found in client-side code and git history.',
    accent: 'from-amber-500 to-yellow-500',
    accentBorder: 'group-hover:border-amber-500/20',
    includes: ['API Keys', 'GitHub Deep Scan', 'GitHub Security Alerts'],
  },
  {
    label: '03',
    title: 'Infrastructure Security',
    description: 'SSL/TLS, security headers, CORS, cookies, and DNS/email configuration auditing.',
    accent: 'from-emerald-500 to-teal-500',
    accentBorder: 'group-hover:border-emerald-500/20',
    includes: ['SSL/TLS', 'Headers', 'CORS', 'Cookies', 'DNS', 'DDoS', 'Vercel', 'Netlify', 'Cloudflare', 'Railway'],
  },
  {
    label: '04',
    title: 'Backend Security',
    description: 'Supabase + Firebase misconfigs, auth flow analysis, and dependency CVEs.',
    accent: 'from-violet-500 to-purple-500',
    accentBorder: 'group-hover:border-violet-500/20',
    includes: ['Supabase', 'Supabase Deep Lint', 'Firebase', 'Convex', 'Auth', 'Dependencies', 'OpenSSF Scorecard'],
  },
];

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
    highlighted: false,
  },
  {
    name: 'Pro',
    priceMonthly: 39,
    priceAnnualPerMonth: 27.30,
    description: 'For growing projects',
    features: ['3 projects', '20 scans/month', 'Full scan suite', 'Priority support'],
    cta: 'Get Started',
    highlighted: true,
  },
  {
    name: 'Max',
    priceMonthly: 79,
    priceAnnualPerMonth: 55.30,
    description: 'For teams & agencies',
    features: ['10 projects', '75 scans/month', 'Full scan suite', 'Dedicated support'],
    cta: 'Get Started',
    highlighted: false,
  },
];

const stats = [
  { value: '30', label: 'Security Scanners' },
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

  // Parallax Logic
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: MouseEvent<HTMLDivElement>) {
    const { left, top, width, height } = currentTarget.getBoundingClientRect();
    const x = (clientX - left) / width - 0.5;
    const y = (clientY - top) / height - 0.5;

    mouseX.set(x);
    mouseY.set(y);
  }

  const orb1X = useSpring(useTransform(mouseX, [-0.5, 0.5], [-30, 30]), { stiffness: 150, damping: 30 });
  const orb1Y = useSpring(useTransform(mouseY, [-0.5, 0.5], [-30, 30]), { stiffness: 150, damping: 30 });

  const orb2X = useSpring(useTransform(mouseX, [-0.5, 0.5], [30, -30]), { stiffness: 150, damping: 30 });
  const orb2Y = useSpring(useTransform(mouseY, [-0.5, 0.5], [30, -30]), { stiffness: 150, damping: 30 });

  // Card tilt — follows cursor position over the terminal card
  const cardRotateX = useMotionValue(0);
  const cardRotateY = useMotionValue(0);
  const smoothCardRotateX = useSpring(cardRotateX, { stiffness: 200, damping: 25 });
  const smoothCardRotateY = useSpring(cardRotateY, { stiffness: 200, damping: 25 });

  function handleCardMouseMove(e: MouseEvent<HTMLDivElement>) {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - left) / width - 0.5;
    const y = (e.clientY - top) / height - 0.5;
    cardRotateX.set(-y * 12);
    cardRotateY.set(x * 12);
  }

  function handleCardMouseLeave() {
    cardRotateX.set(0);
    cardRotateY.set(0);
  }

  return (
    <div className="min-h-screen bg-background overflow-hidden" onMouseMove={handleMouseMove}>
      {/* Navigation */}
      {/* Navigation - Cluely Style Pill */}
      <nav aria-label="Main navigation" className="fixed top-4 w-full z-50 flex justify-center pointer-events-none px-4">
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="bg-[#1C1C1E]/80 backdrop-blur-md border border-white/10 rounded-full px-4 py-2 flex items-center gap-3 sm:gap-6 shadow-2xl pointer-events-auto transition-all duration-300 hover:border-white/20 hover:scale-[1.01]"
        >
          <div className="flex items-center gap-2 pr-4 border-r border-white/10">
            <Image src="/logo.png" alt="CheckVibe Logo" width={24} height={24} className="w-6 h-6 object-contain rounded" />
            <span className="font-bold text-white tracking-tight">CheckVibe</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            {!isLoggedIn && <Link href="/login" className="hover:text-white transition-colors">Login</Link>}
          </div>
          <Button asChild size="sm" className="hidden md:inline-flex bg-white text-black hover:bg-zinc-200 rounded-full px-5 font-medium transition-all shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)]">
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
            <a href="#features" onClick={() => setMobileNavOpen(false)} className="py-3 text-sm font-medium text-zinc-400 hover:text-white transition-colors border-b border-white/5">Features</a>
            <a href="#pricing" onClick={() => setMobileNavOpen(false)} className="py-3 text-sm font-medium text-zinc-400 hover:text-white transition-colors border-b border-white/5">Pricing</a>
            {!isLoggedIn && <Link href="/login" onClick={() => setMobileNavOpen(false)} className="py-3 text-sm font-medium text-zinc-400 hover:text-white transition-colors border-b border-white/5">Login</Link>}
            <div className="mt-4">
              <Button asChild className="w-full bg-white text-black hover:bg-zinc-200 rounded-full font-medium">
                <Link href={isLoggedIn ? '/dashboard' : '/signup'}>{isLoggedIn ? 'Dashboard' : 'Get Started'}</Link>
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <main>
      {/* Hero Section - Cluely 1:1 Replica */}
      <section className="relative pt-24 sm:pt-40 pb-12 sm:pb-20 px-4 sm:px-6 lg:px-8 sm:min-h-[100svh] flex flex-col items-center justify-center overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-[#0E0E10]" aria-hidden="true">
          <motion.div
            style={{ x: orb1X, y: orb1Y }}
            className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#497EE9]/20 blur-[120px] rounded-full"
          />
          <motion.div
            style={{ x: orb2X, y: orb2Y }}
            className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#749CFF]/10 blur-[120px] rounded-full"
          />
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay"></div>
        </div>

        <div className="max-w-5xl mx-auto text-center relative z-10 flex flex-col items-center gap-5 sm:gap-8">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm shadow-inner shadow-white/5"
          >
            <span className="flex h-2 w-2 rounded-full bg-[#3B82F6] animate-pulse"></span>
            <span className="text-xs font-medium text-blue-200 tracking-wide uppercase">Now Live</span>
          </motion.div>

          {/* H1 Typography - EB Garamond + Reveal Animation */}
          <h1 className="font-heading text-[26px] leading-[1.08] min-[400px]:text-[32px] sm:text-[56px] md:text-[80px] tracking-[-0.02em] text-white flex flex-col items-center gap-0 sm:gap-2 w-full">
            <span className="block overflow-hidden">
              <motion.span
                initial={{ y: 100 }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                className="block"
              >
                The <span className="italic text-white/50">All-in-One</span> Scanner
              </motion.span>
            </span>
            <span className="block overflow-hidden">
              <motion.span
                initial={{ y: 100 }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
                className="block"
              >
                for <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#749CFF] via-[#A5B4FC] to-[#749CFF] animate-gradient-flow bg-[length:200%_auto]">vibecoded</span>
              </motion.span>
            </span>
            <span className="block overflow-hidden">
              <motion.span
                initial={{ y: 100 }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.4 }}
                className="block"
              >
                Websites
              </motion.span>
            </span>
          </h1>

          {/* Subtext */}
          <div className="overflow-hidden">
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="text-sm sm:text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto px-2"
            >
              CheckVibe scans your live website for exposed API keys, SQL injection, XSS, and 30 more security checks.
            </motion.p>
          </div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-4"
          >
            <Button size="lg" asChild className="h-12 px-6 sm:px-8 rounded-xl bg-gradient-to-b from-white to-zinc-200 text-black shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] hover:scale-[1.02] transition-transform text-base font-semibold border-0">
              <Link href={isLoggedIn ? '/dashboard' : '/signup'}>
                {isLoggedIn ? 'Dashboard' : 'Start Scanning'}
              </Link>
            </Button>
            <div className="flex items-center gap-4 text-sm text-zinc-500">
              <div className="h-px w-10 bg-white/10"></div>
              <span>Free plan available</span>
              <div className="h-px w-10 bg-white/10"></div>
            </div>
          </motion.div>

          {/* Stats Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4 sm:gap-8 mt-8 sm:mt-12 w-full max-w-4xl"
          >
            {stats.map((stat, i) => (
              <div key={i} className="flex flex-col items-center justify-center text-center min-w-0">
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-1 flex items-baseline">
                  {stat.value.includes('<') && <span className="mr-0.5 text-lg sm:text-2xl text-zinc-400">&lt;</span>}
                  <CountUp
                    to={parseInt(stat.value.replace(/\D/g, ''))}
                    className="bg-clip-text text-transparent bg-gradient-to-b from-white to-white/50"
                  />
                  {stat.value.includes('+') && <span className="ml-0.5 text-lg sm:text-2xl text-zinc-400">+</span>}
                  {stat.value.includes('s') && <span className="ml-0.5 text-lg sm:text-2xl text-zinc-400">s</span>}
                </div>
                <div className="text-[11px] sm:text-sm text-zinc-500 font-medium uppercase tracking-wide sm:tracking-wider">{stat.label}</div>
              </div>
            ))}
          </motion.div>

          {/* Hero Visual - Code Scanner Animation */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, rotateX: 20 }}
            animate={{ opacity: 1, scale: 1, rotateX: 0 }}
            transition={{ delay: 0.7, duration: 1, ease: "easeOut" }}
            className="relative mt-6 sm:mt-16 w-full max-w-4xl group"
            style={{ perspective: 800 }}
            aria-hidden="true"
          >
            {/* Main Terminal Window */}
            <motion.div
              style={{ rotateX: smoothCardRotateX, rotateY: smoothCardRotateY }}
              onMouseMove={handleCardMouseMove}
              onMouseLeave={handleCardMouseLeave}
              className="relative bg-[#1C1C1E] border border-white/10 rounded-xl overflow-hidden shadow-2xl h-[280px] sm:h-[350px] md:h-[450px] w-full flex flex-col"
            >

              {/* Header */}
              <div className="h-10 border-b border-white/5 bg-white/5 flex items-center px-4 justify-between">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/20"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/20"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/20"></div>
                </div>
                <div className="text-xs text-zinc-500 font-mono">analysis_result.json</div>
              </div>

              {/* Code Content & Scanner */}
              <div className="relative p-3 sm:p-6 font-mono text-[10px] sm:text-sm overflow-hidden flex-1 bg-[#0E0E10]">

                {/* Grid Background */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px]"></div>

                {/* Code Lines */}
                <div className="space-y-1 relative z-10 opacity-80 whitespace-nowrap">
                  <div className="flex gap-2 sm:gap-4"><span className="text-zinc-600">01</span> <span className="text-blue-400">export</span> <span className="text-cyan-400">default</span> <span className="text-blue-400">function</span> <span className="text-yellow-200">PaymentHandler</span>() {'{'}</div>
                  <div className="flex gap-2 sm:gap-4"><span className="text-zinc-600">02</span>   <span className="text-zinc-400">// TODO: Refactor this later</span></div>
                  <div className="flex gap-2 sm:gap-4"><span className="text-zinc-600">03</span>   <span className="text-blue-400">const</span> <span className="text-cyan-200">stripeKey</span> = <span className="text-green-300">&quot;sk_live_EXAMPLE_KEY...&quot;</span>;</div>
                  <div className="flex gap-2 sm:gap-4"><span className="text-zinc-600">04</span>   <span className="text-blue-400">const</span> <span className="text-cyan-200">headers</span> = {'{'}</div>
                  <div className="flex gap-2 sm:gap-4"><span className="text-zinc-600">05</span>     <span className="text-green-300">&quot;Authorization&quot;</span>: <span className="text-green-300">`Bearer ${'{'}stripeKey{'}'}`</span></div>
                  <div className="flex gap-2 sm:gap-4"><span className="text-zinc-600">06</span>   {'}'};</div>
                  <div className="flex gap-2 sm:gap-4"><span className="text-zinc-600">07</span> </div>
                  <div className="flex gap-2 sm:gap-4"><span className="text-zinc-600">08</span>   <span className="text-blue-400">await</span> <span className="text-cyan-400">fetch</span>(<span className="text-green-300">&quot;/api/charge&quot;</span>, {'{'}</div>
                  <div className="flex gap-2 sm:gap-4"><span className="text-zinc-600">09</span>     <span className="text-cyan-200">method</span>: <span className="text-green-300">&quot;POST&quot;</span>,</div>
                  <div className="flex gap-2 sm:gap-4"><span className="text-zinc-600">10</span>     <span className="text-cyan-200">headers</span></div>
                  <div className="flex gap-2 sm:gap-4"><span className="text-zinc-600">11</span>   {'}'});</div>
                  <div className="flex gap-2 sm:gap-4"><span className="text-zinc-600">12</span> {'}'}</div>
                  <div className="flex gap-2 sm:gap-4"><span className="text-zinc-600">13</span> </div>
                  <div className="flex gap-2 sm:gap-4"><span className="text-zinc-600">14</span> <span className="text-zinc-400">{'// CORS: Missing Access-Control headers'}</span></div>
                  <div className="flex gap-2 sm:gap-4"><span className="text-zinc-600">15</span> <span className="text-blue-400">export</span> <span className="text-blue-400">const</span> <span className="text-cyan-200">config</span> = {'{'} <span className="text-green-300">&quot;cors&quot;</span>: <span className="text-orange-300">false</span> {'}'};</div>
                </div>

                {/* Scanning Beam */}
                <motion.div
                  animate={{ top: ["0%", "100%", "0%"] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  className="absolute left-0 right-0 h-[2px] bg-blue-500/50 shadow-[0_0_20px_2px_rgba(59,130,246,0.5)] z-20 overflow-visible"
                >
                  <div className="absolute right-2 sm:right-4 -top-3 bg-blue-500 text-[10px] sm:text-xs text-white px-2 py-0.5 rounded font-mono font-medium tracking-wide shadow-lg shadow-blue-500/30 whitespace-nowrap">SCANNING</div>
                </motion.div>

                {/* Scan overlay gradient */}
                <motion.div
                  animate={{ top: ["-10%", "90%", "-10%"] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  className="absolute left-0 right-0 h-20 bg-gradient-to-b from-blue-500/10 to-transparent z-10 pointer-events-none"
                />

                {/* Detection Markers - Animated Appear */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: [0, 1, 1, 0, 0] }}
                  transition={{ duration: 4, repeat: Infinity, times: [0.1, 0.2, 0.45, 0.5, 1] }}
                  className="absolute top-[30px] sm:top-[80px] right-3 sm:right-10 bg-red-500/10 border border-red-500/50 text-red-400 px-2 sm:px-3 py-1 sm:py-2 rounded-lg backdrop-blur-md flex items-center gap-1.5 sm:gap-3 shadow-xl z-30 max-w-[calc(100%-24px)] sm:max-w-none"
                >
                  <AlertTriangle className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-red-500 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[10px] sm:text-sm font-bold truncate">Critical Issue</div>
                    <div className="text-[9px] sm:text-xs opacity-80 truncate">Exposed Stripe Key</div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: [0, 1, 1, 0, 0] }}
                  transition={{ duration: 4, repeat: Infinity, times: [0.6, 0.7, 0.9, 0.95, 1] }}
                  className="absolute top-[90px] sm:top-[220px] md:top-[320px] right-3 sm:right-10 bg-yellow-500/10 border border-yellow-500/50 text-yellow-400 px-2 sm:px-3 py-1 sm:py-2 rounded-lg backdrop-blur-md flex items-center gap-1.5 sm:gap-3 shadow-xl z-30 max-w-[calc(100%-24px)] sm:max-w-none"
                >
                  <AlertTriangle className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-yellow-500 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[10px] sm:text-sm font-bold truncate">XSS Warning</div>
                    <div className="text-[9px] sm:text-xs opacity-80 truncate">Reflected Input</div>
                  </div>
                </motion.div>

              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Trust Strip */}
      <section className="relative py-10 sm:py-14 px-4 sm:px-6 lg:px-8 bg-[#0E0E10] border-t border-white/5">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center gap-4"
          >
            <p className="text-xs sm:text-sm font-medium uppercase tracking-widest text-zinc-500">Trusted by developers shipping with AI</p>
            <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
              {['30 Security Scanners', '150+ Checks', 'Real-Time CVE Lookups', 'GitHub Deep Scan'].map((item) => (
                <div key={item} className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.06]">
                  <CheckCircle className="h-3.5 w-3.5 text-blue-400" />
                  <span className="text-xs sm:text-sm text-zinc-300">{item}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-16 sm:py-24 px-4 sm:px-6 lg:px-8 bg-[#0E0E10]">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0E0E10] via-blue-950/5 to-[#0E0E10]" aria-hidden="true" />

        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02] mix-blend-overlay" aria-hidden="true"></div>

        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-10 sm:mb-16"
          >
            <Badge variant="secondary" className="mb-4 bg-[#749CFF]/10 border-[#749CFF]/20 text-[#749CFF]">
              Features
            </Badge>
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-heading font-medium mb-4 tracking-tight text-white">
              Everything You Need to{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#749CFF] via-[#A5B4FC] to-[#749CFF] animate-gradient-flow">Ship Safely</span>
            </h2>
            <p className="text-sm sm:text-xl text-zinc-400 max-w-2xl mx-auto">
              30 scanners that catch the issues vibe-coded sites commonly have.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 stagger-children">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <div className={`group relative h-full rounded-xl border border-white/[0.06] ${feature.accentBorder} bg-white/[0.02] hover:bg-white/[0.035] transition-all duration-300 overflow-hidden`}>
                  {/* Accent top bar */}
                  <div className={`h-[2px] bg-gradient-to-r ${feature.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                  <div className="relative p-5 sm:p-6 flex flex-col h-full">
                    <div className="flex items-start gap-4 mb-3">
                      <span className={`text-[11px] font-mono font-bold tracking-widest bg-gradient-to-r ${feature.accent} bg-clip-text text-transparent shrink-0 pt-1`}>
                        {feature.label}
                      </span>
                      <h3 className="text-[15px] sm:text-base font-semibold text-white tracking-tight leading-tight">{feature.title}</h3>
                    </div>
                    <p className="text-[13px] text-zinc-500 leading-relaxed mb-4 pl-10">
                      {feature.description}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-auto pl-10">
                      {feature.includes.map((item) => (
                        <span key={item} className="text-[11px] px-2 py-0.5 rounded-md bg-white/[0.04] text-zinc-400 font-medium">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="relative pt-16 sm:pt-24 pb-0 px-4 sm:px-6 lg:px-8 bg-[#0E0E10]">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02] mix-blend-overlay" aria-hidden="true"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-10 sm:mb-16"
          >
            <Badge variant="secondary" className="mb-4 bg-blue-500/10 border-blue-500/20 text-blue-300">
              Pricing
            </Badge>
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-heading font-medium mb-4 tracking-tight text-white">
              Simple, <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#749CFF] via-[#A5B4FC] to-[#749CFF] animate-gradient-flow">Transparent</span> Pricing
            </h2>
            <p className="text-sm sm:text-xl text-zinc-400 max-w-2xl mx-auto mb-6 sm:mb-8">
              Flexible plans for every team size. Cancel anytime.
            </p>

            {/* Billing Toggle */}
            <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 p-1">
              <button
                onClick={() => setBilling('monthly')}
                className={`px-4 sm:px-5 py-2 rounded-full text-sm font-medium transition-all ${
                  billing === 'monthly'
                    ? 'bg-white text-black shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBilling('annual')}
                className={`px-4 sm:px-5 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 sm:gap-2 ${
                  billing === 'annual'
                    ? 'bg-white text-black shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Annual
                <span className={`text-[10px] sm:text-xs font-semibold px-1.5 sm:px-2 py-0.5 rounded-full ${
                  billing === 'annual'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-green-500/10 text-green-400'
                }`}>
                  -30%
                </span>
              </button>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 pt-4 max-w-sm sm:max-w-5xl mx-auto">
            {pricingTiers.map((tier, index) => (
              <motion.div
                key={tier.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="h-full"
              >
                <div className={`relative h-full flex flex-col rounded-xl border transition-all duration-300 ${tier.highlighted
                    ? 'bg-zinc-900/60 border-blue-500/30 shadow-[0_0_30px_-10px_rgba(59,130,246,0.2)]'
                    : 'bg-zinc-900/40 border-white/5 hover:border-white/10'
                  }`}>
                  {tier.highlighted && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                      <div className="bg-blue-600 text-[10px] font-bold px-3 py-1 rounded-full text-white shadow-lg uppercase tracking-wider">
                        Most Popular
                      </div>
                    </div>
                  )}
                  <div className="p-6 border-b border-white/5">
                    <h3 className="text-lg font-medium text-white">{tier.name}</h3>
                    <p className="text-sm text-zinc-400 mt-1">{tier.description}</p>
                    <div className="mt-4">
                      {'isFree' in tier && tier.isFree ? (
                        <span className="text-4xl font-bold text-white tracking-tight">Free</span>
                      ) : tier.priceMonthly === null ? (
                        <span className="text-4xl font-bold text-white tracking-tight">Custom</span>
                      ) : billing === 'annual' ? (
                        <div className="flex flex-col">
                          <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-bold text-white tracking-tight">{formatPrice(tier.priceAnnualPerMonth!, currency)}</span>
                            <span className="text-zinc-500 text-sm font-normal">/mo</span>
                          </div>
                          <span className="text-zinc-500 text-sm line-through mt-1">{formatPrice(tier.priceMonthly!, currency)}/mo</span>
                          <span className="text-zinc-500 text-xs mt-1">billed annually</span>
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
                          <CheckCircle className={`h-5 w-5 shrink-0 ${tier.highlighted ? 'text-blue-400' : 'text-zinc-500'}`} />
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
                    ) : 'isContact' in tier && tier.isContact ? (
                      <Button
                        className="w-full bg-white/5 border-white/10 hover:bg-white/10 text-white"
                        variant="outline"
                        asChild
                      >
                        <a href="mailto:hello@checkvibe.dev?subject=CheckVibe Max Plan">
                          <Mail className="mr-2 h-4 w-4" />
                          {tier.cta}
                        </a>
                      </Button>
                    ) : (
                      <Button
                        className={`w-full ${tier.highlighted
                          ? 'bg-blue-600 hover:bg-blue-500 text-white border-0 shadow-lg shadow-blue-500/20'
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
              </motion.div>
            ))}
          </div>

          {/* Feature Comparison Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-12 sm:mt-16 max-w-5xl mx-auto"
          >
            <h3 className="text-lg sm:text-xl font-medium text-white text-center mb-6">Compare Plans</h3>
            <div className="overflow-x-auto rounded-xl border border-white/5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.02]">
                    <th className="text-left py-3 px-4 text-zinc-400 font-medium w-[40%]">Feature</th>
                    <th className="text-center py-3 px-4 text-zinc-400 font-medium">Free</th>
                    <th className="text-center py-3 px-4 text-zinc-400 font-medium">Starter</th>
                    <th className="text-center py-3 px-4 text-zinc-400 font-medium text-blue-400">Pro</th>
                    <th className="text-center py-3 px-4 text-zinc-400 font-medium">Max</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {[
                    { feature: 'Projects', values: ['1', '1', '3', '10'] },
                    { feature: 'Scans / month', values: ['3', '5', '20', '75'] },
                    { feature: 'Security scanners', values: ['30', '30', '30', '30'] },
                    { feature: 'Full scan details', values: [false, true, true, true] },
                    { feature: 'Scan history', values: [false, true, true, true] },
                    { feature: 'Issue dismissals', values: [false, true, true, true] },
                    { feature: 'Shareable reports', values: [false, true, true, true] },
                    { feature: 'API access', values: [false, false, true, true] },
                    { feature: 'Priority support', values: [false, false, true, true] },
                    { feature: 'Dedicated support', values: [false, false, false, true] },
                  ].map((row) => (
                    <tr key={row.feature} className="hover:bg-white/[0.01] transition-colors">
                      <td className="py-2.5 px-4 text-zinc-300">{row.feature}</td>
                      {row.values.map((val, i) => (
                        <td key={i} className="text-center py-2.5 px-4">
                          {typeof val === 'boolean' ? (
                            val ? (
                              <CheckCircle className="h-4 w-4 text-emerald-400 mx-auto" />
                            ) : (
                              <span className="text-zinc-600">—</span>
                            )
                          ) : (
                            <span className="text-white font-medium">{val}</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* Custom CTA */}
          <div className="mt-8 text-center text-sm text-zinc-500">
            Need more? <a href="mailto:hello@checkvibe.dev?subject=CheckVibe Custom Plan" className="text-white hover:text-blue-400 transition-colors font-medium">Contact us</a> for custom plans.
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative pt-12 sm:pt-16 pb-16 sm:pb-24 px-4 sm:px-6 lg:px-8 bg-[#0E0E10] overflow-hidden">
        {/* Gradient orbs */}
        <div className="absolute w-64 h-64 top-0 left-1/4 bg-[#497EE9]/10 blur-[100px] rounded-full pointer-events-none" aria-hidden="true" />
        <div className="absolute w-48 h-48 bottom-0 right-1/4 bg-[#749CFF]/10 blur-[100px] rounded-full pointer-events-none" aria-hidden="true" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="glass-card shadow-cluely-card rounded-2xl p-6 sm:p-12 bg-white/[0.02] border-white/10"
          >
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-heading font-medium mb-4 tracking-tight text-white">
              Don&apos;t <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#749CFF] via-[#A5B4FC] to-[#749CFF] animate-gradient-flow">Ship Vulnerabilities</span>
            </h2>
            <p className="text-base sm:text-xl text-zinc-400 mb-8">
              30 scanners. One click. Know exactly what to fix before you deploy.
            </p>
            <Button size="lg" asChild className="text-base sm:text-lg px-6 sm:px-10 py-5 sm:py-6 shimmer-button bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 border-0 glow-on-hover text-white">
              <Link href={isLoggedIn ? '/dashboard' : '/signup'}>
                {isLoggedIn ? 'Dashboard' : 'Start Scanning'}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>
      </main>

      {/* Footer */}
      <footer className="py-8 sm:py-12 px-4 sm:px-6 lg:px-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center gap-4 sm:gap-6 md:flex-row md:justify-between">
            <div className="flex items-center gap-2">
              <Image src="/logo.png" alt="CheckVibe Logo" width={24} height={24} className="w-6 h-6 object-contain rounded" />
              <span className="font-bold text-white">CheckVibe</span>
            </div>
            <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-6 text-sm text-zinc-400">
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
              <Link href="/cookies" className="hover:text-white transition-colors">Cookies</Link>
              <a href="mailto:hello@checkvibe.dev" className="hover:text-white transition-colors">Contact</a>
            </div>
            <p className="text-muted-foreground text-xs sm:text-sm text-center">
              © {new Date().getFullYear()} CheckVibe
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
