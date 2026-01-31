---
name: Scanner Development
<<<<<<< Updated upstream
description: Guidelines for building the 6 scanner microservices for VibeCheck
---

# Scanner Development

This skill provides patterns and guidelines for developing VibeCheck's scanner microservices.

## Scanner Types

| Scanner | Purpose | Key Technologies |
|---------|---------|------------------|
| **Security** | Vulnerability detection, headers, SSL | OWASP ZAP, custom rules |
| **API Keys** | Credential leak detection | Regex, entropy analysis |
| **AI Detection** | Identify AI-generated sites | ML model, pattern matching |
| **Legal** | Compliance and claim verification | NLP, rules engine |
| **SEO** | Technical and on-page SEO | Lighthouse, schema validator |
| **Competitor** | Tech stack and traffic analysis | Wappalyzer-style detection |

## Scanner Architecture Pattern

Each scanner should follow this structure:

```
scanner-<name>/
├── src/
│   ├── index.ts          # Main entry point
│   ├── scanner.ts        # Core scanning logic
│   ├── patterns/         # Detection patterns
│   │   └── rules.ts
│   ├── analyzers/        # Specific analyzers
│   │   └── *.ts
│   └── types.ts          # TypeScript interfaces
├── tests/
│   └── scanner.test.ts
├── package.json
└── Dockerfile
```

## Common Scanner Interface

All scanners should implement this interface:

```typescript
interface ScannerResult {
  scanId: string;
  scannerType: ScannerType;
  score: number;           // 0-100
  findings: Finding[];
  recommendations: Recommendation[];
  metadata: Record<string, unknown>;
  completedAt: Date;
}

interface Finding {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  title: string;
  description: string;
  location?: string;       // URL, file path, or code location
  evidence?: string;       // Proof of finding
  remediation?: string;    // How to fix
}

interface Recommendation {
  priority: number;        // 1 = highest priority
  title: string;
  description: string;
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
}

type ScannerType = 
  | 'security'
  | 'api_keys'
  | 'ai_detection'
  | 'legal'
  | 'seo'
  | 'competitor';
```

## Scanner Implementation Template

```typescript
import { Browser, chromium } from 'playwright';

export class BaseScanner {
  protected browser: Browser | null = null;
  
  async initialize(): Promise<void> {
    this.browser = await chromium.launch({ headless: true });
  }
  
  async cleanup(): Promise<void> {
    await this.browser?.close();
  }
  
  abstract async scan(url: string): Promise<ScannerResult>;
  
  protected calculateScore(findings: Finding[]): number {
    const weights = { critical: 25, high: 15, medium: 8, low: 3, info: 0 };
    const deductions = findings.reduce((sum, f) => sum + weights[f.severity], 0);
    return Math.max(0, 100 - deductions);
=======
description: Patterns for creating new scanner microservices for VibeCheck
---

# Scanner Development for VibeCheck

This skill covers how to create new scanner modules that analyze websites for security, SEO, legal compliance, API key leaks, and AI detection.

## Scanner Architecture

Each scanner is an independent module that:
1. Receives a target URL and configuration
2. Performs analysis
3. Returns a structured result with score, findings, and recommendations

```
┌─────────────────────────────────────────────────┐
│                 Scanner Interface                │
├─────────────────────────────────────────────────┤
│  Input: { url, options }                        │
│  Output: { score, findings[], recommendations[] }│
└─────────────────────────────────────────────────┘
```

## Scanner Types

| Scanner | Purpose | Key Checks |
|---------|---------|------------|
| **Security** | Find vulnerabilities | XSS, CSRF, headers, HTTPS |
| **API Key Leak** | Detect exposed secrets | AWS, Stripe, Firebase, OpenAI keys |
| **AI Detection** | Identify vibe-coded sites | Code patterns, design fingerprints |
| **Legal** | Check compliance | GDPR, privacy policy, claims |
| **SEO** | Audit optimization | Meta tags, Core Web Vitals, structure |
| **Competitor** | Analyze competition | Tech stack, traffic, content |

## Base Scanner Interface

```typescript
// types/scanner.ts
export interface ScannerInput {
  url: string;
  options?: Record<string, unknown>;
}

export interface Finding {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  location?: string;
  evidence?: string;
}

export interface Recommendation {
  id: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  effort: 'quick' | 'moderate' | 'significant';
}

export interface ScanResult {
  scannerType: string;
  score: number; // 0-100
  findings: Finding[];
  recommendations: Recommendation[];
  metadata?: Record<string, unknown>;
  scannedAt: Date;
}

