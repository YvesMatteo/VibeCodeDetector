---
<<<<<<< Updated upstream
name: Next.js Dashboard Development
description: Build and maintain the VibeCheck dashboard UI with Next.js, React, and Tailwind CSS
---

# Next.js Dashboard Development

This skill provides guidance for building the VibeCheck user dashboard with Next.js.

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | Next.js 14+ (App Router) |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui |
| State | React hooks + Supabase realtime |
| Auth | Supabase Auth |
| Forms | React Hook Form + Zod |
=======
name: Next.js Dashboard
description: Patterns for building VibeCheck's dashboard UI with Next.js 14+, React, and Tailwind CSS
---

# Next.js Dashboard Development for VibeCheck

This skill covers UI patterns for building VibeCheck's user dashboard using Next.js 14+ App Router, React, TypeScript, and Tailwind CSS.
>>>>>>> Stashed changes

## Project Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
<<<<<<< Updated upstream
│   │   ├── signup/page.tsx
│   │   └── reset-password/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Dashboard home
│   │   ├── scans/
│   │   │   ├── page.tsx          # Scan history
│   │   │   ├── new/page.tsx      # New scan
│   │   │   └── [id]/page.tsx     # Scan details
│   │   ├── competitors/
│   │   │   └── page.tsx
│   │   ├── reports/
│   │   │   └── page.tsx
│   │   └── settings/
│   │       └── page.tsx
│   ├── api/
│   │   ├── scans/route.ts
│   │   └── webhooks/
│   │       └── stripe/route.ts
│   ├── layout.tsx
│   └── page.tsx                  # Landing page
├── components/
│   ├── ui/                       # shadcn components
│   ├── dashboard/
│   │   ├── sidebar.tsx
│   │   ├── header.tsx
│   │   └── scan-card.tsx
│   ├── scans/
│   │   ├── scan-form.tsx
│   │   ├── scan-results.tsx
│   │   └── score-gauge.tsx
│   └── charts/
│       └── findings-chart.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   ├── stripe.ts
│   └── utils.ts
├── hooks/
│   ├── use-user.ts
│   ├── use-scans.ts
│   └── use-subscription.ts
└── types/
    └── database.ts               # Generated Supabase types
```

## Project Initialization

```bash
# Create Next.js app
npx -y create-next-app@latest ./ --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

# Install dependencies
npm install @supabase/supabase-js @supabase/ssr stripe @stripe/stripe-js
npm install react-hook-form @hookform/resolvers zod
npm install recharts lucide-react

# Initialize shadcn/ui
npx -y shadcn@latest init
npx -y shadcn@latest add button card input form dialog sheet
```

## Supabase Client Setup

### Browser Client (`lib/supabase/client.ts`)

```typescript
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
=======
│   │   └── signup/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx         # Dashboard layout with sidebar
│   │   ├── page.tsx           # Dashboard home
│   │   ├── scans/
│   │   │   ├── page.tsx       # Scan history
│   │   │   ├── new/page.tsx   # New scan form
│   │   │   └── [id]/page.tsx  # Scan results
│   │   ├── competitors/page.tsx
│   │   └── settings/page.tsx
│   ├── api/
│   │   └── scans/route.ts
│   ├── layout.tsx
│   └── page.tsx               # Landing page
├── components/
│   ├── ui/                    # Reusable UI components
│   ├── dashboard/             # Dashboard-specific components
│   └── scanners/              # Scanner result components
├── lib/
│   ├── supabase/
│   └── utils.ts
└── types/
```

## Dashboard Layout

```tsx
// app/(dashboard)/layout.tsx
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
>>>>>>> Stashed changes
  );
}
```

<<<<<<< Updated upstream
### Server Client (`lib/supabase/server.ts`)

```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );
}
```

## Authentication Flow

### Login Page

```typescript
'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  
  async function handleLogin(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (!error) {
      router.push('/dashboard');
    }
  }
  
  // ... form implementation
}
```

### Protected Routes Middleware

```typescript
// middleware.ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) => cookies.forEach(c => response.cookies.set(c)),
      },
    }
  );
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  return response;
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
```

## Dashboard Components

### Scan Score Gauge

```typescript
interface ScoreGaugeProps {
  score: number;
  label: string;
}

