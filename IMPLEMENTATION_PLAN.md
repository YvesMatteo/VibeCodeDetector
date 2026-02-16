# Implementation Plan — Dashboard UX Improvements

## Status
- [x] Planning
- [ ] In Progress
- [ ] Complete

## Overview

10 incremental UI/UX improvements based on user quiz preferences. Each change is surgical — no full redesigns. Dark theme, existing layouts, and all functionality preserved.

**New dependency**: `sonner` (toast library)

---

## Change 1: Install Sonner Toast Library

### [MODIFY] `dashboard/package.json`

Add `"sonner": "^2.0.0"` to dependencies.

### [MODIFY] `dashboard/src/app/layout.tsx`

Add `<Toaster />` from sonner at the root layout level:

```tsx
import { Toaster } from 'sonner';
// Inside the body:
<Toaster position="bottom-center" theme="dark" richColors />
```

**Rationale**: All inline green/red alert boxes across the app will be replaced with `toast.success()` / `toast.error()` calls from sonner.

---

## Change 2: Collapsible Sidebar

### [MODIFY] `dashboard/src/app/dashboard/layout.tsx`

**Current**: Fixed `w-56` sidebar, always showing labels.

**Changes**:

1. Add `collapsed` state with `localStorage` persistence:
```tsx
const [collapsed, setCollapsed] = useState(false);

useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved === 'true') setCollapsed(true);
}, []);

function toggleCollapse() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('sidebar-collapsed', String(next));
}
```

2. Update `<aside>` width: `w-56` → `collapsed ? 'w-14' : 'w-56'` with `transition-all duration-200`

3. Update `<main>` padding: `md:pl-56` → `collapsed ? 'md:pl-14' : 'md:pl-56'` with matching transition

4. Add collapse toggle button at bottom of sidebar (above user menu):
```tsx
<button onClick={toggleCollapse} className="mx-3 p-2 rounded-md text-zinc-500 hover:text-white hover:bg-white/[0.04] transition-colors">
    {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
</button>
```

5. Update `SidebarContent` to accept `collapsed` prop:
   - Logo section: Hide text span when collapsed, show only logo icon
   - New Project button: Show only `<Plus>` icon when collapsed, full text when expanded
   - Nav items: Hide text, show only icons when collapsed. Add `title` attribute for tooltip
   - User menu: Show only avatar when collapsed, full row when expanded

6. Add imports: `PanelLeftOpen`, `PanelLeftClose` from lucide-react

**Mobile stays unchanged** — collapse only affects desktop sidebar.

---

## Change 3: Two-Step Project Creation Form

### [MODIFY] `dashboard/src/app/dashboard/projects/new/page.tsx`

**Current**: Single form with 3 cards (Project Details, GitHub, Backend) all visible.

**Changes**:

1. Add step state:
```tsx
const [step, setStep] = useState(1);
```

2. Add step indicator at top of form (2 connected dots):
```tsx
<div className="flex items-center gap-3 mb-8">
    <div className={`flex items-center justify-center h-8 w-8 rounded-full text-sm font-medium ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-500'}`}>1</div>
    <div className={`flex-1 h-px ${step >= 2 ? 'bg-blue-600' : 'bg-zinc-700'}`} />
    <div className={`flex items-center justify-center h-8 w-8 rounded-full text-sm font-medium ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-500'}`}>2</div>
