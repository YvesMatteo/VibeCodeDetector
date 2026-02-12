
export interface PlainEnglishExplanation {
    summary: string;
    whyItMatters: string;
}

const definitions: Record<string, PlainEnglishExplanation> = {
    'ai generation indicator': {
        summary: 'This site appears to be AI-generated.',
        whyItMatters: 'AI-generated sites often have generic content, poor accessibility, and security oversights that need human review.',
    },
    'lcp': {
        summary: 'Content takes too long to appear.',
        whyItMatters: 'Users leave websites that don\'t load instantly. This is the #1 factor for perceived speed.',
    },
    'cls': {
        summary: 'Page layout shifts unexpectedly.',
        whyItMatters: 'It\'s frustrating when users try to click something and it moves. Google penalizes this heavily.',
    },
    'contrast': {
        summary: 'Text is hard to read.',
        whyItMatters: 'Low contrast text is invisible to many users, especially on mobile outdoors.',
    },
    'alt': {
        summary: 'Images are missing descriptions.',
        whyItMatters: 'Blind users (and Google) cannot "see" your images without text descriptions.',
    },
    'unused javascript': {
        summary: 'Loading code that isn\'t used.',
        whyItMatters: 'It slows down the site for no reason. It\'s like packing a winter coat for a beach trip.',
    },
    'api key': {
        summary: 'Secret password exposed.',
        whyItMatters: 'Hackers can use this to steal your data or charge your credit card. This is a critical security risk.',
    },
    'exposed .env': {
        summary: 'Your secret passwords are visible to everyone.',
        whyItMatters: 'The .env file contains all your API keys, database passwords, and secrets. Anyone can read them right now.',
    },
    'exposed /.git': {
        summary: 'Your source code can be downloaded by hackers.',
        whyItMatters: 'The .git folder lets attackers reconstruct your entire codebase, including hardcoded secrets and business logic.',
    },
    'phpmyadmin': {
        summary: 'Anyone can try to log into your database admin panel.',
        whyItMatters: 'phpMyAdmin gives full database control. Bots constantly scan for it and try default passwords.',
    },
    'firebase': {
        summary: 'Your database is open to the entire internet.',
        whyItMatters: 'Anyone can read (and possibly write) all data in your Firebase database without logging in.',
    },
    'leakix': {
        summary: 'Known data leaks found for this domain.',
        whyItMatters: 'Your domain appears in public leak databases, meaning attackers already know about exposed services.',
    },
    'exposed database port': {
        summary: 'Your database is directly reachable from the internet.',
        whyItMatters: 'Databases should never be publicly accessible. Attackers can brute-force passwords or exploit known vulnerabilities.',
    },
    'anthropic': {
        summary: 'AI service key exposed.',
        whyItMatters: 'Someone can use your Anthropic API key to run up charges or access AI services on your account.',
    },
    'discord': {
        summary: 'Discord bot password exposed.',
        whyItMatters: 'Attackers can take over your Discord bot to spam, scam, or damage your community.',
    },
    'graphql': {
        summary: 'Your API blueprint is public.',
        whyItMatters: 'GraphQL Playground exposes your entire API schema, showing attackers every query and mutation available.',
    },
    'source map': {
        summary: 'Your original source code is downloadable.',
        whyItMatters: 'Source maps let anyone read your unminified code, including comments, variable names, and internal logic.',
    },
    'swagger': {
        summary: 'Your API documentation is publicly exposed.',
        whyItMatters: 'Swagger/OpenAPI docs show attackers every endpoint, parameter, and data model in your API.',
    },
    'unprotected api': {
        summary: 'Sensitive data returned without login.',
        whyItMatters: 'Anyone can access user emails, usernames, or other private data just by visiting the URL.',
    },
    'remote access port': {
        summary: 'Remote control services are exposed.',
        whyItMatters: 'Services like FTP, Telnet, RDP, and VNC allow direct server access. Bots constantly try to brute-force these.',
    },
    'cors reflects arbitrary': {
        summary: 'Any website can read your users\' data.',
        whyItMatters: 'Your server trusts every website that asks. An attacker\'s site can steal logged-in user data, session tokens, and personal information.',
    },
    'cors wildcard': {
        summary: 'Your API is open to every website on the internet.',
        whyItMatters: 'Using * for CORS means any site can read your API responses. Fine for public data, dangerous for anything private.',
    },
    'cors accepts null origin': {
        summary: 'Attackers can bypass your security using iframes.',
        whyItMatters: 'The "null" origin is used by sandboxed iframes and local files. Accepting it lets attackers craft pages that bypass your origin checks.',
    },
    'cors vulnerable to subdomain': {
        summary: 'A forgotten subdomain could be used to hack your users.',
        whyItMatters: 'If an attacker takes over any of your subdomains (even unused ones), they can use it to steal data from your main site.',
    },
    'cors origin validation uses insecure': {
        summary: 'Your website\'s security check can be easily tricked.',
        whyItMatters: 'The origin check uses simple text matching that attackers can bypass by registering domains like "yoursite.com.evil.com".',
    },
    'cors accepts http': {
        summary: 'Your site trusts insecure connections.',
        whyItMatters: 'Accepting HTTP origins means someone intercepting wifi traffic can pretend to be your site and steal data.',
    },
    'cors accepts private': {
        summary: 'Debug settings left in production.',
        whyItMatters: 'Accepting localhost/internal IPs suggests development CORS settings are still active. This is a common vibe-coding mistake.',
    },
    'csrf token': {
        summary: 'Forms can be submitted by attacker websites.',
        whyItMatters: 'Without CSRF tokens, an attacker can create a hidden page that submits forms as your logged-in users — changing passwords, making purchases, etc.',
    },
    'csrf protection': {
        summary: 'No anti-forgery protection detected anywhere.',
        whyItMatters: 'Your site has zero CSRF defenses. Any malicious website can trigger actions on behalf of your users without them knowing.',
    },
    'samesite': {
        summary: 'Login cookies are sent to attacker websites.',
        whyItMatters: 'Without SameSite on cookies, your user\'s login session is sent along with cross-site requests, enabling account takeover.',
    },
    'clickjacking': {
        summary: 'Your site can be embedded in an attacker\'s page.',
        whyItMatters: 'Attackers can overlay invisible buttons on top of your site, tricking users into clicking things they didn\'t intend to.',
    },
    'state-changing action uses get': {
        summary: 'Dangerous actions can be triggered by clicking a link.',
        whyItMatters: 'GET requests for delete/update actions mean an attacker can trigger them via image tags, emails, or chat messages.',
    },
    'missing secure flag': {
        summary: 'Login cookies can be stolen over wifi.',
        whyItMatters: 'Without the Secure flag, cookies are sent over unencrypted HTTP connections. Anyone on the same wifi can grab them.',
    },
    'missing httponly': {
        summary: 'JavaScript can read your login cookies.',
        whyItMatters: 'If any XSS vulnerability exists on your site, attackers can steal user sessions instantly with document.cookie.',
    },
    'jwt in cookie': {
        summary: 'Your authentication token is exposed to browser scripts.',
        whyItMatters: 'JWTs contain the user\'s entire identity. Without HttpOnly, a single XSS bug lets attackers impersonate any user.',
    },
    '__secure-': {
        summary: 'Cookie security prefix is incorrectly configured.',
        whyItMatters: 'The __Secure- prefix tells browsers to require HTTPS, but only works if you also set the Secure flag.',
    },
    '__host-': {
        summary: 'Cookie host prefix is incorrectly configured.',
        whyItMatters: 'The __Host- prefix provides the strongest cookie isolation but requires specific settings to work.',
    },
    'broad domain scope': {
        summary: 'Your login cookie is shared across all subdomains.',
        whyItMatters: 'If a hacker compromises any subdomain (even a test server), they can steal user sessions from your main site.',
    },
    'long expiry': {
        summary: 'Login sessions last for weeks or months.',
        whyItMatters: 'If a cookie is stolen, the attacker has weeks to use it. Shorter sessions limit the damage window.',
    },
    'authentication pages served over http': {
        summary: 'Passwords are sent in the open.',
        whyItMatters: 'Without HTTPS, anyone on the same wifi network can see the passwords your users type. This is the most basic security flaw.',
    },
    'no rate limiting': {
        summary: 'Hackers can guess passwords endlessly.',
        whyItMatters: 'Without limits on login attempts, automated tools can try thousands of password combinations per second.',
    },
    'weak client-side password': {
        summary: 'Users can set "123" as their password.',
        whyItMatters: 'Without minimum length requirements, users choose trivially guessable passwords that get cracked in seconds.',
    },
    'hardcoded credentials': {
        summary: 'Passwords are written directly into the code.',
        whyItMatters: 'This is one of the most common vibe-coding mistakes — AI generates placeholder credentials and they ship to production.',
    },
    'client-side password comparison': {
        summary: 'Password checking happens in the browser, not the server.',
        whyItMatters: 'Anyone can open browser DevTools and bypass the check. Authentication must ALWAYS happen server-side.',
    },
    'storing secrets in localstorage': {
        summary: 'Sensitive data is stored where any script can read it.',
        whyItMatters: 'localStorage has zero protection from XSS. Any third-party script or ad on your page can read these secrets.',
    },
    'firebase-rtdb-open': {
        summary: 'Your Firebase database is readable by anyone.',
        whyItMatters: 'All data in your Realtime Database can be downloaded without logging in. This is the #1 Firebase security mistake.',
    },
    'firebase-storage-listable': {
        summary: 'Anyone can browse your uploaded files.',
        whyItMatters: 'Attackers can list and download every file in your Firebase Storage bucket, including user uploads and private documents.',
    },
    'firebase-firestore-open': {
        summary: 'Your Firestore database is publicly readable.',
        whyItMatters: 'All documents in your Firestore collections can be read by anyone. User data, private records — everything is exposed.',
    },
    'firebase-auth-enumeration': {
        summary: 'Attackers can check if emails are registered.',
        whyItMatters: 'The Firebase Auth API reveals which email addresses have accounts, enabling targeted phishing and credential stuffing attacks.',
    },
    'firebase-apikey-unrestricted': {
        summary: 'Your Firebase API key works from anywhere.',
        whyItMatters: 'Without referrer restrictions, anyone can use your API key from their own app, potentially exhausting your quota or creating fake accounts.',
    },
    // OpenSSF Scorecard findings
    'scorecard-overall': {
        summary: 'Overall supply chain security score.',
        whyItMatters: 'The OpenSSF Scorecard evaluates how well your project follows supply chain security best practices.',
    },
    'scorecard-branch-protection': {
        summary: 'Branch protection is weak or missing.',
        whyItMatters: 'Without branch protection, anyone with push access can commit directly to main, bypassing code review.',
    },
    'scorecard-code-review': {
        summary: 'Code changes lack review.',
        whyItMatters: 'Unreviewed code is the top vector for introducing vulnerabilities or backdoors.',
    },
    'scorecard-dangerous-workflow': {
        summary: 'GitHub Actions workflow has dangerous patterns.',
        whyItMatters: 'Workflows using pull_request_target with PR checkout allow attackers to run arbitrary code in your CI.',
    },
    'scorecard-token-permissions': {
        summary: 'GitHub token has excessive permissions.',
        whyItMatters: 'Overly broad GITHUB_TOKEN permissions let compromised Actions steps do more damage.',
    },
    'scorecard-pinned-dependencies': {
        summary: 'CI dependencies aren\'t pinned to hashes.',
        whyItMatters: 'Mutable tags (like @v3) can be silently replaced with malicious code. Pin to SHA hashes.',
    },
    'scorecard-sast': {
        summary: 'No static analysis in your CI.',
        whyItMatters: 'SAST tools like CodeQL catch security bugs before they reach production.',
    },
    'scorecard-vulnerabilities': {
        summary: 'Known vulnerabilities found.',
        whyItMatters: 'Unpatched vulnerabilities are actively exploited by automated scanners.',
    },
    // GitHub Security findings
    'gh-sec-dependabot-summary': {
        summary: 'Dependabot found vulnerable dependencies.',
        whyItMatters: 'Known CVEs in your dependencies are the easiest attack vector — automated tools exploit them within hours of disclosure.',
    },
    'gh-sec-dependabot-disabled': {
        summary: 'Dependabot alerts aren\'t enabled.',
        whyItMatters: 'Without Dependabot, you won\'t know when your dependencies have known vulnerabilities.',
    },
    'gh-sec-codescan-summary': {
        summary: 'Code scanning found security issues.',
        whyItMatters: 'These are potential vulnerabilities in YOUR code — SQL injection, XSS, path traversal, etc.',
    },
    'gh-sec-codescan-disabled': {
        summary: 'Code scanning (SAST) isn\'t set up.',
        whyItMatters: 'CodeQL and similar tools catch bugs that manual review misses. Free for public repos.',
    },
    'gh-sec-secrets-summary': {
        summary: 'Leaked credentials found in your repo.',
        whyItMatters: 'Exposed API keys and tokens get harvested by bots within minutes. Rotate them NOW.',
    },
    'gh-sec-secrets-disabled': {
        summary: 'Secret scanning isn\'t enabled.',
        whyItMatters: 'GitHub can detect 200+ secret types before they\'re committed. Free and easy to enable.',
    },
    // Supabase Management API findings
    'mgmt-rls-disabled': {
        summary: 'Tables are missing Row Level Security.',
        whyItMatters: 'Without RLS, any authenticated user can read and modify ALL data in these tables via the Supabase client.',
    },
    'mgmt-policies-permissive': {
        summary: 'RLS policies allow unrestricted access.',
        whyItMatters: 'Policies using "true" as the condition don\'t actually restrict anything — they\'re security theater.',
    },
    'mgmt-auth-users-fk': {
        summary: 'Public tables reference auth.users directly.',
        whyItMatters: 'Foreign keys to auth.users can leak email addresses and user metadata through PostgREST JOINs.',
    },
    'mgmt-security-definer': {
        summary: 'Functions bypass Row Level Security.',
        whyItMatters: 'SECURITY DEFINER functions run as the owner (superuser), ignoring all RLS policies. If they accept user input, they\'re a privilege escalation risk.',
    },
    'mgmt-dangerous-extensions': {
        summary: 'Dangerous database extensions are enabled.',
        whyItMatters: 'Extensions like dblink and file_fdw can be used to access external systems or read local files.',
    },
    'mgmt-storage-public-buckets': {
        summary: 'Storage buckets are publicly accessible.',
        whyItMatters: 'Anyone on the internet can read files from public buckets without authentication.',
    },
    // Convex Backend findings
    'convex-token-exposed': {
        summary: 'Convex admin key or auth secret is in your frontend code.',
        whyItMatters: 'Anyone can see this key in their browser and get full admin access to your Convex backend.',
    },
    'convex-functions-enumerable': {
        summary: 'Anyone can list all your Convex functions.',
        whyItMatters: 'Attackers can discover internal function names and signatures, making it easier to find vulnerabilities.',
    },
    'convex-cors-open': {
        summary: 'Any website can call your Convex backend.',
        whyItMatters: 'Without CORS restrictions, malicious websites can make requests to your Convex functions on behalf of logged-in users.',
    },
    // Vercel Hosting findings
    'vercel-source-maps': {
        summary: 'Your original source code is downloadable from Vercel.',
        whyItMatters: 'Source maps reveal your unminified code, comments, and variable names — making it trivial to find vulnerabilities.',
    },
    'vercel-next-data-leak': {
        summary: 'Server-side data is leaking through _next/data endpoints.',
        whyItMatters: 'Data meant for server-side rendering is publicly accessible. This may include API keys, database queries, or user data.',
    },
    'vercel-env-exposed': {
        summary: 'Your .env file is publicly accessible on Vercel.',
        whyItMatters: 'Anyone can download your environment variables including API keys, database passwords, and secrets.',
    },
    'vercel-api-stack-trace': {
        summary: 'Your API routes leak error details.',
        whyItMatters: 'Stack traces reveal your code structure, file paths, and dependencies — giving attackers a roadmap.',
    },
    // Netlify Hosting findings
    'netlify-functions-exposed': {
        summary: 'Netlify Functions are accessible without authentication.',
        whyItMatters: 'Attackers can discover and call your serverless functions directly, potentially triggering sensitive operations.',
    },
    'netlify-build-metadata': {
        summary: 'Netlify build metadata is publicly visible.',
        whyItMatters: 'Build metadata reveals site IDs, deployment configuration, and internal details that help attackers target your site.',
    },
    'netlify-env-exposed': {
        summary: 'Configuration files are publicly accessible on Netlify.',
        whyItMatters: 'Exposed .env or netlify.toml files can contain API keys, build secrets, and deployment configuration.',
    },
    // Cloudflare Pages findings
    'cf-old-deploys-accessible': {
        summary: 'Old Cloudflare Pages deployments may be accessible.',
        whyItMatters: 'Previous deployments can contain outdated code with known vulnerabilities, debug settings, or removed features.',
    },
    'cf-source-maps': {
        summary: 'Source maps are exposed on Cloudflare Pages.',
        whyItMatters: 'Anyone can download your original source code, including comments and internal logic.',
    },
    'cf-workers-exposed': {
        summary: 'Cloudflare Worker source code or API details are exposed.',
        whyItMatters: 'Exposed Worker code reveals your server-side logic, and verbose API errors help attackers understand your backend.',
    },
    'vercel-git-exposed': {
        summary: 'Your git repository is downloadable from the Vercel deployment.',
        whyItMatters: 'Attackers can reconstruct your entire source code, commit history, and any secrets ever committed.',
    },
    'netlify-git-exposed': {
        summary: 'Your git repository is downloadable from the Netlify deployment.',
        whyItMatters: 'Attackers can reconstruct your entire source code, commit history, and any secrets ever committed.',
    },
    'cf-git-exposed': {
        summary: 'Your git repository is downloadable from the Cloudflare Pages deployment.',
        whyItMatters: 'Attackers can reconstruct your entire source code, commit history, and any secrets ever committed.',
    },
    'railway-git-exposed': {
        summary: 'Your git repository is downloadable from the Railway deployment.',
        whyItMatters: 'Attackers can reconstruct your entire source code, commit history, and any secrets ever committed.',
    },
    'vercel-backup-files': {
        summary: 'Backup or database dump files are publicly downloadable.',
        whyItMatters: 'Backup files often contain full database contents, source code, or credentials in plain text.',
    },
    'netlify-backup-files': {
        summary: 'Backup or database dump files are publicly downloadable.',
        whyItMatters: 'Backup files often contain full database contents, source code, or credentials in plain text.',
    },
    'cf-backup-files': {
        summary: 'Backup or database dump files are publicly downloadable.',
        whyItMatters: 'Backup files often contain full database contents, source code, or credentials in plain text.',
    },
    'railway-backup-files': {
        summary: 'Backup or database dump files are publicly downloadable.',
        whyItMatters: 'Backup files often contain full database contents, source code, or credentials in plain text.',
    },
    'vercel-config-exposed': {
        summary: 'Your vercel.json deployment config is publicly readable.',
        whyItMatters: 'It reveals your routing rules, rewrites, and environment variable names — a roadmap for attackers.',
    },
    'netlify-config-exposed': {
        summary: 'Netlify config files (_redirects, _headers) are publicly readable.',
        whyItMatters: 'These reveal internal routing rules, API paths, and security header configuration.',
    },
    'cf-config-exposed': {
        summary: 'Cloudflare config files (wrangler.toml, _headers) are publicly readable.',
        whyItMatters: 'wrangler.toml can expose account IDs and Worker bindings. Config files reveal infrastructure details.',
    },
    'railway-config-exposed': {
        summary: 'Deployment config files (Dockerfile, Procfile) are publicly readable.',
        whyItMatters: 'Dockerfiles reveal base images and build steps. Procfiles reveal service architecture. Both help attackers plan attacks.',
    },
    'convex-config-exposed': {
        summary: 'Convex configuration or generated API files are publicly accessible.',
        whyItMatters: 'Generated API types reveal all your backend function names and data structures to potential attackers.',
    },
    'mgmt-rls-no-policies': {
        summary: 'Tables have RLS enabled but no policies.',
        whyItMatters: 'RLS with no policies means nobody (except service_role) can access the data — probably not what you intended.',
    },
    'heading order': {
        summary: 'Messy document structure.',
        whyItMatters: 'Headings should follow a hierarchy (H1 -> H2 -> H3). Skipping levels confuses screen readers and SEO bots.',
    },
    'redirects': {
        summary: 'Too many "hops" to get to the page.',
        whyItMatters: 'Each redirect adds a delay before the page even starts loading.',
    },
    'main landmark': {
        summary: 'Computer can\'t find the main content.',
        whyItMatters: 'Screen readers need a "Main" landmark to jump straight to the content.',
    },
    'document title': {
        summary: 'Page is missing a name.',
        whyItMatters: 'The tab name in the browser is empty. This looks broken and hurts SEO.',
    },
};

