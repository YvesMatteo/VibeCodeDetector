import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
    title: ReactNode;
    description?: ReactNode;
    actions?: ReactNode;
    className?: string;
    children?: ReactNode;
}

export function PageHeader({ title, description, actions, className, children }: PageHeaderProps) {
    return (
        <div className={cn("border-b border-white/[0.06] bg-background/50", className)}>
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 py-8 px-4 md:px-8 max-w-7xl mx-auto w-full">
                <div className="min-w-0">
                    <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-zinc-100 flex items-center gap-3">
                        {title}
                    </h1>
                    {description && (
                        <p className="text-sm text-zinc-400 mt-1.5 break-words">
                            {description}
                        </p>
                    )}
                </div>
                {actions && (
                    <div className="flex flex-wrap items-center gap-3 shrink-0">
                        {actions}
                    </div>
                )}
            </div>
            {children && (
                <div className="px-4 md:px-8 max-w-7xl mx-auto w-full">
                    {children}
                </div>
            )}
        </div>
    );
}
