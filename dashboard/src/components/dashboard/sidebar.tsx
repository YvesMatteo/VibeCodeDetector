'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
    FolderKanban,
    CreditCard,
    Settings,
    LogOut,
    Key,
    BookOpen,
    ExternalLink,
    Mail,
    ScrollText,
    Menu,
    Send,
    Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { OWNER_EMAIL_CLIENT } from '@/lib/constants';
import { Button } from '@/components/ui/button'; // Assuming Button is available

export const mainNav = [
    { name: 'Projects', href: '/dashboard', icon: FolderKanban },
    { name: 'API Keys/MCP Server', href: '/dashboard/api-keys', icon: Key },
    { name: 'Plans', href: '/dashboard/credits', icon: CreditCard },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export const resourceLinks = [
    { name: 'Docs', href: '/dashboard/docs', icon: BookOpen, external: false },
    { name: 'Changelog', href: '/dashboard/changelog', icon: ScrollText, external: false },
];

export const connectLinks = [
    { name: 'Support', href: '/dashboard/support', icon: Mail, external: false },
];

const OWNER_EMAIL = OWNER_EMAIL_CLIENT;

export const adminLinks = [
    { name: 'Users', href: '/dashboard/admin/users', icon: Users },
    { name: 'Bulk Outreach', href: '/dashboard/bulk-outreach', icon: Send },
];

interface SidebarProps {
    userEmail: string | null;
    userPlan: string;
    initials: string;
    handleLogout: () => void;
    className?: string;
    isMobile?: boolean; // If true, render as static full width (for sheet)
    onNavClick?: () => void;
}

export function Sidebar({
    userEmail,
    userPlan,
    initials,
    handleLogout,
    className,
    isMobile = false,
    onNavClick,
}: SidebarProps) {
    const pathname = usePathname();

    const NavItem = ({ item, isExternal = false }: { item: any, isExternal?: boolean }) => {
        const isActive = !isExternal && (
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href)) ||
            (item.href === '/dashboard' && pathname.startsWith('/dashboard/projects'))
        );

        const Icon = item.icon;

        const content = (
            <div className={cn(
                "relative flex items-center px-2.5 py-2 min-h-[44px] rounded-md transition-colors duration-100 group/item overflow-hidden",
                isActive
                    ? "text-zinc-200 bg-white/[0.06] border border-white/[0.08]"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03] border border-transparent"
            )}>
                {/* Fixed size icon container perfectly aligned */}
                <div className="flex items-center justify-center min-w-[24px] w-[24px] shrink-0">
                    <Icon className={cn(
                        "h-[14px] w-[14px] transition-colors stroke-[2px]",
                        isActive ? "text-zinc-300" : "text-zinc-500 group-hover/item:text-zinc-400"
                    )} />
                </div>

                <span className={cn(
                    "ml-2.5 whitespace-nowrap font-normal text-[12px] opacity-0 transition-opacity duration-100",
                    !isMobile && "group-hover:opacity-100",
                    isMobile && "opacity-100"
                )}>
                    {item.name}
                </span>

                {isExternal && (
                    <ExternalLink className={cn(
                        "h-3 w-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity",
                        !isMobile && "hidden group-hover:block"
                    )} />
                )}
            </div>
        );

        if (isExternal) {
            return (
                <a
                    href={item.href}
                    target={item.href.startsWith('mailto') ? undefined : '_blank'}
                    rel="noopener noreferrer"
                    onClick={onNavClick}
                    className="block"
                >
                    {content}
                </a>
            );
        }

        return (
            <Link href={item.href} onClick={onNavClick} className="block">
                {content}
            </Link>
        );
    };

    return (
        <div
            className={cn(
                "flex flex-col h-full bg-background border-r border-white/[0.06] transition-[width] duration-100 ease-out overflow-hidden z-50",
                !isMobile && "w-[60px] hover:w-[220px] group", // Desktop expand logic
                isMobile && "w-full",
                className
            )}
        >
            {/* Logo Section */}
            <div className="h-16 flex items-center shrink-0 px-2">
                <a href="https://checkvibe.dev" className="flex items-center px-2.5 w-full overflow-hidden hover:opacity-80 transition-opacity">
                    <div className="w-[24px] flex justify-center shrink-0">
                        <Image src="/logo-icon.png" alt="Icon" width={20} height={20} className="w-5 h-5 object-contain" />
                    </div>
                    <div className={cn(
                        "ml-2.5 opacity-0 transition-opacity duration-100",
                        !isMobile && "group-hover:opacity-100",
                        isMobile && "opacity-100"
                    )}>
                        <h1 className="font-semibold text-sm tracking-tight select-none whitespace-nowrap">
                            CheckVibe
                        </h1>
                    </div>
                </a>
            </div>

            {/* User Profile */}
            <div className="px-2 pb-4">
                <div className="flex items-center p-2 rounded-xl transition-colors hover:bg-white/[0.03]">
                    <div className="w-[24px] flex justify-center shrink-0">
                        <Avatar className="h-[24px] w-[24px] ring-1 ring-white/[0.08] shrink-0">
                            <AvatarFallback className="bg-white/[0.06] text-zinc-300 text-[10px] font-medium">
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                    </div>

                    <div className={cn(
                        "flex flex-col min-w-0 overflow-hidden ml-2.5 opacity-0 transition-opacity duration-100",
                        !isMobile && "group-hover:opacity-100",
                        isMobile && "opacity-100"
                    )}>
                        <p className="text-[12px] font-medium text-white truncate" title={userEmail || 'User'}>
                            {userEmail?.split('@')[0] || 'User'}
                        </p>
                        <p className="text-[10px] text-zinc-500 capitalize leading-none whitespace-nowrap">
                            {userPlan === 'none' ? 'Free Plan' : `${userPlan} Plan`}
                        </p>
                    </div>
                </div>
            </div>

            <div className="h-px bg-white/[0.06] mx-4 mb-4" />

            {/* Scrollable Nav Area */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 space-y-4 scrollbar-none">
                {/* Main Nav */}
                <div className="space-y-0.5">
                    {mainNav.map((item) => (
                        <NavItem key={item.name} item={item} />
                    ))}
                </div>

                {/* Resources */}
                <div className="space-y-0.5 mt-6">
                    <p className={cn(
                        "px-3 text-[9px] font-medium tracking-wider text-zinc-600 uppercase mb-1.5 opacity-0 transition-opacity duration-100",
                        !isMobile && "group-hover:opacity-100",
                        isMobile && "opacity-100"
                    )}>
                        Resources
                    </p>
                    {resourceLinks.map((item) => (
                        <NavItem key={item.name} item={item} isExternal={item.external} />
                    ))}
                </div>

                {/* Connect */}
                <div className="space-y-0.5 mt-6">
                    <p className={cn(
                        "px-3 text-[9px] font-medium tracking-wider text-zinc-600 uppercase mb-1.5 opacity-0 transition-opacity duration-100",
                        !isMobile && "group-hover:opacity-100",
                        isMobile && "opacity-100"
                    )}>
                        Connect
                    </p>
                    {connectLinks.map((item) => (
                        <NavItem key={item.name} item={item} isExternal={item.external} />
                    ))}
                </div>

                {/* Admin (owner only) */}
                {userEmail === OWNER_EMAIL && (
                    <div className="space-y-0.5 mt-6">
                        <p className={cn(
                            "px-3 text-[9px] font-medium tracking-wider text-zinc-600 uppercase mb-1.5 opacity-0 transition-opacity duration-100",
                            !isMobile && "group-hover:opacity-100",
                            isMobile && "opacity-100"
                        )}>
                            Admin
                        </p>
                        {adminLinks.map((item) => (
                            <NavItem key={item.name} item={item} />
                        ))}
                    </div>
                )}
            </div>

            {/* Logout */}
            <div className="p-2 mt-auto shrink-0 border-t border-white/[0.06]">
                <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-2.5 py-1.5 min-h-[32px] rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03] transition-colors duration-100"
                >
                    <div className="flex items-center justify-center w-[24px] shrink-0">
                        <LogOut className="h-[14px] w-[14px] shrink-0 stroke-[2px]" />
                    </div>
                    <span className={cn(
                        "ml-2.5 whitespace-nowrap text-[12px] font-normal opacity-0 transition-opacity duration-100",
                        !isMobile && "group-hover:opacity-100",
                        isMobile && "opacity-100"
                    )}>
                        Log out
                    </span>
                </button>
            </div>
        </div>
    );
}
