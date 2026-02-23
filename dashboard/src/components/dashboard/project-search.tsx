'use client';

import { Search } from 'lucide-react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';

export function ProjectSearch() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    function handleSearch(term: string) {
        const params = new URLSearchParams(searchParams.toString());
        if (term) {
            params.set('q', term);
        } else {
            params.delete('q');
        }

        startTransition(() => {
            router.replace(`${pathname}?${params.toString()}`);
        });
    }

    return (
        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
            <input
                type="text"
                placeholder="Search for a project"
                defaultValue={searchParams.get('q')?.toString()}
                onChange={(e) => handleSearch(e.target.value)}
                className="h-8 w-40 sm:w-64 rounded-md bg-[#1c1c1c] border border-white/10 pl-9 pr-3 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-sky-500/50"
            />
        </div>
    );
}
