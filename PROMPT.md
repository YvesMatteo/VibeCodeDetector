# Goal

Incrementally improve the CheckVibe dashboard UI/UX based on user quiz preferences — subtle, focused changes that make the app more understandable, flowy, and user-friendly. **Do NOT overhaul the existing design** — layer improvements on top of the current dark aesthetic.

## Context

- **Stack**: Next.js 16 + Supabase + Stripe + Tailwind + shadcn/ui + Lucide icons
- **Dashboard dir**: `dashboard/` with its own `.env.local`
- **Current UI**: Dark theme, 56px fixed sidebar, card-based layouts, skeleton scan loading, inline error alerts
- **30 security scanners** wired and working — don't touch scanner logic
- **Existing pages**: Landing (waitlist), dashboard (project grid), project CRUD, scan results, API keys, credits/billing, settings

## Key Files

- **Sidebar/Layout**: `dashboard/src/app/dashboard/layout.tsx`
- **Project Dashboard**: `dashboard/src/app/dashboard/page.tsx`
- **Project Card**: `dashboard/src/components/dashboard/project-card.tsx`
- **New Project**: `dashboard/src/app/dashboard/projects/new/page.tsx`
- **Scan Results**: `dashboard/src/app/dashboard/scans/[id]/page.tsx`
- **AuditReport**: `dashboard/src/components/dashboard/audit-report.tsx`
- **Scan Loading**: `dashboard/src/app/dashboard/scans/[id]/loading.tsx`
- **AI Fix Prompt**: `dashboard/src/components/dashboard/ai-fix-prompt.tsx`
- **Credits/Billing**: `dashboard/src/app/dashboard/credits/page.tsx`
- **API Keys**: `dashboard/src/app/dashboard/api-keys/page.tsx`
- **Settings**: `dashboard/src/app/dashboard/settings/page.tsx`
- **Scan History**: `dashboard/src/app/dashboard/projects/[id]/history/page.tsx`
- **ScansTable**: `dashboard/src/components/dashboard/scans-table.tsx`

## Requirements

### Must-Do (Incremental UX Improvements)
1. **Collapsible sidebar** — Add toggle to collapse/expand sidebar to icon-only mode, persist in localStorage
2. **Two-step project form** — Split into Step 1 (Name + URL) → Step 2 (GitHub + Backend), same page with step indicator
3. **Sonner toasts** — Install `sonner`, replace all inline green/red alert boxes with stacked bottom-center toasts
4. **Scan loading progress bar** — Replace skeleton with animated progress bar + rotating security tips
5. **Comparison table pricing** — Convert credits page from card grid to feature comparison table with checkmarks
6. **Inline AI fixes** — Move AI fix from modal to inline expandable per finding in ScannerAccordion
7. **Settings tabs** — Convert single scroll to tabbed layout (Profile | Security | Billing)
8. **Soft plan limit blocks** — Replace error-only limit messages with upgrade nudge showing what they'd get
9. **Timeline history** — Replace scan history table with vertical timeline view showing score at each point
10. **Score-first hero enhancement** — Animate the existing score display with a gradient ring/gauge animation

### Nice-to-Have (If Time Permits)
- Guided onboarding wizard (3-step for first-time users)
- Kanban toggle for project view (Healthy / Needs Attention / Critical columns)
- Bottom tab bar for mobile navigation
- Interactive API key tutorial
- Subtle gradient accents on cards and buttons

### Hard Constraints
- **Dark-only** theme — no light mode
- **No keyboard shortcuts**
- **Keep waitlist/passcode gate as-is**
- **Keep error states minimal** (short text + action button)
- **Don't break** scanners, Stripe billing, API keys, auth
- **Don't change** the landing page or waitlist page
- **Preserve mobile responsiveness**
- **Subtle changes only** — user explicitly said "don't change the UI too much"
