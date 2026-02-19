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
    Plus,
    Key,
    BookOpen,
    ExternalLink,
    Mail,
    ScrollText,
    Menu,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button'; // Assuming Button is available

export const mainNav = [
    { name: 'Projects', href: '/dashboard', icon: FolderKanban },
    { name: 'API Keys', href: '/dashboard/api-keys', icon: Key },
    { name: 'Plans', href: '/dashboard/credits', icon: CreditCard },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export const resourceLinks = [
    { name: 'Docs', href: '/dashboard/docs', icon: BookOpen, external: false },
    { name: 'Changelog', href: '/dashboard/changelog', icon: ScrollText, external: false },
];

export const connectLinks = [
    { name: 'Support', href: 'mailto:support@checkvibe.dev', icon: Mail, external: true },
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
                "relative flex items-center px-3 py-2 min-h-[44px] rounded-lg transition-all duration-200 group/item overflow-hidden",
                isActive
                    ? "text-white bg-sky-400/[0.08] border border-sky-400/[0.1]"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03] border border-transparent"
            )}>
                {/* Icon Container - Fixed Width */}
                <div className="flex items-center justify-center min-w-[20px] mr-3">
                    <Icon className={cn(
                        "h-[18px] w-[18px] transition-colors",
                        isActive ? "text-sky-400" : "text-zinc-500 group-hover/item:text-zinc-300"
                    )} />
                </div>

                {/* Text Label - Transitions opacity/width/transform */}
                <span className={cn(
                    "whitespace-nowrap font-medium text-[13px] transition-all duration-300 origin-left",
                    !isMobile && "opacity-0 translate-x-[-10px] group-hover:opacity-100 group-hover:translate-x-0 w-0 group-hover:w-auto delay-75", // Desktop: hidden by default
                    isMobile && "opacity-100 w-auto" // Mobile: always visible
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
                "flex flex-col h-full bg-background border-r border-white/[0.06] transition-[width] duration-300 ease-in-out overflow-hidden z-50",
                !isMobile && "w-[70px] hover:w-[240px] group", // Desktop expand logic
                isMobile && "w-full",
                className
            )}
        >
            {/* Logo Section */}
            <div className="h-16 flex items-center shrink-0 px-4">
                <Link href="/" className="flex items-center gap-3 overflow-hidden">
                    {/* Always visible Icon */}
                    <div className="min-w-[24px] flex justify-center">
                        <Image src="/logo-icon.png" alt="Icon" width={24} height={24} className="w-6 h-6 object-contain" />
                    </div>
                    {/* Text Logo - Hidden on collapsed */}
                    <div className={cn(
                        "transition-all duration-300 origin-left",
                        !isMobile && "opacity-0 translate-x-[-10px] group-hover:opacity-100 group-hover:translate-x-0 w-0 group-hover:w-auto delay-75",
                        isMobile && "opacity-100 w-auto"
                    )}>
                        <h1 className="font-bold text-lg tracking-tight select-none">
                            CheckVibe
                        </h1>
                    </div>
                </Link>
            </div>

            {/* User Profile - Compact vs Expanded */}
            <div className="px-3 pb-4">
                <div className={cn(
                    "flex items-center gap-3 p-2 rounded-xl transition-colors hover:bg-white/[0.03]",
                    !isMobile && "justify-center group-hover:justify-start"
                )}>
                    <Avatar className="h-8 w-8 ring-1 ring-white/[0.08] shrink-0">
                        <AvatarFallback className="bg-white/[0.06] text-zinc-300 text-xs font-medium">
                            {initials}
                        </AvatarFallback>
                    </Avatar>

                    <div className={cn(
                        "flex flex-col min-w-0 transition-all duration-300 overflow-hidden",
                        !isMobile && "opacity-0 w-0 group-hover:opacity-100 group-hover:w-auto delay-75",
                        isMobile && "opacity-100 w-auto"
                    )}>
                        <p className="text-[13px] font-medium text-white truncate">
                            {userEmail?.split('@')[0] || 'User'}
                        </p>
                        <p className="text-[11px] text-zinc-500 capitalize leading-none">
                            {userPlan === 'none' ? 'Free Plan' : `${userPlan} Plan`}
                        </p>
                    </div>
                </div>
            </div>

            <div className="h-px bg-white/[0.06] mx-4 mb-4" />

            {/* Scrollable Nav Area */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 space-y-6 scrollbar-none">
                {/* Main Nav */}
                <div className="space-y-1">
                    {/* New Project Button */}
                    <div className="mb-4">
                        <Link href="/dashboard/projects/new" onClick={onNavClick}>
                            <div className={cn(
                                "flex items-center justify-center p-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-white transition-all duration-200 group/btn shadow-[0_0_15px_-3px_rgba(14,165,233,0.3)]",
                                !isMobile && "h-10 w-10 mx-auto group-hover:w-full group-hover:mx-0 group-hover:justify-start group-hover:px-3",
                                isMobile && "w-full h-10 px-3 justify-start"
                            )}>
                                <Plus className="h-5 w-5 shrink-0" />
                                <span className={cn(
                                    "ml-3 whitespace-nowrap text-[13px] font-medium overflow-hidden transition-all duration-300",
                                    !isMobile && "w-0 opacity-0 group-hover:w-auto group-hover:opacity-100 delay-75",
                                    isMobile && "w-auto opacity-100"
                                )}>
                                    New Project
                                </span>
                            </div>
                        </Link>
                    </div>

                    {mainNav.map((item) => (
                        <NavItem key={item.name} item={item} />
                    ))}
                </div>

                {/* Resources */}
                <div className="space-y-1">
                    <p className={cn(
                        "px-3 text-[10px] font-medium tracking-wider text-zinc-600 uppercase mb-2 transition-opacity duration-300",
                        !isMobile && "opacity-0 group-hover:opacity-100 delay-75",
                        isMobile && "opacity-100"
                    )}>
                        Resources
                    </p>
                    {resourceLinks.map((item) => (
                        <NavItem key={item.name} item={item} isExternal={item.external} />
                    ))}
                </div>

                {/* Connect */}
                <div className="space-y-1">
                    <p className={cn(
                        "px-3 text-[10px] font-medium tracking-wider text-zinc-600 uppercase mb-2 transition-opacity duration-300",
                        !isMobile && "opacity-0 group-hover:opacity-100 delay-75",
                        isMobile && "opacity-100"
                    )}>
                        Connect
                    </p>
                    {connectLinks.map((item) => (
                        <NavItem key={item.name} item={item} isExternal={item.external} />
                    ))}
                </div>
            </div>

            {/* Logout */}
            <div className="p-3 mt-auto">
                <button
                    onClick={handleLogout}
                    className={cn(
                        "flex items-center w-full p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03] transition-all duration-200 group/logout",
                        !isMobile && "justify-center group-hover:justify-start"
                    )}
                >
                    <LogOut className="h-[18px] w-[18px] shrink-0" />
                    <span className={cn(
                        "ml-3 whitespace-nowrap text-[13px] font-medium overflow-hidden transition-all duration-300",
                        !isMobile && "w-0 opacity-0 group-hover:w-auto group-hover:opacity-100 delay-75",
                        isMobile && "w-auto opacity-100"
                    )}>
                        Log out
                    </span>
                </button>
            </div>
        </div>
    );
}