export function ScoreGauge({ score, label }: ScoreGaugeProps) {
  const getColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    if (score >= 40) return 'text-orange-500';
    return 'text-red-500';
  };
  
  return (
    <div className="flex flex-col items-center">
      <div className={`text-4xl font-bold ${getColor(score)}`}>
        {score}
      </div>
      <div className="text-sm text-muted-foreground">{label}</div>
=======
## Key Dashboard Components

### Score Display Component

```tsx
// components/dashboard/score-display.tsx
interface ScoreDisplayProps {
  score: number;
  label: string;
  size?: 'sm' | 'md' | 'lg';
}

export function ScoreDisplay({ score, label, size = 'md' }: ScoreDisplayProps) {
  const getColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };
  
  const sizes = {
    sm: 'text-2xl',
    md: 'text-4xl',
    lg: 'text-6xl',
  };
  
  return (
    <div className="flex flex-col items-center">
      <span className={`font-bold ${sizes[size]} ${getColor(score)}`}>
        {score}
      </span>
      <span className="text-gray-500 text-sm">{label}</span>
>>>>>>> Stashed changes
    </div>
  );
}
```

<<<<<<< Updated upstream
### Findings Summary Card

```typescript
interface FindingsSummaryProps {
  findings: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export function FindingsSummary({ findings }: FindingsSummaryProps) {
  return (
    <div className="flex gap-4">
      <Badge variant="destructive">🔴 {findings.critical} Critical</Badge>
      <Badge variant="warning">🟠 {findings.high} High</Badge>
      <Badge variant="secondary">🟡 {findings.medium} Medium</Badge>
      <Badge variant="outline">🟢 {findings.low} Low</Badge>
=======
### Findings List Component

```tsx
// components/scanners/findings-list.tsx
import { Finding } from '@/types/scanner';

const severityColors = {
  critical: 'bg-red-100 text-red-800 border-red-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  low: 'bg-blue-100 text-blue-800 border-blue-200',
  info: 'bg-gray-100 text-gray-800 border-gray-200',
};

export function FindingsList({ findings }: { findings: Finding[] }) {
  return (
    <div className="space-y-3">
      {findings.map((finding) => (
        <div
          key={finding.id}
          className={`p-4 rounded-lg border ${severityColors[finding.severity]}`}
        >
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">{finding.title}</h4>
            <span className="text-xs uppercase font-medium">
              {finding.severity}
            </span>
          </div>
          <p className="text-sm mt-1 opacity-80">{finding.description}</p>
          {finding.location && (
            <p className="text-xs mt-2 font-mono opacity-60">{finding.location}</p>
          )}
        </div>
      ))}
>>>>>>> Stashed changes
    </div>
  );
}
```

<<<<<<< Updated upstream
## API Routes

### Create Scan

```typescript
// app/api/scans/route.ts
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { targetUrl, scanTypes } = await request.json();
  
  // Check scan limits
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('scans_used, scans_limit')
    .eq('id', user.id)
    .single();
    
  if (profile && profile.scans_used >= profile.scans_limit) {
    return NextResponse.json({ error: 'Scan limit reached' }, { status: 403 });
  }
  
  // Create scan
  const { data: scan, error } = await supabase
    .from('scans')
    .insert({
      user_id: user.id,
      target_url: targetUrl,
      scan_types: scanTypes,
      status: 'pending',
    })
    .select()
    .single();
    
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  // Increment scans_used
  await supabase
    .from('user_profiles')
    .update({ scans_used: profile.scans_used + 1 })
    .eq('id', user.id);
  
  // TODO: Queue scan job
  
  return NextResponse.json(scan);
}
```

## Real-time Scan Updates

```typescript
=======
### Scan Progress Component

