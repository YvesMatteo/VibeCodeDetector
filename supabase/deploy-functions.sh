#!/usr/bin/env bash
# Deploy all edge functions WITH JWT verification enabled.
# Requires: SUPABASE_ACCESS_TOKEN env var set
#
# The scan API route already sends Authorization: Bearer <jwt> on every request
# (user's access token for session auth, anon key for API key auth).
# Edge functions still validate x-scanner-key as additional auth layer.
#
# Usage: ./supabase/deploy-functions.sh

set -euo pipefail

if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ]; then
  echo "Error: SUPABASE_ACCESS_TOKEN is required"
  exit 1
fi

PROJECT_REF="vlffoepzknlbyxhkmwmn"

FUNCTIONS=(
  security-headers-scanner
  api-key-scanner
  legal-scanner
  threat-scanner
  sqli-scanner
  tech-scanner
  github-scanner
  cors-scanner
  csrf-scanner
  cookie-scanner
  auth-scanner
  supabase-scanner
  firebase-scanner
  convex-scanner
  deps-scanner
  ssl-scanner
  dns-scanner
  xss-scanner
  redirect-scanner
  scorecard-scanner
  github-security-scanner
  supabase-mgmt-scanner
  vercel-scanner
  netlify-scanner
  cloudflare-scanner
  railway-scanner
  vibe-scanner
  ddos-scanner
  upload-scanner
  audit-scanner
  mobile-scanner
)

echo "Deploying ${#FUNCTIONS[@]} edge functions to project $PROJECT_REF..."
echo "JWT verification: ENABLED (no --no-verify-jwt flag)"
echo ""

FAILED=0
for fn in "${FUNCTIONS[@]}"; do
  echo -n "  Deploying $fn... "
  if supabase functions deploy "$fn" --project-ref "$PROJECT_REF" 2>/dev/null; then
    echo "OK"
  else
    echo "FAILED"
    FAILED=$((FAILED + 1))
  fi
done

echo ""
if [ $FAILED -eq 0 ]; then
  echo "All ${#FUNCTIONS[@]} functions deployed successfully."
else
  echo "WARNING: $FAILED function(s) failed to deploy."
  exit 1
fi
