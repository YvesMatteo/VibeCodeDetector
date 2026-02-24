import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { validateTargetUrl, validateScannerAuth, getCorsHeaders } from "../_shared/security.ts";

/**
 * API Key & Exposure Scanner
 * Detects exposed API keys, secrets, credentials, exposed infrastructure,
 * and unprotected databases in client-side code and server paths.
 */

const API_KEY_PATTERNS = [
    // =========================================================================
    // AWS (3 patterns)
    // =========================================================================
    { name: 'AWS Access Key', pattern: /AKIA[0-9A-Z]{16}/g, severity: 'critical' },
    { name: 'AWS Secret Key', pattern: /(?<![A-Za-z0-9/+=])[A-Za-z0-9/+=]{40}(?![A-Za-z0-9/+=])/g, severity: 'critical', requiresContext: true, contextKeywords: /AKIA[0-9A-Z]{16}|aws_secret_access_key|AWS_SECRET_ACCESS_KEY|aws_secret_key|AWS_SECRET_KEY/i },
    { name: 'AWS MWS Token', pattern: /amzn\.mws\.[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, severity: 'critical' },

    // =========================================================================
    // Azure (2 patterns)
    // =========================================================================
    { name: 'Azure Storage Key', pattern: /(?:[A-Za-z0-9+/]{86}==)/g, severity: 'critical', requiresContext: true },
    { name: 'Azure AD Client Secret', pattern: /(?:azure|AZURE).*['"]\b[a-zA-Z0-9~._-]{34}\b['"]/gi, severity: 'critical' },

    // =========================================================================
    // GCP (1 pattern)
    // =========================================================================
    { name: 'GCP Service Account Key', pattern: /"type"\s*:\s*"service_account"/g, severity: 'critical' },

    // =========================================================================
    // Stripe (3 patterns)
    // =========================================================================
    { name: 'Stripe Live Secret Key', pattern: /sk_live_[a-zA-Z0-9]{24,}/g, severity: 'critical' },
    { name: 'Stripe Test Secret Key', pattern: /sk_test_[a-zA-Z0-9]{24,}/g, severity: 'critical' },
    { name: 'Stripe Restricted Key', pattern: /rk_live_[a-zA-Z0-9]{24,}/g, severity: 'critical' },

    // =========================================================================
    // OpenAI (2 patterns)
    // =========================================================================
    { name: 'OpenAI API Key', pattern: /sk-[a-zA-Z0-9]{48}/g, severity: 'critical' },
    { name: 'OpenAI API Key (new)', pattern: /sk-proj-[a-zA-Z0-9]{48}/g, severity: 'critical' },

    // =========================================================================
    // Anthropic (1 pattern)
    // =========================================================================
    { name: 'Anthropic API Key', pattern: /sk-ant-[a-zA-Z0-9_-]{40,}/g, severity: 'critical' },

    // =========================================================================
    // Hugging Face (1 pattern)
    // =========================================================================
    { name: 'Hugging Face Token', pattern: /hf_[a-zA-Z0-9]{34,}/g, severity: 'critical' },

    // =========================================================================
    // Replicate (1 pattern)
    // =========================================================================
    { name: 'Replicate API Token', pattern: /r8_[a-zA-Z0-9]{20,}/g, severity: 'critical' },

    // =========================================================================
    // Google (2 patterns)
    // =========================================================================
    { name: 'Google API Key', pattern: /AIza[0-9A-Za-z-_]{35}/g, severity: 'critical' },
    { name: 'Google OAuth Client ID', pattern: /[0-9]+-[0-9A-Za-z_]{32}\.apps\.googleusercontent\.com/g, severity: 'critical' },

    // =========================================================================
    // Firebase (1 pattern)
    // =========================================================================
    { name: 'Firebase API Key', pattern: /(?:apiKey|FIREBASE_API_KEY)\s*[:=]\s*['"](AIza[0-9A-Za-z-_]{35})['"]/gi, severity: 'critical' },

    // =========================================================================
    // GitHub (4 patterns)
    // =========================================================================
    { name: 'GitHub Personal Access Token', pattern: /ghp_[a-zA-Z0-9]{36}/g, severity: 'critical' },
    { name: 'GitHub OAuth Token', pattern: /gho_[a-zA-Z0-9]{36}/g, severity: 'critical' },
    { name: 'GitHub App Token', pattern: /ghu_[a-zA-Z0-9]{36}/g, severity: 'critical' },
    { name: 'GitHub Fine-Grained PAT', pattern: /github_pat_[a-zA-Z0-9_]{82}/g, severity: 'critical' },

    // =========================================================================
    // GitLab (1 pattern)
    // =========================================================================
    { name: 'GitLab PAT', pattern: /glpat-[a-zA-Z0-9_-]{20,}/g, severity: 'critical' },

    // =========================================================================
    // Supabase (1 pattern)
    // =========================================================================
    { name: 'Supabase Service Role Key', pattern: /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g, severity: 'critical', additionalCheck: (match: string) => match.includes('service_role') },

    // =========================================================================
    // Database Connection Strings (4 patterns)
    // =========================================================================
    { name: 'MongoDB Connection String', pattern: /mongodb(\+srv)?:\/\/[^:]+:[^@]+@[^\s'"]+/gi, severity: 'critical' },
    { name: 'PostgreSQL Connection String', pattern: /postgres(ql)?:\/\/[^:]+:[^@]+@[^\s'"]+/gi, severity: 'critical' },
    { name: 'Redis Connection String', pattern: /redis:\/\/[^:]*:[^@]+@[^\s'"]+/gi, severity: 'critical' },
    { name: 'MySQL Connection String', pattern: /mysql:\/\/[^:]+:[^@]+@[^\s'"]+/gi, severity: 'critical' },

    // =========================================================================
    // Twilio (2 patterns)
    // =========================================================================
    { name: 'Twilio API Key', pattern: /SK[a-f0-9]{32}/g, severity: 'critical' },
    { name: 'Twilio Auth Token', pattern: /(?:twilio|TWILIO).*['"]\b[a-f0-9]{32}\b['"]/gi, severity: 'critical' },

    // =========================================================================
    // Slack (2 patterns)
    // =========================================================================
    { name: 'Slack Bot Token', pattern: /xoxb-[0-9]{10,13}-[0-9]{10,13}-[a-zA-Z0-9]{24}/g, severity: 'critical' },
    { name: 'Slack Webhook URL', pattern: /https:\/\/hooks\.slack\.com\/services\/[A-Z0-9]+\/[A-Z0-9]+\/[a-zA-Z0-9]+/g, severity: 'critical' },

    // =========================================================================
    // Discord (2 patterns)
    // =========================================================================
    { name: 'Discord Bot Token', pattern: /[MN][A-Za-z\d]{23,}\.[\w-]{6}\.[\w-]{27,}/g, severity: 'critical' },
    { name: 'Discord Webhook', pattern: /https:\/\/discord(?:app)?\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+/g, severity: 'critical' },

    // =========================================================================
    // Telegram (1 pattern)
    // =========================================================================
    { name: 'Telegram Bot Token', pattern: /\d{8,10}:[A-Za-z0-9_-]{35}/g, severity: 'critical' },

    // =========================================================================
    // SendGrid (1 pattern)
    // =========================================================================
    { name: 'SendGrid API Key', pattern: /SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}/g, severity: 'critical' },

    // =========================================================================
    // Mailchimp (1 pattern)
    // =========================================================================
    { name: 'Mailchimp API Key', pattern: /[a-f0-9]{32}-us[0-9]{1,2}/g, severity: 'critical' },

    // =========================================================================
    // Mailgun (1 pattern)
    // =========================================================================
    { name: 'Mailgun API Key', pattern: /key-[a-zA-Z0-9]{32}/g, severity: 'critical' },

    // =========================================================================
    // Postmark (1 pattern)
    // =========================================================================
    { name: 'Postmark Server Token', pattern: /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/g, severity: 'critical', requiresContext: true },

    // =========================================================================
    // Square (2 patterns)
    // =========================================================================
    { name: 'Square Access Token', pattern: /sq0atp-[a-zA-Z0-9_-]{22,}/g, severity: 'critical' },
    { name: 'Square OAuth Secret', pattern: /sq0csp-[a-zA-Z0-9_-]{43,}/g, severity: 'critical' },

    // =========================================================================
    // PayPal / Braintree (1 pattern)
    // =========================================================================
    { name: 'PayPal/Braintree Token', pattern: /access_token\$production\$[a-z0-9]{13}\$[a-f0-9]{32}/g, severity: 'critical' },

    // =========================================================================
    // Doppler (1 pattern)
    // =========================================================================
    { name: 'Doppler Token', pattern: /dp\.st\.[a-zA-Z0-9_-]{40,}/g, severity: 'critical' },

    // =========================================================================
    // Vercel (1 pattern)
    // =========================================================================
    { name: 'Vercel Token', pattern: /(?:vercel|VERCEL).*['"]\b[a-zA-Z0-9]{24}\b['"]/gi, severity: 'critical' },

    // =========================================================================
    // Netlify (1 pattern)
    // =========================================================================
    { name: 'Netlify Token', pattern: /(?:netlify|NETLIFY).*['"]\b[a-zA-Z0-9_-]{40,}\b['"]/gi, severity: 'critical' },

    // =========================================================================
    // JWT (1 pattern)
    // =========================================================================
    { name: 'JWT Secret', pattern: /(?:jwt[_-]?secret|JWT_SECRET)\s*[:=]\s*['"][^'"]{16,}['"]/gi, severity: 'critical' },

    // =========================================================================
    // Private Keys (1 pattern)
    // =========================================================================
    { name: 'Private Key', pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g, severity: 'critical' },

    // =========================================================================
    // Generic patterns (2 patterns)
    // =========================================================================
    { name: 'Generic API Key', pattern: /(?:api[_-]?key|apikey)\s*[:=]\s*['"][a-zA-Z0-9_-]{20,}['"]/gi, severity: 'critical' },
    { name: 'Generic Secret', pattern: /(?:secret|password|passwd|pwd)\s*[:=]\s*['"][^'"]{8,}['"]/gi, severity: 'critical' },

    // =========================================================================
    // AI/ML Services (~20 patterns)
    // =========================================================================
    { name: 'Groq API Key', pattern: /gsk_[a-zA-Z0-9]{48,}/g, severity: 'critical' },
    { name: 'Fireworks AI Key', pattern: /fw_[a-zA-Z0-9]{32,}/g, severity: 'critical' },
    { name: 'Cohere API Key', pattern: /co_[a-zA-Z0-9]{40,}/g, severity: 'critical' },
    { name: 'Mistral API Key', pattern: /(?:mistral|MISTRAL)[_-]?(?:api[_-]?key|API_KEY)\s*[:=]\s*['"][a-zA-Z0-9]{32,}['"]/gi, severity: 'critical' },
    { name: 'Perplexity API Key', pattern: /pplx-[a-f0-9]{48,}/g, severity: 'critical' },
    { name: 'ElevenLabs API Key', pattern: /(?:elevenlabs|ELEVENLABS|xi[_-]?api[_-]?key|XI_API_KEY)\s*[:=]\s*['"][a-f0-9]{32}['"]/gi, severity: 'critical' },
    { name: 'AssemblyAI API Key', pattern: /(?:assemblyai|ASSEMBLYAI)[_-]?(?:api[_-]?key|API_KEY)\s*[:=]\s*['"][a-f0-9]{32}['"]/gi, severity: 'critical' },
    { name: 'Deepgram API Key', pattern: /(?:deepgram|DEEPGRAM)[_-]?(?:api[_-]?key|API_KEY)\s*[:=]\s*['"][a-f0-9]{40}['"]/gi, severity: 'critical' },
    { name: 'Voyage AI Key', pattern: /voy_[a-zA-Z0-9]{32,}/g, severity: 'critical' },
    { name: 'RunwayML API Key', pattern: /(?:runway|RUNWAY)[_-]?(?:api[_-]?key|API_KEY)\s*[:=]\s*['"][a-zA-Z0-9_-]{32,}['"]/gi, severity: 'high' },
    { name: 'Stability AI Key', pattern: /sk-[a-zA-Z0-9]{48,}/g, severity: 'critical', requiresContext: true, contextKeywords: /stability|STABILITY|stable[_-]?diffusion/i },
    { name: 'Together AI Key', pattern: /tok_[a-zA-Z0-9]{32,}/g, severity: 'critical' },
    { name: 'Anyscale API Key', pattern: /(?:anyscale|ANYSCALE)[_-]?(?:api[_-]?key|API_KEY)\s*[:=]\s*['"][a-zA-Z0-9_-]{32,}['"]/gi, severity: 'high' },
    { name: 'AI21 Labs API Key', pattern: /(?:ai21|AI21)[_-]?(?:api[_-]?key|API_KEY)\s*[:=]\s*['"][a-zA-Z0-9]{32,}['"]/gi, severity: 'critical' },
    { name: 'Writer AI Key', pattern: /(?:writer|WRITER)[_-]?(?:api[_-]?key|API_KEY)\s*[:=]\s*['"][a-zA-Z0-9]{32,}['"]/gi, severity: 'high' },
    { name: 'Cerebras API Key', pattern: /(?:cerebras|CEREBRAS)[_-]?(?:api[_-]?key|API_KEY)\s*[:=]\s*['"][a-zA-Z0-9_-]{32,}['"]/gi, severity: 'critical' },
    { name: 'DeepSeek API Key', pattern: /(?:deepseek|DEEPSEEK)[_-]?(?:api[_-]?key|API_KEY)\s*[:=]\s*['"][a-zA-Z0-9_-]{32,}['"]/gi, severity: 'critical' },
    { name: 'Google AI Studio / Gemini Key', pattern: /(?:gemini|GEMINI|google[_-]?ai|GOOGLE_AI)[_-]?(?:api[_-]?key|API_KEY)\s*[:=]\s*['"]AIza[0-9A-Za-z_-]{35}['"]/gi, severity: 'critical' },
    { name: 'Clarifai PAT', pattern: /(?:clarifai|CLARIFAI)[_-]?(?:pat|PAT|api[_-]?key|API_KEY)\s*[:=]\s*['"][a-f0-9]{40,}['"]/gi, severity: 'critical' },
    { name: 'Roboflow API Key', pattern: /(?:roboflow|ROBOFLOW)[_-]?(?:api[_-]?key|API_KEY)\s*[:=]\s*['"][a-zA-Z0-9]{20,}['"]/gi, severity: 'high' },

    // =========================================================================
    // Vector Databases (~6 patterns)
    // =========================================================================
    { name: 'Pinecone API Key', pattern: /(?:pinecone|PINECONE)[_-]?(?:api[_-]?key|API_KEY)\s*[:=]\s*['"][a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}['"]/gi, severity: 'critical' },
    { name: 'Pinecone API Key (new)', pattern: /pcsk_[a-zA-Z0-9_-]{40,}/g, severity: 'critical' },
    { name: 'Weaviate API Key', pattern: /(?:weaviate|WEAVIATE)[_-]?(?:api[_-]?key|API_KEY)\s*[:=]\s*['"][a-zA-Z0-9]{32,}['"]/gi, severity: 'critical' },
    { name: 'Qdrant API Key', pattern: /(?:qdrant|QDRANT)[_-]?(?:api[_-]?key|API_KEY)\s*[:=]\s*['"][a-zA-Z0-9_-]{32,}['"]/gi, severity: 'critical' },
    { name: 'Milvus Token', pattern: /(?:milvus|MILVUS)[_-]?(?:token|TOKEN|api[_-]?key|API_KEY)\s*[:=]\s*['"][a-zA-Z0-9_-]{32,}['"]/gi, severity: 'high' },
    { name: 'Chroma Cloud Token', pattern: /(?:chroma|CHROMA)[_-]?(?:token|TOKEN|api[_-]?key|API_KEY)\s*[:=]\s*['"][a-zA-Z0-9_-]{32,}['"]/gi, severity: 'high' },

    // =========================================================================
    // Databases (~10 patterns)
    // =========================================================================
    { name: 'Neon DB Connection', pattern: /neondb_[a-zA-Z0-9_-]{20,}/g, severity: 'critical' },
    { name: 'PlanetScale Token', pattern: /pscale_tkn_[a-zA-Z0-9_-]{32,}/g, severity: 'critical' },
    { name: 'PlanetScale OAuth Token', pattern: /pscale_oauth_[a-zA-Z0-9_-]{32,}/g, severity: 'critical' },
    { name: 'PlanetScale Password', pattern: /pscale_pw_[a-zA-Z0-9_-]{32,}/g, severity: 'critical' },
    { name: 'Turso Auth Token', pattern: /(?:turso|TURSO|libsql|LIBSQL)[_-]?(?:auth[_-]?token|AUTH_TOKEN)\s*[:=]\s*['"][a-zA-Z0-9._-]{40,}['"]/gi, severity: 'critical' },
    { name: 'Upstash Redis Token', pattern: /(?:upstash|UPSTASH)[_-]?(?:redis[_-]?rest[_-]?token|REDIS_REST_TOKEN)\s*[:=]\s*['"]AX[a-zA-Z0-9_-]{30,}['"]/gi, severity: 'critical' },
    { name: 'Fauna Secret Key', pattern: /fn[a-zA-Z0-9_-]{40,}/g, severity: 'critical', requiresContext: true, contextKeywords: /fauna|FAUNA|faunadb|FAUNADB/i },
    { name: 'Xata API Key', pattern: /xau_[a-zA-Z0-9]{20,}/g, severity: 'critical' },
    { name: 'CockroachDB Connection', pattern: /(?:cockroach|COCKROACH)[_-]?(?:db|DB)[_-]?(?:url|URL|connection|CONNECTION)\s*[:=]\s*['"]postgresql:\/\/[^'"]+['"]/gi, severity: 'critical' },
    { name: 'Hasura Admin Secret', pattern: /(?:hasura|HASURA)[_-]?(?:admin[_-]?secret|ADMIN_SECRET|graphql[_-]?admin[_-]?secret|GRAPHQL_ADMIN_SECRET)\s*[:=]\s*['"][^'"]{16,}['"]/gi, severity: 'critical' },
    { name: 'TiDB Connection', pattern: /(?:tidb|TIDB)[_-]?(?:password|PASSWORD|token|TOKEN)\s*[:=]\s*['"][^'"]{8,}['"]/gi, severity: 'critical' },

    // =========================================================================
    // Email Services (~6 patterns)
    // =========================================================================
    { name: 'Resend API Key', pattern: /re_[a-zA-Z0-9]{24,}/g, severity: 'critical' },
    { name: 'Loops API Key', pattern: /(?:loops|LOOPS)[_-]?(?:api[_-]?key|API_KEY)\s*[:=]\s*['"][a-f0-9]{32,}['"]/gi, severity: 'high' },
    { name: 'Brevo (Sendinblue) API Key', pattern: /xkeysib-[a-f0-9]{64}/g, severity: 'critical' },
    { name: 'ConvertKit API Secret', pattern: /(?:convertkit|CONVERTKIT)[_-]?(?:api[_-]?secret|API_SECRET|secret|SECRET)\s*[:=]\s*['"][a-zA-Z0-9_-]{20,}['"]/gi, severity: 'critical' },
    { name: 'Beehiiv API Key', pattern: /(?:beehiiv|BEEHIIV)[_-]?(?:api[_-]?key|API_KEY)\s*[:=]\s*['"][a-zA-Z0-9_-]{32,}['"]/gi, severity: 'high' },
    { name: 'Customer.io API Key', pattern: /(?:customerio|CUSTOMERIO|customer[_.]io|CUSTOMER[_.]IO)[_-]?(?:api[_-]?key|API_KEY|tracking[_-]?api[_-]?key)\s*[:=]\s*['"][a-f0-9]{32,}['"]/gi, severity: 'high' },

    // =========================================================================
    // Hosting / Infrastructure (~12 patterns)
    // =========================================================================
    { name: 'Fly.io Token', pattern: /fo1_[a-zA-Z0-9_-]{40,}/g, severity: 'critical' },
    { name: 'Render API Key', pattern: /rnd_[a-zA-Z0-9]{32,}/g, severity: 'critical' },
    { name: 'Railway Token', pattern: /(?:railway|RAILWAY)[_-]?(?:token|TOKEN|api[_-]?token|API_TOKEN)\s*[:=]\s*['"][a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}['"]/gi, severity: 'critical' },
    { name: 'DigitalOcean Token', pattern: /dop_v1_[a-f0-9]{64}/g, severity: 'critical' },
    { name: 'DigitalOcean OAuth Token', pattern: /doo_v1_[a-f0-9]{64}/g, severity: 'critical' },
    { name: 'Linode Token', pattern: /(?:linode|LINODE)[_-]?(?:token|TOKEN|api[_-]?token|API_TOKEN)\s*[:=]\s*['"][a-f0-9]{64}['"]/gi, severity: 'critical' },
    { name: 'Hetzner API Token', pattern: /(?:hetzner|HETZNER)[_-]?(?:token|TOKEN|api[_-]?token|API_TOKEN)\s*[:=]\s*['"][a-zA-Z0-9]{64}['"]/gi, severity: 'critical' },
    { name: 'Vultr API Key', pattern: /(?:vultr|VULTR)[_-]?(?:api[_-]?key|API_KEY)\s*[:=]\s*['"][a-zA-Z0-9]{36}['"]/gi, severity: 'critical' },
    { name: 'Heroku API Key', pattern: /(?:heroku|HEROKU)[_-]?(?:api[_-]?key|API_KEY)\s*[:=]\s*['"][a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}['"]/gi, severity: 'critical' },
    { name: 'Cloudflare API Token', pattern: /(?:cloudflare|CLOUDFLARE|cf|CF)[_-]?(?:api[_-]?token|API_TOKEN)\s*[:=]\s*['"][a-zA-Z0-9_-]{40}['"]/gi, severity: 'critical' },
    { name: 'Cloudflare Global API Key', pattern: /v1\.0-[a-f0-9]{24}-[a-f0-9]{24}/g, severity: 'critical' },
    { name: 'Akamai Client Token', pattern: /akab-[a-zA-Z0-9]{16}-[a-zA-Z0-9]{16}/g, severity: 'critical' },
    { name: 'Fastly API Token', pattern: /(?:fastly|FASTLY)[_-]?(?:api[_-]?token|API_TOKEN|key|KEY)\s*[:=]\s*['"][a-zA-Z0-9_-]{32}['"]/gi, severity: 'critical' },

    // =========================================================================
    // Auth Providers (~8 patterns)
    // =========================================================================
    { name: 'Clerk Secret Key', pattern: /sk_live_[a-zA-Z0-9]{24,}/g, severity: 'critical', requiresContext: true, contextKeywords: /clerk|CLERK/i },
    { name: 'Clerk Test Secret Key', pattern: /sk_test_[a-zA-Z0-9]{24,}/g, severity: 'high', requiresContext: true, contextKeywords: /clerk|CLERK/i },
    { name: 'Auth0 Management API Token', pattern: /(?:auth0|AUTH0)[_-]?(?:management[_-]?api[_-]?token|MANAGEMENT_API_TOKEN|api[_-]?token|API_TOKEN|client[_-]?secret|CLIENT_SECRET)\s*[:=]\s*['"][a-zA-Z0-9_-]{32,}['"]/gi, severity: 'critical' },
    { name: 'Okta API Token', pattern: /(?:okta|OKTA)[_-]?(?:api[_-]?token|API_TOKEN|client[_-]?secret|CLIENT_SECRET)\s*[:=]\s*['"]00[a-zA-Z0-9_-]{38,}['"]/gi, severity: 'critical' },
    { name: 'WorkOS API Key', pattern: /wk_[a-zA-Z0-9]{32,}/g, severity: 'critical' },
    { name: 'Stytch Secret', pattern: /stytch-[a-zA-Z0-9_-]{32,}/g, severity: 'critical' },
    { name: 'Kinde Client Secret', pattern: /(?:kinde|KINDE)[_-]?(?:client[_-]?secret|CLIENT_SECRET)\s*[:=]\s*['"][a-zA-Z0-9_-]{32,}['"]/gi, severity: 'critical' },
    { name: 'PropelAuth API Key', pattern: /(?:propelauth|PROPELAUTH|propel_auth|PROPEL_AUTH)[_-]?(?:api[_-]?key|API_KEY)\s*[:=]\s*['"][a-zA-Z0-9_-]{32,}['"]/gi, severity: 'critical' },
    { name: 'Descope Project ID / Key', pattern: /(?:descope|DESCOPE)[_-]?(?:project[_-]?id|management[_-]?key|PROJECT_ID|MANAGEMENT_KEY)\s*[:=]\s*['"][a-zA-Z0-9_-]{20,}['"]/gi, severity: 'high' },

    // =========================================================================
    // Payment Services (~6 patterns)
    // =========================================================================
    { name: 'Lemon Squeezy API Key', pattern: /(?:lemon[_-]?squeezy|LEMON_SQUEEZY|lemonsqueezy|LEMONSQUEEZY)[_-]?(?:api[_-]?key|API_KEY)\s*[:=]\s*['"][a-zA-Z0-9_-]{40,}['"]/gi, severity: 'critical' },
    { name: 'Paddle API Key', pattern: /(?:paddle|PADDLE)[_-]?(?:api[_-]?key|API_KEY|auth[_-]?code|AUTH_CODE)\s*[:=]\s*['"][a-f0-9]{32,}['"]/gi, severity: 'critical' },
    { name: 'Gumroad API Token', pattern: /(?:gumroad|GUMROAD)[_-]?(?:api[_-]?token|API_TOKEN|access[_-]?token|ACCESS_TOKEN)\s*[:=]\s*['"][a-zA-Z0-9_-]{30,}['"]/gi, severity: 'critical' },
    { name: 'Coinbase Commerce API Key', pattern: /(?:coinbase|COINBASE)[_-]?(?:commerce[_-]?)?(?:api[_-]?key|API_KEY)\s*[:=]\s*['"][a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}['"]/gi, severity: 'critical' },
    { name: 'Razorpay Key Secret', pattern: /rzp_(?:live|test)_[a-zA-Z0-9]{14,}/g, severity: 'critical' },
    { name: 'Mercado Pago Access Token', pattern: /APP_USR-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/g, severity: 'critical' },

    // =========================================================================
    // Monitoring & Analytics (~14 patterns)
    // =========================================================================
    { name: 'Sentry DSN', pattern: /https:\/\/[a-f0-9]{32}@[a-z0-9.-]+\.ingest\.(?:us\.)?sentry\.io\/\d+/g, severity: 'medium' },
    { name: 'Sentry Auth Token', pattern: /sntrys_[a-zA-Z0-9]{56,}/g, severity: 'critical' },
    { name: 'Datadog API Key', pattern: /(?:datadog|DATADOG|dd|DD)[_-]?(?:api[_-]?key|API_KEY)\s*[:=]\s*['"][a-f0-9]{32}['"]/gi, severity: 'critical' },
    { name: 'Datadog App Key', pattern: /(?:datadog|DATADOG|dd|DD)[_-]?(?:app[_-]?key|APP_KEY|application[_-]?key|APPLICATION_KEY)\s*[:=]\s*['"][a-f0-9]{40}['"]/gi, severity: 'critical' },
    { name: 'New Relic API Key', pattern: /NRAK-[A-Z0-9]{27}/g, severity: 'critical' },
    { name: 'New Relic License Key', pattern: /(?:new[_-]?relic|NEWRELIC|NEW_RELIC)[_-]?(?:license[_-]?key|LICENSE_KEY)\s*[:=]\s*['"][a-f0-9]{40}NRAL['"]/gi, severity: 'critical' },
    { name: 'PostHog Server API Key', pattern: /phx_[a-zA-Z0-9]{40,}/g, severity: 'critical' },
    { name: 'Mixpanel Token', pattern: /(?:mixpanel|MIXPANEL)[_-]?(?:token|TOKEN|project[_-]?token|PROJECT_TOKEN)\s*[:=]\s*['"][a-f0-9]{32}['"]/gi, severity: 'high' },
    { name: 'Amplitude API Key', pattern: /(?:amplitude|AMPLITUDE)[_-]?(?:api[_-]?key|API_KEY|secret[_-]?key|SECRET_KEY)\s*[:=]\s*['"][a-f0-9]{32}['"]/gi, severity: 'high' },
    { name: 'Segment Write Key', pattern: /(?:segment|SEGMENT)[_-]?(?:write[_-]?key|WRITE_KEY)\s*[:=]\s*['"][a-zA-Z0-9]{24,}['"]/gi, severity: 'high' },
    { name: 'LaunchDarkly SDK Key', pattern: /sdk-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/g, severity: 'critical' },
    { name: 'Grafana Service Account Token', pattern: /glsa_[a-zA-Z0-9]{32}_[a-f0-9]{8}/g, severity: 'critical' },
    { name: 'Grafana API Key', pattern: /eyJr[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, severity: 'critical', requiresContext: true, contextKeywords: /grafana|GRAFANA/i },
    { name: 'BugSnag API Key', pattern: /(?:bugsnag|BUGSNAG)[_-]?(?:api[_-]?key|API_KEY|notifier[_-]?key|NOTIFIER_KEY)\s*[:=]\s*['"][a-f0-9]{32}['"]/gi, severity: 'high' },
    { name: 'PagerDuty API Key', pattern: /(?:pagerduty|PAGERDUTY|pd|PD)[_-]?(?:api[_-]?key|API_KEY|integration[_-]?key|INTEGRATION_KEY|routing[_-]?key|ROUTING_KEY)\s*[:=]\s*['"][a-f0-9]{32}['"]/gi, severity: 'critical' },
    { name: 'Honeycomb API Key', pattern: /(?:honeycomb|HONEYCOMB)[_-]?(?:api[_-]?key|API_KEY)\s*[:=]\s*['"][a-zA-Z0-9]{22}['"]/gi, severity: 'critical' },
    { name: 'Logflare API Key', pattern: /(?:logflare|LOGFLARE)[_-]?(?:api[_-]?key|API_KEY|access[_-]?token|ACCESS_TOKEN)\s*[:=]\s*['"][a-zA-Z0-9_-]{32,}['"]/gi, severity: 'high' },
    { name: 'Axiom API Token', pattern: /(?:axiom|AXIOM)[_-]?(?:api[_-]?token|API_TOKEN|token|TOKEN)\s*[:=]\s*['"]xaat-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}['"]/gi, severity: 'critical' },
    { name: 'Axiom Ingest Token', pattern: /xait-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/g, severity: 'high' },

    // =========================================================================
    // CMS / Content (~12 patterns)
    // =========================================================================
    { name: 'Sanity Token', pattern: /(?:sanity|SANITY)[_-]?(?:auth[_-]?token|AUTH_TOKEN|token|TOKEN|api[_-]?token|API_TOKEN)\s*[:=]\s*['"]sk[a-zA-Z0-9]{80,}['"]/gi, severity: 'critical' },
    { name: 'Contentful Management Token', pattern: /CFPAT-[a-zA-Z0-9_-]{43}/g, severity: 'critical' },
    { name: 'Contentful Delivery Token', pattern: /(?:contentful|CONTENTFUL)[_-]?(?:delivery[_-]?token|DELIVERY_TOKEN|access[_-]?token|ACCESS_TOKEN)\s*[:=]\s*['"][a-zA-Z0-9_-]{43,}['"]/gi, severity: 'high' },
    { name: 'Prismic Token', pattern: /(?:prismic|PRISMIC)[_-]?(?:access[_-]?token|ACCESS_TOKEN|api[_-]?token|API_TOKEN)\s*[:=]\s*['"][a-zA-Z0-9._-]{40,}['"]/gi, severity: 'high' },
    { name: 'Hygraph Token', pattern: /(?:hygraph|HYGRAPH|graphcms|GRAPHCMS)[_-]?(?:token|TOKEN|auth[_-]?token|AUTH_TOKEN)\s*[:=]\s*['"][a-zA-Z0-9_-]{100,}['"]/gi, severity: 'critical' },
    { name: 'DatoCMS API Token', pattern: /(?:datocms|DATOCMS|dato|DATO)[_-]?(?:api[_-]?token|API_TOKEN|token|TOKEN)\s*[:=]\s*['"][a-f0-9]{30,}['"]/gi, severity: 'critical' },
    { name: 'Storyblok Token', pattern: /(?:storyblok|STORYBLOK)[_-]?(?:token|TOKEN|api[_-]?key|API_KEY|access[_-]?token|ACCESS_TOKEN)\s*[:=]\s*['"][a-zA-Z0-9]{20,}['"]/gi, severity: 'high' },
    { name: 'Builder.io Private Key', pattern: /(?:builder|BUILDER)[_-]?(?:private[_-]?key|PRIVATE_KEY|api[_-]?key|API_KEY)\s*[:=]\s*['"][a-f0-9]{32}['"]/gi, severity: 'critical' },
    { name: 'Ghost Admin API Key', pattern: /(?:ghost|GHOST)[_-]?(?:admin[_-]?api[_-]?key|ADMIN_API_KEY)\s*[:=]\s*['"][a-f0-9]{24}:[a-f0-9]{64}['"]/gi, severity: 'critical' },
    { name: 'Notion Integration Token', pattern: /secret_[a-zA-Z0-9]{43}/g, severity: 'critical' },
    { name: 'Airtable PAT', pattern: /pat[a-zA-Z0-9]{14}\.[a-f0-9]{64}/g, severity: 'critical' },
    { name: 'Directus Token', pattern: /(?:directus|DIRECTUS)[_-]?(?:token|TOKEN|admin[_-]?token|ADMIN_TOKEN|api[_-]?token|API_TOKEN)\s*[:=]\s*['"][a-zA-Z0-9_-]{32,}['"]/gi, severity: 'critical' },
    { name: 'Webflow API Token', pattern: /(?:webflow|WEBFLOW)[_-]?(?:api[_-]?token|API_TOKEN|token|TOKEN)\s*[:=]\s*['"][a-f0-9]{64}['"]/gi, severity: 'critical' },

    // =========================================================================
    // Communication & Messaging (~10 patterns)
    // =========================================================================
    { name: 'Pusher App Secret', pattern: /(?:pusher|PUSHER)[_-]?(?:app[_-]?secret|APP_SECRET|secret|SECRET)\s*[:=]\s*['"][a-f0-9]{20}['"]/gi, severity: 'critical' },
    { name: 'Pusher Key', pattern: /(?:pusher|PUSHER)[_-]?(?:key|KEY|app[_-]?key|APP_KEY)\s*[:=]\s*['"][a-f0-9]{20}['"]/gi, severity: 'high' },
    { name: 'Ably API Key', pattern: /(?:ably|ABLY)[_-]?(?:api[_-]?key|API_KEY|key|KEY)\s*[:=]\s*['"][a-zA-Z0-9._-]{20,}:[a-zA-Z0-9_-]{20,}['"]/gi, severity: 'critical' },
    { name: 'Stream Secret Key', pattern: /stream_[a-zA-Z0-9]{40,}/g, severity: 'critical', requiresContext: true, contextKeywords: /getstream|stream[_-]?chat|stream[_-]?feed|STREAM/i },
    { name: 'Telnyx API Key', pattern: /KEY[a-zA-Z0-9_-]{40,}/g, severity: 'critical', requiresContext: true, contextKeywords: /telnyx|TELNYX/i },
    { name: 'Vonage API Secret', pattern: /(?:vonage|VONAGE|nexmo|NEXMO)[_-]?(?:api[_-]?secret|API_SECRET|secret|SECRET)\s*[:=]\s*['"][a-zA-Z0-9]{16}['"]/gi, severity: 'critical' },
    { name: 'MessageBird API Key', pattern: /(?:messagebird|MESSAGEBIRD)[_-]?(?:api[_-]?key|API_KEY|access[_-]?key|ACCESS_KEY)\s*[:=]\s*['"][a-zA-Z0-9]{25}['"]/gi, severity: 'critical' },
    { name: 'Twitch Client Secret', pattern: /(?:twitch|TWITCH)[_-]?(?:client[_-]?secret|CLIENT_SECRET)\s*[:=]\s*['"][a-z0-9]{30}['"]/gi, severity: 'critical' },
    { name: 'Intercom Access Token', pattern: /(?:intercom|INTERCOM)[_-]?(?:access[_-]?token|ACCESS_TOKEN|api[_-]?key|API_KEY)\s*[:=]\s*['"][a-zA-Z0-9=_-]{40,}['"]/gi, severity: 'critical' },
    { name: 'Sendbird API Token', pattern: /(?:sendbird|SENDBIRD)[_-]?(?:api[_-]?token|API_TOKEN|app[_-]?token|APP_TOKEN)\s*[:=]\s*['"][a-f0-9]{40}['"]/gi, severity: 'critical' },
    { name: 'Agora App Certificate', pattern: /(?:agora|AGORA)[_-]?(?:app[_-]?certificate|APP_CERTIFICATE|secret|SECRET)\s*[:=]\s*['"][a-f0-9]{32}['"]/gi, severity: 'critical' },

    // =========================================================================
    // Storage / CDN (~8 patterns)
    // =========================================================================
    { name: 'Cloudinary Secret', pattern: /(?:cloudinary|CLOUDINARY)[_-]?(?:api[_-]?secret|API_SECRET|secret|SECRET)\s*[:=]\s*['"][a-zA-Z0-9_-]{20,}['"]/gi, severity: 'critical' },
    { name: 'Cloudinary URL', pattern: /cloudinary:\/\/[0-9]+:[a-zA-Z0-9_-]+@[a-zA-Z0-9_-]+/g, severity: 'critical' },
    { name: 'Uploadthing Secret', pattern: /sk_live_[a-zA-Z0-9]{32,}/g, severity: 'critical', requiresContext: true, contextKeywords: /uploadthing|UPLOADTHING/i },
    { name: 'Mux Token Secret', pattern: /(?:mux|MUX)[_-]?(?:token[_-]?secret|TOKEN_SECRET|secret|SECRET)\s*[:=]\s*['"][a-zA-Z0-9/+=]{64,}['"]/gi, severity: 'critical' },
    { name: 'Backblaze App Key', pattern: /K0[a-zA-Z0-9]{29,}/g, severity: 'critical', requiresContext: true, contextKeywords: /backblaze|b2|B2_APPLICATION_KEY/i },
    { name: 'Bunny CDN API Key', pattern: /(?:bunny|BUNNY|bunnycdn|BUNNYCDN)[_-]?(?:api[_-]?key|API_KEY|password|PASSWORD)\s*[:=]\s*['"][a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12,}['"]/gi, severity: 'critical' },
    { name: 'Imgix Token', pattern: /(?:imgix|IMGIX)[_-]?(?:token|TOKEN|secure[_-]?url[_-]?token|SECURE_URL_TOKEN)\s*[:=]\s*['"][a-zA-Z0-9_-]{20,}['"]/gi, severity: 'high' },
    { name: 'Filestack API Key', pattern: /(?:filestack|FILESTACK)[_-]?(?:api[_-]?key|API_KEY|key|KEY)\s*[:=]\s*['"]A[a-zA-Z0-9]{20}['"]/gi, severity: 'high' },
    { name: 'ImageKit Private Key', pattern: /(?:imagekit|IMAGEKIT)[_-]?(?:private[_-]?key|PRIVATE_KEY)\s*[:=]\s*['"]private_[a-zA-Z0-9+/=]{20,}['"]/gi, severity: 'critical' },

    // =========================================================================
    // CI/CD & Dev Tools (~12 patterns)
    // =========================================================================
    { name: 'CircleCI Token', pattern: /(?:circleci|CIRCLECI|circle[_-]?ci|CIRCLE_CI)[_-]?(?:token|TOKEN|api[_-]?token|API_TOKEN)\s*[:=]\s*['"][a-f0-9]{40}['"]/gi, severity: 'critical' },
    { name: 'npm Token', pattern: /npm_[a-zA-Z0-9]{36}/g, severity: 'critical' },
    { name: 'PyPI API Token', pattern: /pypi-[a-zA-Z0-9_-]{100,}/g, severity: 'critical' },
    { name: 'RubyGems API Key', pattern: /rubygems_[a-f0-9]{48}/g, severity: 'critical' },
    { name: 'NuGet API Key', pattern: /oy2[a-z0-9]{43}/g, severity: 'critical' },
    { name: 'Bitbucket App Password', pattern: /(?:bitbucket|BITBUCKET)[_-]?(?:app[_-]?password|APP_PASSWORD|token|TOKEN)\s*[:=]\s*['"][a-zA-Z0-9_-]{20,}['"]/gi, severity: 'critical' },
    { name: 'Travis CI Token', pattern: /(?:travis|TRAVIS)[_-]?(?:token|TOKEN|api[_-]?token|API_TOKEN)\s*[:=]\s*['"][a-zA-Z0-9_-]{22}['"]/gi, severity: 'high' },
    { name: 'Codecov Token', pattern: /(?:codecov|CODECOV)[_-]?(?:token|TOKEN)\s*[:=]\s*['"][a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}['"]/gi, severity: 'high' },
    { name: 'Buildkite Agent Token', pattern: /bkua_[a-f0-9]{40}/g, severity: 'critical' },
    { name: 'Terraform Cloud Token', pattern: /(?:terraform|TF|TFC)[_-]?(?:token|TOKEN|api[_-]?token|API_TOKEN)\s*[:=]\s*['"][a-zA-Z0-9._-]{14,}['"]/gi, severity: 'critical' },
    { name: 'Terraform Cloud Token (prefix)', pattern: /tf_[a-zA-Z0-9]{40,}/g, severity: 'critical', requiresContext: true, contextKeywords: /terraform|hashicorp|TF_TOKEN|TFC_TOKEN/i },
    { name: 'Pulumi Access Token', pattern: /pul-[a-f0-9]{40}/g, severity: 'critical' },
    { name: 'Docker Hub PAT', pattern: /dckr_pat_[a-zA-Z0-9_-]{27,}/g, severity: 'critical' },

    // =========================================================================
    // SaaS Services (~15 patterns)
    // =========================================================================
    { name: 'Linear API Key', pattern: /lin_api_[a-zA-Z0-9]{40}/g, severity: 'critical' },
    { name: 'Figma PAT', pattern: /figd_[a-zA-Z0-9_-]{40,}/g, severity: 'critical' },
    { name: 'Shopify Admin API Token', pattern: /shpat_[a-f0-9]{32}/g, severity: 'critical' },
    { name: 'Shopify Private App Password', pattern: /shppa_[a-f0-9]{32}/g, severity: 'critical' },
    { name: 'Shopify Custom App Token', pattern: /shpca_[a-f0-9]{32}/g, severity: 'critical' },
    { name: 'Shopify Shared Secret', pattern: /shpss_[a-f0-9]{32}/g, severity: 'critical' },
    { name: 'HubSpot PAT', pattern: /pat-na1-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/g, severity: 'critical' },
    { name: 'Zendesk API Token', pattern: /(?:zendesk|ZENDESK)[_-]?(?:api[_-]?token|API_TOKEN|token|TOKEN)\s*[:=]\s*['"][a-zA-Z0-9]{40}['"]/gi, severity: 'critical' },
    { name: 'Typeform PAT', pattern: /tfp_[a-zA-Z0-9_-]{40,}/g, severity: 'critical' },
    { name: 'Calendly API Key', pattern: /(?:calendly|CALENDLY)[_-]?(?:api[_-]?key|API_KEY|token|TOKEN)\s*[:=]\s*['"][a-zA-Z0-9_-]{40,}['"]/gi, severity: 'high' },
    { name: 'DocuSign Integration Key', pattern: /(?:docusign|DOCUSIGN)[_-]?(?:integration[_-]?key|INTEGRATION_KEY|client[_-]?id|CLIENT_ID)\s*[:=]\s*['"][a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}['"]/gi, severity: 'high' },
    { name: 'Plaid Client Secret', pattern: /(?:plaid|PLAID)[_-]?(?:client[_-]?secret|CLIENT_SECRET|secret|SECRET)\s*[:=]\s*['"][a-f0-9]{30}['"]/gi, severity: 'critical' },
    { name: 'Lob API Key', pattern: /(?:lob|LOB)[_-]?(?:api[_-]?key|API_KEY)\s*[:=]\s*['"](?:live|test)_[a-f0-9]{35,}['"]/gi, severity: 'critical' },
    { name: 'Mapbox Secret Token', pattern: /sk\.eyJ[a-zA-Z0-9_-]{50,}\.[a-zA-Z0-9_-]{20,}/g, severity: 'critical' },
    { name: 'Algolia Admin API Key', pattern: /(?:algolia|ALGOLIA)[_-]?(?:admin[_-]?api[_-]?key|ADMIN_API_KEY|api[_-]?key|API_KEY)\s*[:=]\s*['"][a-f0-9]{32}['"]/gi, severity: 'critical' },
    { name: 'Jira API Token', pattern: /(?:jira|JIRA|atlassian|ATLASSIAN)[_-]?(?:api[_-]?token|API_TOKEN|token|TOKEN)\s*[:=]\s*['"][a-zA-Z0-9]{24}['"]/gi, severity: 'critical' },
    { name: 'Asana PAT', pattern: /(?:asana|ASANA)[_-]?(?:personal[_-]?access[_-]?token|PAT|token|TOKEN)\s*[:=]\s*['"]0\/[a-f0-9]{32}\/[0-9]{13,}:[a-f0-9]{32}['"]/gi, severity: 'critical' },
    { name: 'Notion Integration Secret', pattern: /(?:notion|NOTION)[_-]?(?:api[_-]?key|API_KEY|token|TOKEN|integration[_-]?secret|INTEGRATION_SECRET)\s*[:=]\s*['"]secret_[a-zA-Z0-9]{43}['"]/gi, severity: 'critical' },

    // =========================================================================
    // Crypto / Blockchain (~6 patterns)
    // =========================================================================
    { name: 'Alchemy API Key', pattern: /(?:alchemy|ALCHEMY)[_-]?(?:api[_-]?key|API_KEY|key|KEY)\s*[:=]\s*['"][a-zA-Z0-9_-]{32}['"]/gi, severity: 'critical' },
    { name: 'Infura API Key', pattern: /(?:infura|INFURA)[_-]?(?:api[_-]?key|API_KEY|project[_-]?id|PROJECT_ID|key|KEY)\s*[:=]\s*['"][a-f0-9]{32}['"]/gi, severity: 'critical' },
    { name: 'Infura API Secret', pattern: /(?:infura|INFURA)[_-]?(?:api[_-]?secret|API_SECRET|project[_-]?secret|PROJECT_SECRET)\s*[:=]\s*['"][a-f0-9]{32}['"]/gi, severity: 'critical' },
    { name: 'Moralis API Key', pattern: /(?:moralis|MORALIS)[_-]?(?:api[_-]?key|API_KEY|key|KEY)\s*[:=]\s*['"][a-zA-Z0-9]{40,}['"]/gi, severity: 'critical' },
    { name: 'Etherscan API Key', pattern: /(?:etherscan|ETHERSCAN)[_-]?(?:api[_-]?key|API_KEY|key|KEY)\s*[:=]\s*['"][a-zA-Z0-9]{34}['"]/gi, severity: 'high' },
    { name: 'CoinGecko Pro API Key', pattern: /(?:coingecko|COINGECKO|cg|CG)[_-]?(?:pro[_-]?)?(?:api[_-]?key|API_KEY)\s*[:=]\s*['"]CG-[a-zA-Z0-9]{25,}['"]/gi, severity: 'high' },
    { name: 'BlockCypher Token', pattern: /(?:blockcypher|BLOCKCYPHER)[_-]?(?:token|TOKEN|api[_-]?token|API_TOKEN)\s*[:=]\s*['"][a-f0-9]{32}['"]/gi, severity: 'high' },

    // =========================================================================
    // Slack Extended (~3 patterns)
    // =========================================================================
    { name: 'Slack User Token', pattern: /xoxp-[0-9]{10,13}-[0-9]{10,13}-[0-9]{10,13}-[a-f0-9]{32}/g, severity: 'critical' },
    { name: 'Slack App Token', pattern: /xapp-[0-9]-[A-Z0-9]+-[0-9]+-[a-zA-Z0-9]+/g, severity: 'critical' },
    { name: 'Slack Config Token', pattern: /xoxe\.xoxp-[0-9]-[a-zA-Z0-9_-]+/g, severity: 'critical' },

    // =========================================================================
    // GitHub Extended (~3 patterns)
    // =========================================================================
    { name: 'GitHub App Installation Token', pattern: /ghs_[a-zA-Z0-9]{36}/g, severity: 'critical' },
    { name: 'GitHub App Refresh Token', pattern: /ghr_[a-zA-Z0-9]{36,}/g, severity: 'critical' },
    { name: 'GitHub Actions Secret Ref', pattern: /(?:GITHUB_TOKEN|GH_TOKEN)\s*[:=]\s*['"][a-zA-Z0-9_-]{30,}['"]/gi, severity: 'critical' },

    // =========================================================================
    // GitLab Extended (~2 patterns)
    // =========================================================================
    { name: 'GitLab Pipeline Trigger Token', pattern: /glptt-[a-f0-9]{40}/g, severity: 'critical' },
    { name: 'GitLab Runner Registration Token', pattern: /GR1348941[a-zA-Z0-9_-]{20}/g, severity: 'critical' },

    // =========================================================================
    // Additional Cloud Services (~10 patterns)
    // =========================================================================
    { name: 'AWS Session Token', pattern: /(?:aws[_-]?session[_-]?token|AWS_SESSION_TOKEN)\s*[:=]\s*['"][A-Za-z0-9/+=]{100,}['"]/gi, severity: 'critical' },
    { name: 'Azure SAS Token', pattern: /(?:sv=20[0-9]{2}-[0-9]{2}-[0-9]{2}&)(?:[a-z]+=[^&]+&)*sig=[a-zA-Z0-9%+/=]+/g, severity: 'critical' },
    { name: 'Azure Connection String', pattern: /DefaultEndpointsProtocol=https?;AccountName=[^;]+;AccountKey=[a-zA-Z0-9+/=]{86,}==/g, severity: 'critical' },
    { name: 'GCP OAuth Secret', pattern: /(?:google|GCP|GCLOUD)[_-]?(?:client[_-]?secret|CLIENT_SECRET|oauth[_-]?secret|OAUTH_SECRET)\s*[:=]\s*['"]GOCSPX-[a-zA-Z0-9_-]{28}['"]/gi, severity: 'critical' },
    { name: 'IBM Cloud API Key', pattern: /(?:ibm|IBM)[_-]?(?:cloud[_-]?)?(?:api[_-]?key|API_KEY)\s*[:=]\s*['"][a-zA-Z0-9_-]{44}['"]/gi, severity: 'critical' },
    { name: 'Oracle Cloud OCID', pattern: /ocid1\.[a-z]+\.[a-z0-9]+\.[a-z0-9-]+\.[a-z0-9]{60}/g, severity: 'high' },
    { name: 'Alibaba Cloud AccessKey', pattern: /LTAI[a-zA-Z0-9]{12,20}/g, severity: 'critical' },
    { name: 'Tencent Cloud SecretId', pattern: /AKID[a-zA-Z0-9]{13,20}/g, severity: 'critical' },
    { name: 'Scaleway API Key', pattern: /(?:scaleway|SCW)[_-]?(?:secret[_-]?key|SECRET_KEY|api[_-]?key|API_KEY)\s*[:=]\s*['"][a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}['"]/gi, severity: 'critical' },
    { name: 'OVH Application Secret', pattern: /(?:ovh|OVH)[_-]?(?:application[_-]?secret|APP_SECRET|secret|SECRET)\s*[:=]\s*['"][a-zA-Z0-9]{32}['"]/gi, severity: 'critical' },

    // =========================================================================
    // Additional SaaS (~15 patterns)
    // =========================================================================
    { name: 'Supabase Anon Key (leaked)', pattern: /(?:supabase|SUPABASE)[_-]?(?:anon[_-]?key|ANON_KEY)\s*[:=]\s*['"]eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+['"]/gi, severity: 'high' },
    { name: 'Firebase Admin SDK', pattern: /"private_key"\s*:\s*"-----BEGIN (?:RSA )?PRIVATE KEY-----/g, severity: 'critical' },
    { name: 'Vercel OIDC Token', pattern: /(?:vercel|VERCEL)[_-]?(?:oidc[_-]?token|OIDC_TOKEN)\s*[:=]\s*['"][a-zA-Z0-9_-]{40,}['"]/gi, severity: 'critical' },
    { name: 'Convex Deploy Key', pattern: /(?:convex|CONVEX)[_-]?(?:deploy[_-]?key|DEPLOY_KEY)\s*[:=]\s*['"]prod:[a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+['"]/gi, severity: 'critical' },
    { name: 'Clerk Secret Key (sk_live)', pattern: /sk_live_[a-zA-Z0-9]{24,}/g, severity: 'critical', requiresContext: true, contextKeywords: /clerk|CLERK|clerkjs/i },
    { name: 'Clerk Webhook Secret', pattern: /whsec_[a-zA-Z0-9]{32,}/g, severity: 'critical' },
    { name: 'Svix Webhook Secret', pattern: /whsec_[a-zA-Z0-9+/=]{32,}/g, severity: 'critical' },
    { name: 'Crisp Token', pattern: /(?:crisp|CRISP)[_-]?(?:token[_-]?id|TOKEN_ID|identifier|IDENTIFIER)\s*[:=]\s*['"][a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}['"]/gi, severity: 'high' },
    { name: 'Freshdesk API Key', pattern: /(?:freshdesk|FRESHDESK)[_-]?(?:api[_-]?key|API_KEY|token|TOKEN)\s*[:=]\s*['"][a-zA-Z0-9]{20}['"]/gi, severity: 'critical' },
    { name: 'Zoho API Key', pattern: /(?:zoho|ZOHO)[_-]?(?:api[_-]?key|API_KEY|client[_-]?secret|CLIENT_SECRET)\s*[:=]\s*['"][a-zA-Z0-9]{32,}['"]/gi, severity: 'critical' },
    { name: 'Zapier Webhook URL', pattern: /https:\/\/hooks\.zapier\.com\/hooks\/catch\/\d+\/[a-zA-Z0-9]+/g, severity: 'high' },
    { name: 'Webex Bot Token', pattern: /(?:webex|WEBEX|cisco[_-]?spark)[_-]?(?:bot[_-]?token|BOT_TOKEN|access[_-]?token|ACCESS_TOKEN)\s*[:=]\s*['"][a-zA-Z0-9_-]{64,}['"]/gi, severity: 'critical' },
    { name: 'Notion Database ID', pattern: /(?:notion|NOTION)[_-]?(?:database[_-]?id|DATABASE_ID)\s*[:=]\s*['"][a-f0-9]{32}['"]/gi, severity: 'medium' },
    { name: 'Airtable API Key (legacy)', pattern: /key[a-zA-Z0-9]{13}/g, severity: 'critical', requiresContext: true, contextKeywords: /airtable|AIRTABLE/i },
    { name: 'Confluence API Token', pattern: /(?:confluence|CONFLUENCE|atlassian|ATLASSIAN)[_-]?(?:api[_-]?token|API_TOKEN)\s*[:=]\s*['"][a-zA-Z0-9]{24}['"]/gi, severity: 'critical' },

    // =========================================================================
    // Additional Email & Marketing (~5 patterns)
    // =========================================================================
    { name: 'Mailjet API Key', pattern: /(?:mailjet|MAILJET)[_-]?(?:api[_-]?key|API_KEY|secret[_-]?key|SECRET_KEY)\s*[:=]\s*['"][a-f0-9]{32}['"]/gi, severity: 'critical' },
    { name: 'SparkPost API Key', pattern: /(?:sparkpost|SPARKPOST)[_-]?(?:api[_-]?key|API_KEY)\s*[:=]\s*['"][a-f0-9]{40}['"]/gi, severity: 'critical' },
    { name: 'Mandrill API Key', pattern: /(?:mandrill|MANDRILL)[_-]?(?:api[_-]?key|API_KEY)\s*[:=]\s*['"][a-zA-Z0-9_-]{22}['"]/gi, severity: 'critical' },
    { name: 'ActiveCampaign API Key', pattern: /(?:activecampaign|ACTIVECAMPAIGN|active[_-]?campaign|ACTIVE_CAMPAIGN)[_-]?(?:api[_-]?key|API_KEY)\s*[:=]\s*['"][a-f0-9]{64}['"]/gi, severity: 'critical' },
    { name: 'Klaviyo Private API Key', pattern: /(?:klaviyo|KLAVIYO)[_-]?(?:private[_-]?api[_-]?key|PRIVATE_API_KEY|api[_-]?key|API_KEY)\s*[:=]\s*['"]pk_[a-f0-9]{34}['"]/gi, severity: 'critical' },

    // =========================================================================
    // Additional Security & Identity (~6 patterns)
    // =========================================================================
    { name: 'HashiCorp Vault Token', pattern: /hvs\.[a-zA-Z0-9_-]{24,}/g, severity: 'critical' },
    { name: 'HashiCorp Vault Batch Token', pattern: /hvb\.[a-zA-Z0-9_-]{100,}/g, severity: 'critical' },
    { name: 'Doppler Service Token', pattern: /dp\.st\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]{40,}/g, severity: 'critical' },
    { name: 'Doppler CLI Token', pattern: /dp\.ct\.[a-zA-Z0-9_-]{40,}/g, severity: 'critical' },
    { name: '1Password Connect Token', pattern: /ops_[a-zA-Z0-9]{43}/g, severity: 'critical' },
    { name: 'Snyk API Token', pattern: /(?:snyk|SNYK)[_-]?(?:token|TOKEN|api[_-]?token|API_TOKEN)\s*[:=]\s*['"][a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}['"]/gi, severity: 'critical' },

    // =========================================================================
    // Additional Payment & Finance (~5 patterns)
    // =========================================================================
    { name: 'Adyen API Key', pattern: /(?:adyen|ADYEN)[_-]?(?:api[_-]?key|API_KEY)\s*[:=]\s*['"]AQE[a-zA-Z0-9_-]{40,}['"]/gi, severity: 'critical' },
    { name: 'Stripe Webhook Secret', pattern: /whsec_[a-zA-Z0-9]{32,}/g, severity: 'critical' },
    { name: 'PayPal Client Secret', pattern: /(?:paypal|PAYPAL)[_-]?(?:client[_-]?secret|CLIENT_SECRET|secret|SECRET)\s*[:=]\s*['"][a-zA-Z0-9_-]{40,}['"]/gi, severity: 'critical' },
    { name: 'Braintree Private Key', pattern: /(?:braintree|BRAINTREE)[_-]?(?:private[_-]?key|PRIVATE_KEY)\s*[:=]\s*['"][a-f0-9]{32}['"]/gi, severity: 'critical' },
    { name: 'Flutterwave Secret Key', pattern: /FLWSECK-[a-f0-9]{32}-X/g, severity: 'critical' },
    { name: 'Flutterwave Test Secret Key', pattern: /FLWSECK_TEST-[a-f0-9]{12}/g, severity: 'high' },

    // =========================================================================
    // Additional Communication (~5 patterns)
    // =========================================================================
    { name: 'Zoom JWT Secret', pattern: /(?:zoom|ZOOM)[_-]?(?:jwt[_-]?secret|JWT_SECRET|api[_-]?secret|API_SECRET)\s*[:=]\s*['"][a-zA-Z0-9]{20,}['"]/gi, severity: 'critical' },
    { name: 'Microsoft Teams Webhook', pattern: /https:\/\/[a-z0-9-]+\.webhook\.office\.com\/webhookb2\/[a-f0-9-]+\/IncomingWebhook\/[a-zA-Z0-9]+\/[a-f0-9-]+/g, severity: 'critical' },
    { name: 'LINE Channel Secret', pattern: /(?:line|LINE)[_-]?(?:channel[_-]?secret|CHANNEL_SECRET)\s*[:=]\s*['"][a-f0-9]{32}['"]/gi, severity: 'critical' },
    { name: 'WhatsApp Business Token', pattern: /(?:whatsapp|WHATSAPP)[_-]?(?:token|TOKEN|api[_-]?token|API_TOKEN)\s*[:=]\s*['"][a-zA-Z0-9_-]{100,}['"]/gi, severity: 'critical' },
    { name: 'Mattermost Token', pattern: /(?:mattermost|MATTERMOST)[_-]?(?:token|TOKEN|access[_-]?token|ACCESS_TOKEN)\s*[:=]\s*['"][a-z0-9]{26}['"]/gi, severity: 'critical' },

    // =========================================================================
    // Additional Databases (~5 patterns)
    // =========================================================================
    { name: 'ElasticSearch URL with Auth', pattern: /https?:\/\/[^:]+:[^@]+@[^\s'"]*(?:elastic|es|elasticsearch)[^\s'"]+/gi, severity: 'critical' },
    { name: 'Cassandra Connection', pattern: /(?:cassandra|CASSANDRA)[_-]?(?:password|PASSWORD)\s*[:=]\s*['"][^'"]{8,}['"]/gi, severity: 'critical' },
    { name: 'InfluxDB Token', pattern: /(?:influxdb|INFLUXDB|influx|INFLUX)[_-]?(?:token|TOKEN|admin[_-]?token|ADMIN_TOKEN)\s*[:=]\s*['"][a-zA-Z0-9_=-]{40,}['"]/gi, severity: 'critical' },
    { name: 'Memcached SASL Password', pattern: /(?:memcached|MEMCACHED|memcachier|MEMCACHIER)[_-]?(?:password|PASSWORD|servers|SERVERS)\s*[:=]\s*['"][^'"]{8,}['"]/gi, severity: 'critical' },
    { name: 'Neo4j Password', pattern: /(?:neo4j|NEO4J)[_-]?(?:password|PASSWORD|auth|AUTH)\s*[:=]\s*['"][^'"]{8,}['"]/gi, severity: 'critical' },

    // =========================================================================
    // Generic Expanded (~10 patterns)
    // =========================================================================
    { name: 'Bearer Token in Code', pattern: /['"]Bearer\s+[a-zA-Z0-9_-]{20,}['"]/g, severity: 'high', requiresContext: true, contextKeywords: /authorization|Authorization|AUTHORIZATION|header|Header|fetch|axios|http/i },
    { name: 'Authorization Header', pattern: /[Aa]uthorization['":\s]+['"](?:Basic|Bearer|Token)\s+[a-zA-Z0-9+/=_-]{20,}['"]/g, severity: 'critical' },
    { name: 'Generic _API_KEY Assignment', pattern: /[A-Z_]+_API_KEY\s*[:=]\s*['"][a-zA-Z0-9_-]{20,}['"]/g, severity: 'high' },
    { name: 'Generic _SECRET_KEY Assignment', pattern: /[A-Z_]+_SECRET_KEY\s*[:=]\s*['"][a-zA-Z0-9_-]{20,}['"]/g, severity: 'critical' },
    { name: 'Generic _TOKEN Assignment', pattern: /[A-Z_]+_TOKEN\s*[:=]\s*['"][a-zA-Z0-9_-]{20,}['"]/g, severity: 'high', requiresContext: true, contextKeywords: /secret|private|admin|service|auth|access/i },
    { name: 'DATABASE_URL', pattern: /DATABASE_URL\s*[:=]\s*['"][a-zA-Z]+:\/\/[^'"]+['"]/gi, severity: 'critical' },
    { name: 'REDIS_URL', pattern: /REDIS_URL\s*[:=]\s*['"]rediss?:\/\/[^'"]+['"]/gi, severity: 'critical' },
    { name: 'MONGODB_URI', pattern: /MONGODB_URI\s*[:=]\s*['"]mongodb(?:\+srv)?:\/\/[^'"]+['"]/gi, severity: 'critical' },
    { name: 'Connection String with Password', pattern: /(?:connection[_-]?string|CONNECTION_STRING)\s*[:=]\s*['"][a-zA-Z]+:\/\/[^:]+:[^@]+@[^'"]+['"]/gi, severity: 'critical' },
    { name: 'Basic Auth in URL', pattern: /https?:\/\/[a-zA-Z0-9_-]+:[a-zA-Z0-9_!@#$%^&*()-]+@[a-zA-Z0-9.-]+/g, severity: 'critical' },

    // =========================================================================
    // Additional Miscellaneous Services (~20 patterns)
    // =========================================================================
    { name: 'Twitch OAuth Token', pattern: /(?:twitch|TWITCH)[_-]?(?:oauth[_-]?token|OAUTH_TOKEN|access[_-]?token|ACCESS_TOKEN)\s*[:=]\s*['"]oauth:[a-z0-9]{30}['"]/gi, severity: 'critical' },
    { name: 'Spotify Client Secret', pattern: /(?:spotify|SPOTIFY)[_-]?(?:client[_-]?secret|CLIENT_SECRET)\s*[:=]\s*['"][a-f0-9]{32}['"]/gi, severity: 'critical' },
    { name: 'Dropbox Access Token', pattern: /(?:dropbox|DROPBOX)[_-]?(?:access[_-]?token|ACCESS_TOKEN|token|TOKEN)\s*[:=]\s*['"]sl\.[a-zA-Z0-9_-]{100,}['"]/gi, severity: 'critical' },
    { name: 'Dropbox Short-Lived Token', pattern: /sl\.[a-zA-Z0-9_-]{136}/g, severity: 'critical' },
    { name: 'Box Developer Token', pattern: /(?:box|BOX)[_-]?(?:developer[_-]?token|DEVELOPER_TOKEN|access[_-]?token|ACCESS_TOKEN)\s*[:=]\s*['"][a-zA-Z0-9]{32}['"]/gi, severity: 'critical' },
    { name: 'Mapbox Access Token (Public)', pattern: /pk\.eyJ[a-zA-Z0-9_-]{50,}\.[a-zA-Z0-9_-]{20,}/g, severity: 'medium' },
    { name: 'HERE API Key', pattern: /(?:here|HERE)[_-]?(?:api[_-]?key|API_KEY)\s*[:=]\s*['"][a-zA-Z0-9_-]{43}['"]/gi, severity: 'high' },
    { name: 'Google Maps API Key', pattern: /(?:google[_-]?maps|GOOGLE_MAPS)[_-]?(?:api[_-]?key|API_KEY)\s*[:=]\s*['"]AIza[0-9A-Za-z-_]{35}['"]/gi, severity: 'high' },
    { name: 'Mapquest API Key', pattern: /(?:mapquest|MAPQUEST)[_-]?(?:api[_-]?key|API_KEY|key|KEY)\s*[:=]\s*['"][a-zA-Z0-9]{32}['"]/gi, severity: 'high' },
    { name: 'Sentry API Key (legacy)', pattern: /(?:sentry|SENTRY)[_-]?(?:api[_-]?key|API_KEY|auth[_-]?token|AUTH_TOKEN)\s*[:=]\s*['"][a-f0-9]{64}['"]/gi, severity: 'critical' },
    { name: 'LaunchDarkly API Token', pattern: /api-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/g, severity: 'critical' },
    { name: 'Split.io API Key', pattern: /(?:split|SPLIT)[_-]?(?:api[_-]?key|API_KEY|sdk[_-]?key|SDK_KEY)\s*[:=]\s*['"][a-zA-Z0-9]{40,}['"]/gi, severity: 'high' },
    { name: 'Unleash Client Secret', pattern: /(?:unleash|UNLEASH)[_-]?(?:client[_-]?secret|CLIENT_SECRET|api[_-]?token|API_TOKEN)\s*[:=]\s*['"][a-zA-Z0-9*:._-]{30,}['"]/gi, severity: 'high' },
    { name: 'Contentstack Management Token', pattern: /(?:contentstack|CONTENTSTACK)[_-]?(?:management[_-]?token|MANAGEMENT_TOKEN)\s*[:=]\s*['"]cs[a-f0-9]{46}['"]/gi, severity: 'critical' },
    { name: 'Strapi API Token', pattern: /(?:strapi|STRAPI)[_-]?(?:api[_-]?token|API_TOKEN|token|TOKEN)\s*[:=]\s*['"][a-f0-9]{64,}['"]/gi, severity: 'critical' },
    { name: 'Payload CMS Secret', pattern: /(?:payload|PAYLOAD)[_-]?(?:secret|SECRET)\s*[:=]\s*['"][a-zA-Z0-9_-]{32,}['"]/gi, severity: 'critical' },
    { name: 'KeystoneJS Session Secret', pattern: /(?:keystone|KEYSTONE)[_-]?(?:session[_-]?secret|SESSION_SECRET)\s*[:=]\s*['"][a-zA-Z0-9_-]{32,}['"]/gi, severity: 'critical' },
    { name: 'Expo Access Token', pattern: /(?:expo|EXPO)[_-]?(?:access[_-]?token|ACCESS_TOKEN|token|TOKEN)\s*[:=]\s*['"][a-zA-Z0-9_-]{40,}['"]/gi, severity: 'critical' },
    { name: 'Appwrite API Key', pattern: /(?:appwrite|APPWRITE)[_-]?(?:api[_-]?key|API_KEY|secret|SECRET)\s*[:=]\s*['"][a-f0-9]{128}['"]/gi, severity: 'critical' },
    { name: 'PocketBase Admin Password', pattern: /(?:pocketbase|POCKETBASE|pb|PB)[_-]?(?:admin[_-]?password|ADMIN_PASSWORD)\s*[:=]\s*['"][^'"]{8,}['"]/gi, severity: 'critical' },

    // =========================================================================
    // Testing & Development Secrets (~5 patterns)
    // =========================================================================
    { name: 'Cypress Record Key', pattern: /(?:cypress|CYPRESS)[_-]?(?:record[_-]?key|RECORD_KEY)\s*[:=]\s*['"][a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}['"]/gi, severity: 'high' },
    { name: 'Playwright Test Secret', pattern: /(?:playwright|PLAYWRIGHT)[_-]?(?:service[_-]?access[_-]?key|SERVICE_ACCESS_KEY)\s*[:=]\s*['"][a-zA-Z0-9_-]{40,}['"]/gi, severity: 'high' },
    { name: 'SonarQube Token', pattern: /(?:sonar|SONAR|sonarqube|SONARQUBE|sonarcloud|SONARCLOUD)[_-]?(?:token|TOKEN|login|LOGIN)\s*[:=]\s*['"][a-f0-9]{40}['"]/gi, severity: 'critical' },
    { name: 'Coveralls Repo Token', pattern: /(?:coveralls|COVERALLS)[_-]?(?:repo[_-]?token|REPO_TOKEN|token|TOKEN)\s*[:=]\s*['"][a-zA-Z0-9]{32,}['"]/gi, severity: 'high' },
    { name: 'Chromatic Project Token', pattern: /(?:chromatic|CHROMATIC)[_-]?(?:project[_-]?token|PROJECT_TOKEN|token|TOKEN)\s*[:=]\s*['"]chpt_[a-f0-9]{24}['"]/gi, severity: 'high' },

    // =========================================================================
    // LanceDB / Additional Vector DB (~2 patterns)
    // =========================================================================
    { name: 'LanceDB Cloud Token', pattern: /(?:lancedb|LANCEDB)[_-]?(?:token|TOKEN|api[_-]?key|API_KEY)\s*[:=]\s*['"][a-zA-Z0-9_-]{32,}['"]/gi, severity: 'high' },
    { name: 'Zilliz Cloud Token', pattern: /(?:zilliz|ZILLIZ)[_-]?(?:token|TOKEN|api[_-]?key|API_KEY)\s*[:=]\s*['"][a-zA-Z0-9_-]{32,}['"]/gi, severity: 'high' },

    // =========================================================================
    // E-commerce & CRM (~5 patterns)
    // =========================================================================
    { name: 'BigCommerce API Token', pattern: /(?:bigcommerce|BIGCOMMERCE)[_-]?(?:access[_-]?token|ACCESS_TOKEN|api[_-]?token|API_TOKEN)\s*[:=]\s*['"][a-zA-Z0-9]{64}['"]/gi, severity: 'critical' },
    { name: 'WooCommerce Consumer Secret', pattern: /(?:woocommerce|WOOCOMMERCE|wc|WC)[_-]?(?:consumer[_-]?secret|CONSUMER_SECRET|secret|SECRET)\s*[:=]\s*['"]cs_[a-f0-9]{40}['"]/gi, severity: 'critical' },
    { name: 'Salesforce Access Token', pattern: /(?:salesforce|SALESFORCE|sfdc|SFDC)[_-]?(?:access[_-]?token|ACCESS_TOKEN|token|TOKEN)\s*[:=]\s*['"]00D[a-zA-Z0-9!.]{80,}['"]/gi, severity: 'critical' },
    { name: 'Pipedrive API Token', pattern: /(?:pipedrive|PIPEDRIVE)[_-]?(?:api[_-]?token|API_TOKEN|token|TOKEN)\s*[:=]\s*['"][a-f0-9]{40}['"]/gi, severity: 'critical' },
    { name: 'Intercom App API Key', pattern: /(?:intercom|INTERCOM)[_-]?(?:app[_-]?api[_-]?key|APP_API_KEY|app[_-]?id|APP_ID)\s*[:=]\s*['"][a-z0-9]{8}['"]/gi, severity: 'medium' },
];

// ---------------------------------------------------------------------------
// Public key allowlist — keys that are designed to be in client-side code.
// If a matched secret matches one of these, downgrade to info severity.
// ---------------------------------------------------------------------------
const PUBLIC_KEY_ALLOWLIST: Array<{
    name: string;
    test: (match: string, context: string) => boolean;
    note: string;
}> = [
    {
        name: 'Stripe Publishable Key',
        test: (m) => /^pk_(?:live|test)_/.test(m),
        note: 'Stripe publishable keys are safe to expose in client-side code. They can only create tokens, not read data.',
    },
    {
        name: 'Google Analytics ID',
        test: (m) => /^G-[A-Z0-9]{4,12}$/.test(m),
        note: 'Google Analytics measurement IDs are public tracking identifiers.',
    },
    {
        name: 'Google AdSense ID',
        test: (m) => /^ca-pub-\d{10,16}$/.test(m),
        note: 'AdSense publisher IDs are public by design.',
    },
    {
        name: 'reCAPTCHA Site Key',
        test: (m, ctx) => /recaptcha|captcha|sitekey/i.test(ctx) && /^6L[a-zA-Z0-9_-]{38}$/.test(m),
        note: 'reCAPTCHA site keys are designed to be public.',
    },
    {
        name: 'Clerk Publishable Key',
        test: (m, ctx) => /^pk_(?:live|test)_/.test(m) && /clerk|clerkjs|CLERK/i.test(ctx),
        note: 'Clerk publishable keys (pk_live_/pk_test_) are designed for client-side use and safe to expose.',
    },
    {
        name: 'PostHog Project API Key',
        test: (m, ctx) => /^phc_/.test(m) && /posthog|PostHog|POSTHOG|analytics/i.test(ctx),
        note: 'PostHog project API keys (phc_) are designed for client-side event capture and are safe to expose.',
    },
    {
        name: 'Mapbox Public Token',
        test: (m) => /^pk\.eyJ/.test(m),
        note: 'Mapbox public tokens (pk.eyJ...) are designed for client-side map rendering. Only secret tokens (sk.) are sensitive.',
    },
    {
        name: 'Algolia Search-Only API Key',
        test: (m, ctx) => /algolia|ALGOLIA/i.test(ctx) && /search[_-]?only|SEARCH_ONLY|search[_-]?api[_-]?key|SEARCH_API_KEY/i.test(ctx),
        note: 'Algolia search-only API keys are designed for client-side search queries and cannot modify data.',
    },
    {
        name: 'Sentry DSN (Public)',
        test: (m) => /^https:\/\/[a-f0-9]+@.*\.ingest\.(?:us\.)?sentry\.io\/\d+$/.test(m),
        note: 'Sentry DSNs are public by design. They allow sending error reports but cannot read project data.',
    },
    {
        name: 'Firebase API Key (Semi-Public)',
        test: (m, ctx) => /^AIza[0-9A-Za-z_-]{35}$/.test(m) && /firebase|firebaseConfig|FIREBASE/i.test(ctx),
        note: 'Firebase API keys are semi-public identifiers. They identify the project but are restricted by Firebase Security Rules and App Check.',
    },
];

/**
 * Check if a matched secret is a known public key.
 * Returns the allowlist entry if matched, null otherwise.
 */
function checkPublicKey(match: string, surroundingContext: string): typeof PUBLIC_KEY_ALLOWLIST[number] | null {
    for (const entry of PUBLIC_KEY_ALLOWLIST) {
        if (entry.test(match, surroundingContext)) return entry;
    }
    return null;
}

/**
 * Get ~200 chars of surrounding context for a match in content.
 */
function getSurroundingContext(content: string, matchIndex: number, matchLength: number): string {
    const start = Math.max(0, matchIndex - 100);
    const end = Math.min(content.length, matchIndex + matchLength + 100);
    return content.substring(start, end);
}

// CDN domains to skip when fetching JS files
const CDN_SKIP_LIST = [
    'cdn.', 'unpkg.com', 'cdnjs.', 'jsdelivr.net', 'ajax.aspnetcdn.com',
    'code.jquery.com', 'fonts.googleapis.com', 'polyfill.io', 'googletagmanager.com',
    'google-analytics.com', 'connect.facebook.net', 'platform.twitter.com',
];

// Paths to probe for exposed infrastructure
const INFRA_PROBES = [
    { path: '/.env', severity: 'critical', validate: (body: string, status: number) => status === 200 && /^[A-Z_]+=.+/m.test(body) && !body.includes('<!DOCTYPE') && !body.includes('<html') },
    { path: '/.git/HEAD', severity: 'critical', validate: (body: string, status: number) => status === 200 && body.startsWith('ref: refs/') },
    { path: '/.git/config', severity: 'critical', validate: (body: string, status: number) => status === 200 && (body.includes('[core]') || body.includes('[remote')) },
    { path: '/phpinfo.php', severity: 'high', validate: (body: string, status: number) => status === 200 && body.includes('PHP Version') && body.includes('phpinfo()') },
    { path: '/swagger.json', severity: 'medium', validate: (body: string, status: number) => { try { const j = JSON.parse(body); return status === 200 && (j.swagger || j.openapi); } catch { return false; } } },
    { path: '/api-docs', severity: 'medium', validate: (body: string, status: number) => status === 200 && /swagger|openapi|api documentation/i.test(body) },
    { path: '/wp-config.php.bak', severity: 'critical', validate: (body: string, status: number) => status === 200 && (body.includes('DB_NAME') || body.includes('DB_PASSWORD')) },
    { path: '/server-status', severity: 'medium', validate: (body: string, status: number) => status === 200 && body.includes('Apache Server Status') },
    { path: '/.DS_Store', severity: 'low', validate: (body: string, status: number) => status === 200 && body.includes('Bud1') },
    { path: '/debug', severity: 'high', validate: (body: string, status: number) => { if (status !== 200) return false; try { const j = JSON.parse(body); return j.stack || j.debug; } catch { return body.includes('Traceback (most recent call last)'); } } },
    { path: '/graphql', severity: 'medium', validate: (body: string, status: number) => status === 200 && /graphql playground|graphiql|altair/i.test(body) },
];

// Database admin UI probes
const DB_ADMIN_PROBES = [
    { path: '/phpmyadmin/', validate: (body: string) => body.includes('phpMyAdmin') && body.includes('pma_'), name: 'phpMyAdmin' },
    { path: '/adminer.php', validate: (body: string) => body.includes('Adminer') && body.includes('login-'), name: 'Adminer' },
    { path: '/_utils/', validate: (body: string) => /fauxton|couchdb/i.test(body), name: 'CouchDB Fauxton' },
    { path: '/mongo-express/', validate: (body: string) => body.includes('mongo-express'), name: 'Mongo Express' },
];

// Unprotected API endpoint probes
const API_ENDPOINT_PROBES = [
    '/api/users',
    '/api/v1/users',
    '/api/admin',
];

interface Finding {
    id: string;
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
    title: string;
    description: string;
    recommendation: string;
    location?: string;
    evidence?: string;
    category?: 'credentials' | 'infrastructure' | 'databases';
}

interface ScanResult {
    scannerType: string;
    score: number;
    findings: Finding[];
    sourcesScanned: number;
    scannedAt: string;
    url: string;
}

function redactSecret(secret: string): string {
    if (secret.length <= 8) return '***REDACTED***';
    return secret.substring(0, 4) + '...[REDACTED]';
}

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

async function fetchWithTimeout(url: string, timeout = 10000): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: { 'User-Agent': 'CheckVibe-Scanner/2.0' },
        });
        return response;
    } finally {
        clearTimeout(timeoutId);
    }
}

/** Compute a simple hash of a string for SPA fingerprinting */
function simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < Math.min(str.length, 2000); i++) {
        hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    }
    return hash;
}

function resolveUrl(scriptUrl: string, baseUrl: string): string {
    if (scriptUrl.startsWith('//')) {
        return 'https:' + scriptUrl;
    } else if (scriptUrl.startsWith('/')) {
        const base = new URL(baseUrl);
        return base.origin + scriptUrl;
    } else if (!scriptUrl.startsWith('http')) {
        return new URL(scriptUrl, baseUrl).href;
    }
    return scriptUrl;
}

function isCdnUrl(url: string): boolean {
    return CDN_SKIP_LIST.some(cdn => url.includes(cdn));
}

async function fetchSources(url: string): Promise<Array<{ content: string; location: string }>> {
    const sources: Array<{ content: string; location: string }> = [];

    try {
        // Fetch main HTML
        const response = await fetchWithTimeout(url);
        let html = await response.text();
        if (html.length > 1_000_000) html = html.substring(0, 1_000_000);
        sources.push({ content: html, location: 'HTML source' });

        // Extract script URLs from HTML
        const scriptMatches = html.matchAll(/<script[^>]+src=["']([^"']+)["'][^>]*>/gi);
        const scriptUrls: string[] = [];

        for (const match of scriptMatches) {
            if (scriptUrls.length >= 15) break;
            const scriptUrl = resolveUrl(match[1], url);
            if (!isCdnUrl(scriptUrl)) {
                scriptUrls.push(scriptUrl);
            }
        }

        // Discover webpack/Next.js build manifest chunks
        const manifestMatch = html.match(/\/_next\/static\/[^/]+\/_buildManifest\.js/);
        if (manifestMatch) {
            const manifestUrl = resolveUrl(manifestMatch[0], url);
            try {
                const manifestRes = await fetchWithTimeout(manifestUrl, 5000);
                const manifestContent = await manifestRes.text();
                // Extract chunk paths from the manifest
                const chunkPaths = manifestContent.matchAll(/["'](\/_next\/static\/chunks\/[^"']+)["']/g);
                for (const chunkMatch of chunkPaths) {
                    if (scriptUrls.length >= 15) break;
                    const chunkUrl = resolveUrl(chunkMatch[1], url);
                    if (!scriptUrls.includes(chunkUrl)) {
                        scriptUrls.push(chunkUrl);
                    }
                }
            } catch { /* skip manifest fetch failures */ }
        }

        // Fetch JS files + attempt source map extraction
        await Promise.all(
            scriptUrls.map(async (jsUrl) => {
                try {
                    const jsResponse = await fetchWithTimeout(jsUrl, 5000);
                    const jsContent = await jsResponse.text();
                    if (jsContent.length > 500000) return;
                    sources.push({ content: jsContent, location: jsUrl });

                    // Check for source map
                    let sourceMapUrl: string | null = null;

                    // Check response header
                    const smHeader = jsResponse.headers.get('SourceMap') || jsResponse.headers.get('X-SourceMap');
                    if (smHeader) {
                        sourceMapUrl = resolveUrl(smHeader, jsUrl);
                    }

                    // Check inline comment
                    if (!sourceMapUrl) {
                        const smMatch = jsContent.match(/\/\/[#@]\s*sourceMappingURL=(\S+)/);
                        if (smMatch && !smMatch[1].startsWith('data:')) {
                            sourceMapUrl = resolveUrl(smMatch[1], jsUrl);
                        }
                    }

                    // Fetch source map and extract original source
                    if (sourceMapUrl) {
                        try {
                            const smResponse = await fetchWithTimeout(sourceMapUrl, 5000);
                            if (smResponse.ok) {
                                const smText = await smResponse.text();
                                const smData = JSON.parse(smText);
                                if (smData.sourcesContent && Array.isArray(smData.sourcesContent)) {
                                    for (const src of smData.sourcesContent) {
                                        if (typeof src === 'string' && src.length > 50 && src.length <= 200000) {
                                            sources.push({ content: src, location: `Source map: ${sourceMapUrl}` });
                                        }
                                    }
                                }
                            }
                        } catch { /* skip source map fetch failures */ }
                    }
                } catch { /* skip failed JS fetches */ }
            })
        );

        // Extract inline scripts
        const inlineScripts = html.match(/<script[^>]*>([^<]+)<\/script>/gi) || [];
        inlineScripts.forEach((script, index) => {
            const content = script.replace(/<\/?script[^>]*>/gi, '');
            if (content.length > 50) {
                sources.push({ content, location: `Inline script #${index + 1}` });
            }
        });

    } catch {
        // Return whatever we have
    }

    return sources;
}

/** Fingerprint the site's 404 response to avoid SPA false positives */
async function get404Fingerprint(baseUrl: string): Promise<{ status: number; hash: number } | null> {
    try {
        const randomPath = '/__checkvibe_nonexistent_' + Math.random().toString(36).slice(2);
        const origin = new URL(baseUrl).origin;
        const res = await fetchWithTimeout(origin + randomPath, 5000);
        const body = await res.text();
        return { status: res.status, hash: simpleHash(body) };
    } catch {
        return null;
    }
}

async function probeExposedPaths(baseUrl: string): Promise<Finding[]> {
    const findings: Finding[] = [];
    const origin = new URL(baseUrl).origin;

    // Get 404 fingerprint for SPA detection
    const fingerprint404 = await get404Fingerprint(baseUrl);

    const probeResults = await Promise.all(
        INFRA_PROBES.map(async (probe) => {
            try {
                const res = await fetchWithTimeout(origin + probe.path, 5000);
                const body = await res.text();

                // Check if this is just the SPA catch-all
                if (fingerprint404 && res.status === fingerprint404.status && simpleHash(body) === fingerprint404.hash) {
                    return null;
                }

                if (probe.validate(body, res.status)) {
                    return {
                        id: `infra-${probe.path.replace(/[^a-z0-9]/gi, '-')}-${findings.length}`,
                        severity: probe.severity as Finding['severity'],
                        title: `Exposed ${probe.path}`,
                        description: `The path ${probe.path} is publicly accessible and contains sensitive content. This file should never be served to the internet.`,
                        recommendation: `Block access to ${probe.path} immediately via your web server configuration or .htaccess rules.`,
                        location: origin + probe.path,
                        category: 'infrastructure' as const,
                    };
                }
            } catch { /* timeout or network error - skip */ }
            return null;
        })
    );

    for (const result of probeResults) {
        if (result) findings.push(result);
    }

    return findings;
}

async function probeExposedDatabases(baseUrl: string, html: string): Promise<Finding[]> {
    const findings: Finding[] = [];
    const origin = new URL(baseUrl).origin;

    // Get 404 fingerprint for SPA detection
    const fingerprint404 = await get404Fingerprint(baseUrl);

    // DB Admin UI probes
    const adminResults = await Promise.all(
        DB_ADMIN_PROBES.map(async (probe) => {
            try {
                const res = await fetchWithTimeout(origin + probe.path, 5000);
                const body = await res.text();

                if (fingerprint404 && res.status === fingerprint404.status && simpleHash(body) === fingerprint404.hash) {
                    return null;
                }

                if (res.ok && probe.validate(body)) {
                    return {
                        id: `db-admin-${probe.name.toLowerCase().replace(/\s+/g, '-')}`,
                        severity: 'critical' as const,
                        title: `Exposed ${probe.name} Panel`,
                        description: `${probe.name} database admin panel is publicly accessible at ${probe.path}. Anyone can attempt to log in and access your database.`,
                        recommendation: `Restrict access to ${probe.name} by IP allowlist, VPN, or remove it from the public server entirely.`,
                        location: origin + probe.path,
                        category: 'databases' as const,
                    };
                }
            } catch { /* skip */ }
            return null;
        })
    );

    for (const r of adminResults) if (r) findings.push(r);

    // Firebase RTDB world-readable check
    const firebaseMatch = html.match(/["']https?:\/\/([a-z0-9-]+\.firebaseio\.com)["']/i);
    if (firebaseMatch) {
        const firebaseUrl = `https://${firebaseMatch[1]}/.json?shallow=true`;
        try {
            const res = await fetchWithTimeout(firebaseUrl, 5000);
            const body = await res.text();
            if (res.ok && body !== 'null' && !body.includes('Permission denied')) {
                findings.push({
                    id: 'db-firebase-rtdb-open',
                    severity: 'critical',
                    title: 'Firebase Realtime DB World-Readable',
                    description: `Firebase Realtime Database at ${firebaseMatch[1]} is readable by anyone without authentication. All data is publicly exposed.`,
                    recommendation: 'Update Firebase Realtime Database security rules to require authentication. Never use {"rules": {".read": true}}.',
                    location: firebaseUrl,
                    category: 'databases',
                });
            }
        } catch { /* skip */ }
    }

    // Unprotected API endpoint probes
    const apiResults = await Promise.all(
        API_ENDPOINT_PROBES.map(async (path) => {
            try {
                const res = await fetchWithTimeout(origin + path, 5000);
                if (!res.ok) return null;
                const body = await res.text();

                if (fingerprint404 && res.status === fingerprint404.status && simpleHash(body) === fingerprint404.hash) {
                    return null;
                }

                try {
                    const json = JSON.parse(body);
                    const str = JSON.stringify(json).toLowerCase();
                    const hasSensitive = ['email', 'password', 'username', 'secret', 'token', 'ssn'].some(f => str.includes(f));
                    if (hasSensitive && (Array.isArray(json) || (json.data && Array.isArray(json.data)))) {
                        return {
                            id: `db-api-${path.replace(/[^a-z0-9]/gi, '-')}`,
                            severity: 'high' as const,
                            title: `Unprotected API: ${path}`,
                            description: `The endpoint ${path} returns sensitive data (e.g. emails, usernames) without authentication.`,
                            recommendation: `Add authentication middleware to ${path} and ensure it requires valid credentials.`,
                            location: origin + path,
                            category: 'databases' as const,
                        };
                    }
                } catch { /* not JSON, skip */ }
            } catch { /* skip */ }
            return null;
        })
    );

    for (const r of apiResults) if (r) findings.push(r);

    return findings;
}

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
        const url = validation.url!;

        // Run all three workstreams in parallel
        const [sources, infraFindings, dbFindings] = await Promise.all([
            fetchSources(url),
            probeExposedPaths(url),
            // DB probing needs HTML, so we fetch it inline
            fetchWithTimeout(url).then(r => r.text()).then(html => probeExposedDatabases(url, html)).catch(() => [] as Finding[]),
        ]);

        const findings: Finding[] = [];
        const foundSecrets = new Set<string>(); // Deduplicate

        // Scan sources for credential patterns
        for (const { content, location } of sources) {
            for (const { name, pattern, severity, requiresContext, additionalCheck, contextKeywords } of API_KEY_PATTERNS) {
                // Reset regex lastIndex
                pattern.lastIndex = 0;

                let match;
                while ((match = pattern.exec(content)) !== null) {
                    const secret = match[0];

                    // Skip if already found
                    if (foundSecrets.has(secret)) continue;

                    const context = getSurroundingContext(content, match.index, secret.length);

                    // Skip low entropy matches for generic patterns
                    if (requiresContext) {
                        const entropy = calculateEntropy(secret);
                        if (entropy < 4.0) continue;

                        // If pattern requires specific context keywords, verify they're present
                        if (contextKeywords && !contextKeywords.test(context)) continue;
                    }

                    // Run additional check if specified
                    if (additionalCheck && !additionalCheck(secret)) continue;

                    foundSecrets.add(secret);

                    const isSourceMap = location.startsWith('Source map:');
                    const publicKey = checkPublicKey(secret, context);

                    if (publicKey) {
                        findings.push({
                            id: `public-key-${name.toLowerCase().replace(/\s+/g, '-')}-${findings.length}`,
                            severity: 'info',
                            title: `Public Key: ${publicKey.name}`,
                            description: publicKey.note,
                            recommendation: 'No action required. This is a publishable key intended for client-side use.',
                            location,
                            evidence: redactSecret(secret),
                            category: 'credentials',
                        });
                    } else {
                        findings.push({
                            id: `leak-${name.toLowerCase().replace(/\s+/g, '-')}-${findings.length}`,
                            severity: severity as Finding['severity'],
                            title: `Exposed ${name}`,
                            description: `Found a potential ${name} exposed in ${isSourceMap ? 'a downloadable source map' : 'client-side code'}. This could allow attackers to access your services.`,
                            recommendation: `Immediately revoke this key and generate a new one. Never expose secret keys in client-side code. Use environment variables and server-side API routes instead.${isSourceMap ? ' Disable source map generation in production builds.' : ''}`,
                            location,
                            evidence: redactSecret(secret),
                            category: 'credentials',
                        });
                    }
                }
            }
        }

        // Check if any source maps were discovered (even if no keys found in them)
        const sourceMapSources = sources.filter(s => s.location.startsWith('Source map:'));
        if (sourceMapSources.length > 0) {
            findings.push({
                id: 'infra-source-maps-exposed',
                severity: 'medium',
                title: 'Source Maps Publicly Accessible',
                description: `Found ${sourceMapSources.length} source map file(s) exposing your original unminified source code. Attackers can read your business logic, comments, and internal paths.`,
                recommendation: 'Disable source map generation in production or restrict access to .map files via server config.',
                category: 'infrastructure',
            });
        }

        // Merge all findings
        findings.push(...infraFindings);
        findings.push(...dbFindings);

        // Calculate score
        let score = 100;
        for (const finding of findings) {
            switch (finding.severity) {
                case 'critical': score -= 30; break;
                case 'high': score -= 20; break;
                case 'medium': score -= 10; break;
                case 'low': score -= 5; break;
            }
        }

        const result: ScanResult = {
            scannerType: 'api_keys',
            score: Math.max(0, Math.min(100, score)),
            findings,
            sourcesScanned: sources.length,
            scannedAt: new Date().toISOString(),
            url,
        };

        return new Response(JSON.stringify(result), {
            headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Scanner error:', error);
        return new Response(
            JSON.stringify({
                scannerType: 'api_keys',
                score: 0,
                error: 'Scan failed. Please try again.',
                findings: [],
                metadata: {},
            }),
            {
                status: 500,
                headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
            }
        );
    }
});
