
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