export interface Scanner {
  name: string;
  scan(input: ScannerInput): Promise<ScanResult>;
}
```

## Creating a New Scanner

### 1. Security Headers Scanner Example

```typescript
// scanners/security-headers.ts
import { Scanner, ScannerInput, ScanResult, Finding } from '@/types/scanner';

export class SecurityHeadersScanner implements Scanner {
  name = 'security-headers';
  
  private readonly requiredHeaders = [
    { name: 'Strict-Transport-Security', severity: 'high' as const },
    { name: 'Content-Security-Policy', severity: 'high' as const },
    { name: 'X-Frame-Options', severity: 'medium' as const },
    { name: 'X-Content-Type-Options', severity: 'medium' as const },
    { name: 'Referrer-Policy', severity: 'low' as const },
    { name: 'Permissions-Policy', severity: 'low' as const },
  ];

  async scan(input: ScannerInput): Promise<ScanResult> {
    const response = await fetch(input.url, { method: 'HEAD' });
    const headers = response.headers;
    
    const findings: Finding[] = [];
    let score = 100;
    
    for (const { name, severity } of this.requiredHeaders) {
      if (!headers.has(name)) {
        const deduction = severity === 'high' ? 15 : severity === 'medium' ? 10 : 5;
        score -= deduction;
        
        findings.push({
          id: `missing-${name.toLowerCase()}`,
          severity,
          title: `Missing ${name} header`,
          description: `The ${name} security header is not set.`,
        });
      }
    }
    
    return {
      scannerType: this.name,
      score: Math.max(0, score),
      findings,
      recommendations: this.generateRecommendations(findings),
      scannedAt: new Date(),
    };
  }
  