</div>
```

3. **Step 1**: Show only the "Project Details" card (Name + URL). Change submit button to "Next" (blue):
```tsx
{step === 1 && (
    <>
        {/* Project Details card — unchanged content */}
        <div className="flex justify-end gap-4 mt-6">
            <Button type="button" variant="outline" asChild>
                <Link href="/dashboard">Cancel</Link>
            </Button>
            <Button type="button" onClick={() => {
                if (!name.trim()) { toast.error('Project name is required'); return; }
                if (!url.trim() || !isValidUrl(url)) { toast.error('Please enter a valid URL'); return; }
                setStep(2);
            }} className="bg-blue-600 hover:bg-blue-500 text-white">
                Next
            </Button>
        </div>
    </>
)}
```

4. **Step 2**: Show GitHub + Backend cards. Change buttons to "Back" + "Create Project":
```tsx
{step === 2 && (
    <>
        {/* GitHub card — unchanged */}
        {/* Backend card — unchanged */}
        <div className="flex justify-between gap-4 mt-6">
            <Button type="button" variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-500 text-white">
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</> : 'Create Project'}
            </Button>
        </div>
    </>
)}
```

5. Replace inline error div with `toast.error()` calls (using sonner).

---

## Change 4: Scan Loading Progress Bar + Tips

### [MODIFY] `dashboard/src/app/dashboard/scans/[id]/loading.tsx`

**Current**: Static skeleton UI with `animate-pulse`.

**Replace entire component** with an animated progress bar + rotating security tips:

```tsx
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
        // Progress: 0→85 over ~35s (fast start, slow end)
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
        // Rotate tips every 4s
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
                {/* Animated shield icon */}
                <div className="relative mb-8">
                    <div className="h-20 w-20 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                        <Shield className="h-10 w-10 text-blue-400 animate-pulse" />
                    </div>
                </div>

                <h2 className="text-xl font-heading font-medium text-white mb-2">
                    Running Security Audit
                </h2>
                <p className="text-zinc-500 text-sm mb-8">
                    30 scanners analyzing your site in parallel
                </p>

                {/* Progress bar */}
                <div className="w-full max-w-md mb-8">
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <p className="text-zinc-600 text-xs mt-2">{Math.round(progress)}% complete</p>
                </div>

                {/* Rotating tip */}
                <div className="flex items-center gap-3 text-zinc-400 text-sm h-6 transition-opacity duration-300">
                    <TipIcon className="h-4 w-4 text-zinc-500 shrink-0" />
                    <span>{tip.text}</span>
                </div>
            </div>
        </div>
    );
}
```

---

## Change 5: Feature Comparison Table for Pricing

### [MODIFY] `dashboard/src/app/dashboard/credits/page.tsx`

**Current**: 4-column card grid with feature bullet lists per plan.

**Changes**: Replace the card grid (lines 216-326) with a comparison table. Keep the header, billing toggle, and current plan banner exactly as they are.

Add expanded features data for the comparison table:

```tsx
const comparisonFeatures = [
    { name: 'Projects', starter: '1', pro: '3', enterprise: '10', max: 'Unlimited' },
    { name: 'Scans per month', starter: '5', pro: '20', enterprise: '75', max: 'Custom' },
    { name: 'Full scan suite (30 scanners)', starter: true, pro: true, enterprise: true, max: true },
    { name: 'PDF export', starter: true, pro: true, enterprise: true, max: true },
    { name: 'AI fix suggestions', starter: true, pro: true, enterprise: true, max: true },
    { name: 'API access', starter: false, pro: true, enterprise: true, max: true },
    { name: 'Priority support', starter: false, pro: true, enterprise: true, max: true },
    { name: 'Dedicated support', starter: false, pro: false, enterprise: true, max: true },
    { name: 'SLA guarantee', starter: false, pro: false, enterprise: false, max: true },
    { name: 'Account manager', starter: false, pro: false, enterprise: false, max: true },
];
```

Replace the grid with a responsive table:

```tsx
{/* Desktop: Full comparison table */}
<div className="hidden md:block overflow-x-auto">
    <table className="w-full border-collapse">
        <thead>
            <tr className="border-b border-white/[0.06]">
                <th className="text-left py-4 px-4 text-sm font-medium text-zinc-500 w-1/3">Features</th>
                {pricingPlans.map(plan => (
                    <th key={plan.id} className="text-center py-4 px-4">
                        <div className="text-white font-medium">{plan.name}</div>
                        <div className="text-2xl font-heading font-bold text-white mt-1">
                            {plan.isContact ? 'Custom' : formatPrice(billing === 'annual' ? plan.priceAnnualPerMonth! : plan.priceMonthly!, currency)}
                        </div>
                        {!plan.isContact && <div className="text-xs text-zinc-600">/mo</div>}
                        {plan.badge && <Badge className="bg-white text-zinc-900 border-0 mt-2 text-xs">{plan.badge}</Badge>}
                    </th>
                ))}
            </tr>
        </thead>
        <tbody>
            {comparisonFeatures.map((feature, i) => (
                <tr key={feature.name} className={`border-b border-white/[0.04] ${i % 2 === 0 ? 'bg-white/[0.01]' : ''}`}>
                    <td className="py-3 px-4 text-sm text-zinc-400">{feature.name}</td>
                    {['starter', 'pro', 'enterprise', 'max'].map(planId => {
                        const val = (feature as any)[planId];
                        return (
                            <td key={planId} className="text-center py-3 px-4">
                                {typeof val === 'boolean' ? (
                                    val ? <CheckCircle className="h-4 w-4 text-emerald-400 mx-auto" /> : <span className="text-zinc-700">—</span>
                                ) : (
                                    <span className="text-sm text-white font-medium">{val}</span>
                                )}
                            </td>
                        );
                    })}
                </tr>
            ))}
        </tbody>
        <tfoot>
            <tr>
                <td className="py-4 px-4" />
                {pricingPlans.map(plan => {
                    const isCurrent = currentPlan === plan.id;
                    return (
                        <td key={plan.id} className="text-center py-4 px-4">
                            {/* Same button logic as current — Subscribe / Current Plan / Contact Us */}
                        </td>
                    );
                })}
            </tr>
        </tfoot>
    </table>
