# Goal

Add SEO infrastructure, a blog system, and LLM-readable content to CheckVibe (checkvibe.dev) so the site gets indexed by Google, ranks for security-scanning keywords, and gets recommended by AI assistants.

## Context

- **Stack**: Next.js 16 (App Router) + Tailwind CSS 4 + Supabase + Vercel
- **Dashboard dir**: `dashboard/` — all code lives here
- **Current SEO**: robots.ts, sitemap.ts (6 static URLs), OG images, JSON-LD SoftwareApplication schema, basic meta tags
- **No blog exists** — no MDX deps, no content files, no RSS
- **No LLM files** — no llms.txt, no .well-known/ai-plugin.json
- **Public pages**: `/`, `/login`, `/signup`, `/privacy`, `/terms`, `/cookies`, `/report/[publicId]`
- **Key files**: `src/app/layout.tsx`, `src/app/sitemap.ts`, `src/app/robots.ts`, `next.config.ts`, `package.json`

## Requirements

### SEO Fundamentals
- Expand sitemap to include blog posts dynamically
- Add FAQ structured data (JSON-LD) to homepage
- Improve meta descriptions per page (not just global)
- Add canonical URLs

### Blog System
- File-based MDX blog at `/blog` and `/blog/[slug]`
- Blog index page with card grid (dark theme, matches site)
- Blog post page with reading time, author, date
- Frontmatter: title, description, date, author, tags, image
- RSS feed at `/feed.xml`
- Blog posts auto-added to sitemap
- SEO metadata per post (OG, description, title)
- Ship with 5 seed articles targeting keywords: "website security scanner", "how to find XSS vulnerabilities", "API key leak detection", "vibe coding security", "OWASP top 10 checklist"

### LLM Visibility (AI-Readable Content)
- `/llms.txt` — plain-text summary of what CheckVibe is, features, pricing (follows llms.txt spec)
- `/llms-full.txt` — detailed markdown version with all features + blog content
- Every blog post also served as raw markdown at `/blog/[slug].md`
- Allow AI crawlers in robots.txt (GPTBot, ChatGPT-User, Claude-Web, etc.)

### Technical
- Use `next-mdx-remote` for MDX rendering
- Blog content as `.mdx` files in `dashboard/content/blog/` directory
- No CMS — all content is git-managed markdown
- Dark theme matching existing site design
- Mobile responsive
