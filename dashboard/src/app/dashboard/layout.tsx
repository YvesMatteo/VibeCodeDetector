'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetTitle,
} from '@/components/ui/sheet';
import {
    Menu,
    Plus,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { SWRProvider } from '@/lib/swr-config';
import { Sidebar } from '@/components/dashboard/sidebar';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createClient();
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [userPlan, setUserPlan] = useState<string>('none');
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        async function loadUser() {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserEmail(user.email || null);
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('plan')
                    .eq('id', user.id)
                    .single();
                if (profile) setUserPlan(profile.plan || 'none');
            }
        }
        loadUser();
    }, []);

    const initials = userEmail
        ? userEmail.substring(0, 2).toUpperCase()
        : '??';

    async function handleLogout() {
        await supabase.auth.signOut();
        router.push('/');
        router.refresh();
    }

    return (
        <div className="min-h-screen bg-background md:flex">
            {/* Mobile Header */}
            <header className="fixed top-0 left-0 right-0 z-40 h-12 safe-top bg-background/80 backdrop-blur-xl border-b border-white/[0.06] flex items-center justify-between px-4 md:hidden">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setMobileOpen(true)}
                        className="h-11 w-11 flex items-center justify-center -ml-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/[0.04] transition-colors"
                        aria-label="Open navigation"
                    >
                        <Menu className="h-5 w-5" />
                    </button>
                    <Link href="/" className="flex items-center">
                        <Image src="/logo-icon.png" alt="CheckVibe" width={24} height={24} className="h-6 w-6 object-contain" />
                    </Link>
                </div>
                <Button asChild size="sm" className="bg-sky-400 text-white hover:bg-sky-500 border-0 font-medium h-9 px-3.5 text-xs rounded-lg">
                    <Link href="/dashboard/projects/new">
                        <Plus className="mr-1 h-3.5 w-3.5" />
                        New
                    </Link>
                </Button>
            </header>

            {/* Mobile Drawer */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetContent side="left" className="w-64 p-0 bg-background border-white/[0.06] safe-bottom" showCloseButton={false}>
                    <SheetTitle className="sr-only">Navigation</SheetTitle>
                    <Sidebar
                        userEmail={userEmail}
                        userPlan={userPlan}
                        initials={initials}
                        handleLogout={handleLogout}
                        onNavClick={() => setMobileOpen(false)}
                        isMobile={true}
                    />
                </SheetContent>
            </Sheet>

            {/* Desktop Sidebar - Sticky Flex Item */}
            <aside className="hidden md:block sticky top-0 h-screen shrink-0 z-50 overflow-visible transition-[width] duration-300">
                <Sidebar
                    userEmail={userEmail}
                    userPlan={userPlan}
                    initials={initials}
                    handleLogout={handleLogout}
                />
            </aside>

            {/* Main Content - Flex remaining space */}
            <main className="flex-1 min-w-0 pt-12 md:pt-0 relative min-h-dvh safe-bottom transition-all duration-300">
                <SWRProvider>
                    <div className="animate-fade-in-up">
                        {children}
                    </div>
                </SWRProvider>
            </main>
        </div>
    );
}
