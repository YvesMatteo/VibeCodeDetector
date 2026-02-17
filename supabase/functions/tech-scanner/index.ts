import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { validateTargetUrl, validateScannerAuth, getCorsHeaders } from "../_shared/security.ts";

/**
 * Tech Stack Scanner
 * Detects website technologies (frameworks, CMS, servers, libraries)
 * and checks for known CVEs against detected versions.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Technology {
    name: string;
    version: string | null;
    category: string;
    detectedVia: string;
}

interface Finding {
    id: string;
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
    title: string;
    description: string;
    recommendation: string;
    evidence?: string;
}

interface CveEntry {
    belowVersion: string;
    cve: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    description: string;
}

// ---------------------------------------------------------------------------
// Known CVE database
// ---------------------------------------------------------------------------

const KNOWN_CVES: Record<string, CveEntry[]> = {
    'WordPress': [
        { belowVersion: '6.4.3', cve: 'CVE-2024-31210', severity: 'high', description: 'Remote code execution via plugin upload' },
        { belowVersion: '6.3.2', cve: 'CVE-2023-39999', severity: 'medium', description: 'Information disclosure via REST API' },
        { belowVersion: '6.2.1', cve: 'CVE-2023-2745', severity: 'medium', description: 'Directory traversal vulnerability' },
        { belowVersion: '5.8.3', cve: 'CVE-2022-21661', severity: 'high', description: 'SQL injection via WP_Query' },
    ],
    'jQuery': [
        { belowVersion: '3.5.0', cve: 'CVE-2020-11023', severity: 'medium', description: 'XSS via HTML sanitization bypass in htmlPrefilter' },
        { belowVersion: '3.5.0', cve: 'CVE-2020-11022', severity: 'medium', description: 'XSS when passing HTML from untrusted sources' },
        { belowVersion: '3.0.0', cve: 'CVE-2019-11358', severity: 'medium', description: 'Prototype pollution in jQuery.extend' },
        { belowVersion: '1.12.0', cve: 'CVE-2015-9251', severity: 'medium', description: 'XSS via cross-domain AJAX requests' },
    ],
    'Angular': [
        { belowVersion: '16.2.0', cve: 'CVE-2023-26116', severity: 'medium', description: 'ReDoS in Angular expressions' },
        { belowVersion: '14.2.10', cve: 'CVE-2023-26117', severity: 'medium', description: 'ReDoS in Angular template compiler' },
    ],
    'PHP': [
        { belowVersion: '8.3.2', cve: 'CVE-2024-1874', severity: 'high', description: 'Command injection on Windows via proc_open' },
        { belowVersion: '8.2.8', cve: 'CVE-2023-3824', severity: 'critical', description: 'Buffer overflow in phar handling' },
        { belowVersion: '8.1.0', cve: 'CVE-2022-31625', severity: 'high', description: 'Use-after-free in pg_query_params' },
        { belowVersion: '7.4.0', cve: 'CVE-2019-11043', severity: 'critical', description: 'Remote code execution in PHP-FPM' },
    ],
    'nginx': [
        { belowVersion: '1.25.3', cve: 'CVE-2023-44487', severity: 'high', description: 'HTTP/2 rapid reset DoS attack' },
        { belowVersion: '1.21.0', cve: 'CVE-2021-23017', severity: 'critical', description: 'Off-by-one in DNS resolver' },
    ],
    'Apache': [
        { belowVersion: '2.4.58', cve: 'CVE-2023-45802', severity: 'medium', description: 'HTTP/2 stream memory consumption DoS' },
        { belowVersion: '2.4.52', cve: 'CVE-2021-44790', severity: 'critical', description: 'Buffer overflow in mod_lua multipart parser' },
        { belowVersion: '2.4.50', cve: 'CVE-2021-42013', severity: 'critical', description: 'Path traversal and RCE via mod_cgi' },
        { belowVersion: '2.4.49', cve: 'CVE-2021-41773', severity: 'critical', description: 'Path traversal and file disclosure' },
    ],
    'Express': [
        { belowVersion: '4.19.2', cve: 'CVE-2024-29041', severity: 'medium', description: 'Open redirect vulnerability in res.redirect' },
        { belowVersion: '4.17.3', cve: 'CVE-2022-24999', severity: 'high', description: 'Prototype pollution via qs dependency' },
    ],
    'Next.js': [
        { belowVersion: '14.1.1', cve: 'CVE-2024-34350', severity: 'high', description: 'Server-side request forgery via Server Actions' },
        { belowVersion: '13.4.20', cve: 'CVE-2023-46298', severity: 'medium', description: 'DoS via crafted HTTP request' },
    ],
    'React': [
        { belowVersion: '18.2.0', cve: 'CVE-2023-33466', severity: 'medium', description: 'XSS in server-side rendering' },
    ],
    'Bootstrap': [
        { belowVersion: '5.3.0', cve: 'CVE-2024-6484', severity: 'medium', description: 'XSS via tooltip/popover data attributes' },
        { belowVersion: '4.3.1', cve: 'CVE-2019-8331', severity: 'medium', description: 'XSS in tooltip/popover data-template' },
    ],
    'Drupal': [
        { belowVersion: '10.2.2', cve: 'CVE-2024-22362', severity: 'high', description: 'Access bypass vulnerability' },
        { belowVersion: '9.5.11', cve: 'CVE-2023-31250', severity: 'high', description: 'Access bypass in file download' },
    ],
    'Joomla': [
        { belowVersion: '5.0.2', cve: 'CVE-2024-21726', severity: 'high', description: 'XSS via mail template management' },
        { belowVersion: '4.4.1', cve: 'CVE-2023-40626', severity: 'medium', description: 'Open redirect vulnerability' },
    ],
    'IIS': [
        { belowVersion: '10.0', cve: 'CVE-2021-31166', severity: 'critical', description: 'HTTP Protocol Stack RCE' },
    ],
    'LiteSpeed': [
        { belowVersion: '6.0.12', cve: 'CVE-2023-40518', severity: 'high', description: 'HTTP request smuggling' },
    ],
    'Vue.js': [
        { belowVersion: '2.7.14', cve: 'CVE-2023-22461', severity: 'medium', description: 'XSS via v-html directive with user input' },
    ],
};

// ---------------------------------------------------------------------------
// Semver comparison utility
// ---------------------------------------------------------------------------

function parseVersion(version: string): number[] {
    return version
        .replace(/^v/i, '')
        .split('.')
        .map(p => {
            const n = parseInt(p, 10);
            return isNaN(n) ? 0 : n;
        });
}

/**
 * Returns true if `version` is strictly less than `threshold`.
 * Both are semver-ish strings like "1.24.1" or "6.4".
 */
