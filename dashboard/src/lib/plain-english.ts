
export interface PlainEnglishExplanation {
    summary: string;
    whyItMatters: string;
}

const definitions: Record<string, PlainEnglishExplanation> = {
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
