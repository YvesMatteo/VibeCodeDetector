# Implementation Plan — SEO + Blog + LLM Visibility

## Status
- [x] Planning
- [ ] In Progress
- [ ] Verification
- [ ] Complete

## Phase 1: Dependencies & Config

### [MODIFY] `dashboard/package.json`
- Add `next-mdx-remote` (MDX rendering in RSC)
- Add `gray-matter` (frontmatter parsing)
- Add `reading-time` (reading time calculation)
- Add `rss` (RSS feed generation)
- Add `rehype-pretty-code` + `shiki` (syntax highlighting in blog posts)

### [MODIFY] `dashboard/next.config.ts`
- Add `pageExtensions: ['ts', 'tsx', 'md', 'mdx']` if needed
- No other changes needed — MDX is rendered via next-mdx-remote (not next/mdx)

---

## Phase 2: Blog Content Library

### [NEW] `dashboard/content/blog/website-security-scanner-guide.mdx`
Seed article ~800 words. Title: "The Complete Guide to Automated Website Security Scanning"
Keywords: website security scanner, automated security scanning, vulnerability detection
- What security scanning is, why it matters
- What CheckVibe scans for (30 scanners overview)
- CTA to try CheckVibe

### [NEW] `dashboard/content/blog/find-xss-vulnerabilities.mdx`
Seed article ~800 words. Title: "How to Find XSS Vulnerabilities Before Hackers Do"
Keywords: XSS vulnerabilities, cross-site scripting, XSS detection
- Types of XSS (reflected, stored, DOM)
- How automated scanners detect XSS
- Prevention checklist

### [NEW] `dashboard/content/blog/api-key-leak-detection.mdx`
Seed article ~800 words. Title: "API Key Leak Detection: Stop Exposing Secrets in Your Frontend"
Keywords: API key leak, exposed API keys, secret scanning
- Common ways keys leak (source code, network tab, git)
- How CheckVibe detects exposed keys
- Best practices

### [NEW] `dashboard/content/blog/vibe-coding-security.mdx`
Seed article ~800 words. Title: "Vibe Coding and Security: Why AI-Generated Code Needs Auditing"
Keywords: vibe coding security, AI-generated code vulnerabilities, cursor security
- What vibe coding is
- Common security pitfalls in AI-generated code
- How to audit vibe-coded apps with CheckVibe

### [NEW] `dashboard/content/blog/owasp-top-10-checklist.mdx`
Seed article ~800 words. Title: "OWASP Top 10 Checklist for 2025: Is Your App Vulnerable?"
Keywords: OWASP top 10, web application security, security checklist
- Walk through each OWASP top 10 item
- How CheckVibe covers each one
- Downloadable checklist CTA

---

## Phase 3: Blog Infrastructure (Code)

### [NEW] `dashboard/src/lib/blog.ts`
Utility functions for the blog:
- `getAllPosts()` — reads `content/blog/*.mdx`, parses frontmatter with `gray-matter`, returns sorted array
- `getPostBySlug(slug)` — reads single post, returns `{ meta, content }`
- `getPostSlugs()` — returns all slugs for static params
- Types: `BlogPost { slug, title, description, date, author, tags, image, readingTime, content }`

### [NEW] `dashboard/src/app/blog/page.tsx`
Blog index page (server component):
- Page metadata: title "Blog | CheckVibe", description
- Hero section: "CheckVibe Blog — Security insights for modern developers"
- Grid of `BlogPostCard` components (image, title, description, date, tags, reading time)
- Link each card to `/blog/[slug]`
- Dark theme, consistent with site design
- JSON-LD BlogPosting schema for each post

### [NEW] `dashboard/src/app/blog/[slug]/page.tsx`
Blog post page (server component):
- `generateStaticParams()` — returns all slugs
- `generateMetadata()` — per-post OG title, description, image
- Render MDX with `next-mdx-remote/rsc` (`MDXRemote`)
- Layout: date, author, reading time, tags at top → MDX content → CTA banner at bottom
- JSON-LD `Article` schema
- Prose styling (Tailwind typography-like custom styles)
- "Back to blog" link

### [NEW] `dashboard/src/app/blog/[slug].md/route.ts`
Raw markdown endpoint — serves the `.mdx` source as `text/markdown` for AI crawlers:
- Read the MDX file for the given slug
- Strip frontmatter
- Return as `text/markdown; charset=utf-8`
- Cache-Control: `public, max-age=3600`

### [NEW] `dashboard/src/components/blog/post-card.tsx`
Blog post card component for the index page:
- Image (or gradient placeholder), title, description, date, tags, reading time
- Hover animation, dark theme