</div>

{/* Mobile: Keep existing card layout */}
<div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-5">
    {/* Existing card markup — unchanged */}
</div>
```

**Key**: Desktop gets comparison table, mobile keeps cards (too narrow for table).

---

## Change 6: Inline AI Fix Per Finding

### [MODIFY] `dashboard/src/components/dashboard/scanner-accordion.tsx`

**Current**: AI fix prompt is a single modal (in `ai-fix-prompt.tsx`) that generates one big markdown prompt for all findings.

**Changes**: Add a small "AI Fix" button per finding row that expands an inline fix section.

In the findings loop inside `ScannerAccordion`, after each finding's recommendation block, add:

```tsx
{finding.recommendation && (
    <button
        onClick={() => setExpandedFix(expandedFix === finding.id ? null : finding.id)}
        className="mt-2 inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
    >
        <Sparkles className="h-3 w-3" />
        {expandedFix === finding.id ? 'Hide AI fix' : 'AI fix suggestion'}
    </button>
)}
{expandedFix === finding.id && (
    <div className="mt-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10 text-xs text-zinc-300 font-mono whitespace-pre-wrap">
        <p className="text-blue-400 font-sans font-medium mb-2 text-xs">Copy this to your AI coding assistant:</p>
        <pre className="text-zinc-400 text-[11px] leading-relaxed">
{`Fix the following issue in my ${url} project:

Issue: ${finding.title}
Severity: ${finding.severity}
Details: ${finding.description}
${finding.recommendation ? `\nRecommendation: ${finding.recommendation}` : ''}
${finding.evidence ? `\nEvidence: ${finding.evidence}` : ''}

Please provide the exact code changes needed.`}
        </pre>
        <button onClick={() => { navigator.clipboard.writeText(/*prompt text*/); toast.success('Copied!'); }}
            className="mt-2 text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1">
            <Copy className="h-3 w-3" /> Copy
        </button>
    </div>
)}
```

Add state: `const [expandedFix, setExpandedFix] = useState<string | null>(null);`

Add imports: `Sparkles`, `Copy` from lucide-react; `toast` from sonner.

**Keep the existing modal AI fix button** — it still generates the full combined prompt. The inline fix is per-finding.

---

## Change 7: Settings Tabs

### [MODIFY] `dashboard/src/app/dashboard/settings/page.tsx`

**Current**: Server component with stacked Profile + Security cards.

**Changes**: Convert to a client-side tabbed layout. The page must remain a server component for auth, so create a new client component for the tabs.

### [NEW] `dashboard/src/components/dashboard/settings-tabs.tsx`

```tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { User, Shield, CreditCard } from 'lucide-react';
import Link from 'next/link';
import { ManageSubscriptionButton } from '@/app/dashboard/settings/manage-subscription-button';

