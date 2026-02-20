'use client';

import { motion } from 'framer-motion';
import { Shield, Key, Server, Database, AlertCircle, CheckCircle2, FileCode2, Terminal, Cloud } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

// Animated Code Block for Simulated Attacks
function CyberattackVisual() {
    return (
        <div className="absolute inset-x-0 bottom-0 top-12 p-4 md:p-6 overflow-hidden">
            <div className="relative h-full w-full rounded-xl bg-[#0E0E10] border border-white/5 font-mono text-xs p-4 flex flex-col overflow-hidden">
                {/* Decorative header */}
                <div className="flex items-center gap-2 border-b border-white/10 pb-3 mb-3">
                    <Terminal className="h-4 w-4 text-zinc-500" />
                    <span className="text-zinc-500">payload_injector.sh</span>
                </div>

                {/* Code lines */}
                <div className="space-y-2 text-zinc-400 relative z-10">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex gap-3">
                        <span className="text-zinc-600 shrink-0">1</span>
                        <span><span className="text-blue-400">Target:</span> https://api.example.com/login</span>
                    </motion.div>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="flex gap-3">
                        <span className="text-zinc-600 shrink-0">2</span>
                        <span><span className="text-green-400">Injecting:</span> &apos; OR 1=1--</span>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.4 }} className="flex gap-3 text-red-400 font-medium">
                        <span className="text-zinc-600 shrink-0">3</span>
                        <span>[x] Vulnerability Detected: SQLi Bypass</span>
                    </motion.div>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.0 }} className="flex gap-3">
                        <span className="text-zinc-600 shrink-0">4</span>
                        <span><span className="text-green-400">Injecting:</span> &lt;img src=x onerror=alert(1)&gt;</span>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 2.6 }} className="flex gap-3 text-red-400 font-medium">
                        <span className="text-zinc-600 shrink-0">5</span>
                        <span>[x] Vulnerability Detected: Reflected XSS</span>
                    </motion.div>
                </div>

                {/* Scanning Beam */}
                <motion.div
                    animate={{ top: ['0%', '100%', '0%'] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                    className="absolute left-0 right-0 h-[1px] bg-rose-500/50 shadow-[0_0_15px_1px_rgba(244,63,94,0.5)] z-20 pointer-events-none"
                />
                <motion.div
                    animate={{ top: ['-10%', '90%', '-10%'] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                    className="absolute left-0 right-0 h-10 bg-gradient-to-b from-rose-500/10 to-transparent z-10 pointer-events-none"
                />
            </div>
        </div>
    );
}

// Secret Hunter Visual
function SecretHunterVisual() {
    return (
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent flex items-end justify-end p-6">
            <div className="w-[85%] rounded-lg bg-[#0E0E10] border border-white/5 p-3 shadow-2xl relative translate-x-4 translate-y-4 rotate-3 group-hover:rotate-0 group-hover:translate-x-0 group-hover:translate-y-0 transition-all duration-500">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
                        <FileCode2 className="h-3.5 w-3.5" />
                        config.ts
                    </div>
                </div>
                <div className="text-[10px] font-mono whitespace-pre text-zinc-500 relative">
                    <span className="text-sky-400">const</span> AWS_KEY = <span className="text-zinc-300">&apos;</span>
                    <span className="relative inline-block w-full mt-1">
                        <span className="text-zinc-300 blur-[2px] select-none">AKIAIOSFODNN7EXAMPLE</span>
                        {/* Red highlight box over the key */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ repeat: Infinity, repeatType: 'reverse', duration: 1.5 }}
                            className="absolute -inset-1 border border-red-500/50 bg-red-500/10 rounded flex items-center justify-end pr-1"
                        >
                            <span className="text-[8px] text-red-400 font-bold uppercase drop-shadow-sm flex items-center gap-1">
                                <AlertCircle className="h-2 w-2" />
                                Exposed
                            </span>
                        </motion.div>
                    </span><span className="text-zinc-300">&apos;</span>;
                </div>
            </div>
        </div>
    );
}

// Infrastructure Visual
function InfraVisual() {
    return (
        <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/5 via-transparent to-transparent flex items-center justify-center p-6">
            <div className="grid grid-cols-2 gap-3 w-full max-w-[200px]">
                <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-[#0E0E10] border border-white/5 relative group-hover:border-emerald-500/30 transition-colors">
                    <Cloud className="h-6 w-6 text-zinc-400 mb-2 group-hover:text-emerald-400 transition-colors" />
                    <span className="text-[10px] text-zinc-500 font-medium">Headers</span>
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.5, type: 'spring' }}
                        className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center"
                    >
                        <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400" />
                    </motion.div>
                </div>
                <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-[#0E0E10] border border-white/5 relative group-hover:border-emerald-500/30 transition-colors">
                    <Server className="h-6 w-6 text-zinc-400 mb-2 group-hover:text-emerald-400 transition-colors" />
                    <span className="text-[10px] text-zinc-500 font-medium">CORS</span>
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 1, type: 'spring' }}
                        className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-red-500/20 border border-red-500 flex items-center justify-center"
                    >
                        <AlertCircle className="h-2.5 w-2.5 text-red-400" />
                    </motion.div>
                </div>
            </div>
        </div>
    );
}

