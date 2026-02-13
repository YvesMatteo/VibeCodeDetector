'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Sparkles, Copy, Check } from 'lucide-react';

interface Finding {
    title: string;
    description: string;
    severity: string;
}

interface TechStackResult {
    findings?: Array<{ title?: string; description?: string;[key: string]: any }>;
    detectedTechnologies?: string[];
    [key: string]: any;
}

interface AIFixPromptProps {
    url: string;
    findings: Finding[];
    techStack?: TechStackResult;
}

// Detect frameworks from tech stack scan results
function detectFramework(techStack?: TechStackResult): { name: string; instructions: string } | null {
    if (!techStack) return null;

    const allText = JSON.stringify(techStack).toLowerCase();

    const frameworks: Array<{ pattern: RegExp; name: string; instructions: string }> = [
        {
            pattern: /next\.?js|nextjs|_next\//i,
            name: 'Next.js',
            instructions: [
                '- Check `next.config.js` for security headers in the `headers()` function',
                '- Set cookies in API routes or middleware via `cookies()` from `next/headers`',
                '- Add CSRF protection in `middleware.ts` using `NextRequest` origin checks',
                '- Use `next-auth` or Supabase Auth for authentication — never roll your own',
                '- Environment variables should go in `.env.local`, NOT in client components',
            ].join('\n'),
        },
        {
            pattern: /express|express\.js/i,
            name: 'Express.js',
            instructions: [
                '- Install and configure `helmet` for security headers: `app.use(helmet())`',
                '- Use `express-rate-limit` for rate limiting login routes',
                '- Set cookies with `{ secure: true, httpOnly: true, sameSite: "lax" }`',
                '- Use `csurf` or `csrf-csrf` middleware for CSRF protection',
                '- Store secrets in `.env` and access via `process.env`, never hardcode',
            ].join('\n'),
        },
        {
            pattern: /django/i,
            name: 'Django',
            instructions: [
                '- Enable `CsrfViewMiddleware` in `MIDDLEWARE` (on by default)',
                '- Set `SESSION_COOKIE_SECURE = True` and `CSRF_COOKIE_SECURE = True`',
                '- Configure `SECURE_HSTS_SECONDS`, `SECURE_SSL_REDIRECT` in settings',
                '- Use `django-cors-headers` with explicit `CORS_ALLOWED_ORIGINS`',
                '- Never use `@csrf_exempt` on state-changing views',
            ].join('\n'),
        },
        {
            pattern: /laravel/i,
            name: 'Laravel',
            instructions: [
                '- CSRF is handled by `VerifyCsrfToken` middleware — ensure `@csrf` in Blade forms',
                '- Set `SESSION_SECURE_COOKIE=true` in `.env` for HTTPS',
                '- Configure CORS in `config/cors.php` with specific allowed origins',
                '- Use Sanctum or Passport for API authentication, never raw JWT',
                '- Security headers go in `App\\Http\\Middleware\\SecurityHeaders`',
            ].join('\n'),
        },
        {
            pattern: /rails|ruby on rails/i,
            name: 'Rails',
            instructions: [
                '- CSRF protection is built-in via `protect_from_forgery with: :exception`',
                '- Set `config.force_ssl = true` in production config',
                '- Configure CORS with `rack-cors` gem in `config/initializers/cors.rb`',
                '- Use `secure` and `httponly` flags on cookies in `session_store.rb`',
                '- Secrets go in `credentials.yml.enc`, not environment variables',
            ].join('\n'),
        },
        {
            pattern: /flask/i,
            name: 'Flask',
            instructions: [
                '- Install `flask-talisman` for security headers and HTTPS enforcement',
                '- Use `flask-wtf` for CSRF protection: `CSRFProtect(app)`',
                '- Set `SESSION_COOKIE_SECURE = True` and `SESSION_COOKIE_HTTPONLY = True`',
                '- Use `flask-cors` with explicit origins, never `CORS(app)` with defaults',
                '- Use `flask-limiter` for rate limiting login endpoints',
            ].join('\n'),
        },
        {
            pattern: /vue|nuxt/i,
            name: 'Vue/Nuxt',
            instructions: [
                '- Security headers should be set in `nuxt.config.ts` routeRules or server middleware',
                '- Use `useFetch` with credentials for cookie-based auth, not localStorage tokens',
                '- CSRF tokens should come from the backend and be sent as `X-CSRF-TOKEN` header',
                '- Never store JWTs in localStorage — use HttpOnly cookies via your API',
                '- Environment variables prefixed with `NUXT_PUBLIC_` are client-exposed',
            ].join('\n'),
        },
        {
            pattern: /react(?!.*native)|vite|create-react-app/i,
            name: 'React (SPA)',
            instructions: [
                '- Security headers must be set on your hosting platform (Vercel, Netlify, nginx)',
                '- Never store tokens in localStorage — use HttpOnly cookies from your API',
                '- Proxy API calls through your backend to avoid CORS issues',
                '- Use content-security-policy meta tags for inline CSP',
                '- Environment variables prefixed with `VITE_` or `REACT_APP_` are client-exposed',
            ].join('\n'),
        },
    ];

    for (const fw of frameworks) {
        if (fw.pattern.test(allText)) {
            return { name: fw.name, instructions: fw.instructions };
        }
    }

    return null;
}

