'use client';

import { Shield, Key, Server, Database, CheckCircle2, XCircle, Terminal, FileCode2, Lock, ArrowRight } from 'lucide-react';

const roadmapSteps = [
    {
        title: "Deep Source Code Analysis",
        description: "We start by analyzing your client-side JavaScript bundles and source maps. Our engines scan for over 100+ patterns of exposed API keys, environment variables, and hardcoded credentials that often leak during build processes.",
        icon: Key,
        visual: (
            <div className="rounded-xl bg-[#0E0E10] border border-white/5 p-4 font-mono text-xs overflow-hidden h-full flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-3 text-zinc-500 border-b border-white/5 pb-2">
                    <FileCode2 className="h-4 w-4" />
                    <span>scanner/secrets.ts</span>
                </div>
                <div className="space-y-1.5 text-zinc-400">
                    <div className="flex"><span className="w-6 text-zinc-600">1</span><span className="text-sky-400">const</span> config = {'{'}</div>
                    <div className="flex"><span className="w-6 text-zinc-600">2</span>  env: <span className="text-green-300">&apos;production&apos;</span>,</div>
                    <div className="flex">
                        <span className="w-6 text-zinc-600">3</span>
                        <span>
                            stripeKey: <span className="text-green-300">&apos;</span>
                            <span className="bg-red-500/20 text-red-300 border border-red-500/30 px-1 rounded mx-0.5">sk_live_51M...</span>
                            <span className="text-green-300">&apos;</span>
                        </span>
                    </div>
                    <div className="flex"><span className="w-6 text-zinc-600">4</span>{'}'};</div>
                </div>
                <div className="mt-4 flex items-center gap-2 text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded w-fit">
                    <XCircle className="h-3 w-3" />
                    <span>CRITICAL: Exposed Stripe Secret Key Detected</span>
                </div>
            </div>
        )
    },
    {
        title: "Infrastructure & Network Audit",
        description: "Next, we probe your hosting environment (Vercel, Netlify, Cloudflare). We evaluate your CORS policies using real cross-origin requests, check SSL/TLS configurations, and verify essential security headers like CSP and HSTS.",
        icon: Server,
        visual: (
            <div className="rounded-xl bg-[#0E0E10]/80 border border-white/5 p-1 overflow-hidden h-full flex flex-col justify-center">
                <div className="rounded-lg bg-[#141418] border border-white/5 divide-y divide-white/5">
                    <div className="flex items-center justify-between p-3">
                        <span className="text-xs font-medium text-zinc-300">Strict-Transport-Security</span>
                        <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                            <CheckCircle2 className="h-3 w-3" /> Configured
                        </div>
                    </div>
                    <div className="flex items-center justify-between p-3">
                        <span className="text-xs font-medium text-zinc-300">CORS Policy</span>
                        <div className="flex items-center gap-1.5 text-[10px] text-red-400 px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20">
                            <XCircle className="h-3 w-3" /> Wildcard Origin (*)
                        </div>
                    </div>
                    <div className="flex items-center justify-between p-3">
                        <span className="text-xs font-medium text-zinc-300">Content-Security-Policy</span>
                        <div className="flex items-center gap-1.5 text-[10px] text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                            <XCircle className="h-3 w-3" /> Missing
                        </div>
                    </div>
                </div>
            </div>
        )
    },
    {
        title: "Simulated Cyberattacks",
        description: "We deploy safe, non-destructive payloads directly against your live endpoints. This includes SQL injection fuzzing, Cross-Site Scripting (XSS) canaries, and testing forms and cookies for CSRF vulnerabilities to see how your app responds.",
        icon: Shield,
        visual: (
            <div className="rounded-xl bg-[#0E0E10] border border-white/5 p-4 font-mono text-xs overflow-hidden h-full flex flex-col justify-center relative shadow-inner">
                <div className="flex items-center gap-2 mb-3 text-zinc-500 border-b border-white/5 pb-2">
                    <Terminal className="h-4 w-4" />
                    <span>attack_simulation_log</span>
                </div>
                <div className="space-y-2 text-zinc-400">
                    <div><span className="text-violet-400">[INFO]</span> Executing payload: <span className="text-amber-300">&lt;script&gt;alert(1)&lt;/script&gt;</span></div>
                    <div className="flex items-center gap-2">
                        <ArrowRight className="h-3 w-3 text-zinc-600" />
                        <span>Target: POST /api/submit-comment</span>
                    </div>
                    <div className="pt-1 mt-1 border-t border-white/5">
                        <span className="text-emerald-400">[SUCCESS]</span> WAF intercepted request. Status 403 Forbidden.
                    </div>
                    <div className="mt-2"><span className="text-violet-400">[INFO]</span> Executing payload: <span className="text-amber-300">&apos; OR 1=1--</span></div>
                    <div className="flex items-center gap-2">
                        <ArrowRight className="h-3 w-3 text-zinc-600" />
                        <span>Target: POST /api/login</span>
                    </div>
                    <div className="pt-1 mt-1 border-t border-white/5">
                        <span className="text-red-400">[VULN]</span> Endpoint returned bypass! Status 200 OK.
                    </div>
                </div>
            </div>
        )
    },
    {
        title: "BaaS & Database Auditing",
        description: "If you use Supabase, Firebase, or similar BaaS providers, we check your endpoint configurations. We attempt unauthenticated requests to your tables to verify that Row Level Security (RLS) policies are properly enforced.",
        icon: Database,
        visual: (
            <div className="rounded-xl bg-[#0E0E10]/80 border border-white/5 p-1 overflow-hidden h-full flex flex-col justify-center">
                <div className="rounded-lg bg-[#141418] border border-white/5 divide-y divide-white/5 p-3 space-y-3">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                            <Database className="h-4 w-4 text-zinc-500" />
                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-white">auth.users</span>
                                <span className="text-[10px] text-zinc-500">Read access attempt</span>
                            </div>
                        </div>
                        <div className="text-[10px] text-emerald-400 px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 font-medium">
                            401 Unauthorized
                        </div>
                    </div>
                    <div className="flex items-start justify-between border-t border-white/5 pt-3">
                        <div className="flex items-center gap-2">
                            <Database className="h-4 w-4 text-zinc-500" />
                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-white">public.profiles</span>
                                <span className="text-[10px] text-zinc-500">Read access attempt</span>
                            </div>
                        </div>
                        <div className="text-[10px] text-red-400 px-2 py-1 rounded bg-red-500/10 border border-red-500/20 font-medium">
                            200 OK (Data Leaked)
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-amber-500 mt-2">
                        <Lock className="h-3 w-3" />
                        <span>Missing RLS policy on table &quot;profiles&quot;</span>
                    </div>
                </div>
            </div>
        ),
    }
];