function isVersionBelow(version: string, threshold: string): boolean {
    const v = parseVersion(version);
    const t = parseVersion(threshold);
    const len = Math.max(v.length, t.length);
    for (let i = 0; i < len; i++) {
        const a = v[i] ?? 0;
        const b = t[i] ?? 0;
        if (a < b) return true;
        if (a > b) return false;
    }
    return false; // equal means NOT below
}

// ---------------------------------------------------------------------------
// Detection helpers
// ---------------------------------------------------------------------------

function addTech(
    techs: Map<string, Technology>,
    name: string,
    version: string | null,
    category: string,
    detectedVia: string,
): void {
    const key = name.toLowerCase();
    const existing = techs.get(key);
    // Keep the entry with a version if possible
    if (!existing || (!existing.version && version)) {
        techs.set(key, { name, version, category, detectedVia });
    }
}

function extractVersion(haystack: string, pattern: RegExp): string | null {
    const m = haystack.match(pattern);
    return m?.[1] ?? null;
}

// ---------------------------------------------------------------------------
// Header-based detection
// ---------------------------------------------------------------------------

function detectFromHeaders(
    headers: Headers,
    techs: Map<string, Technology>,
): void {
    const server = headers.get('server');
    if (server) {
        const lower = server.toLowerCase();
        if (lower.includes('nginx')) {
            const ver = extractVersion(server, /nginx\/([\d.]+)/i);
            addTech(techs, 'nginx', ver, 'Web Server', `Server header: ${server}`);
        }
        if (lower.includes('apache')) {
            const ver = extractVersion(server, /apache\/([\d.]+)/i);
            addTech(techs, 'Apache', ver, 'Web Server', `Server header: ${server}`);
        }
        if (lower.includes('iis') || lower.includes('microsoft')) {
            const ver = extractVersion(server, /iis\/([\d.]+)/i) ?? extractVersion(server, /microsoft-iis\/([\d.]+)/i);
            addTech(techs, 'IIS', ver, 'Web Server', `Server header: ${server}`);
        }
        if (lower.includes('litespeed')) {
            const ver = extractVersion(server, /litespeed\/([\d.]+)/i);
            addTech(techs, 'LiteSpeed', ver, 'Web Server', `Server header: ${server}`);
        }
        if (lower.includes('cloudflare')) {
            addTech(techs, 'Cloudflare', null, 'CDN / Proxy', `Server header: ${server}`);
        }
        if (lower.includes('openresty')) {
            const ver = extractVersion(server, /openresty\/([\d.]+)/i);
            addTech(techs, 'OpenResty', ver, 'Web Server', `Server header: ${server}`);
        }
        if (lower.includes('caddy')) {
            addTech(techs, 'Caddy', null, 'Web Server', `Server header: ${server}`);
        }
    }

    const poweredBy = headers.get('x-powered-by');
    if (poweredBy) {
        const lower = poweredBy.toLowerCase();
        if (lower.includes('express')) {
            addTech(techs, 'Express', null, 'Framework', `X-Powered-By: ${poweredBy}`);
        }
        if (lower.includes('php')) {
            const ver = extractVersion(poweredBy, /php\/([\d.]+)/i);
            addTech(techs, 'PHP', ver, 'Language', `X-Powered-By: ${poweredBy}`);
        }
        if (lower.includes('asp.net')) {
            const ver = extractVersion(poweredBy, /asp\.net(?:\s+core)?\/([\d.]+)/i);
            addTech(techs, 'ASP.NET', ver, 'Framework', `X-Powered-By: ${poweredBy}`);
        }
        if (lower.includes('next.js')) {
            const ver = extractVersion(poweredBy, /next\.js\s*([\d.]+)/i);
            addTech(techs, 'Next.js', ver, 'Framework', `X-Powered-By: ${poweredBy}`);
        }
        if (lower.includes('nuxt')) {
            addTech(techs, 'Nuxt.js', null, 'Framework', `X-Powered-By: ${poweredBy}`);
        }
        if (lower.includes('django')) {
            addTech(techs, 'Django', null, 'Framework', `X-Powered-By: ${poweredBy}`);
        }
        if (lower.includes('rails') || lower.includes('phusion')) {
            addTech(techs, 'Ruby on Rails', null, 'Framework', `X-Powered-By: ${poweredBy}`);
        }
    }

    const generator = headers.get('x-generator');
    if (generator) {
        addTech(techs, generator.split('/')[0].trim(), extractVersion(generator, /([\d.]+)/), 'CMS', `X-Generator: ${generator}`);
    }

    // Drupal-specific headers
    if (headers.get('x-drupal-cache') || headers.get('x-drupal-dynamic-cache')) {
        addTech(techs, 'Drupal', null, 'CMS', 'X-Drupal-Cache header present');
    }

    // Shopify
    if (headers.get('x-shopify-stage')) {
        addTech(techs, 'Shopify', null, 'E-commerce Platform', 'X-Shopify-Stage header present');
    }

    // Wix
    const allHeaderKeys = [...headers.keys()];
    if (allHeaderKeys.some(h => h.toLowerCase().startsWith('x-wix'))) {
        addTech(techs, 'Wix', null, 'Website Builder', 'X-Wix-* header present');
    }

    // CDN / Proxy via Via header
    const via = headers.get('via');
    if (via) {
        const lower = via.toLowerCase();
        if (lower.includes('cloudfront')) addTech(techs, 'Amazon CloudFront', null, 'CDN / Proxy', `Via: ${via}`);
        if (lower.includes('varnish')) addTech(techs, 'Varnish', null, 'CDN / Proxy', `Via: ${via}`);
        if (lower.includes('akamai')) addTech(techs, 'Akamai', null, 'CDN / Proxy', `Via: ${via}`);
        if (lower.includes('fastly')) addTech(techs, 'Fastly', null, 'CDN / Proxy', `Via: ${via}`);
        if (lower.includes('cloudflare')) addTech(techs, 'Cloudflare', null, 'CDN / Proxy', `Via: ${via}`);
    }

    // X-Cache
    const xCache = headers.get('x-cache');
    if (xCache) {
        const lower = xCache.toLowerCase();
        if (lower.includes('cloudfront')) addTech(techs, 'Amazon CloudFront', null, 'CDN / Proxy', `X-Cache: ${xCache}`);
        if (lower.includes('varnish')) addTech(techs, 'Varnish', null, 'CDN / Proxy', `X-Cache: ${xCache}`);
    }

    // Vercel
    if (headers.get('x-vercel-id') || headers.get('x-vercel-cache')) {
        addTech(techs, 'Vercel', null, 'Hosting Platform', 'X-Vercel-* header present');
    }

    // Netlify
    if (headers.get('x-nf-request-id') || (server && server.toLowerCase().includes('netlify'))) {
        addTech(techs, 'Netlify', null, 'Hosting Platform', 'Netlify header or server detected');
    }
}