export function AIFixPrompt({ url, findings, techStack }: AIFixPromptProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    const generatePrompt = () => {
        const critical = findings.filter(f => f.severity?.toLowerCase() === 'critical');
        const high = findings.filter(f => f.severity?.toLowerCase() === 'high');
        const others = findings.filter(f => !['critical', 'high'].includes(f.severity?.toLowerCase()));

        const framework = detectFramework(techStack);

        let prompt = `# Fix Request for ${url}\n\n`;
        prompt += `I have run an automated security audit on my website and need you to fix the following issues.\n\n`;

        if (framework) {
            prompt += `## 🔧 Detected Framework: ${framework.name}\n\n`;
        }

        if (critical.length > 0) {
            prompt += `## 🚨 Critical Issues (Fix Immediately)\n`;
            prompt += critical.map(f => `- [ ] **${f.title}**: ${f.description}`).join('\n');
            prompt += `\n\n`;
        }

        if (high.length > 0) {
            prompt += `## ⚠️ High Priority Issues\n`;
            prompt += high.map(f => `- [ ] **${f.title}**: ${f.description}`).join('\n');
            prompt += `\n\n`;
        }

        if (others.length > 0) {
            prompt += `## 🛠️ Improvements\n`;
            prompt += others.map(f => `- [ ] **${f.title}**: ${f.description}`).join('\n');
            prompt += `\n\n`;
        }

        prompt += `## Instructions\n`;
        prompt += `1. Analyze the codebase to find the source of these issues.\n`;
        prompt += `2. Fix the critical security issues first — they are actively exploitable.\n`;
        prompt += `3. Apply standard best practices for the remaining items.\n`;
        prompt += `4. Explain your changes file-by-file.\n`;

        if (framework) {
            prompt += `\n## ${framework.name}-Specific Guidance\n`;
            prompt += framework.instructions + '\n';
        }

        return prompt;
    };


    const promptText = generatePrompt();

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(promptText);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback for when clipboard API is unavailable
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button className="bg-white text-zinc-900 hover:bg-zinc-200 border-0">
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate AI Fix Prompt
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-[#070D19] border-white/10 text-white">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Sparkles className="h-5 w-5 text-blue-400" />
                        AI Remediation Prompt
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                        Copy this prompt and give it to your AI coding assistant (like Cursor or Windsurf) to fix these issues automatically.
                    </DialogDescription>
                </DialogHeader>

                <div className="relative mt-4 group">
                    <pre className="p-4 rounded-lg bg-black/50 border border-white/10 text-sm font-mono text-slate-300 overflow-auto max-h-[400px] whitespace-pre-wrap">
                        {promptText}
                    </pre>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="absolute top-2 right-2 h-8 w-8 bg-white/10 hover:bg-white/20 text-white sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                        onClick={handleCopy}
                    >
                        {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                    </Button>
                </div>

                <div className="flex justify-end gap-2 mt-4">
                    <Button variant="ghost" onClick={() => setIsOpen(false)} className="hover:bg-white/5 hover:text-white">
                        Close
                    </Button>
                    <Button onClick={handleCopy} className="bg-blue-600 hover:bg-blue-500 text-white">
                        {copied ? (
                            <>
                                <Check className="mr-2 h-4 w-4" />
                                Copied!
                            </>
                        ) : (
                            <>
                                <Copy className="mr-2 h-4 w-4" />
                                Copy Prompt
                            </>
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