export function FeatureRoadmap() {
    return (
        <div className="max-w-5xl mx-auto py-12">

            <div className="relative">
                {/* Vertical line connecting steps (hidden on mobile, visible on sm and up) */}
                <div className="absolute left-[27px] sm:left-1/2 top-0 bottom-0 w-px bg-white/10 -translate-x-1/2 hidden sm:block" />

                <div className="space-y-12 sm:space-y-24 relative">
                    {roadmapSteps.map((step, index) => {
                        const Icon = step.icon;
                        const isEven = index % 2 === 0;

                        return (
                            <div key={index} className="flex flex-col sm:flex-row items-center gap-8 sm:gap-12 relative">
                                {/* Mobile connecting line */}
                                {index !== roadmapSteps.length - 1 && (
                                    <div className="absolute left-6 top-12 bottom-[-48px] w-px bg-white/10 sm:hidden" />
                                )}

                                {/* Timeline Node */}
                                <div className={`
                      absolute left-6 sm:left-1/2 -translate-x-1/2 top-0 sm:top-1/2 sm:-translate-y-1/2 
                      w-10 h-10 rounded-full bg-[#1C1C1E] border-2 border-zinc-800 flex items-center justify-center z-10
                      shadow-[0_0_15px_-3px_rgba(255,255,255,0.1)]
                   `}>
                                    <Icon className="h-4 w-4 text-zinc-400" />
                                </div>

                                {/* Content Block */}
                                <div className={`w-full sm:w-1/2 pl-16 sm:pl-0 ${isEven ? 'sm:pr-16 sm:text-right' : 'sm:pl-16 sm:order-last'}`}>
                                    <div className={`flex flex-col ${isEven ? 'sm:items-end' : 'sm:items-start'}`}>
                                        <span className="text-[10px] font-mono font-medium text-sky-400 tracking-wider uppercase mb-2">Step 0{index + 1}</span>
                                        <h3 className="text-xl sm:text-2xl font-semibold text-white tracking-tight mb-3">{step.title}</h3>
                                        <p className="text-sm text-zinc-400 leading-relaxed max-w-sm">
                                            {step.description}
                                        </p>
                                    </div>
                                </div>

                                {/* Visual Block */}
                                <div className={`w-full sm:w-1/2 mt-6 sm:mt-0 ${isEven ? 'sm:pl-16 sm:order-last' : 'sm:pr-16'}`}>
                                    <div className="h-[220px] w-full max-w-sm mx-auto sm:mx-0 rounded-2xl border border-white/10 bg-[#141418] p-3 shadow-lg shadow-black/20">
                                        {step.visual}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