  private generateRecommendations(findings: Finding[]) {
    return findings.map(f => ({
      id: `fix-${f.id}`,
      priority: f.severity === 'critical' ? 'high' : f.severity,
      title: `Add ${f.title.replace('Missing ', '')}`,
      description: `Configure your server to send the appropriate header.`,
      effort: 'quick' as const,
    }));
>>>>>>> Stashed changes
  }
}
```

<<<<<<< Updated upstream
---

## Security Scanner

### Detection Categories

1. **Vulnerability Detection**
   - SQL Injection patterns in forms/URLs
   - XSS vulnerabilities (reflected, stored)
   - CSRF token presence
   - IDOR patterns

2. **Security Headers**
   ```typescript
   const REQUIRED_HEADERS = [
     'Content-Security-Policy',
     'X-Frame-Options',
     'X-Content-Type-Options',
     'Referrer-Policy',
     'Permissions-Policy',
     'Strict-Transport-Security'
   ];
   ```

3. **SSL/TLS Analysis**
   - Certificate validity
   - TLS version (require 1.2+)
   - HSTS implementation
   - Mixed content detection

4. **Authentication Audit**
   - Password policy indicators
   - Rate limiting detection
   - Session cookie flags (HttpOnly, Secure, SameSite)

---

## API Key Scanner

### Detection Patterns

```typescript
const API_KEY_PATTERNS: Record<string, RegExp> = {
  // AWS
  aws_access_key: /AKIA[0-9A-Z]{16}/,
  aws_secret_key: /[0-9a-zA-Z/+=]{40}/,
  
  // Google Cloud
  google_api_key: /AIza[0-9A-Za-z-_]{35}/,
  google_oauth: /[0-9]+-[0-9A-Za-z_]{32}\.apps\.googleusercontent\.com/,
  
  // Stripe
  stripe_publishable: /pk_(live|test)_[0-9a-zA-Z]{24,}/,
  stripe_secret: /sk_(live|test)_[0-9a-zA-Z]{24,}/,
  
  // Supabase
  supabase_anon: /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/,
  
  // OpenAI
  openai_api: /sk-[a-zA-Z0-9]{48}/,
  
  // Generic patterns
  generic_api_key: /['"]?api[_-]?key['"]?\s*[:=]\s*['"][a-zA-Z0-9]{20,}['"]/i,
  generic_secret: /['"]?secret['"]?\s*[:=]\s*['"][a-zA-Z0-9]{20,}['"]/i,
};
```

### Scanning Locations

1. **HTML Source** - Check inline scripts, data attributes
2. **JavaScript Bundles** - Parse and analyze JS files
3. **Source Maps** - Extract original source if available
4. **Network Requests** - Monitor API calls during page load
5. **localStorage/sessionStorage** - Check for stored credentials

### Entropy Analysis

For generic patterns, use entropy calculation to reduce false positives:

```typescript
function calculateEntropy(str: string): number {
  const freq: Record<string, number> = {};
  for (const char of str) {
    freq[char] = (freq[char] || 0) + 1;
  }
  return Object.values(freq).reduce((entropy, count) => {
    const p = count / str.length;
    return entropy - p * Math.log2(p);
  }, 0);
}

// High entropy (> 4.0) suggests random/generated string
```

---

## AI Detection Scanner

### Visual Pattern Detection

```typescript
const AI_DESIGN_PATTERNS = {
  tailwind_defaults: [
    'bg-gradient-to-r',
    'from-purple-500',
    'backdrop-blur',
    'rounded-2xl',
  ],
  shadcn_patterns: [
    'data-[state=',
    'cn(',
    '@radix-ui',
  ],
  generic_hero: [
    'hero',
    'gradient-text',
    'animate-pulse',
  ],
};
```

### Code Fingerprints

- Boilerplate comments (e.g., "// TODO: implement")
- Over-commented obvious code
- Inconsistent naming conventions
- Unused imports/variables
- Over-engineered simple solutions

### Content Indicators

- Generic placeholder text patterns
- Lorem ipsum detection
- Repetitive phrasing
- Generic meta descriptions

---

## Legal Compliance Scanner

### Claim Detection (NLP)

```typescript
const CLAIM_PATTERNS = {
  unsubstantiated: [
    /\b(best|#1|leading|top)\b.*\b(in the world|industry|market)\b/i,
    /\b\d+x\s+(faster|better|more)\b/i,
    /\bguaranteed\b/i,
  ],
  security_claims: [
    /bank[- ]level\s+(security|encryption)/i,
    /military[- ]grade/i,
    /\bGDPR\s+compliant\b/i,
    /\bSOC\s*2\b/i,
    /\bHIPAA\s+compliant\b/i,
  ],
};
```

### Required Pages Check

```typescript
const REQUIRED_PAGES = [
  { name: 'Privacy Policy', patterns: ['/privacy', '/privacy-policy'] },
  { name: 'Terms of Service', patterns: ['/terms', '/tos', '/terms-of-service'] },
  { name: 'Cookie Policy', patterns: ['/cookies', '/cookie-policy'] },
  { name: 'Contact', patterns: ['/contact', '/contact-us'] },
];
```

### Compliance Rules

| Regulation | Key Checks |
|------------|------------|
| GDPR | Cookie consent banner, data processing notice |
| CCPA | "Do Not Sell" link, privacy rights |
| ADA/WCAG | Alt text, keyboard navigation, contrast |
| FTC | Affiliate disclosures, endorsement labels |

---

## SEO Scanner

### Lighthouse Integration

Use Lighthouse programmatically:

```typescript
import lighthouse from 'lighthouse';

const result = await lighthouse(url, {
  port: (new URL(browser.wsEndpoint())).port,
  output: 'json',
  onlyCategories: ['performance', 'seo', 'accessibility'],
});
```

### Technical SEO Checks

1. **Core Web Vitals** - LCP, FID, CLS, TTFB
2. **Crawlability** - robots.txt, sitemap.xml, canonical URLs
3. **Mobile** - Viewport, touch targets, font sizes
4. **Meta Tags** - Title, description, OG tags, Twitter cards
5. **Schema** - JSON-LD validation, rich snippet eligibility

---

## Competitor Scanner

### Technology Detection

```typescript
const TECH_FINGERPRINTS = {
  frameworks: {
    'React': [/__REACT_DEVTOOLS/, /react\.production/],
    'Vue': [/__VUE__/, /vue\.runtime/],
    'Next.js': [/_next\/static/, /__NEXT_DATA__/],
    'Nuxt': [/__NUXT__/, /_nuxt\//],
  },
  analytics: {
    'Google Analytics': [/gtag|ga\(/],
    'Mixpanel': [/mixpanel/],
    'Segment': [/analytics\.js/],
  },
  payments: {
    'Stripe': [/js\.stripe\.com/],
    'PayPal': [/paypal\.com\/sdk/],
  },
};
```

---

## Queue Integration

Scanners receive jobs from BullMQ:

```typescript
import { Worker } from 'bullmq';

const worker = new Worker('security-scanner', async (job) => {
  const { scanId, targetUrl } = job.data;
  
  const scanner = new SecurityScanner();
  await scanner.initialize();
  
  try {
    const result = await scanner.scan(targetUrl);
    await saveScanResult(scanId, result);
    return result;
  } finally {
    await scanner.cleanup();
  }
}, { connection: redisConnection });
```

## Edge Function Deployment

For lightweight scanners, deploy as Supabase Edge Functions:

```tool
mcp_supabase-mcp-server_deploy_edge_function
project_id: <project_id>
name: security-headers-scanner
entrypoint_path: index.ts
verify_jwt: true
files: [{"name": "index.ts", "content": "<function_code>"}]
=======
### 2. API Key Leak Scanner Example

```typescript
// scanners/api-key-leak.ts
const API_KEY_PATTERNS = [
  { name: 'AWS Access Key', pattern: /AKIA[0-9A-Z]{16}/, severity: 'critical' },
  { name: 'AWS Secret Key', pattern: /[A-Za-z0-9/+=]{40}/, severity: 'critical' },
  { name: 'Stripe Live Key', pattern: /sk_live_[a-zA-Z0-9]{24,}/, severity: 'critical' },
  { name: 'Stripe Test Key', pattern: /sk_test_[a-zA-Z0-9]{24,}/, severity: 'medium' },
  { name: 'OpenAI API Key', pattern: /sk-[a-zA-Z0-9]{48}/, severity: 'critical' },
  { name: 'Supabase Service Role', pattern: /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*/, severity: 'critical' },
  { name: 'Firebase Config', pattern: /apiKey["']?\s*[:=]\s*["'][A-Za-z0-9_-]{39}["']/, severity: 'high' },
  { name: 'MongoDB URI', pattern: /mongodb(\+srv)?:\/\/[^:]+:[^@]+@/, severity: 'critical' },
];

export class ApiKeyLeakScanner implements Scanner {
  name = 'api-key-leak';
  
  async scan(input: ScannerInput): Promise<ScanResult> {
    // Fetch page HTML and all linked JavaScript
    const sources = await this.fetchAllSources(input.url);
    const findings: Finding[] = [];
    
    for (const { content, location } of sources) {
      for (const { name, pattern, severity } of API_KEY_PATTERNS) {
        const matches = content.match(pattern);
        if (matches) {
          findings.push({
            id: `leak-${name.toLowerCase().replace(/\s/g, '-')}`,
            severity: severity as Finding['severity'],
            title: `Exposed ${name}`,
            description: `Found potential ${name} in client-side code.`,
            location,
            evidence: this.redactKey(matches[0]),
          });
        }
      }
    }
    
    const score = findings.length === 0 ? 100 : 
      Math.max(0, 100 - findings.reduce((acc, f) => 
        acc + (f.severity === 'critical' ? 30 : f.severity === 'high' ? 20 : 10), 0));
    
    return {
      scannerType: this.name,
      score,
      findings,
      recommendations: [...],
      scannedAt: new Date(),
    };
  }
  
  private redactKey(key: string): string {
    return key.slice(0, 8) + '...' + key.slice(-4);
  }
}
```

## Using Puppeteer/Playwright for Dynamic Content

```typescript
import { chromium } from 'playwright';

async function fetchDynamicContent(url: string) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.goto(url, { waitUntil: 'networkidle' });
  
  // Get all script contents
  const scripts = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('script'))
      .map(s => s.textContent || s.src);
  });
  
  // Get localStorage/sessionStorage
  const storage = await page.evaluate(() => ({
    localStorage: { ...localStorage },
    sessionStorage: { ...sessionStorage },
  }));
  
  await browser.close();
  return { scripts, storage };
}
```

## Scanner Queue Integration

Scanners are executed via a job queue (Redis + BullMQ):

```typescript
// workers/scanner-worker.ts
import { Worker } from 'bullmq';
import { SecurityHeadersScanner } from '@/scanners/security-headers';
import { ApiKeyLeakScanner } from '@/scanners/api-key-leak';

const scanners = {
  'security-headers': new SecurityHeadersScanner(),
  'api-key-leak': new ApiKeyLeakScanner(),
  // Add more scanners
};

const worker = new Worker('scan-jobs', async (job) => {
  const { url, scanTypes } = job.data;
  const results = [];
  
  for (const type of scanTypes) {
    const scanner = scanners[type];
    if (scanner) {
      const result = await scanner.scan({ url });
      results.push(result);
    }
  }
  
  return results;
});
```

## Testing Scanners

Always test with known vulnerable and secure sites:

```typescript
describe('SecurityHeadersScanner', () => {
  it('should detect missing headers', async () => {
    const scanner = new SecurityHeadersScanner();
    const result = await scanner.scan({ url: 'http://example-insecure.com' });
    
    expect(result.score).toBeLessThan(100);
    expect(result.findings.length).toBeGreaterThan(0);
  });
});
>>>>>>> Stashed changes
```
