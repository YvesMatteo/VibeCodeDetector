'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Shield, Zap, BarChart3, X } from 'lucide-react';

export function WelcomeModal() {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const dismissed = localStorage.getItem('cv-welcome-dismissed');
        if (!dismissed) {
            setOpen(true);
        }
    }, []);

    function handleDismiss() {
        localStorage.setItem('cv-welcome-dismissed', '1');
        setOpen(false);
    }

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={handleDismiss} />
            <div className="relative w-full max-w-lg rounded-2xl border border-white/[0.06] bg-[#111113] p-6 md:p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                <button
                    onClick={handleDismiss}
                    className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
                >
                    <X className="h-5 w-5" />
                </button>

                <div className="text-center mb-6">
                    <div className="w-12 h-12 rounded-xl bg-sky-400/10 border border-sky-400/20 flex items-center justify-center mx-auto mb-4">
                        <Shield className="h-6 w-6 text-sky-400" />
                    </div>
                    <h2 className="text-xl font-heading font-medium text-white mb-2">
                        Welcome to CheckVibe
                    </h2>
                    <p className="text-sm text-zinc-400">
                        Get your first security audit in 30 seconds.
                    </p>
                </div>

                <div className="space-y-4 mb-6">
                    <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-white/[0.04] border border-white/[0.06] shrink-0 mt-0.5">
                            <span className="text-sm font-bold text-sky-400">1</span>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-white">Create a project</p>
                            <p className="text-xs text-zinc-500">Add your site URL and optional GitHub repo.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-white/[0.04] border border-white/[0.06] shrink-0 mt-0.5">
                            <Zap className="h-4 w-4 text-amber-400" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-white">Run an audit</p>
                            <p className="text-xs text-zinc-500">30 scanners check your site for vulnerabilities in under a minute.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-white/[0.04] border border-white/[0.06] shrink-0 mt-0.5">
                            <BarChart3 className="h-4 w-4 text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-white">Fix and track</p>
                            <p className="text-xs text-zinc-500">Get AI-powered fix suggestions. Re-scan to verify improvements.</p>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3">
                    <Button
                        onClick={handleDismiss}
                        className="flex-1 bg-sky-500 hover:bg-sky-400 text-white border-0"
                    >
                        Get Started
                    </Button>
                </div>
            </div>
        </div>
    );
}