export function getPlainEnglish(title: string, description: string): PlainEnglishExplanation | null {
    const normalizedText = (title + ' ' + description).toLowerCase();

    for (const key in definitions) {
        if (normalizedText.includes(key)) {
            return definitions[key];
        }
    }

    // Fallbacks for common patterns not in the dictionary
    if (normalizedText.includes('timeout') || normalizedText.includes('slow')) {
        return {
            summary: 'The server is responding too slowly.',
            whyItMatters: 'Slow server response times delay the entire page load.',
        };
    }

    if (normalizedText.includes('error') && normalizedText.includes('console')) {
        return {
            summary: 'Broken code is running in the browser.',
            whyItMatters: 'Errors can break features and make the site feel buggy.',
        }
    }

    return null;
}

export function generateAIPrompt(url: string, issues: any[]): string {
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    const technicalIssues = issues.filter(i => i.severity !== 'critical');

    return `
# Fix Request for ${url}

I have run an automated audit on my website and need you to fix the following issues.

## 🚨 Critical Issues (Fix These First)
${criticalIssues.map(i => `- [ ] **${i.title}**: ${i.description}`).join('\n')}

## 🛠️ Improvements
${technicalIssues.map(i => `- [ ] **${i.title}**: ${i.description}`).join('\n')}

## Instructions
1. Analyze the codebase to find the source of these issues.
2. Fix the critical security/performance issues first.
3. Apply standard best practices for the remaining items.
4. Explain your changes file-by-file.
`;
}
