const fastify = require('fastify')({ logger: true });
const { chromium } = require('playwright');

const PORT = process.env.PORT || 8080;
const AUTH_KEY = process.env.RENDERER_SECRET_KEY || 'default-secret';

fastify.post('/render', async (request, reply) => {
    const authHeader = request.headers['x-renderer-key'];
    if (authHeader !== AUTH_KEY) {
        return reply.status(401).send({ error: 'Unauthorized' });
    }

    const { url } = request.body;
    if (!url || typeof url !== 'string') {
        return reply.status(400).send({ error: 'Missing or invalid url' });
    }

    let browser;
    try {
        fastify.log.info(`Rendering URL: ${url}`);
        browser = await chromium.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
        });
        const context = await browser.newContext({
            userAgent: 'CheckVibe-PlaywrightRenderer/1.0 (+https://checkvibe.dev)',
            ignoreHTTPSErrors: true,
            bypassCSP: true,
        });

        const page = await context.newPage();
        const apiCalls = new Set();
        const cookiesSet = [];

        page.on('request', req => {
            const resourceType = req.resourceType();
            if (['fetch', 'xhr'].includes(resourceType)) {
                apiCalls.add(req.url());
            }
        });

        page.on('response', async res => {
            const headers = res.headers();
            if (headers['set-cookie']) {
                // Keep track of cookies set during SPA loading for deep cookie scanning
                cookiesSet.push(headers['set-cookie']);
            }
        });

        // Navigate and wait for network idle to ensure SPAs are rendered
        await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });

        // Let it settle for a bit more if there are delayed renders
        await new Promise(r => setTimeout(r, 2000));

        const html = await page.evaluate(() => document.documentElement.outerHTML);
        const cookies = await context.cookies();

        return {
            url,
            html,
            apiCalls: Array.from(apiCalls),
            cookies: cookies
        };
    } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: error.message });
    } finally {
        if (browser) {
            await browser.close().catch(() => { });
        }
    }
});

const start = async () => {
    try {
        await fastify.listen({ port: PORT, host: '0.0.0.0' });
        console.log(`Renderer service running on port ${PORT}`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();
