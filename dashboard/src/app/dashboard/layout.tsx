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
} from 'lucide-react';
import { useEffect, useState } from 'react';

const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Scans', href: '/dashboard/scans', icon: Scan },
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
            <div className="flex h-16 items-center px-6 border-b border-white/5">
                <Link href="/" className="flex items-center space-x-2 group">
                    <div className="relative">
                        <Image src="/logo-nobg.png" alt="CheckVibe" width={28} height={28} className="h-7 w-7 object-contain transition-transform group-hover:scale-110 drop-shadow-[0_0_6px_rgba(59,130,246,0.6)]" />
                    </div>
                    <span className="font-heading text-xl font-bold tracking-tight">CheckVibe</span>
                </Link>
            </div>

            {/* New Scan Button */}
            <div className="p-4">
                <Button asChild className="w-full bg-white text-black hover:bg-zinc-200 border-0 font-medium transition-all shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)]">
                    <Link href="/dashboard/scans/new" onClick={onNavClick}>
                        <Plus className="mr-2 h-4 w-4" />
                        New Scan
                    </Link>
                </Button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 space-y-1">
                {navigation.map((item) => {
                    const isActive = pathname === item.href ||
                        (item.href !== '/dashboard' && pathname.startsWith(item.href));

                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            onClick={onNavClick}
                            className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${isActive
                                ? 'text-white font-medium'
                                : 'text-zinc-500 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            {isActive && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                            )}
                            <item.icon className={`h-4 w-4 transition-transform group-hover:scale-110 ${isActive ? 'text-blue-400' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            <Separator className="bg-white/5" />

            {/* User Menu */}
            <div className="p-4">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="w-full justify-start gap-3 px-3 hover:bg-white/5">
                            <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-xs">
                                    {initials}
                                </AvatarFallback>
                            </Avatar>
                            <span className="flex-1 text-left text-sm truncate">
                                {userEmail || 'Loading...'}
                            </span>
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56 glass-card border-white/10">
                        <DropdownMenuItem asChild className="hover:bg-white/5 focus:bg-white/5">
                            <Link href="/dashboard/settings">
                                <Settings className="mr-2 h-4 w-4" />
                                Settings
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-white/10" />
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
        <div className="min-h-screen bg-background">
            {/* Mobile Header */}
            <header className="fixed top-0 left-0 right-0 z-40 h-14 bg-[#0E0E10] border-b border-white/5 flex items-center justify-between px-4 md:hidden">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setMobileOpen(true)}
                        className="p-2.5 -ml-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                    >
                        <Menu className="h-5 w-5" />
                    </button>
                    <Link href="/" className="flex items-center space-x-2">
                        <Image src="/logo-nobg.png" alt="CheckVibe" width={24} height={24} className="h-6 w-6 object-contain drop-shadow-[0_0_6px_rgba(59,130,246,0.6)]" />
                        <span className="font-heading text-lg font-bold tracking-tight">CheckVibe</span>
                    </Link>
                </div>
                <Button asChild size="sm" className="bg-white text-black hover:bg-zinc-200 border-0 font-medium h-8 px-3 text-xs">
                    <Link href="/dashboard/scans/new">
                        <Plus className="mr-1 h-3.5 w-3.5" />
                        New Scan
                    </Link>
                </Button>
            </header>

            {/* Mobile Drawer */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetContent side="left" className="w-64 p-0 bg-[#0E0E10] border-white/5" showCloseButton={false}>
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
            <aside className="hidden md:block fixed inset-y-0 left-0 z-50 w-64 bg-[#0E0E10] border-r border-white/5">
                <SidebarContent
                    pathname={pathname}
                    userEmail={userEmail}
                    initials={initials}
                    handleLogout={handleLogout}
                />
            </aside>

            {/* Main Content */}
            <main className="md:pl-64 pt-14 md:pt-0">
                <div className="min-h-screen animate-fade-in-up">
                    {children}
                </div>
            </main>
        </div>
    );
}
