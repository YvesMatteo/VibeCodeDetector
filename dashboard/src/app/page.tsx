import Link from 'next/link';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { SupportedTools } from '@/components/ui/supported-tools';
import { FeatureRoadmap } from '@/components/ui/feature-roadmap';
import { ThreeBackground } from '@/components/landing/ThreeBackground';
import { NavBar } from '@/components/landing/NavBar';
import { HeroSection } from '@/components/landing/HeroSection';
import { PricingSection } from '@/components/landing/PricingSection';
import { CtaSection } from '@/components/landing/CtaSection';

const testimonials = [
  {
    quote: 'I shipped a Cursor-built SaaS in a weekend and CheckVibe immediately flagged an exposed Supabase service-role key in my client bundle. Saved me from a very bad Monday.',
    name: 'Marcus Chen',
    title: 'Indie Maker',
    initials: 'MC',
    color: 'bg-sky-500',
  },
  {
    quote: 'We run 35 checks on every deploy now. The SQL injection and XSS scanners alone have caught issues our team missed during code review twice this month.',
    name: 'Sarah Okonkwo',
    title: 'CTO, Liftoff Labs',
    initials: 'SO',
    color: 'bg-emerald-500',
  },
  {
    quote: 'As a solo founder using vibe coding, security was my blind spot. CheckVibe turned it into my strongest feature. Customers actually mention it in sales calls now.',
    name: 'Jake Morrison',
    title: 'Founder, ShipStack',
    initials: 'JM',
    color: 'bg-violet-500',
  },
  {
    quote: 'The CORS and security header checks caught misconfigurations on three of our client projects within the first scan. Worth every penny of the Pro plan.',
    name: 'Priya Sharma',
    title: 'Lead Engineer, Devmesh',
    initials: 'PS',
    color: 'bg-amber-500',
  },
  {
    quote: 'We integrated CheckVibe into our CI pipeline with the MCP server. Now no PR merges without a passing security scan. It took five minutes to set up.',
    name: 'Tom Eriksson',
    title: 'DevOps, NordStack',
    initials: 'TE',
    color: 'bg-rose-500',
  },
];

