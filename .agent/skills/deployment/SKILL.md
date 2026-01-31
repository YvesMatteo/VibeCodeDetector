---
name: Deployment
description: Deploying VibeCheck frontend to Vercel and backend services to Railway/Fly.io
---

# Deployment for VibeCheck

This skill covers deploying the VibeCheck platform across multiple providers.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Cloudflare CDN                         │
└─────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
┌────────▼────────┐  ┌────────▼────────┐  ┌───────▼───────┐
│     Vercel      │  │   Railway/Fly   │  │   Supabase    │
│   (Next.js UI)  │  │  (Scanner APIs) │  │   (Database)  │
└─────────────────┘  └─────────────────┘  └───────────────┘
```

## Vercel Deployment (Frontend)

### Setup

1. Connect GitHub repo to Vercel
2. Configure build settings:
   - Framework Preset: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`

### Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# App
NEXT_PUBLIC_APP_URL=https://vibecheck.app
```

### vercel.json

```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["iad1"],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "no-store" }
      ]
    }
  ]
}
```

## Railway Deployment (Scanner Workers)

### Dockerfile for Scanner Service

```dockerfile
# Dockerfile
FROM node:20-slim

# Install Chromium for Playwright
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    libgbm1 \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .

CMD ["node", "dist/worker.js"]
```

### railway.json

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "startCommand": "node dist/worker.js",
    "healthcheckPath": "/health",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

### Environment Variables (Railway)

```env
NODE_ENV=production
REDIS_URL=redis://...
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

## Fly.io Alternative (Scanner Workers)

### fly.toml

```toml
app = "vibecheck-scanners"
primary_region = "iad"

[build]
  dockerfile = "Dockerfile"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 1

[env]
  NODE_ENV = "production"

[[services]]
  protocol = "tcp"
  internal_port = 3000

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]
```

### Deploy Commands

```bash
# Install Fly CLI
# Windows: winget install flyctl

# Login
fly auth login

# Launch app
fly launch --name vibecheck-scanners

# Set secrets
fly secrets set REDIS_URL=redis://... SUPABASE_URL=...

# Deploy
fly deploy
```

## Redis (Upstash)

VibeCheck uses Upstash Redis for job queues:

1. Create account at [upstash.com](https://upstash.com)
2. Create new Redis database
3. Copy connection string to `REDIS_URL`

```typescript
// lib/redis.ts
import { Redis } from '@upstash/redis';

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});
```

## CI/CD with GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'

  deploy-workers:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to Railway
        uses: bervProject/railway-deploy@main
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
          service: scanner-workers
```

## Health Checks

Implement health endpoints for monitoring:

```typescript
// app/api/health/route.ts
export async function GET() {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    stripe: await checkStripe(),
  };
  
  const healthy = Object.values(checks).every(Boolean);
  
  return Response.json(
    { status: healthy ? 'healthy' : 'unhealthy', checks },
    { status: healthy ? 200 : 503 }
  );
}
```

## Monitoring Setup

1. **Vercel Analytics** - Enable in project settings
2. **Sentry** - Error tracking
3. **Upstash** - Redis metrics
4. **Supabase Dashboard** - Database metrics

## Rollback Procedure

### Vercel
```bash
# List deployments
vercel ls

# Rollback to previous
vercel rollback [deployment-url]
```

### Railway
```bash
railway rollback
```

### Fly.io
```bash
fly releases
fly deploy --image registry.fly.io/vibecheck-scanners:previous-version
```
