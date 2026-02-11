'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Sheet,
    SheetContent,
    SheetTitle,
} from '@/components/ui/sheet';
import {
    LayoutDashboard,
    Scan,
    CreditCard,
    Settings,
    LogOut,
    Plus,
    ChevronDown,
    Menu,
    Key,
} from 'lucide-react';
import { useEffect, useState } from 'react';

const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Scans', href: '/dashboard/scans', icon: Scan },
    { name: 'API Keys', href: '/dashboard/api-keys', icon: Key },
    { name: 'Credits', href: '/dashboard/credits', icon: CreditCard },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

function SidebarContent({
    pathname,
    userEmail,
    initials,
    handleLogout,
    onNavClick,
}: {
    pathname: string;
    userEmail: string | null;
    initials: string;
    handleLogout: () => void;
    onNavClick?: () => void;
}) {
    return (
        <div className="flex h-full flex-col">
            {/* Logo */}
            <div className="flex h-14 items-center px-5 border-b border-white/[0.06]">
                <Link href="/" className="flex items-center gap-2.5">
                    <Image src="/logo-nobg.png" alt="CheckVibe" width={24} height={24} className="h-6 w-6 object-contain" />
                    <span className="text-[15px] font-semibold tracking-tight text-white">CheckVibe</span>
                </Link>
            </div>

            {/* New Scan Button */}
            <div className="px-3 pt-4 pb-2">
                <Button asChild className="w-full h-9 bg-white text-zinc-900 hover:bg-zinc-200 border-0 font-medium text-sm transition-colors">
                    <Link href="/dashboard/scans/new" onClick={onNavClick}>
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        New Scan
                    </Link>
                </Button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 pt-1 space-y-0.5">
                {navigation.map((item) => {
                    const isActive = pathname === item.href ||
                        (item.href !== '/dashboard' && pathname.startsWith(item.href));

                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            onClick={onNavClick}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] transition-colors ${isActive
                                ? 'text-white bg-white/[0.08] font-medium'
                                : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04]'
                                }`}
                        >
                            <item.icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-zinc-600'}`} />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            <Separator className="bg-white/[0.06]" />

            {/* User Menu */}
            <div className="p-3">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="w-full justify-start gap-2.5 px-2.5 h-9 hover:bg-white/[0.04]">
                            <Avatar className="h-6 w-6">
                                <AvatarFallback className="bg-zinc-800 text-zinc-400 text-[10px] font-medium">
                                    {initials}
                                </AvatarFallback>
                            </Avatar>
                            <span className="flex-1 text-left text-[13px] text-zinc-400 truncate">
                                {userEmail || 'Loading...'}
                            </span>
                            <ChevronDown className="h-3.5 w-3.5 text-zinc-600" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56 bg-zinc-900 border-white/10">
                        <DropdownMenuItem asChild className="text-zinc-400 hover:text-white hover:bg-white/[0.06] focus:bg-white/[0.06]">
                            <Link href="/dashboard/settings">
                                <Settings className="mr-2 h-4 w-4" />
                                Settings
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-white/[0.06]" />
                        <DropdownMenuItem onClick={handleLogout} className="text-red-400 hover:bg-red-500/10 focus:bg-red-500/10">
                            <LogOut className="mr-2 h-4 w-4" />
                            Log out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
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
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) setUserEmail(user.email || null);
        });
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
        <div className="min-h-screen bg-[#09090B]">
            {/* Mobile Header */}
            <header className="fixed top-0 left-0 right-0 z-40 h-12 bg-[#09090B] border-b border-white/[0.06] flex items-center justify-between px-4 md:hidden" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setMobileOpen(true)}
                        className="p-2 -ml-1.5 rounded-md text-zinc-500 hover:text-white hover:bg-white/[0.06] transition-colors"
                    >
                        <Menu className="h-5 w-5" />
                    </button>
                    <Link href="/" className="flex items-center gap-2">
                        <Image src="/logo-nobg.png" alt="CheckVibe" width={20} height={20} className="h-5 w-5 object-contain" />
                        <span className="text-sm font-semibold tracking-tight text-white">CheckVibe</span>
                    </Link>
                </div>
                <Button asChild size="sm" className="bg-white text-zinc-900 hover:bg-zinc-200 border-0 font-medium h-7 px-2.5 text-xs">
                    <Link href="/dashboard/scans/new">
                        <Plus className="mr-1 h-3 w-3" />
                        Scan
                    </Link>
                </Button>
            </header>

            {/* Mobile Drawer */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetContent side="left" className="w-60 p-0 bg-[#09090B] border-white/[0.06]" showCloseButton={false}>
                    <SheetTitle className="sr-only">Navigation</SheetTitle>
                    <SidebarContent
                        pathname={pathname}
                        userEmail={userEmail}
                        initials={initials}
                        handleLogout={handleLogout}
                        onNavClick={() => setMobileOpen(false)}
                    />
                </SheetContent>
            </Sheet>

            {/* Desktop Sidebar */}
            <aside className="hidden md:block fixed inset-y-0 left-0 z-50 w-56 bg-[#09090B] border-r border-white/[0.06]">
                <SidebarContent
                    pathname={pathname}
                    userEmail={userEmail}
                    initials={initials}
                    handleLogout={handleLogout}
                />
            </aside>

            {/* Main Content */}
            <main className="md:pl-56 pt-12 md:pt-0 relative min-h-screen pb-[env(safe-area-inset-bottom)]">
                {children}
            </main>
        </div>
    );
}