// ---------------------------------------------------------------------------
// Cookie-based detection
// ---------------------------------------------------------------------------

function detectFromCookies(
    headers: Headers,
    techs: Map<string, Technology>,
): void {
    const setCookie = headers.get('set-cookie') ?? '';
    const lower = setCookie.toLowerCase();

    if (lower.includes('phpsessid')) {
        addTech(techs, 'PHP', null, 'Language', 'PHPSESSID cookie');
    }
    if (lower.includes('asp.net_sessionid')) {
        addTech(techs, 'ASP.NET', null, 'Framework', 'ASP.NET_SessionId cookie');
    }
    if (lower.includes('jsessionid')) {
        addTech(techs, 'Java', null, 'Language', 'JSESSIONID cookie');
    }
    if (lower.includes('laravel_session')) {
        addTech(techs, 'Laravel', null, 'Framework', 'laravel_session cookie');
    }
    if (lower.includes('_rails_session') || lower.includes('_session_id')) {
        addTech(techs, 'Ruby on Rails', null, 'Framework', '_rails_session cookie');
    }
    if (lower.includes('connect.sid')) {
        addTech(techs, 'Express', null, 'Framework', 'connect.sid cookie');
    }
    if (lower.includes('wp-settings') || lower.includes('wordpress_')) {
        addTech(techs, 'WordPress', null, 'CMS', 'WordPress cookie detected');
    }
}

// ---------------------------------------------------------------------------
// HTML-based detection
// ---------------------------------------------------------------------------