### [NEW] `dashboard/src/components/blog/mdx-components.tsx`
Custom MDX components for rich rendering:
- Styled `h1-h4`, `p`, `a`, `ul`, `ol`, `blockquote`, `code`, `pre`
- Custom `Callout` component (info/warning/tip)
- `CodeBlock` with syntax highlighting via rehype-pretty-code

---

## Phase 4: SEO Improvements

### [MODIFY] `dashboard/src/app/sitemap.ts`
- Import `getPostSlugs()` from `@/lib/blog`
- Add all blog posts: `{ url: baseUrl/blog/[slug], changeFrequency: 'monthly', priority: 0.7 }`
- Add `/blog` index: `{ url: baseUrl/blog, changeFrequency: 'weekly', priority: 0.8 }`

### [MODIFY] `dashboard/src/app/robots.ts`
- Keep existing rules
- Add explicit Allow for AI crawlers:
  ```
  { userAgent: 'GPTBot', allow: '/' }
  { userAgent: 'ChatGPT-User', allow: '/' }
  { userAgent: 'Claude-Web', allow: '/' }
  { userAgent: 'Applebot-Extended', allow: '/' }
  { userAgent: 'PerplexityBot', allow: '/' }
  { userAgent: 'Bytespider', allow: '/' }
  ```
- Add `host: 'https://checkvibe.dev'`

### [MODIFY] `dashboard/src/app/layout.tsx`
- Add `alternates: { types: { 'application/rss+xml': '/feed.xml' } }` to metadata
- Keep existing JSON-LD, it's good

### [MODIFY] `dashboard/src/app/page.tsx`
- Add FAQ section at bottom of homepage with common questions
- Add FAQPage JSON-LD schema (embedded in page, not layout)
- Questions: "What is CheckVibe?", "How many scanners does CheckVibe have?", "Is CheckVibe free?", "What vulnerabilities does CheckVibe detect?", "How does CheckVibe compare to manual penetration testing?"

---

## Phase 5: LLM-Readable Files

### [NEW] `dashboard/public/llms.txt`
Plain-text file following the llms.txt spec:
```
# CheckVibe

> AI-powered website security scanner with 30+ automated checks.

CheckVibe scans websites for security vulnerabilities including SQL injection,
XSS, exposed API keys, CORS misconfiguration, and more.

## Features
- 30 automated security scanners
- AI-powered vibe coding detection
- ...

## Pricing
- Free: 1 project, 3 scans/month
- Starter ($19/mo): 1 project, 5 scans/month, full scan suite
- Pro ($39/mo): 3 projects, 20 scans/month
- Max ($79/mo): 10 projects, 50 scans/month

## Links
- Website: https://checkvibe.dev
- Blog: https://checkvibe.dev/blog
- Sign Up: https://checkvibe.dev/signup
- Documentation: https://checkvibe.dev/dashboard/docs
```

### [NEW] `dashboard/public/llms-full.txt`
Extended markdown with detailed feature descriptions + all blog post content concatenated.
Generated at build time via a script, OR served dynamically via a route.
Better approach: **dynamic route** at `src/app/llms-full.txt/route.ts` that reads all blog posts and concatenates them.

### [NEW] `dashboard/src/app/llms-full.txt/route.ts`
Dynamic route that:
1. Starts with the same header as llms.txt
2. Appends detailed feature descriptions (all 30 scanners)
3. Appends all blog post content (full markdown)
4. Returns as `text/plain; charset=utf-8`
5. Cache: `s-maxage=3600`

### [NEW] `dashboard/src/app/feed.xml/route.ts`
RSS 2.0 feed:
- Channel: CheckVibe Blog, link, description
- Each blog post as an item: title, description, link, pubDate, content
- Content-Type: `application/rss+xml`

---

## Phase 6: Final Touches

### [MODIFY] `dashboard/src/app/page.tsx`
- Add "From the Blog" section above footer with 3 latest posts
- Links to `/blog`

### Verification
- `npm run build` — no errors
- Visit `/blog` — see 5 posts
- Visit `/blog/[slug]` — see rendered MDX
- Visit `/blog/[slug].md` — see raw markdown
- Visit `/feed.xml` — see valid RSS
- Visit `/sitemap.xml` — see blog posts included
- Visit `/llms.txt` — see plain text
- Visit `/llms-full.txt` — see full content
- Visit `/robots.txt` — see AI crawler rules
- `npx tsc --noEmit` passes

## Notes
- Blog images: use gradient/abstract placeholders (no stock photos needed)
- Author: default to "CheckVibe Team"
- All blog content should naturally mention CheckVibe without being spammy
- Focus on genuinely helpful security content that happens to showcase the product