// BaaS Visual
function BaaSVisual() {
    return (
        <div className="absolute inset-0 bg-gradient-to-t from-violet-500/5 via-transparent to-transparent flex items-end p-6">
            <div className="w-full space-y-2">
                <div className="flex items-center justify-between p-2 rounded bg-white/5 border border-white/5 text-[10px] font-mono">
                    <span className="text-zinc-400">auth.users</span>
                    <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Secure</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-red-500/10 border border-red-500/20 text-[10px] font-mono">
                    <span className="text-zinc-400">public.profiles</span>
                    <span className="text-red-400 font-bold flex items-center gap-1"><AlertCircle className="h-3 w-3" /> RLS Bypassed</span>
                </div>
            </div>
        </div>
    );
}


export function FeatureBento() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 md:grid-rows-2 gap-4 max-w-5xl mx-auto auto-rows-[300px]">

            {/* Card 1: Large Span (Rows & Cols) */}
            <div className="md:col-span-2 md:row-span-2 group relative rounded-2xl border border-white/10 bg-[#141418] overflow-hidden hover:border-rose-500/30 transition-colors shadow-lg">
                <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent pointer-events-none" />
                <div className="relative z-10 p-6 md:p-8 flex flex-col h-full">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
                            <Shield className="h-5 w-5 text-rose-400" />
                        </div>
                        <h3 className="text-xl font-semibold text-white tracking-tight">Injection &#38; Cyberattacks</h3>
                    </div>
                    <p className="text-zinc-400 text-sm max-w-sm">
                        We send real payloads to your live site — SQL injection probes, XSS canaries, and open redirect bypass attempts — checking your limits.
                    </p>

                    <CyberattackVisual />
                </div>
            </div>

            {/* Card 2: Medium Top Right */}
            <div className="group relative rounded-2xl border border-white/10 bg-[#141418] overflow-hidden hover:border-amber-500/30 transition-colors shadow-lg">
                <div className="relative z-10 p-6 flex flex-col h-full pointer-events-none">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                            <Key className="h-4 w-4 text-amber-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-white tracking-tight">Secret Hunter</h3>
                    </div>
                    <p className="text-zinc-400 text-xs">
                        Deep-scanning JS bundles and source maps for leaked API keys.
                    </p>
                </div>
                <SecretHunterVisual />
            </div>

            {/* Card 3: Medium Bottom Right (Split) */}
            <div className="grid grid-rows-2 gap-4">
                <div className="group relative rounded-2xl border border-white/10 bg-[#141418] overflow-hidden hover:border-emerald-500/30 transition-colors shadow-lg">
                    <div className="relative z-10 p-5 flex flex-col h-full pointer-events-none">
                        <div className="flex items-center gap-3 mb-1">
                            <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                <Server className="h-4 w-4 text-emerald-400" />
                            </div>
                            <h3 className="text-sm font-semibold text-white tracking-tight">Infra &#38; Configs</h3>
                        </div>
                        <p className="text-zinc-400 text-xs">CORS policies, SSL, and headers.</p>
                    </div>
                    <InfraVisual />
                </div>

                <div className="group relative rounded-2xl border border-white/10 bg-[#141418] overflow-hidden hover:border-violet-500/30 transition-colors shadow-lg">
                    <div className="relative z-10 p-5 flex flex-col h-full pointer-events-none">
                        <div className="flex items-center gap-3 mb-1">
                            <div className="p-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20">
                                <Database className="h-4 w-4 text-violet-400" />
                            </div>
                            <h3 className="text-sm font-semibold text-white tracking-tight">BaaS Security</h3>
                        </div>
                        <p className="text-zinc-400 text-xs">Endpoint probing and RLS check.</p>
                    </div>
                    <BaaSVisual />
                </div>
            </div>

        </div>
    );
}