interface SettingsTabsProps {
    email: string;
    userId: string;
    createdAt: string;
    plan: string;
}

const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'billing', label: 'Billing', icon: CreditCard },
];

export function SettingsTabs({ email, userId, createdAt, plan }: SettingsTabsProps) {
    const [activeTab, setActiveTab] = useState('profile');

    return (
        <>
            {/* Tab bar */}
            <div className="flex gap-1 mb-6 border-b border-white/[0.06] pb-0">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                            activeTab === tab.id
                                ? 'text-white border-white'
                                : 'text-zinc-500 border-transparent hover:text-zinc-300'
                        }`}
                    >
                        <tab.icon className="h-4 w-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab content */}
            {activeTab === 'profile' && (
                <Card className="bg-white/[0.02] border-white/[0.06]">
                    {/* Existing Profile card content — move here */}
                </Card>
            )}
            {activeTab === 'security' && (
                <Card className="bg-white/[0.02] border-white/[0.06]">
                    {/* Existing Security card content — move here */}
                </Card>
            )}
            {activeTab === 'billing' && (
                <Card className="bg-white/[0.02] border-white/[0.06]">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <CreditCard className="h-5 w-5 text-zinc-400" />
                            <div>
                                <CardTitle className="text-white">Billing</CardTitle>
                                <CardDescription className="text-zinc-500">Manage your subscription</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-white">Current plan: <span className="capitalize">{plan}</span></p>
                                <p className="text-sm text-zinc-500">{plan === 'none' ? 'No active subscription' : 'Manage your plan and payment method'}</p>
                            </div>
                            {plan !== 'none' ? (
                                <ManageSubscriptionButton />
                            ) : (
                                <Button variant="outline" size="sm" asChild className="bg-transparent border-white/[0.08] hover:bg-white/[0.04]">
                                    <Link href="/dashboard/credits">View Plans</Link>
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}
        </>
    );
}
```

### [MODIFY] `dashboard/src/app/dashboard/settings/page.tsx`

Replace the stacked cards with:
```tsx
import { SettingsTabs } from '@/components/dashboard/settings-tabs';

// In return:
<SettingsTabs
    email={user?.email || ''}
    userId={user?.id || ''}
    createdAt={user?.created_at ? new Date(user.created_at).toLocaleDateString() : ''}
    plan={plan}
/>
```

---

## Change 8: Soft Plan Limit Upgrade Nudge

### [MODIFY] `dashboard/src/app/dashboard/projects/new/page.tsx`

**Current** (lines 126-139): Red error box with "Subscribe to a plan →" or "Upgrade for more projects →" links.

**Replace** the error handling for `PLAN_REQUIRED` and `PROJECT_LIMIT_REACHED` with a styled upgrade card:

```tsx
{errorCode === 'PLAN_REQUIRED' && (
    <div className="mb-6 p-5 rounded-xl border border-blue-500/20 bg-blue-500/5">
        <h3 className="text-white font-medium mb-1">Choose a plan to create projects</h3>
        <p className="text-zinc-400 text-sm mb-3">
            Start with Starter for 1 project and 5 scans/month, or go Pro for 3 projects and 20 scans.
        </p>
        <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-500 text-white">
            <Link href="/dashboard/credits">View Plans</Link>
        </Button>
    </div>
)}
{errorCode === 'PROJECT_LIMIT_REACHED' && (
    <div className="mb-6 p-5 rounded-xl border border-amber-500/20 bg-amber-500/5">
        <h3 className="text-white font-medium mb-1">Project limit reached</h3>
        <p className="text-zinc-400 text-sm mb-3">
            Upgrade to get more projects — Pro gives you 3, Enterprise gives you 10.
        </p>
        <Button asChild size="sm" className="bg-amber-600 hover:bg-amber-500 text-white">
            <Link href="/dashboard/credits">Upgrade Plan</Link>
        </Button>
    </div>
)}
```

Apply same pattern in `dashboard/src/app/dashboard/scans/new/page.tsx` for `SCAN_LIMIT_REACHED` and `DOMAIN_LIMIT_REACHED`.

---

## Change 9: Timeline History View

### [MODIFY] `dashboard/src/app/dashboard/projects/[id]/history/page.tsx`

**Current**: Uses `<ScansTable>` component for a table view.

**Replace** with a vertical timeline:

```tsx
{scans.map((scan: any, index: number) => {
    const issueCount = /* count issues from scan.results */;
    const score = scan.overall_score;
    const rating = getVibeRating(issueCount);
    const date = new Date(scan.created_at);
    const isFirst = index === 0;

    return (
        <div key={scan.id} className="relative flex gap-4 pb-8 last:pb-0">
            {/* Timeline line */}
            {index < scans.length - 1 && (
                <div className="absolute left-[17px] top-10 bottom-0 w-px bg-white/[0.06]" />
            )}
            {/* Timeline dot */}
            <div className={`relative z-10 mt-1 h-[35px] w-[35px] rounded-full flex items-center justify-center shrink-0 border ${
                isFirst ? 'bg-blue-500/15 border-blue-500/30' : 'bg-white/[0.03] border-white/[0.06]'
            }`}>
                <span className={`text-xs font-bold ${isFirst ? 'text-blue-400' : 'text-zinc-500'}`}>
                    {score ?? '—'}
                </span>
            </div>
            {/* Content */}
            <Link
                href={`/dashboard/projects/${params.id}/history/${scan.id}`}
                className="flex-1 group"
            >
                <div className="p-4 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                            <Badge className={`${rating.bg} ${rating.color} text-xs`}>{rating.label}</Badge>
                            {isFirst && <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-xs">Latest</Badge>}
                        </div>
                        <span className="text-xs text-zinc-600">{date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-sm text-zinc-400">
                        {issueCount} issue{issueCount !== 1 ? 's' : ''} found
                    </p>
                </div>
            </Link>
        </div>
    );
})}
```

Import `Badge`, `getVibeRating` helper (extract from `audit-report.tsx` or duplicate the small function), `Link`.

The page will need a `'use client'` wrapper component or an inline server→client boundary for the timeline rendering. Create a simple `<ScanTimeline>` client component if needed.

---

## Change 10: Score-First Hero Enhancement (Gradient Ring Animation)

### [MODIFY] `dashboard/src/components/dashboard/audit-report.tsx`

**Current** (around line 164-172): The score display is a large number inside a circular div with `border-white/[0.06]`.

**Enhance** with an SVG gradient ring that animates on load:

Replace the score circle div with:

```tsx
<div className="relative h-32 w-32 md:h-36 md:w-36 shrink-0">
    {/* Animated SVG ring */}
    <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="4" className="text-white/[0.06]" />
        <circle
            cx="60" cy="60" r="54" fill="none" strokeWidth="4"
            strokeLinecap="round"
            stroke="url(#scoreGradient)"
            strokeDasharray={`${(score / 100) * 339.292} 339.292`}
            className="transition-all duration-1000 ease-out"
            style={{ strokeDashoffset: 0 }}
        />
        <defs>
            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
        </defs>
    </svg>
    {/* Score number (centered) */}
    <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-4xl md:text-5xl font-heading font-bold ${getIssueCountColor(issueCount)}`}>
            {issueCount}
        </span>
        <span className="text-[10px] text-zinc-500 mt-0.5">
            +{passingCheckCount} passing
        </span>
    </div>
