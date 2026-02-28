'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export function CtaSection() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user) setIsLoggedIn(true);
    });
  }, []);

  return (
    <div className="max-w-4xl mx-auto text-center relative z-10">
      <div className="glass-card shadow-cluely-card rounded-2xl p-6 sm:p-12 bg-white/[0.02] border-white/10">
        <h2 className="text-2xl sm:text-4xl lg:text-5xl font-heading font-medium mb-4 tracking-tight text-white">
          Don&apos;t <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-sky-200 to-sky-400 animate-gradient-flow">Ship Vulnerabilities</span>
        </h2>
        <p className="text-base sm:text-xl text-zinc-400 mb-8">
          35 security checks. Always monitoring. Know exactly what to fix before you deploy.
        </p>
        <Button size="lg" asChild className="text-base sm:text-lg px-6 sm:px-10 py-5 sm:py-6 shimmer-button bg-gradient-to-r from-sky-500 to-cyan-600 hover:from-sky-400 hover:to-cyan-500 border-0 glow-on-hover text-white">
          <Link href={isLoggedIn ? '/dashboard' : '/signup'}>
            {isLoggedIn ? 'Dashboard' : 'Start Monitoring'}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
