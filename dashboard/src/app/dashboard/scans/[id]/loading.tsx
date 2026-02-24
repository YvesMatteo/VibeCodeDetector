'use client';

import { useState, useEffect } from 'react';
import { Shield, Lock, Eye, Server, Globe, Code } from 'lucide-react';

const SECURITY_TIPS = [
    { icon: Shield, text: 'Checking security headers and CSP policies...' },
    { icon: Lock, text: 'Scanning for SQL injection and XSS vulnerabilities...' },
    { icon: Eye, text: 'Detecting exposed API keys and secrets...' },
    { icon: Server, text: 'Analyzing backend configuration and access controls...' },
    { icon: Globe, text: 'Testing CORS, CSRF, and cookie security...' },
    { icon: Code, text: 'Inspecting SSL/TLS certificates and DNS records...' },
    { icon: Shield, text: 'Checking for DDoS protection and rate limiting...' },
    { icon: Lock, text: 'Scanning file upload forms for restrictions...' },
    { icon: Eye, text: 'Detecting monitoring and audit logging...' },
    { icon: Server, text: 'Testing mobile API rate limiting...' },
];

export default function ScanDetailLoading() {
    const [progress, setProgress] = useState(0);
    const [tipIndex, setTipIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 85) return prev;
                const increment = prev < 30 ? 3 : prev < 60 ? 1.5 : 0.5;
                return Math.min(prev + increment, 85);
            });
        }, 500);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            setTipIndex(prev => (prev + 1) % SECURITY_TIPS.length);
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    const tip = SECURITY_TIPS[tipIndex];
    const TipIcon = tip.icon;

    return (
        <div className="p-4 md:p-8 max-w-2xl mx-auto">
            <div className="flex flex-col items-center text-center py-20">
                <div className="relative mb-8">
                    <div className="h-20 w-20 rounded-full bg-sky-400/10 border border-sky-400/20 flex items-center justify-center">
                        <Shield className="h-10 w-10 text-sky-400 animate-pulse" />
                    </div>
                </div>

                <h2 className="text-xl font-heading font-medium text-white mb-2">
                    Running Security Audit
                </h2>
                <p className="text-zinc-500 text-sm mb-8">
                    35 scanners analyzing your site in parallel
                </p>

                <div className="w-full max-w-md mb-8">
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-sky-500 to-cyan-500 rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <p className="text-zinc-600 text-xs mt-2">{Math.round(progress)}% complete</p>
                </div>

                <div className="flex items-center gap-3 text-zinc-400 text-sm h-6">
                    <TipIcon className="h-4 w-4 text-zinc-500 shrink-0" />
                    <span>{tip.text}</span>
                </div>
            </div>
        </div>
    );
}
