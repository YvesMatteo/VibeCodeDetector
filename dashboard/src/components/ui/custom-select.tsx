'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption {
    value: string;
    label: string;
    icon?: React.ReactNode;
}

interface CustomSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: SelectOption[];
    placeholder?: string;
    id?: string;
    className?: string;
}

export function CustomSelect({ value, onChange, options, placeholder, id, className }: CustomSelectProps) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const selected = options.find(o => o.value === value);

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    return (
        <div ref={ref} className={`relative ${className ?? ''}`} id={id}>
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                className="flex items-center justify-between w-full h-10 rounded-md border bg-white/[0.03] border-white/[0.08] text-white px-3 text-sm transition-colors hover:border-white/[0.15] focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
                <div className="flex items-center gap-2">
                    {selected?.icon && <span className="shrink-0">{selected.icon}</span>}
                    <span className={selected ? 'text-white' : 'text-zinc-500'}>
                        {selected?.label ?? placeholder ?? 'Select...'}
                    </span>
                </div>
                <ChevronDown className={`h-4 w-4 text-zinc-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="absolute z-50 mt-1 w-full rounded-md border border-white/[0.08] bg-zinc-900 shadow-xl shadow-black/40 py-1 animate-in fade-in-0 zoom-in-95 duration-100">
                    {options.map(opt => (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => { onChange(opt.value); setOpen(false); }}
                            className={`flex items-center gap-2 w-full px-3 py-2 text-sm text-left transition-colors ${opt.value === value
                                    ? 'text-white bg-white/[0.06]'
                                    : 'text-zinc-300 hover:text-white hover:bg-white/[0.04]'
                                }`}
                        >
                            <Check className={`h-3.5 w-3.5 shrink-0 ${opt.value === value ? 'text-emerald-400' : 'text-transparent'}`} />
                            {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                            {opt.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
