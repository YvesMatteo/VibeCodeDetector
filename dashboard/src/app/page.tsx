'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

import { Badge } from '@/components/ui/badge';
import {
  Shield,
  Key,
  Bot,
  Scale,
  Search,
  Users,
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
import { useState, type MouseEvent } from 'react';

const features = [
  {
    icon: Shield,
    title: 'Security Scanner',
    description: 'Identify vulnerabilities, check security headers, and audit authentication.',
    color: 'text-red-400',
    glow: 'group-hover:shadow-red-500/20',
  },
  {
    icon: Key,
    title: 'API Key Detector',
    description: 'Find exposed credentials, API keys, and sensitive data in client-side code.',
    color: 'text-amber-400',
    glow: 'group-hover:shadow-amber-500/20',
  },
  {
    icon: Bot,
    title: 'AI Detection',
    description: 'Identify telltale signs that a website was built using AI coding assistants.',
    color: 'text-blue-400',
    glow: 'group-hover:shadow-blue-500/20',
  },
  {
    icon: Scale,
    title: 'Legal Compliance',
    description: 'Ensure websites don\'t make unsubstantiated claims and comply with regulations.',
    color: 'text-indigo-400',
    glow: 'group-hover:shadow-indigo-500/20',
  },
  {
    icon: Search,
    title: 'SEO Analyzer',
    description: 'Comprehensive SEO audit with Core Web Vitals, meta tags, and schema validation.',
    color: 'text-sky-400',
    glow: 'group-hover:shadow-sky-500/20',
  },
  {
    icon: Users,
    title: 'Competitor Intel',
    description: 'Understand what competitors are doing and what\'s working for them.',
    color: 'text-cyan-400',
    glow: 'group-hover:shadow-cyan-500/20',
  },
];

const pricingTiers = [
  {
    name: 'Starter',
    price: '$19',
    period: '/mo',
    description: 'For solo makers',
    features: ['1 domain', '5 scans/month', 'All 6 scanners', 'PDF export'],
    cta: 'Get Started',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$39',
    period: '/mo',
    description: 'For growing projects',
    features: ['3 domains', '20 scans/month', 'All 6 scanners', 'Priority support'],
    cta: 'Get Started',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: '$89',
    period: '/mo',
    description: 'For teams & agencies',
    features: ['10 domains', '75 scans/month', 'All 6 scanners', 'Dedicated support'],
    cta: 'Get Started',
    highlighted: false,
  },
  {
    name: 'Max',
    price: 'Custom',
    period: '',
    description: 'For large organizations',
    features: ['Unlimited domains', 'Custom scan volume', 'SLA guarantee', 'Account manager'],
    cta: 'Contact Us',
    highlighted: false,
    isContact: true,
  },
];

const stats = [
  { value: '50+', label: 'Security Checks' },
  { value: '100+', label: 'API Key Patterns' },
  { value: '20+', label: 'SEO Metrics' },
  { value: '<30s', label: 'Average Scan Time' },
];

export default function HomePage() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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

  return (
    <div className="min-h-screen bg-background overflow-hidden" onMouseMove={handleMouseMove}>
      {/* Navigation */}
      {/* Navigation - Cluely Style Pill */}
      <nav aria-label="Main navigation" className="fixed top-4 w-full z-50 flex justify-center pointer-events-none">
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="bg-[#1C1C1E]/80 backdrop-blur-md border border-white/10 rounded-full px-4 py-2 flex items-center gap-6 shadow-2xl pointer-events-auto transition-all duration-300 hover:border-white/20 hover:scale-[1.01]"
        >
          <div className="flex items-center gap-2 pr-4 border-r border-white/10">
            <Image src="/logo.png" alt="CheckVibe Logo" width={24} height={24} className="w-6 h-6 object-contain" />
            <span className="font-bold text-white tracking-tight">CheckVibe</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <Link href="/login" className="hover:text-white transition-colors">Login</Link>
          </div>
          <Button asChild size="sm" className="hidden md:inline-flex bg-white text-black hover:bg-zinc-200 rounded-full px-5 font-medium transition-all shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)]">
            <Link href="/signup">Get Started</Link>
          </Button>
          <button
            onClick={() => setMobileNavOpen(true)}
            className="md:hidden p-1.5 rounded-lg text-zinc-400 hover:text-white transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
        </motion.div>
      </nav>

      {/* Mobile Nav Drawer */}
      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="right" className="w-64 bg-[#1C1C1E] border-white/10 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="flex flex-col gap-1 p-6 pt-12">
            <a href="#features" onClick={() => setMobileNavOpen(false)} className="py-3 text-sm font-medium text-zinc-400 hover:text-white transition-colors border-b border-white/5">Features</a>
            <a href="#pricing" onClick={() => setMobileNavOpen(false)} className="py-3 text-sm font-medium text-zinc-400 hover:text-white transition-colors border-b border-white/5">Pricing</a>
            <Link href="/login" onClick={() => setMobileNavOpen(false)} className="py-3 text-sm font-medium text-zinc-400 hover:text-white transition-colors border-b border-white/5">Login</Link>
            <div className="mt-4">
              <Button asChild className="w-full bg-white text-black hover:bg-zinc-200 rounded-full font-medium">
                <Link href="/signup">Get Started</Link>
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <main>
      {/* Hero Section - Cluely 1:1 Replica */}
      <section className="relative pt-40 pb-20 px-4 sm:px-6 lg:px-8 min-h-screen flex flex-col items-center justify-center overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-[#0E0E10]">
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

        <div className="max-w-5xl mx-auto text-center relative z-10 flex flex-col items-center gap-8">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm shadow-inner shadow-white/5"
          >
            <span className="flex h-2 w-2 rounded-full bg-[#3B82F6] animate-pulse"></span>
            <span className="text-xs font-medium text-blue-200 tracking-wide uppercase">Private Beta</span>
          </motion.div>

          {/* H1 Typography - EB Garamond + Reveal Animation */}
          <h1 className="font-heading text-[36px] leading-[1.05] sm:text-[56px] md:text-[80px] tracking-[-0.02em] text-white flex flex-col items-center gap-2">
            <span className="block overflow-hidden">
              <motion.span
                initial={{ y: 100 }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                className="block"
              >
                The <span className="italic text-white/50 font-serif">#1</span> Scanner
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
              className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto"
            >
              CheckVibe listens to your codebase. It catches what AI misses: security holes,
              <br className="hidden md:block" />
              leaked keys, and bad vibes.
            </motion.p>
          </div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-4"
          >
            <Button size="lg" asChild className="h-12 px-8 rounded-xl bg-gradient-to-b from-white to-zinc-200 text-black shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] hover:scale-[1.02] transition-transform text-base font-semibold border-0">
              <Link href="/signup">
                Start Scanning
              </Link>
            </Button>
            <div className="flex items-center gap-4 text-sm text-zinc-500">
              <div className="h-px w-10 bg-white/10"></div>
              <span>Plans from $19/month</span>
              <div className="h-px w-10 bg-white/10"></div>
            </div>
          </motion.div>

          {/* Stats Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-12 w-full max-w-4xl px-4"
          >
            {stats.map((stat, i) => (
              <div key={i} className="flex flex-col items-center justify-center text-center">
                <div className="text-3xl md:text-4xl font-bold text-white mb-1 flex items-baseline">
                  {stat.value.includes('<') && <span className="mr-1 text-2xl text-zinc-400">&lt;</span>}
                  <CountUp
                    to={parseInt(stat.value.replace(/\D/g, ''))}
                    className="bg-clip-text text-transparent bg-gradient-to-b from-white to-white/50"
                  />
                  {stat.value.includes('+') && <span className="ml-1 text-2xl text-zinc-400">+</span>}
                  {stat.value.includes('s') && <span className="ml-1 text-2xl text-zinc-400">s</span>}
                </div>
                <div className="text-sm text-zinc-500 font-medium uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </motion.div>

          {/* Hero Visual - Code Scanner Animation */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, rotateX: 20 }}
            animate={{ opacity: 1, scale: 1, rotateX: 0 }}
            transition={{ delay: 0.7, duration: 1, ease: "easeOut" }}
            className="relative mt-16 w-full max-w-4xl perspective-midrange group"
          >
            {/* Main Terminal Window */}
            <div className="relative bg-[#1C1C1E] border border-white/10 rounded-xl overflow-hidden shadow-2xl h-[280px] sm:h-[350px] md:h-[450px] w-full flex flex-col transform transition-transform duration-700">

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
              <div className="relative p-6 font-mono text-sm overflow-hidden flex-1 bg-[#0E0E10]">

                {/* Grid Background */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px]"></div>

                {/* Code Lines */}
                <div className="space-y-1 relative z-10 opacity-80">
                  <div className="flex gap-4"><span className="text-zinc-600">01</span> <span className="text-blue-400">export</span> <span className="text-cyan-400">default</span> <span className="text-blue-400">function</span> <span className="text-yellow-200">PaymentHandler</span>() {'{'}</div>
                  <div className="flex gap-4"><span className="text-zinc-600">02</span>   <span className="text-zinc-400">// TODO: Refactor this later</span></div>
                  <div className="flex gap-4"><span className="text-zinc-600">03</span>   <span className="text-blue-400">const</span> <span className="text-cyan-200">stripeKey</span> = <span className="text-green-300">"sk_live_51Mz..."</span>; <span className="text-zinc-500">{'// <= Exposed Key'}</span></div>
                  <div className="flex gap-4"><span className="text-zinc-600">04</span>   <span className="text-blue-400">const</span> <span className="text-cyan-200">headers</span> = {'{'}</div>
                  <div className="flex gap-4"><span className="text-zinc-600">05</span>     <span className="text-green-300">"Authorization"</span>: <span className="text-green-300">`Bearer ${'{'}stripeKey{'}'}`</span></div>
                  <div className="flex gap-4"><span className="text-zinc-600">06</span>   {'}'};</div>
                  <div className="flex gap-4"><span className="text-zinc-600">07</span> </div>
                  <div className="flex gap-4"><span className="text-zinc-600">08</span>   <span className="text-blue-400">await</span> <span className="text-cyan-400">fetch</span>(<span className="text-green-300">"/api/charge"</span>, {'{'}</div>
                  <div className="flex gap-4"><span className="text-zinc-600">09</span>     <span className="text-cyan-200">method</span>: <span className="text-green-300">"POST"</span>,</div>
                  <div className="flex gap-4"><span className="text-zinc-600">10</span>     <span className="text-cyan-200">headers</span></div>
                  <div className="flex gap-4"><span className="text-zinc-600">11</span>   {'}'});</div>
                  <div className="flex gap-4"><span className="text-zinc-600">12</span> {'}'}</div>
                  <div className="flex gap-4"><span className="text-zinc-600">13</span> </div>
                  <div className="flex gap-4"><span className="text-zinc-600">14</span> <span className="text-zinc-400">{'// SEO: Missing meta tags'}</span></div>
                  <div className="flex gap-4"><span className="text-zinc-600">15</span> <span className="text-blue-400">export</span> <span className="text-blue-400">const</span> <span className="text-cyan-200">metadata</span> = {'{'} {'}'};</div>
                </div>

                {/* Scanning Beam */}
                <motion.div
                  animate={{ top: ["0%", "100%", "0%"] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  className="absolute left-0 right-0 h-[2px] bg-blue-500/50 shadow-[0_0_20px_2px_rgba(59,130,246,0.5)] z-20"
                >
                  <div className="absolute right-0 -top-2 bg-blue-500 text-[10px] text-white px-1 rounded-sm font-mono">SCANNING</div>
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
                  className="absolute top-[80px] right-10 bg-red-500/10 border border-red-500/50 text-red-400 px-3 py-2 rounded-lg backdrop-blur-md flex items-center gap-3 shadow-xl z-30"
                >
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <div>
                    <div className="text-xs font-bold">Critical Issue</div>
                    <div className="text-[10px] opacity-80">Exposed Stripe Key</div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: [0, 1, 1, 0, 0] }}
                  transition={{ duration: 4, repeat: Infinity, times: [0.6, 0.7, 0.9, 0.95, 1] }}
                  className="absolute top-[320px] right-10 bg-yellow-500/10 border border-yellow-500/50 text-yellow-400 px-3 py-2 rounded-lg backdrop-blur-md flex items-center gap-3 shadow-xl z-30"
                >
                  <Search className="w-5 h-5 text-yellow-500" />
                  <div>
                    <div className="text-xs font-bold">SEO Warning</div>
                    <div className="text-[10px] opacity-80">Missing Metadata</div>
                  </div>
                </motion.div>

              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-24 px-4 sm:px-6 lg:px-8 bg-[#0E0E10]">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0E0E10] via-blue-950/5 to-[#0E0E10]" />

        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02] mix-blend-overlay"></div>

        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <Badge variant="secondary" className="mb-4 bg-[#749CFF]/10 border-[#749CFF]/20 text-[#749CFF]">
              Features
            </Badge>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-medium mb-4 tracking-tight text-white">
              Everything You Need to{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#749CFF] via-[#A5B4FC] to-[#749CFF] animate-gradient-flow">Ship Safely</span>
            </h2>
            <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
              Six powerful scanners that catch the issues AI coding tools commonly miss.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <div className="group relative h-full bg-zinc-900/40 border border-white/5 rounded-xl hover:border-white/10 transition-colors overflow-hidden">
                  <div className={`absolute inset-0 bg-gradient-to-br ${feature.color.replace('text-', 'from-')}/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

                  <div className="relative p-6 flex flex-col h-full">
                    <div className="flex items-center gap-4 mb-4">
                      <div className={`p-2 rounded-lg bg-white/5 ${feature.color} ring-1 ring-white/10 group-hover:ring-white/20 transition-all`}>
                        <feature.icon className="h-5 w-5" />
                      </div>
                      <h3 className="text-lg font-medium text-white tracking-tight">{feature.title}</h3>
                    </div>
                    <p className="text-sm text-zinc-400 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="relative py-24 px-4 sm:px-6 lg:px-8 bg-[#0E0E10]">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02] mix-blend-overlay"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <Badge variant="secondary" className="mb-4 bg-blue-500/10 border-blue-500/20 text-blue-300">
              Pricing
            </Badge>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-medium mb-4 tracking-tight text-white">
              Simple, <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#749CFF] via-[#A5B4FC] to-[#749CFF] animate-gradient-flow">Transparent</span> Pricing
            </h2>
            <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
              Monthly plans for every team size. Cancel anytime.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
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
                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-white tracking-tight">{tier.price}</span>
                      {tier.period && <span className="text-zinc-500 text-sm font-normal">{tier.period}</span>}
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

                    {'isContact' in tier && tier.isContact ? (
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
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 px-4 sm:px-6 lg:px-8 bg-[#0E0E10] border-t border-white/5">
        {/* Gradient orbs */}
        <div className="orb orb-blue w-64 h-64 top-0 left-1/4" />
        <div className="orb orb-blue w-48 h-48 bottom-0 right-1/4" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="glass-card shadow-cluely-card rounded-2xl p-6 sm:p-12 bg-white/[0.02] border-white/10"
          >
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-medium mb-4 tracking-tight text-white">
              Ready to <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#749CFF] via-[#A5B4FC] to-[#749CFF] animate-gradient-flow">Ship with Confidence</span>?
            </h2>
            <p className="text-xl text-zinc-400 mb-8">
              Plans start at $19/month. Cancel anytime.
            </p>
            <Button size="lg" asChild className="text-lg px-10 py-6 shimmer-button bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 border-0 glow-on-hover text-white">
              <Link href="/signup">
                Start Scanning
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>
      </main>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <Image src="/logo.png" alt="CheckVibe Logo" width={24} height={24} className="w-6 h-6 object-contain" />
              <span className="font-bold text-white">CheckVibe</span>
            </div>
            <p className="text-muted-foreground text-sm">
              © {new Date().getFullYear()} CheckVibe. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
