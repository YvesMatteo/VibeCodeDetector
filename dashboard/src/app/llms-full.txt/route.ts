import { getAllPosts } from '@/lib/blog';
import fs from 'fs';
import path from 'path';

export async function GET() {
    // Read the base llms.txt
    const llmsBase = fs.readFileSync(
        path.join(process.cwd(), 'public', 'llms.txt'),
        'utf-8'
    );

    // Get all blog posts
    const posts = getAllPosts();

    const blogSection = posts
        .map(
            (post) =>
                `## ${post.title}\n\n*${post.description}*\n\nPublished: ${post.date} | Reading time: ${post.readingTime}\nURL: https://checkvibe.dev/blog/${post.slug}\n\n${post.content}`
        )
        .join('\n\n---\n\n');

    const fullContent = `${llmsBase}

---

# Detailed Scanner Descriptions

## Security Headers Scanner
Checks for the presence and configuration of critical HTTP security headers: Content-Security-Policy (CSP), Strict-Transport-Security (HSTS), X-Frame-Options, X-Content-Type-Options, Referrer-Policy, and Permissions-Policy. Flags missing, weak, or misconfigured headers.

## SQL Injection Scanner
Tests all accessible input vectors (URL parameters, form fields, headers) with error-based, time-based, and blind SQL injection payloads. Detects both classic and modern injection patterns.

## XSS Scanner
Injects hundreds of cross-site scripting payloads across reflected, stored, and DOM-based attack vectors. Tests various encoding bypasses and context-aware payloads.

## API Key Scanner
Pattern-matches against 50+ known API key formats (AWS, Stripe, Supabase, Firebase, GitHub, Twilio, SendGrid, etc.) in page source, JavaScript bundles, and network requests. Also performs entropy analysis for unknown key formats.

## SSL/TLS Scanner
Validates certificate chain, expiration, protocol versions (TLS 1.2+), cipher suite strength, and HSTS configuration. Flags deprecated protocols and weak ciphers.

## CORS Scanner
Tests Cross-Origin Resource Sharing configuration for overly permissive policies (wildcard origins, credential sharing, preflight bypasses).

## CSRF Scanner
Checks for Cross-Site Request Forgery protections: token presence, SameSite cookie attributes, and custom header requirements on state-changing endpoints.

## Cookie Scanner
Audits all cookies for Secure flag, HttpOnly flag, SameSite attribute, proper expiration, and path/domain restrictions.

## DNS Scanner
Checks DNSSEC configuration, SPF records, DKIM signing, DMARC policy, and identifies potential DNS-related attack vectors.

## DDoS Protection Scanner
Detects WAF presence (Cloudflare, AWS WAF, etc.), CDN usage, rate limiting implementation, and basic DDoS mitigation measures.

## Domain Hijacking Scanner
Assesses domain registration security via RDAP, nameserver integrity and diversity, typosquatting risk, zone exposure, and NS security configuration.

## Vibe Coding Detector
Uses AI analysis to detect patterns common in AI-generated code (Cursor, Copilot, Claude) and flags security anti-patterns that AI coding assistants commonly introduce.

---

# Blog Articles

${blogSection}
`;

    return new Response(fullContent, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, max-age=3600, s-maxage=3600',
        },
    });
}
