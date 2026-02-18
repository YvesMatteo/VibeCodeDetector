'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
    Sheet,
    SheetContent,
    SheetTitle,
} from '@/components/ui/sheet';
import {
    FolderKanban,
    CreditCard,
    Settings,
    LogOut,
    Plus,
    Menu,
    Key,
    BookOpen,
    ExternalLink,
    Mail,
    ScrollText,
} from 'lucide-react';
import { useEffect, useState } from 'react';

const mainNav = [
    { name: 'Projects', href: '/dashboard', icon: FolderKanban },
    { name: 'API Keys', href: '/dashboard/api-keys', icon: Key },
    { name: 'Plans', href: '/dashboard/credits', icon: CreditCard },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

const resourceLinks = [
    { name: 'Docs', href: '/dashboard/docs', icon: BookOpen, external: false },
    { name: 'Changelog', href: '/dashboard/changelog', icon: ScrollText, external: false },
];

const connectLinks = [
    { name: 'Support', href: 'mailto:support@checkvibe.dev', icon: Mail, external: true },
];

function SidebarContent({
    pathname,
    userEmail,
    userPlan,
    initials,
    handleLogout,
    onNavClick,
}: {
    pathname: string;
    userEmail: string | null;
    userPlan: string;
    initials: string;
    handleLogout: () => void;
    onNavClick?: () => void;
}) {
    return (
        <div className="flex h-full flex-col">
            {/* Logo */}
            <div className="px-4 pt-5 pb-3">
                <Link href="/" className="flex items-center gap-2.5 group">
                    <Image src="/logo-composite.png" alt="CheckVibe" width={140} height={28} className="w-auto h-7 object-contain" />
                </Link>
            </div>

            {/* User Profile */}
            <div className="px-4 pt-3 pb-4">
                <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 ring-1 ring-white/[0.08]">
                        <AvatarFallback className="bg-white/[0.06] text-zinc-300 text-xs font-medium">
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-white truncate">
                            {userEmail?.split('@')[0] || 'User'}
                        </p>
                        <p className="text-[11px] text-zinc-500 capitalize">
                            {userPlan === 'none' ? 'Free Plan' : `${userPlan} Plan`}
                        </p>
                    </div>
                </div>
            </div>

            <div className="h-px bg-white/[0.06] mx-4" />

            {/* New Project Button */}
            <div className="px-3 pt-3 pb-1">
                <Button asChild className="w-full h-9 bg-sky-400 text-white hover:bg-sky-500 border-0 text-[13px] font-medium transition-colors rounded-lg">
                    <Link href="/dashboard/projects/new" onClick={onNavClick}>
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        New Project
                    </Link>
                </Button>
            </div>

            {/* Main Navigation */}
            <nav className="flex-1 px-3 pt-3 space-y-6 overflow-y-auto">
                <div>
                    {mainNav.map((item) => {
                        const isActive = pathname === item.href ||
                            (item.href !== '/dashboard' && pathname.startsWith(item.href)) ||
                            (item.href === '/dashboard' && pathname.startsWith('/dashboard/projects'));

                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                onClick={onNavClick}
                                className={`group relative flex items-center justify-between px-3 py-2 min-h-[44px] rounded-lg text-[13px] transition-all duration-150 ${isActive
                                    ? 'text-white bg-sky-400/[0.08] border border-sky-400/[0.1]'
                                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03] border border-transparent'
                                    }`}
                            >
                                <div className="flex items-center gap-2.5">
                                    <item.icon className={`h-[15px] w-[15px] ${isActive ? 'text-sky-400' : 'text-zinc-600 group-hover:text-zinc-400'}`} />
                                    {item.name}
                                </div>
                            </Link>
                        );
                    })}
                </div>

                {/* Resources Section */}
                <div>
                    <p className="px-3 mb-1.5 text-[10px] font-medium tracking-wider text-zinc-600 uppercase">
                        Resources
                    </p>
                    {resourceLinks.map((item) => {
                        const isActive = pathname.startsWith(item.href);
                        if (item.external) {
                            return (
                                <a
                                    key={item.name}
                                    href={item.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={onNavClick}
                                    className="group flex items-center justify-between px-3 py-2 min-h-[44px] rounded-lg text-[13px] text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03] transition-all duration-150"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <item.icon className="h-[15px] w-[15px] text-zinc-600 group-hover:text-zinc-400" />
                                        {item.name}
                                    </div>
                                    <ExternalLink className="h-3 w-3 text-zinc-700 group-hover:text-zinc-500" />
                                </a>
                            );
                        }
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                onClick={onNavClick}
                                className={`group flex items-center justify-between px-3 py-2 min-h-[44px] rounded-lg text-[13px] transition-all duration-150 ${isActive
                                        ? 'text-white bg-sky-400/[0.08]'
                                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]'
                                    }`}
                            >
                                <div className="flex items-center gap-2.5">
                                    <item.icon className={`h-[15px] w-[15px] ${isActive ? 'text-sky-400' : 'text-zinc-600 group-hover:text-zinc-400'}`} />
                                    {item.name}
                                </div>
                            </Link>
                        );
                    })}
                </div>

                {/* Connect Section */}
                <div>
                    <p className="px-3 mb-1.5 text-[10px] font-medium tracking-wider text-zinc-600 uppercase">
                        Connect
                    </p>
                    {connectLinks.map((item) => (
                        <a
                            key={item.name}
                            href={item.href}
                            target={item.href.startsWith('mailto') ? undefined : '_blank'}
                            rel="noopener noreferrer"
                            onClick={onNavClick}
                            className="group flex items-center justify-between px-3 py-2 min-h-[44px] rounded-lg text-[13px] text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03] transition-all duration-150"
                        >
                            <div className="flex items-center gap-2.5">
                                <item.icon className="h-[15px] w-[15px] text-zinc-600 group-hover:text-zinc-400" />
                                {item.name}
                            </div>
                            <ExternalLink className="h-3 w-3 text-zinc-700 group-hover:text-zinc-500" />
                        </a>
                    ))}
                </div>
            </nav>

            <div className="h-px bg-white/[0.06] mx-4" />

            {/* Bottom: Logout */}
            <div className="px-3 py-3">
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center px-3 py-2 min-h-[44px] rounded-lg text-[13px] text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03] transition-all duration-150"
                >
                    <div className="flex items-center gap-2.5">
                        <LogOut className="h-[15px] w-[15px] text-zinc-600" />
                        Log out
                    </div>
                </button>
            </div>
        </div>
    );
}

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
        <div className="min-h-screen bg-background">
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
                <Button asChild size="sm" className="bg-sky-400 text-white hover:bg-sky-500 border-0 font-medium h-8 px-3 text-xs rounded-lg">
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
                    <SidebarContent
                        pathname={pathname}
                        userEmail={userEmail}
                        userPlan={userPlan}
                        initials={initials}
                        handleLogout={handleLogout}
                        onNavClick={() => setMobileOpen(false)}
                    />
                </SheetContent>
            </Sheet>

            {/* Desktop Sidebar */}
            <aside className="hidden md:block fixed inset-y-0 left-0 z-50 w-[220px] bg-background border-r border-white/[0.06]">
                <SidebarContent
                    pathname={pathname}
                    userEmail={userEmail}
                    userPlan={userPlan}
                    initials={initials}
                    handleLogout={handleLogout}
                />
            </aside>

            {/* Main Content */}
            <main className="md:pl-[220px] pt-12 md:pt-0 relative min-h-dvh safe-bottom">
                <div className="animate-fade-in-up">
                    {children}
                </div>
            </main>
        </div>
    );
}
