'use client';

import { useState, useEffect, useCallback, type MouseEvent } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import * as motion from 'framer-motion/client';
import { useMotionValue, useSpring } from 'framer-motion';
import { CountUp } from '@/components/ui/count-up';
import { createClient } from '@/lib/supabase/client';

const stats = [
  { value: '35', label: 'Security Checks' },
  { value: '100+', label: 'API Key Patterns' },
  { value: '150+', label: 'Rules Monitored' },
  { value: '<30s', label: 'Average Check Time' },
];

export function HeroSection() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user) setIsLoggedIn(true);
    });
  }, []);

  // Detect touch device -- disable tilt on mobile (no hover)
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    setIsTouch('ontouchstart' in window || window.matchMedia('(pointer: coarse)').matches);
  }, []);

  // Card tilt -- follows cursor position over the terminal card (desktop only)
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

  return (
    <section
      id="slide-hero"
      className="min-h-[100dvh] flex flex-col items-center justify-center relative z-10 px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24 pb-8 sm:pb-12"
    >
      <div className="max-w-5xl mx-auto text-center relative z-10 flex flex-col items-center gap-4 sm:gap-6 w-full flex-1 justify-center -mt-10 sm:-mt-16">
        {/* H1 Typography */}
        <h1 className="font-heading text-[26px] leading-[1.08] min-[400px]:text-[32px] sm:text-[48px] md:text-[64px] tracking-[-0.02em] text-white flex flex-col items-center gap-0 sm:gap-1 w-full">
          <span className="block overflow-hidden">
            <motion.span
              initial={{ y: isTouch ? 30 : 100 }}
              animate={{ y: 0 }}
              transition={{ duration: isTouch ? 0.4 : 0.8, ease: 'easeOut', delay: isTouch ? 0 : 0.1 }}
              className="block"
            >
              <span className="italic text-white/50">Always-on</span> security monitoring
            </motion.span>
          </span>
          <span className="block overflow-hidden">
            <motion.span
              initial={{ y: isTouch ? 30 : 100 }}
              animate={{ y: 0 }}
              transition={{ duration: isTouch ? 0.4 : 0.8, ease: 'easeOut', delay: isTouch ? 0.05 : 0.2 }}
              className="block"
            >
              for <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-sky-300 to-sky-400 animate-gradient-flow bg-[length:200%_auto]">vibecoded</span> apps
            </motion.span>
          </span>
        </h1>

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0, y: isTouch ? 10 : 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: isTouch ? 0.1 : 0.3, duration: isTouch ? 0.3 : 0.5 }}
          className="text-sm sm:text-lg text-zinc-400 max-w-2xl mx-auto px-2"
        >
          35 security checks. Always watching. Exposed API keys, SQL injection, XSS, and more.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: isTouch ? 10 : 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: isTouch ? 0.15 : 0.4, duration: isTouch ? 0.3 : 0.5 }}
          className="flex flex-col sm:flex-row gap-3 justify-center items-center"
        >
          <Button size="lg" asChild className="h-12 px-6 sm:px-8 rounded-xl bg-gradient-to-b from-white to-zinc-200 text-black shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] [@media(hover:hover)]:hover:scale-[1.02] transition-transform text-base font-semibold border-0">
            <Link href={isLoggedIn ? '/dashboard' : '/signup'}>
              {isLoggedIn ? 'Dashboard' : 'Start Monitoring'}
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
          initial={{ opacity: 0, y: isTouch ? 10 : 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: isTouch ? 0.2 : 0.5, duration: isTouch ? 0.3 : 0.5 }}
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

        {/* Terminal card -- compact */}
        <motion.div
          initial={{ opacity: 0, scale: isTouch ? 0.98 : 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: isTouch ? 0.25 : 0.6, duration: isTouch ? 0.4 : 0.8, ease: 'easeOut' }}
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
                transition={{ duration: isTouch ? 6 : 4, repeat: Infinity, ease: 'linear' }}
                style={{ willChange: 'top' }}
                className="absolute left-0 right-0 h-[2px] bg-sky-400/50 shadow-[0_0_20px_2px_rgba(59,130,246,0.5)] z-20 overflow-visible"
              >
                <div className="absolute right-2 sm:right-4 -top-3 bg-sky-400 text-[9px] sm:text-xs text-white px-1.5 sm:px-2 py-0.5 rounded font-mono font-medium tracking-wide shadow-lg shadow-sky-400/30 whitespace-nowrap">SCANNING</div>
              </motion.div>

              {/* Beam glow -- hidden on mobile for GPU savings */}
              {!isTouch && (
                <motion.div
                  animate={{ top: ['-10%', '90%', '-10%'] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                  className="absolute left-0 right-0 h-16 bg-gradient-to-b from-sky-400/10 to-transparent z-10 pointer-events-none"
                />
              )}

              <motion.div
                initial={{ opacity: 0, x: isTouch ? 10 : 20 }}
                animate={{ opacity: [0, 1, 1, 0, 0] }}
                transition={{ duration: isTouch ? 6 : 4, repeat: Infinity, times: [0.1, 0.2, 0.45, 0.5, 1] }}
                style={{ willChange: 'opacity, transform' }}
                className="absolute top-[16px] min-[400px]:top-[20px] sm:top-[50px] right-2 min-[400px]:right-3 sm:right-8 bg-red-500/10 border border-red-500/50 text-red-400 px-1.5 min-[400px]:px-2 sm:px-3 py-0.5 min-[400px]:py-1 sm:py-1.5 rounded-lg backdrop-blur-md flex items-center gap-1 min-[400px]:gap-1.5 sm:gap-2 shadow-xl z-30 max-w-[120px] min-[400px]:max-w-[180px] sm:max-w-none"
              >
                <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4 text-red-500 shrink-0" />
                <div className="min-w-0 overflow-hidden">
                  <div className="text-[8px] min-[400px]:text-[9px] sm:text-xs font-bold truncate">Exposed Stripe Key</div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: isTouch ? 10 : 20 }}
                animate={{ opacity: [0, 1, 1, 0, 0] }}
                transition={{ duration: isTouch ? 6 : 4, repeat: Infinity, times: [0.6, 0.7, 0.9, 0.95, 1] }}
                style={{ willChange: 'opacity, transform' }}
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
  );
}
