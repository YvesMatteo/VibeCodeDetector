'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import * as motion from 'framer-motion/client';
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet';
import { createClient } from '@/lib/supabase/client';

export function NavBar() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Detect touch device
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    setIsTouch('ontouchstart' in window || window.matchMedia('(pointer: coarse)').matches);
  }, []);

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user) setIsLoggedIn(true);
    });
  }, []);

  return (
    <>
      <nav aria-label="Main navigation" className="fixed top-4 w-full z-50 flex justify-center pointer-events-none px-4">
        <motion.div
          initial={{ y: isTouch ? -20 : -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: isTouch ? 0.4 : 0.8, ease: 'easeOut' }}
          className="bg-[#1C1C1E]/80 backdrop-blur-md border border-white/10 rounded-full px-6 py-3 flex items-center gap-4 sm:gap-8 shadow-2xl pointer-events-auto transition-all duration-300 [@media(hover:hover)]:hover:border-white/20 [@media(hover:hover)]:hover:scale-[1.01]"
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
    </>
  );
}