```tsx
// components/scanners/scan-progress.tsx
>>>>>>> Stashed changes
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

<<<<<<< Updated upstream
export function useScanStatus(scanId: string) {
  const [status, setStatus] = useState<string>('pending');
  const supabase = createClient();
  
  useEffect(() => {
    const channel = supabase
      .channel(`scan:${scanId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'scans',
          filter: `id=eq.${scanId}`,
        },
        (payload) => {
          setStatus(payload.new.status);
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [scanId]);
  
  return status;
}
```

## Environment Variables

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Styling Guidelines

1. **Dark Mode First** - Design for dark mode, add light mode support
2. **Use CSS Variables** - Leverage Tailwind's CSS variable system
3. **Consistent Spacing** - Use Tailwind's spacing scale (p-4, gap-6, etc.)
4. **Responsive** - Mobile-first, use sm/md/lg breakpoints
5. **Animations** - Subtle transitions (150-300ms) for interactions

## Performance Tips

1. Use React Server Components where possible
2. Implement loading.tsx for streaming
3. Use Image component for optimized images
4. Lazy load heavy components (charts, editors)
5. Cache API responses with React Query or SWR
=======
export function ScanProgress({ scanId }: { scanId: string }) {
  const [status, setStatus] = useState('pending');
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    const supabase = createClient();
    
    const channel = supabase
      .channel(`scan-${scanId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'scans',
        filter: `id=eq.${scanId}`,
      }, (payload) => {
        setStatus(payload.new.status);
        // Calculate progress based on completed scanner types
      })
      .subscribe();
    
    return () => { supabase.removeChannel(channel); };
  }, [scanId]);
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>Scanning...</span>
        <span>{progress}%</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
```

## New Scan Form

```tsx
// app/(dashboard)/scans/new/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const SCAN_TYPES = [
  { id: 'security', label: 'Security', icon: '🔒' },
  { id: 'api-keys', label: 'API Key Leaks', icon: '🔑' },
  { id: 'seo', label: 'SEO', icon: '📈' },
  { id: 'legal', label: 'Legal Compliance', icon: '⚖️' },
  { id: 'ai-detection', label: 'AI Detection', icon: '🤖' },
];

export default function NewScanPage() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['security']);
  const [isLoading, setIsLoading] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    const res = await fetch('/api/scans', {
      method: 'POST',
      body: JSON.stringify({ url, scanTypes: selectedTypes }),
    });
    
    const { scanId } = await res.json();
    router.push(`/scans/${scanId}`);
  };
  
  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <div>
        <label className="block text-sm font-medium mb-2">Website URL</label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          className="w-full px-4 py-2 border rounded-lg"
          required
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-2">Scan Types</label>
        <div className="grid grid-cols-2 gap-3">
          {SCAN_TYPES.map((type) => (
            <button
              key={type.id}
              type="button"
              onClick={() => {
                setSelectedTypes((prev) =>
                  prev.includes(type.id)
                    ? prev.filter((t) => t !== type.id)
                    : [...prev, type.id]
                );
              }}
              className={`p-3 border rounded-lg text-left transition ${
                selectedTypes.includes(type.id)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200'
              }`}
            >
              <span className="mr-2">{type.icon}</span>
              {type.label}
            </button>
          ))}
        </div>
      </div>
      
      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {isLoading ? 'Starting Scan...' : 'Start Scan'}
      </button>
    </form>
  );
}
```

## Design System Colors

Use consistent colors across the dashboard:

```css
/* globals.css */
:root {
  --color-critical: 239 68 68;  /* red-500 */
  --color-high: 249 115 22;     /* orange-500 */
  --color-medium: 234 179 8;    /* yellow-500 */
  --color-low: 59 130 246;      /* blue-500 */
  --color-success: 34 197 94;   /* green-500 */
}
```

## Best Practices

1. **Use Server Components** by default, add 'use client' only when needed
2. **Implement loading states** using `loading.tsx` files
3. **Handle errors** with `error.tsx` boundaries
4. **Optimize images** with `next/image`
5. **Use Suspense** for streaming and progressive loading
6. **Implement proper SEO** with metadata API
>>>>>>> Stashed changes