function detectFromHtml(
    html: string,
    techs: Map<string, Technology>,
): void {
    // Meta generator
    const generatorMatch = html.match(/<meta\s[^>]*name\s*=\s*["']generator["'][^>]*content\s*=\s*["']([^"']+)["']/i)
        ?? html.match(/<meta\s[^>]*content\s*=\s*["']([^"']+)["'][^>]*name\s*=\s*["']generator["']/i);
    if (generatorMatch) {
        const gen = generatorMatch[1];
        const genLower = gen.toLowerCase();
        if (genLower.includes('wordpress')) {
            const ver = extractVersion(gen, /wordpress\s*([\d.]+)/i);
            addTech(techs, 'WordPress', ver, 'CMS', `meta generator: ${gen}`);
        } else if (genLower.includes('joomla')) {
            const ver = extractVersion(gen, /joomla!\s*([\d.]+)/i) ?? extractVersion(gen, /([\d.]+)/);
            addTech(techs, 'Joomla', ver, 'CMS', `meta generator: ${gen}`);
        } else if (genLower.includes('drupal')) {
            const ver = extractVersion(gen, /drupal\s*([\d.]+)/i);
            addTech(techs, 'Drupal', ver, 'CMS', `meta generator: ${gen}`);
        } else if (genLower.includes('ghost')) {
            const ver = extractVersion(gen, /ghost\s*([\d.]+)/i);
            addTech(techs, 'Ghost', ver, 'CMS', `meta generator: ${gen}`);
        } else if (genLower.includes('hugo')) {
            const ver = extractVersion(gen, /hugo\s*([\d.]+)/i);
            addTech(techs, 'Hugo', ver, 'Static Site Generator', `meta generator: ${gen}`);
        } else if (genLower.includes('jekyll')) {
            const ver = extractVersion(gen, /jekyll\s*v?([\d.]+)/i);
            addTech(techs, 'Jekyll', ver, 'Static Site Generator', `meta generator: ${gen}`);
        } else if (genLower.includes('hexo')) {
            addTech(techs, 'Hexo', extractVersion(gen, /([\d.]+)/), 'Static Site Generator', `meta generator: ${gen}`);
        } else if (genLower.includes('typo3')) {
            addTech(techs, 'TYPO3', extractVersion(gen, /([\d.]+)/), 'CMS', `meta generator: ${gen}`);
        } else if (genLower.includes('squarespace')) {
            addTech(techs, 'Squarespace', null, 'Website Builder', `meta generator: ${gen}`);
        } else if (genLower.includes('webflow')) {
            addTech(techs, 'Webflow', null, 'Website Builder', `meta generator: ${gen}`);
        } else {
            addTech(techs, gen.split(/[\s/]+/)[0], extractVersion(gen, /([\d.]+)/), 'CMS / Tool', `meta generator: ${gen}`);
        }
    }

    // WordPress indicators
    if (/\/wp-content\//i.test(html) || /\/wp-includes\//i.test(html)) {
        const wpVer = extractVersion(html, /\bver=([\d.]+)/);
        addTech(techs, 'WordPress', wpVer, 'CMS', 'wp-content/wp-includes paths in HTML');
    }

    // Drupal
    if (/sites\/default\/files/i.test(html) || /\/core\/misc\/drupal\.js/i.test(html)) {
        addTech(techs, 'Drupal', null, 'CMS', 'Drupal file paths in HTML');
    }

    // Shopify
    if (/cdn\.shopify\.com/i.test(html)) {
        addTech(techs, 'Shopify', null, 'E-commerce Platform', 'cdn.shopify.com reference in HTML');
    }

    // Next.js
    if (/\/_next\//i.test(html) || /__next/i.test(html) || /__NEXT_DATA__/i.test(html)) {
        addTech(techs, 'Next.js', null, 'Framework', '_next or __NEXT_DATA__ in HTML');
    }

    // Nuxt.js
    if (/\/_nuxt\//i.test(html) || /window\.__NUXT__/i.test(html)) {
        addTech(techs, 'Nuxt.js', null, 'Framework', '_nuxt or __NUXT__ in HTML');
    }

    // Angular
    const angularVerMatch = html.match(/ng-version\s*=\s*["']([\d.]+)["']/i);
    if (angularVerMatch) {
        addTech(techs, 'Angular', angularVerMatch[1], 'Framework', `ng-version="${angularVerMatch[1]}" in HTML`);
    } else if (/ng-app/i.test(html) || /ng-controller/i.test(html)) {
        addTech(techs, 'AngularJS', null, 'Framework', 'ng-app or ng-controller in HTML (AngularJS 1.x)');
    }

    // React
    if (/data-reactroot/i.test(html) || /data-reactid/i.test(html)) {
        addTech(techs, 'React', null, 'Framework', 'data-reactroot/data-reactid in HTML');
    }

    // Gatsby
    if (/id\s*=\s*["']___gatsby["']/i.test(html)) {
        addTech(techs, 'Gatsby', null, 'Static Site Generator', '<div id="___gatsby"> in HTML');
    }

    // Svelte / SvelteKit
    if (/svelte/i.test(html) && /<script[^>]*svelte/i.test(html)) {
        addTech(techs, 'Svelte', null, 'Framework', 'Svelte references in script tags');
    }
    if (/__sveltekit/i.test(html)) {
        addTech(techs, 'SvelteKit', null, 'Framework', '__sveltekit in HTML');
    }

    // Ember
    if (/ember/i.test(html) && (/ember\.js/i.test(html) || /ember-cli/i.test(html) || /id\s*=\s*["']ember/i.test(html))) {
        addTech(techs, 'Ember.js', null, 'Framework', 'Ember references in HTML');
    }

    // jQuery (with version extraction)
    const jqueryVerMatch = html.match(/jquery[.-]([\d.]+)(?:\.min)?\.js/i)
        ?? html.match(/jquery\.js\?ver=([\d.]+)/i)
        ?? html.match(/jQuery\s+v([\d.]+)/i);
    if (jqueryVerMatch) {
        addTech(techs, 'jQuery', jqueryVerMatch[1], 'JavaScript Library', `jQuery ${jqueryVerMatch[1]} in HTML`);
    } else if (/jquery/i.test(html)) {
        addTech(techs, 'jQuery', null, 'JavaScript Library', 'jQuery reference in HTML');
    }

    // Vue.js
    const vueVerMatch = html.match(/vue(?:@|\/)([\d.]+)/i) ?? html.match(/vue\.(?:min\.)?js\?v=([\d.]+)/i);
    if (vueVerMatch) {
        addTech(techs, 'Vue.js', vueVerMatch[1], 'Framework', `Vue.js ${vueVerMatch[1]} in HTML`);
    } else if (/vue(?:\.min)?\.js/i.test(html) || /data-v-[a-f0-9]+/i.test(html) || /id\s*=\s*["']app["'][^>]*data-v-/i.test(html)) {
        addTech(techs, 'Vue.js', null, 'Framework', 'Vue.js indicators in HTML');
    }

    // Bootstrap (with version extraction)
    const bsVerMatch = html.match(/bootstrap[./-]([\d.]+)(?:\.min)?\.(?:css|js)/i)
        ?? html.match(/bootstrap\.(?:min\.)?(?:css|js)\?ver=([\d.]+)/i);
    if (bsVerMatch) {
        addTech(techs, 'Bootstrap', bsVerMatch[1], 'CSS Framework', `Bootstrap ${bsVerMatch[1]} in HTML`);
    } else if (/bootstrap/i.test(html) && /(?:\.min)?\.(?:css|js)/i.test(html)) {
        addTech(techs, 'Bootstrap', null, 'CSS Framework', 'Bootstrap reference in HTML');
    }

    // Tailwind CSS
    if (/tailwindcss/i.test(html) || /tailwind/i.test(html)) {
        addTech(techs, 'Tailwind CSS', null, 'CSS Framework', 'Tailwind CSS reference in HTML');
    }

    // Google CDN libraries
    if (/googleapis\.com\/ajax\/libs\//i.test(html)) {
        addTech(techs, 'Google CDN', null, 'CDN', 'googleapis.com/ajax/libs/ in HTML');
    }

    // CDNJS
    if (/cdnjs\.cloudflare\.com/i.test(html)) {
        addTech(techs, 'CDNJS', null, 'CDN', 'cdnjs.cloudflare.com in HTML');
    }

    // UNPKG
    if (/unpkg\.com/i.test(html)) {
        addTech(techs, 'UNPKG', null, 'CDN', 'unpkg.com in HTML');
    }

    // Font Awesome
    if (/font-awesome|fontawesome/i.test(html)) {
        addTech(techs, 'Font Awesome', null, 'Icon Library', 'Font Awesome reference in HTML');
    }

    // Try to extract Next.js version from build manifest or __NEXT_DATA__
    const nextDataMatch = html.match(/__NEXT_DATA__.*?"version"\s*:\s*"([\d.]+)"/s)
        ?? html.match(/"next"\s*:\s*"([\d.]+)"/);
    if (nextDataMatch) {
        addTech(techs, 'Next.js', nextDataMatch[1], 'Framework', `__NEXT_DATA__ version: ${nextDataMatch[1]}`);
    }

    // React version from ReactDOM or React script tags
    const reactVerMatch = html.match(/react(?:-dom)?[./-]([\d.]+)(?:\.min)?\.(?:js|mjs)/i)
        ?? html.match(/react\.(?:development|production\.min)\.js\?v=([\d.]+)/i);
    if (reactVerMatch) {
        addTech(techs, 'React', reactVerMatch[1], 'Framework', `React ${reactVerMatch[1]} in script src`);
    }

    // Google Analytics / Tag Manager
    if (/google-analytics\.com|googletagmanager\.com|gtag\(/i.test(html)) {
        addTech(techs, 'Google Analytics', null, 'Analytics', 'Google Analytics/GTM in HTML');
    }

    // Cloudflare Rocket Loader / other Cloudflare indicators
    if (/cloudflare/i.test(html) && /rocket-loader|cf-/i.test(html)) {
        addTech(techs, 'Cloudflare', null, 'CDN / Proxy', 'Cloudflare scripts in HTML');
    }
}

// ---------------------------------------------------------------------------
// Path probing (limited to 3 probes max)
// ---------------------------------------------------------------------------

async function probeCommonPaths(
    baseUrl: string,
    techs: Map<string, Technology>,
    homepageLength: number,
): Promise<void> {
    // Each probe has a content validator to prevent SPA catch-all false positives.
    // We use GET (not HEAD) and verify the response body confirms the technology.
    const probes: { path: string; tech: string; category: string; validate: (body: string, ct: string) => boolean }[] = [
        {
            path: '/wp-login.php',
            tech: 'WordPress',
            category: 'CMS',
            // Real WP login pages contain "wp-login" form or "wordpress" references
            validate: (body, ct) => ct.includes('text/html') && /wp-login|wordpress/i.test(body),
        },
        {
            path: '/wp-json/wp/v2/',
            tech: 'WordPress',
            category: 'CMS',
            // Real WP REST API returns application/json with "namespace":"wp/v2"
            validate: (body, ct) => ct.includes('json') && /namespace.*wp\/v2|wp\/v2.*namespace/i.test(body),
        },
        {
            path: '/administrator/',
            tech: 'Joomla',
            category: 'CMS',
            // Real Joomla admin pages contain "joomla" references
            validate: (body, ct) => ct.includes('text/html') && /joomla|com_login/i.test(body),
        },
    ];

    const origin = new URL(baseUrl).origin;

    const results = await Promise.allSettled(
        probes.map(async (probe) => {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);
            try {
                const resp = await fetch(`${origin}${probe.path}`, {
                    method: 'GET',
                    redirect: 'follow',
                    signal: controller.signal,
                    headers: { 'User-Agent': 'CheckVibe-Scanner/2.0' },
                });
                if (resp.status !== 200 && resp.status !== 302 && resp.status !== 301) return;
                const body = await resp.text();
                const ct = resp.headers.get('content-type') || '';
                // Skip if response is the same size as homepage (SPA catch-all)
                if (Math.abs(body.length - homepageLength) / Math.max(homepageLength, 1) < 0.05) return;
                // Validate content actually matches the technology
                if (probe.validate(body, ct)) {
                    addTech(techs, probe.tech, null, probe.category, `${probe.path} returned ${resp.status}`);
                }
            } finally {
                clearTimeout(timeout);
            }
        }),
    );

    // Silently ignore probe errors
    void results;
}

// ---------------------------------------------------------------------------
// Debug mode detection
// ---------------------------------------------------------------------------

function detectDebugMode(html: string, headers: Headers): string[] {
    const indicators: string[] = [];

    if (headers.get('x-debug-token') || headers.get('x-debug-token-link')) {
        indicators.push('X-Debug-Token header present (Symfony debug mode)');
    }
    if (headers.get('x-debug')) {
        indicators.push('X-Debug header present');
    }
    if (/debug\s*[:=]\s*true/i.test(html)) {
        indicators.push('debug=true found in HTML source');
    }
    if (/\bDEBUG\b/.test(html) && /traceback|stack\s*trace|exception/i.test(html)) {
        indicators.push('Debug traceback/stacktrace found in HTML');
    }
    if (/<!-- #BeginEditable|<!-- Symfony Web Debug/i.test(html)) {
        indicators.push('Debug HTML comments found');
    }
    if (/laravel.*debugbar|__clockwork/i.test(html)) {
        indicators.push('Laravel Debugbar or Clockwork detected');
    }

    return indicators;
}

// ---------------------------------------------------------------------------
// Technology-to-ecosystem mapping for OSV.dev lookups
// ---------------------------------------------------------------------------

const TECH_TO_ECOSYSTEM: Record<string, { ecosystem: string; packageName: string }> = {
    'Next.js': { ecosystem: 'npm', packageName: 'next' },
    'React': { ecosystem: 'npm', packageName: 'react' },
    'Vue.js': { ecosystem: 'npm', packageName: 'vue' },
    'Angular': { ecosystem: 'npm', packageName: '@angular/core' },
    'AngularJS': { ecosystem: 'npm', packageName: 'angular' },
    'jQuery': { ecosystem: 'npm', packageName: 'jquery' },
    'Bootstrap': { ecosystem: 'npm', packageName: 'bootstrap' },
    'Express': { ecosystem: 'npm', packageName: 'express' },
    'Nuxt.js': { ecosystem: 'npm', packageName: 'nuxt' },
    'Gatsby': { ecosystem: 'npm', packageName: 'gatsby' },
    'Svelte': { ecosystem: 'npm', packageName: 'svelte' },
    'SvelteKit': { ecosystem: 'npm', packageName: '@sveltejs/kit' },
    'Ember.js': { ecosystem: 'npm', packageName: 'ember-source' },
    'WordPress': { ecosystem: 'Packagist', packageName: 'wordpress/wordpress' },
    'Drupal': { ecosystem: 'Packagist', packageName: 'drupal/core' },
    'Joomla': { ecosystem: 'Packagist', packageName: 'joomla/joomla-cms' },
    'Laravel': { ecosystem: 'Packagist', packageName: 'laravel/framework' },
    'Django': { ecosystem: 'PyPI', packageName: 'Django' },
    'Ruby on Rails': { ecosystem: 'RubyGems', packageName: 'rails' },
    'Ghost': { ecosystem: 'npm', packageName: 'ghost' },
};

// ---------------------------------------------------------------------------
// Live CVE checking via OSV.dev API (free, no key required)
// ---------------------------------------------------------------------------

async function checkCvesLive(techs: Map<string, Technology>): Promise<{ findings: Finding[]; deductions: number }> {
    const findings: Finding[] = [];
    let deductions = 0;
    const seenCves = new Set<string>();

    // Build OSV batch query for techs with known versions and ecosystem mappings
    const queries: Array<{ package: { name: string; ecosystem: string }; version: string; _techName: string; _detectedVia: string }> = [];

    for (const tech of techs.values()) {
        if (!tech.version) continue;
        const mapping = TECH_TO_ECOSYSTEM[tech.name];
        if (!mapping) continue;

        queries.push({
            package: { name: mapping.packageName, ecosystem: mapping.ecosystem },
            version: tech.version.replace(/^v/i, ''),
            _techName: tech.name,
            _detectedVia: tech.detectedVia,
        });
    }

    if (queries.length === 0) return { findings, deductions };

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        try {
            const res = await fetch('https://api.osv.dev/v1/querybatch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    queries: queries.map(q => ({
                        package: q.package,
                        version: q.version,
                    })),
                }),
                signal: controller.signal,
            });

            if (!res.ok) return { findings, deductions };

            const data = await res.json();
            if (!data.results || !Array.isArray(data.results)) return { findings, deductions };

            for (let i = 0; i < data.results.length; i++) {
                const result = data.results[i];
                const query = queries[i];
                if (!result.vulns || !Array.isArray(result.vulns)) continue;

                // Take top 5 vulns per technology to avoid flooding
                for (const vuln of result.vulns.slice(0, 5)) {
                    const vulnId = vuln.id || '';
                    // Prefer CVE alias if available
                    const cveAlias = vuln.aliases?.find((a: string) => a.startsWith('CVE-')) || vulnId;

                    if (seenCves.has(cveAlias)) continue;
                    seenCves.add(cveAlias);

                    // Determine severity from OSV data
                    let severity: 'critical' | 'high' | 'medium' | 'low' = 'medium';
                    const severityScore = vuln.severity?.[0]?.score;
                    const dbSeverity = vuln.database_specific?.severity?.toLowerCase();

                    if (severityScore >= 9.0 || dbSeverity === 'critical') severity = 'critical';
                    else if (severityScore >= 7.0 || dbSeverity === 'high') severity = 'high';
                    else if (severityScore >= 4.0 || dbSeverity === 'moderate' || dbSeverity === 'medium') severity = 'medium';
                    else severity = 'low';

                    const severityDeduction =
                        severity === 'critical' ? 30 :
                        severity === 'high' ? 20 :
                        severity === 'medium' ? 10 : 5;

                    deductions += severityDeduction;

                    // Extract fix version
                    let fixVersion = '';
                    if (vuln.affected?.[0]?.ranges) {
                        for (const range of vuln.affected[0].ranges) {
                            const fixEvent = range.events?.find((e: any) => e.fixed);
                            if (fixEvent) {
                                fixVersion = fixEvent.fixed;
                                break;
                            }
                        }
                    }

                    const summary = vuln.summary || vuln.details?.substring(0, 150) || 'No description available';

                    findings.push({
                        id: `osv-${cveAlias.toLowerCase().replace(/[^a-z0-9-]/g, '-')}`,
                        severity,
                        title: `${query._techName} ${query.version} — ${cveAlias}`,
                        description: summary.length > 200 ? summary.substring(0, 200) + '...' : summary,
                        recommendation: fixVersion
                            ? `Update ${query._techName} to version ${fixVersion} or later.`
                            : `Update ${query._techName} to the latest version.`,
                        evidence: `Detected via: ${query._detectedVia}. Source: OSV.dev`,
                    });
                }
            }
        } finally {
            clearTimeout(timeout);
        }
    } catch (e) {
        // OSV.dev unavailable — fall through to hardcoded CVEs
        console.error('OSV.dev query failed:', e);
    }

    return { findings, deductions };
}

// ---------------------------------------------------------------------------
// Hardcoded CVE checking (fallback)
// ---------------------------------------------------------------------------

function checkCvesHardcoded(techs: Map<string, Technology>): { findings: Finding[]; deductions: number } {
    const findings: Finding[] = [];
    let deductions = 0;

    for (const tech of techs.values()) {
        const cveList = KNOWN_CVES[tech.name];
        if (!cveList || !tech.version) continue;

        for (const entry of cveList) {
            if (isVersionBelow(tech.version, entry.belowVersion)) {
                const severityDeduction =
                    entry.severity === 'critical' ? 30 :
                    entry.severity === 'high' ? 20 :
                    entry.severity === 'medium' ? 10 : 5;

                deductions += severityDeduction;

                findings.push({
                    id: `cve-${entry.cve.toLowerCase()}`,
                    severity: entry.severity,
                    title: `${tech.name} ${tech.version} — ${entry.cve}`,
                    description: entry.description,
                    recommendation: `Update ${tech.name} to version ${entry.belowVersion} or later.`,
                    evidence: `Detected via: ${tech.detectedVia}`,
                });
            }
        }
    }

    return { findings, deductions };
}

// ---------------------------------------------------------------------------
// Combined CVE check: live OSV.dev first, hardcoded fallback, deduplicated
// ---------------------------------------------------------------------------

async function checkCves(techs: Map<string, Technology>): Promise<{ findings: Finding[]; deductions: number }> {
    // Try live OSV.dev first
    const liveResults = await checkCvesLive(techs);

    // Always run hardcoded as fallback (catches techs without OSV ecosystem mapping)
    const hardcodedResults = checkCvesHardcoded(techs);

    // Merge: use live results as primary, add hardcoded findings not already covered
    const seenIds = new Set(liveResults.findings.map(f => {
        // Extract CVE ID from title for dedup
        const cveMatch = f.title.match(/CVE-\d{4}-\d+/i);
        return cveMatch ? cveMatch[0].toLowerCase() : f.id;
    }));

    const mergedFindings = [...liveResults.findings];
    let mergedDeductions = liveResults.deductions;

    for (const finding of hardcodedResults.findings) {
        const cveMatch = finding.title.match(/CVE-\d{4}-\d+/i);
        const key = cveMatch ? cveMatch[0].toLowerCase() : finding.id;
        if (!seenIds.has(key)) {
            seenIds.add(key);
            mergedFindings.push(finding);
            // Re-calculate deduction for this finding
            const d = finding.severity === 'critical' ? 30 :
                      finding.severity === 'high' ? 20 :
                      finding.severity === 'medium' ? 10 : 5;
            mergedDeductions += d;
        }
    }

    return { findings: mergedFindings, deductions: mergedDeductions };
}

// ---------------------------------------------------------------------------
// Security concern findings
// ---------------------------------------------------------------------------

function checkInfoDisclosure(
    headers: Headers,
    techs: Map<string, Technology>,
    html: string,
): { findings: Finding[]; deductions: number } {
    const findings: Finding[] = [];
    let deductions = 0;

    // Server header version disclosure
    const server = headers.get('server');
    if (server && /[\d.]+/.test(server)) {
        deductions += 5;
        findings.push({
            id: 'info-server-version',
            severity: 'medium',
            title: 'Server version exposed in headers',
            description: `The Server header discloses version information: "${server}". This helps attackers identify specific vulnerabilities.`,
            recommendation: 'Configure your web server to suppress version information from the Server header.',
            evidence: `Server: ${server}`,
        });
    }

    // X-Powered-By disclosure
    const poweredBy = headers.get('x-powered-by');
    if (poweredBy) {
        deductions += 5;
        findings.push({
            id: 'info-powered-by',
            severity: 'medium',
            title: 'X-Powered-By header exposes technology stack',
            description: `The X-Powered-By header reveals: "${poweredBy}". This aids attacker reconnaissance.`,
            recommendation: 'Remove the X-Powered-By header from your server configuration.',
            evidence: `X-Powered-By: ${poweredBy}`,
        });
    }

    // Outdated jQuery without version-specific CVE (general warning)
    const jquery = techs.get('jquery');
    if (jquery?.version && isVersionBelow(jquery.version, '3.0.0')) {
        deductions += 15;
        findings.push({
            id: 'outdated-jquery',
            severity: 'medium',
            title: `Very outdated jQuery version ${jquery.version}`,
            description: `jQuery ${jquery.version} is multiple major versions behind the current release and contains known security vulnerabilities.`,
            recommendation: 'Update jQuery to the latest 3.x release.',
            evidence: `Detected via: ${jquery.detectedVia}`,
        });
    }

    // WordPress without security indicators
    const wp = techs.get('wordpress');
    if (wp) {
        const hasSecurityPlugin = /wordfence|sucuri|ithemes-security|all-in-one-wp-security|better-wp-security/i.test(html);
        if (!hasSecurityPlugin) {
            findings.push({
                id: 'wp-no-security-plugin',
                severity: 'low',
                title: 'WordPress detected without security plugin indicators',
                description: 'No common WordPress security plugin signatures were detected (Wordfence, Sucuri, iThemes Security, etc.).',
                recommendation: 'Consider installing a security plugin such as Wordfence or Sucuri for additional protection.',
                evidence: `Detected via: ${wp.detectedVia}`,
            });
        }
    }

    // Debug mode
    const debugIndicators = detectDebugMode(html, headers);
    if (debugIndicators.length > 0) {
        deductions += 20;
        findings.push({
            id: 'debug-mode-enabled',
            severity: 'high',
            title: 'Debug mode indicators detected',
            description: `The site appears to have debug mode enabled, which can expose sensitive information such as stack traces, database queries, and internal paths.`,
            recommendation: 'Disable debug mode in production environments immediately.',
            evidence: debugIndicators.join('; '),
        });
    }

    return { findings, deductions };
}

// ---------------------------------------------------------------------------
// Extract versions from first-party JS bundles
// ---------------------------------------------------------------------------

async function extractVersionsFromScripts(
    targetUrl: string,
    html: string,
    techs: Map<string, Technology>,
): Promise<void> {
    const origin = new URL(targetUrl).origin;

    // Find first-party script URLs (up to 5, skip CDN/third-party)
    const scriptPattern = /<script[^>]+src\s*=\s*["']([^"']+)["']/gi;
    const cdnPatterns = /cdn\.|cdnjs\.|unpkg\.com|jsdelivr\.net|googleapis\.com|gstatic\.com|cloudflare\.com|google-analytics/i;
    const scripts: string[] = [];

    let m;
    while ((m = scriptPattern.exec(html)) !== null && scripts.length < 5) {
        let src = m[1];
        if (src.startsWith('//')) src = 'https:' + src;
        else if (src.startsWith('/')) src = origin + src;
        else if (!src.startsWith('http')) continue;

        try {
            const srcUrl = new URL(src);
            if (srcUrl.origin !== origin) continue; // skip third-party
            if (cdnPatterns.test(src)) continue;
            scripts.push(src);
        } catch { /* skip invalid URLs */ }
    }

    if (scripts.length === 0) return;

    // Fetch up to 3 scripts and scan for version patterns
    const results = await Promise.allSettled(
        scripts.slice(0, 3).map(async (src) => {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);
            try {
                const resp = await fetch(src, {
                    signal: controller.signal,
                    headers: { 'User-Agent': 'CheckVibe-TechScanner/1.0' },
                });
                if (!resp.ok) return;
                const text = await resp.text();
                // Only scan first 50KB to avoid memory issues
                const chunk = text.substring(0, 50000);

                // Next.js version in chunks
                const nextMatch = chunk.match(/Next\.js\s+v?([\d.]+)/i)
                    ?? chunk.match(/"next":\s*"([\d.]+)"/);
                if (nextMatch) addTech(techs, 'Next.js', nextMatch[1], 'Framework', `JS bundle: Next.js ${nextMatch[1]}`);

                // React version in bundles
                const reactMatch = chunk.match(/React v?([\d.]+)/i)
                    ?? chunk.match(/react\.version\s*=\s*"([\d.]+)"/);
                if (reactMatch) addTech(techs, 'React', reactMatch[1], 'Framework', `JS bundle: React ${reactMatch[1]}`);

                // Vue.js
                const vueMatch = chunk.match(/Vue\.js v([\d.]+)/i);
                if (vueMatch) addTech(techs, 'Vue.js', vueMatch[1], 'Framework', `JS bundle: Vue.js ${vueMatch[1]}`);

                // Angular
                const angMatch = chunk.match(/@angular\/core.*?([\d]+\.[\d]+\.[\d]+)/);
                if (angMatch) addTech(techs, 'Angular', angMatch[1], 'Framework', `JS bundle: Angular ${angMatch[1]}`);

                // jQuery
                const jqMatch = chunk.match(/jQuery\s+v?([\d.]+)/i)
                    ?? chunk.match(/jquery:\s*"([\d.]+)"/);
                if (jqMatch) addTech(techs, 'jQuery', jqMatch[1], 'JavaScript Library', `JS bundle: jQuery ${jqMatch[1]}`);
            } finally {
                clearTimeout(timeout);
            }
        }),
    );
    void results;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: getCorsHeaders(req) });
    }

    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        });
    }

    if (!validateScannerAuth(req)) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        });
    }

    try {
        const body = await req.json();
        const validation = validateTargetUrl(body.targetUrl);
        if (!validation.valid) {
            return new Response(JSON.stringify({ error: validation.error }), {
                status: 400,
                headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
            });
        }
        const targetUrl = validation.url!;

        // ------------------------------------------------------------------
        // 1. Fetch the target page (full GET — we need HTML body + headers)
        // ------------------------------------------------------------------
        const controller = new AbortController();
        const fetchTimeout = setTimeout(() => controller.abort(), 15000);
        let response: Response;
        try {
            response = await fetch(targetUrl, {
                method: 'GET',
                redirect: 'follow',
                signal: controller.signal,
                headers: {
                    'User-Agent': 'CheckVibe-TechScanner/1.0 (+https://checkvibe.dev)',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                },
            });
        } finally {
            clearTimeout(fetchTimeout);
        }

        const html = await response.text();
        const techs = new Map<string, Technology>();

        // ------------------------------------------------------------------
        // 2. Run all detection methods
        // ------------------------------------------------------------------
        detectFromHeaders(response.headers, techs);
        detectFromCookies(response.headers, techs);
        detectFromHtml(html, techs);

        // Path probing (max 3 requests with content validation)
        await probeCommonPaths(targetUrl, techs, html.length);

        // Try to extract versions from first-party JS files
        await extractVersionsFromScripts(targetUrl, html, techs);

        // ------------------------------------------------------------------
        // 3. Check detected technologies against CVE database (live + hardcoded)
        // ------------------------------------------------------------------
        const cveResults = await checkCves(techs);

        // Add info finding listing all detected technologies
        if (techs.size > 0) {
            const techList = [...techs.values()];
            const withVersion = techList.filter(t => t.version);
            const withoutVersion = techList.filter(t => !t.version);

            cveResults.findings.push({
                id: 'tech-stack-detected',
                severity: 'info',
                title: `${techs.size} technologies detected`,
                description: techList.map(t => t.version ? `${t.name} ${t.version}` : t.name).join(', '),
                recommendation: withoutVersion.length > 0
                    ? `${withoutVersion.length} technologies detected without version numbers — CVE checks only run when a version is identified. Consider checking these manually: ${withoutVersion.map(t => t.name).join(', ')}.`
                    : 'All detected technologies have version numbers and were checked for known CVEs.',
            });
        }

        // ------------------------------------------------------------------
        // 4. Check for security concerns (info disclosure, debug, etc.)
        // ------------------------------------------------------------------
        const infoResults = checkInfoDisclosure(response.headers, techs, html);

        // ------------------------------------------------------------------
        // 5. Compile results
        // ------------------------------------------------------------------
        const allFindings: Finding[] = [...cveResults.findings, ...infoResults.findings];
        const totalDeductions = cveResults.deductions + infoResults.deductions;
        const score = Math.max(0, Math.min(100, 100 - totalDeductions));

        const technologies = [...techs.values()].map(t => ({
            name: t.name,
            version: t.version,
            category: t.category,
        }));

        const checksRun =
            3  // header detection, cookie detection, HTML detection
            + 3  // path probes
            + (techs.size > 0 ? 1 : 0)  // CVE check
            + 1; // info disclosure check

        return new Response(JSON.stringify({
            scannerType: 'tech_stack',
            score,
            checksRun,
            findings: allFindings,
            technologies,
            scannedAt: new Date().toISOString(),
            url: targetUrl,
        }), {
            headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Scanner error:', error);
        return new Response(JSON.stringify({
            scannerType: 'tech_stack',
            score: 0,
            error: 'Scan failed. The target may be unreachable or blocking requests.',
            findings: [],
            technologies: [],
            checksRun: 0,
            scannedAt: new Date().toISOString(),
            url: '',
        }), {
            status: 500,
            headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        });
    }
});
