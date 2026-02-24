'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    FileSearch,
    History,
    Bell,
    Puzzle,
    Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
    { name: 'Overview', href: '', icon: LayoutDashboard },
    { name: 'Report', href: '/report', icon: FileSearch },
    { name: 'History', href: '/history', icon: History },
    { name: 'Schedule & Alerts', href: '/monitoring', icon: Bell },
    { name: 'Integrations', href: '/integrations', icon: Puzzle },
    { name: 'Settings', href: '/settings', icon: Settings },
];

export function ProjectTabNav({ projectId }: { projectId: string }) {
    const pathname = usePathname();
    const basePath = `/dashboard/projects/${projectId}`;

    return (
        <div className="border-b border-white/[0.06]">
            <div className="px-4 md:px-8 max-w-7xl mx-auto w-full">
                <nav className="flex gap-0.5 -mb-px overflow-x-auto scrollbar-none">
                    {tabs.map((tab) => {
                        const tabPath = `${basePath}${tab.href}`;
                        const isActive = tab.href === ''
                            ? pathname === basePath
                            : pathname === tabPath || (tab.href === '/history' && pathname.startsWith(`${basePath}/history`));
                        const Icon = tab.icon;

                        return (
                            <Link
                                key={tab.name}
                                href={tabPath}
                                className={cn(
                                    "flex items-center gap-1.5 px-3.5 py-3 text-[13px] font-medium border-b-2 transition-colors whitespace-nowrap min-h-[44px]",
                                    isActive
                                        ? "border-sky-400 text-white"
                                        : "border-transparent text-zinc-500 hover:text-zinc-300 hover:border-white/[0.1]"
                                )}
                            >
                                <Icon className={cn(
                                    "h-3.5 w-3.5",
                                    isActive ? "text-sky-400" : "text-zinc-600"
                                )} />
                                {tab.name}
                            </Link>
                        );
                    })}
                </nav>
            </div>
        </div>
    );
}