</div>
```

The `score` value should be a computed weighted average from `results` (already exists as `overall_score` on the scan record). If not available in AuditReport props, compute it from `results` using scanner weights.

---

## Replace Inline Alerts with Sonner Toasts

### Files to update (search & replace pattern):

All files that use inline `{error && <div className="...text-red-500...">` or `{success && <div className="...text-green-500...">}` patterns:

1. **`projects/new/page.tsx`** — Replace generic error alert with `toast.error(error)` (keep upgrade nudges from Change 8 as cards, not toasts)
2. **`projects/[id]/settings/page.tsx`** — Replace success/error inline boxes with `toast.success('Settings saved')` / `toast.error()`
3. **`scans/new/page.tsx`** — Same pattern (keep upgrade nudges as cards)
4. **`api-keys/page.tsx`** — Replace inline status messages
5. **`credits/page.tsx`** — Replace error div with `toast.error()`

Each file: `import { toast } from 'sonner'`, remove the state variable for error/success display, call `toast.error()` or `toast.success()` in the catch/success handlers.

---

## Verification

### Build Check
```bash
cd dashboard && npm install && npm run build
```

### Manual Smoke Tests
1. **Sidebar collapse**: Click toggle → sidebar shrinks to icons → click again → expands. Reload page → preference persisted.
2. **New project form**: Step 1 shows name/URL only → "Next" validates → Step 2 shows GitHub/Backend → "Back" returns to Step 1 → "Create" submits.
3. **Scan loading**: Progress bar animates 0→85% → tips rotate every 4s → results load and replace.
4. **Pricing table**: Desktop shows comparison table with checkmarks → Mobile shows card layout.
5. **Inline AI fix**: Click "AI fix suggestion" on a finding → inline code block expands → copy works.
6. **Settings tabs**: 3 tabs render → clicking switches content → Billing tab shows plan + manage button.
7. **Plan limits**: Create project when at limit → styled upgrade card appears (not red error box).
8. **Timeline**: History page shows vertical timeline with scores → click entry navigates to scan detail.
9. **Score ring**: Audit report shows animated gradient ring around issue count.
10. **Toasts**: Actions show bottom-center stacked toasts instead of inline colored boxes.

### Files Modified (10)
- `dashboard/package.json` — add sonner dependency
- `dashboard/src/app/layout.tsx` — add Toaster component
- `dashboard/src/app/dashboard/layout.tsx` — collapsible sidebar
- `dashboard/src/app/dashboard/projects/new/page.tsx` — two-step form + upgrade nudges
- `dashboard/src/app/dashboard/scans/[id]/loading.tsx` — progress bar + tips
- `dashboard/src/app/dashboard/credits/page.tsx` — comparison table
- `dashboard/src/app/dashboard/settings/page.tsx` — use SettingsTabs component
- `dashboard/src/app/dashboard/projects/[id]/history/page.tsx` — timeline view
- `dashboard/src/components/dashboard/audit-report.tsx` — gradient score ring
- `dashboard/src/components/dashboard/scanner-accordion.tsx` — inline AI fix per finding

### Files Created (1)
- `dashboard/src/components/dashboard/settings-tabs.tsx` — tabbed settings component

### Files Updated for Sonner (~5)
- `dashboard/src/app/dashboard/projects/[id]/settings/page.tsx`
- `dashboard/src/app/dashboard/scans/new/page.tsx`
- `dashboard/src/app/dashboard/api-keys/page.tsx`
- `dashboard/src/app/dashboard/credits/page.tsx`
