# Goal

Create internal Changelog and Docs pages for the CheckVibe dashboard, replacing external links with in-app routes.

## Context

- **Stack**: Next.js 16 + Supabase + Tailwind + shadcn/ui + Lucide icons
- **Dashboard dir**: `dashboard/` with sidebar navigation in `layout.tsx`
- **Sidebar links** for Docs and Changelog previously pointed to external URLs

## Requirements
- [x] Changelog page at `/dashboard/changelog` with version history timeline
- [x] Docs page at `/dashboard/docs` with API reference, scanners, rate limits, MCP integration
- [x] Update sidebar links from external URLs to internal routes with active state highlighting
- [x] Match existing dark theme design language

## Success Criteria
- [x] Both pages render without errors
- [x] Sidebar links navigate to internal pages with active highlighting
- [x] Build passes successfully
