# Full Codebase Improvement Sprint

## Goal
Implement all 37 improvement recommendations from the 5-team codebase audit across UI/UX, Backend, Scanners, Growth, and DX.

## Requirements
- Fix all critical/high priority issues first
- Maintain backward compatibility
- Don't break existing functionality
- Build passes after each phase

## Constraints
- Use existing Tailwind/shadcn theme
- No major dependency additions without clear justification
- Supabase typed client workaround: `.from('table' as any)`
- Edge functions deployed with `--no-verify-jwt`

## Success Criteria
- Build passes with `ignoreBuildErrors: false`
- All critical backend bugs fixed (score inflation, timeouts)
- Project settings page exists and works
- Scanner accuracy improved (legal, CSP, CSRF, SQLi)
- Shareable public scan reports
- Usage quota display on dashboard
- Onboarding flow for new users