const faqs = [
  { q: 'What is CheckVibe?', a: 'CheckVibe is an always-on security monitoring platform that runs 35 automated checks on your site to detect vulnerabilities like SQL injection, XSS, exposed API keys, misconfigured headers, and more — continuously, on every deploy.' },
  { q: 'How does monitoring work?', a: 'CheckVibe runs 35 security checks on a schedule that matches your plan — from weekly (Free) to every 6 hours (Max). You get email alerts when issues appear, and deploy hooks trigger checks automatically on every deployment.' },
  { q: 'Is CheckVibe free to use?', a: 'Yes — the free plan includes 1 project with weekly monitoring and an issue overview. Paid plans start at $19/month for daily monitoring, full details, history, and more projects.' },
  { q: 'What vulnerabilities does CheckVibe detect?', a: 'CheckVibe detects SQL injection, cross-site scripting (XSS), exposed API keys, CORS misconfigurations, missing security headers, weak SSL/TLS, CSRF vulnerabilities, open redirects, dependency CVEs, DNS issues, and more.' },
  { q: 'How does CheckVibe compare to manual penetration testing?', a: 'CheckVibe complements manual pentesting by providing continuous, automated monitoring. Run 35 checks on every deployment — something manual testing can\'t match for frequency and speed.' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#0E0E10] overflow-x-hidden">
      {/* Three.js background -- lazy-loaded, ssr: false */}
      <ThreeBackground />

      {/* Navigation (client island -- auth state + mobile drawer) */}
      <NavBar />

      {/* ======================== SLIDE 1: HERO + DEMO ======================== */}
      <HeroSection />

      {/* ======================== SLIDE 3: FEATURES ======================== */}
      <section
        id="slide-features"
        className="relative z-10 px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-20 sm:pb-28"
      >
        <div className="max-w-7xl mx-auto relative z-10 w-full">
          <div className="text-center mb-10 sm:mb-14">
            <Badge variant="secondary" className="mb-4 bg-sky-500/10 border-sky-500/20 text-sky-400">
              Built for Your Stack
            </Badge>
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-heading font-medium mb-4 tracking-tight text-white">
              Integrate the Tools{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-sky-200 to-sky-400 animate-gradient-flow">You Actually Use</span>
            </h2>
            <p className="text-sm sm:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
              Supabase, Firebase, Vercel, Netlify, GitHub — 35 security checks purpose-built for the modern vibe-coded stack. Connect your repo and get results in seconds.
            </p>
          </div>

          <SupportedTools />

          {/* ======================== MCP INTEGRATION ======================== */}
          <div className="max-w-4xl mx-auto relative z-10 w-full mt-0 sm:mt-2 mb-20 sm:mb-28">
            <div className="text-center mb-6 sm:mb-8">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-heading font-medium mb-3 tracking-tight text-white flex items-center justify-center gap-2 sm:gap-3">
                Native <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 animate-gradient-flow">MCP Server</span> Support
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl mx-auto leading-relaxed">
                Run CheckVibe directly from your favorite AI code editor or agent using the standard Model Context Protocol. Scan, fix, and verify without leaving your IDE.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 max-w-3xl mx-auto">
              {/* Claude */}
              <div className="flex flex-col items-center justify-center p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/10 transition-all duration-300 shadow-xl">
                <div className="w-8 h-8 sm:w-12 sm:h-12 mb-2 sm:mb-3 flex items-center justify-center">
                  <img src="/images/tools/claude.svg" alt="Claude AI" className="w-full h-full object-contain" />
                </div>
                <h3 className="text-base font-medium text-white">Claude</h3>
              </div>

              {/* Cursor */}
              <div className="flex flex-col items-center justify-center p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/10 transition-all duration-300 shadow-xl">
                <div className="w-8 h-8 sm:w-12 sm:h-12 mb-2 sm:mb-3 flex items-center justify-center rounded-xl overflow-hidden">
                  <img src="/images/tools/cursor.png" alt="Cursor Editor" className="w-full h-full object-contain" />
                </div>
                <h3 className="text-base font-medium text-white">Cursor</h3>
              </div>

              {/* Antigravity */}
              <div className="flex flex-col items-center justify-center p-4 sm:p-5 rounded-2xl bg-white/[0.02] border border-white/10 transition-all duration-300 shadow-xl">
                <div className="w-8 h-8 sm:w-12 sm:h-12 mb-2 sm:mb-3 flex items-center justify-center rounded-xl overflow-hidden">
                  <img src="/images/tools/antigravity.png" alt="Google Antigravity" className="w-full h-full object-contain" />
                </div>
                <h3 className="text-base font-medium text-white">Antigravity</h3>
              </div>
            </div>
          </div>

          <FeatureRoadmap />
        </div>
      </section>

      {/* ======================== PRICING (client island -- billing toggle + currency) ======================== */}
      <PricingSection />

      {/* ======================== TESTIMONIALS ======================== */}
      <section
        id="slide-testimonials"
        className="relative z-10 px-4 sm:px-6 lg:px-8 pt-2 sm:pt-4 pb-20 sm:pb-28"
      >
        <div className="max-w-7xl mx-auto relative z-10 w-full">
          <div className="text-center mb-10 sm:mb-14">
            <Badge variant="secondary" className="mb-4 bg-sky-500/10 border-sky-500/20 text-sky-400">
              Testimonials
            </Badge>
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-heading font-medium mb-4 tracking-tight text-white">
              Trusted by{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-sky-200 to-sky-400 animate-gradient-flow">Developers</span>
            </h2>
            <p className="text-sm sm:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
              See why teams building with AI code editors rely on CheckVibe to keep their apps secure.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto">
            {testimonials.map((testimonial) => (
              <div
                key={testimonial.name}
                className="relative flex flex-col rounded-xl border border-white/5 bg-white/[0.02] p-6 transition-all duration-300 [@media(hover:hover)]:hover:border-white/10 [@media(hover:hover)]:hover:bg-white/[0.04]"
              >
                {/* Quote mark */}
                <span className="text-sky-400/20 text-4xl font-serif leading-none mb-2 select-none" aria-hidden="true">&ldquo;</span>
                <p className="text-sm sm:text-[15px] text-zinc-300 leading-relaxed flex-1 mb-6">
                  {testimonial.quote}
                </p>
                <div className="flex items-center gap-3 mt-auto pt-4 border-t border-white/5">
                  <div className={`w-9 h-9 rounded-full ${testimonial.color} flex items-center justify-center text-xs font-bold text-white shrink-0`}>
                    {testimonial.initials}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white truncate">{testimonial.name}</div>
                    <div className="text-xs text-zinc-500 truncate">{testimonial.title}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ======================== SLIDE 5: CTA + FOOTER ======================== */}
      <section
        id="slide-cta"
        className="relative z-10 px-4 sm:px-6 lg:px-8 py-20 sm:py-28"
      >
        {/* Gradient orbs -- hidden on small mobile for GPU savings */}
        <div className="hidden sm:block absolute w-64 h-64 top-1/4 left-1/4 bg-sky-500/10 blur-[100px] rounded-full pointer-events-none" aria-hidden="true" />
        <div className="hidden sm:block absolute w-48 h-48 bottom-1/4 right-1/4 bg-sky-400/10 blur-[100px] rounded-full pointer-events-none" aria-hidden="true" />

        {/* CTA (client island -- auth state) */}
        <CtaSection />

        {/* FAQ Section */}
        <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-24 relative z-10">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-center mb-12 text-white">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {faqs.map(({ q, a }) => (
              <details key={q} className="group rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
                <summary className="flex items-center justify-between px-6 py-5 cursor-pointer text-[15px] sm:text-base font-semibold text-white [@media(hover:hover)]:hover:text-sky-400 transition-colors list-none [&::-webkit-details-marker]:hidden">
                  {q}
                  <span className="ml-4 text-zinc-500 group-open:rotate-45 transition-transform text-xl flex shrink-0">+</span>
                </summary>
                <div className="px-6 pb-5 text-sm sm:text-[15px] text-zinc-300 leading-relaxed">
                  {a}
                </div>
              </details>
            ))}
          </div>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'FAQPage',
                mainEntity: faqs.map(({ q, a }) => ({
                  '@type': 'Question',
                  name: q,
                  acceptedAnswer: { '@type': 'Answer', text: a },
                })),
              }),
            }}
          />
        </div>

        {/* Footer */}
        <footer className="w-full pt-12 sm:pt-16 pb-8 relative z-10 safe-bottom mt-12 sm:mt-16">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col items-center gap-4 sm:gap-6 md:flex-row md:justify-between">
              <div className="flex items-center gap-2">
                <Image src="/logo-composite.png" alt="CheckVibe Logo" width={120} height={24} className="w-auto h-6 object-contain" />
              </div>
              <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-6 text-sm text-zinc-400">
                <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
                <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
                <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
                <Link href="/cookies" className="hover:text-white transition-colors">Cookies</Link>
                <a href="mailto:support@checkvibe.dev" className="hover:text-white transition-colors">Contact</a>
              </div>
              <p className="text-muted-foreground text-xs sm:text-sm text-center">
                &copy; {new Date().getFullYear()} CheckVibe
              </p>
            </div>
          </div>
        </footer>
      </section>
    </div>
  );
}
