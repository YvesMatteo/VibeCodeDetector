---
name: Supabase Integration
description: Guidelines for integrating Supabase auth, database, and real-time features in VibeCheck
---

# Supabase Integration for VibeCheck

This skill covers patterns for using Supabase as the backend for VibeCheck's authentication, database, and real-time features.

## Project Context

VibeCheck uses Supabase for:
- **Authentication**: User sign-up, login, and session management
- **Database**: PostgreSQL for storing scan jobs, results, user profiles, and competitors
- **Real-time**: Updates for scan progress and notifications

## Database Schema Reference

```sql
-- User profiles (extends Supabase Auth)
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    subscription_tier TEXT DEFAULT 'free',
    scans_used INTEGER DEFAULT 0,
    scans_limit INTEGER DEFAULT 3,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scan jobs
CREATE TABLE scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_profiles(id),
    target_url TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, running, completed, failed
    scan_types TEXT[], -- ['security', 'seo', 'legal', etc.]
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Scan results
CREATE TABLE scan_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_id UUID REFERENCES scans(id),
    scanner_type TEXT NOT NULL,
    score INTEGER,
    findings JSONB,
    recommendations JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Competitor tracking
CREATE TABLE competitors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES user_profiles(id),
    competitor_url TEXT NOT NULL,
    tracking_enabled BOOLEAN DEFAULT true,
    last_scanned TIMESTAMPTZ
);
```

## Row Level Security (RLS) Policies

Always enable RLS on all tables. Example policies:

```sql
-- Enable RLS
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;

-- Users can only see their own scans
CREATE POLICY "Users can view own scans"
ON scans FOR SELECT
USING (auth.uid() = user_id);

-- Users can create scans (with limit check)
CREATE POLICY "Users can create scans"
ON scans FOR INSERT
WITH CHECK (auth.uid() = user_id);
```

## Client Setup (Next.js)

### Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Client Creation
```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### Server Client (for API routes)
```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createServerSupabaseClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}
```

## Common Patterns

### Checking Scan Limits
```typescript
async function canUserScan(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('user_profiles')
    .select('scans_used, scans_limit')
    .eq('id', userId)
    .single()
  
  return data ? data.scans_used < data.scans_limit : false
}
```

### Incrementing Scan Count
```typescript
async function incrementScanCount(userId: string) {
  await supabase.rpc('increment_scan_count', { user_id: userId })
}
```

### Real-time Scan Updates
```typescript
const channel = supabase
  .channel('scan-updates')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'scans',
      filter: `id=eq.${scanId}`
    },
    (payload) => {
      console.log('Scan updated:', payload.new)
    }
  )
  .subscribe()
```

## Best Practices

1. **Always use RLS** - Never rely on client-side filtering alone
2. **Use service role sparingly** - Only in trusted server environments
3. **Validate inputs** - Use Zod or similar before database operations
4. **Handle errors gracefully** - Supabase returns `{ data, error }` objects
5. **Use transactions** - For operations that must be atomic (use `rpc` functions)
