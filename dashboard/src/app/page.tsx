import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Shield,
  Key,
  Bot,
  Scale,
  Search,
  Users,
  CheckCircle,
  ArrowRight,
  Zap,
  Sparkles
} from 'lucide-react';

const features = [
  {
    icon: Shield,
    title: 'Security Scanner',
    description: 'Identify vulnerabilities, check security headers, and audit authentication.',
    color: 'text-red-400',
    glow: 'group-hover:shadow-red-500/20',
  },
  {
    icon: Key,
    title: 'API Key Detector',
    description: 'Find exposed credentials, API keys, and sensitive data in client-side code.',
    color: 'text-amber-400',
    glow: 'group-hover:shadow-amber-500/20',
  },
  {
    icon: Bot,
    title: 'AI Detection',
    description: 'Identify telltale signs that a website was built using AI coding assistants.',
    color: 'text-[#749CFF]',
    glow: 'group-hover:shadow-[#749CFF]/20',
  },
  {
    icon: Scale,
    title: 'Legal Compliance',
    description: 'Ensure websites don\'t make unsubstantiated claims and comply with regulations.',
    color: 'text-blue-400',
    glow: 'group-hover:shadow-blue-500/20',
  },
  {
    icon: Search,
    title: 'SEO Analyzer',
    description: 'Comprehensive SEO audit with Core Web Vitals, meta tags, and schema validation.',
    color: 'text-green-400',
    glow: 'group-hover:shadow-green-500/20',
  },
  {
    icon: Users,
    title: 'Competitor Intel',
    description: 'Understand what competitors are doing and what\'s working for them.',
    color: 'text-cyan-400',
    glow: 'group-hover:shadow-cyan-500/20',
  },
];

const pricingTiers = [
  {
    name: 'Free',
    price: '$0',
    period: '/month',
    description: 'For trying things out',
    features: ['3 scans per month', 'Basic security scan', 'SEO overview', 'Limited API key detection'],
    cta: 'Get Started',
    highlighted: false,
  },
  {
    name: 'Starter',
    price: '$29',
    period: '/month',
    description: 'For indie hackers',
    features: ['25 scans per month', 'Full security scanner', 'Complete SEO audit', 'API key leak detection', 'Email alerts', 'PDF reports'],
    cta: 'Start Free Trial',
    highlighted: false,
  },
  {
    name: 'Professional',
    price: '$79',
    period: '/month',
    description: 'For growing teams',
    features: ['100 scans per month', 'All Starter features', 'Legal compliance checker', 'AI detection scanner', 'Competitor analysis (3)', 'API access'],
    cta: 'Start Free Trial',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: '$199',
    period: '/month',
    description: 'For agencies',
    features: ['Unlimited scans', 'All Pro features', 'Unlimited competitors', 'White-label reports', 'Priority support', 'Team (5 seats)'],
    cta: 'Contact Sales',
    highlighted: false,
  },
];

const stats = [
  { value: '50+', label: 'Security Checks' },
  { value: '100+', label: 'API Key Patterns' },
  { value: '20+', label: 'SEO Metrics' },
  { value: '<30s', label: 'Average Scan Time' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Navigation */}
      {/* Navigation - Cluely Style Pill */}
      <nav className="fixed top-4 w-full z-50 flex justify-center pointer-events-none">
        <div className="bg-[#1C1C1E]/80 backdrop-blur-md border border-white/10 rounded-full px-4 py-2 flex items-center gap-6 shadow-2xl pointer-events-auto transition-all duration-300 hover:border-white/20 hover:scale-[1.01]">
          <div className="flex items-center gap-2 pr-4 border-r border-white/10">
            <Zap className="h-5 w-5 text-[#749CFF]" />
            <span className="font-bold text-white tracking-tight">VibeCheck</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-400">
            <Link href="#features" className="hover:text-white transition-colors">Features</Link>
            <Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link>
            <Link href="/login" className="hover:text-white transition-colors">Login</Link>
          </div>
          <Button asChild size="sm" className="bg-white text-black hover:bg-zinc-200 rounded-full px-5 font-medium transition-all shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)]">
            <Link href="/signup">Get Started</Link>
          </Button>
        </div>
      </nav>

      {/* Hero Section - Cluely 1:1 Replica */}
      <section className="relative pt-40 pb-20 px-4 sm:px-6 lg:px-8 min-h-screen flex flex-col items-center justify-center overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-[#0E0E10]">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#497EE9]/20 blur-[120px] rounded-full animate-float-slow" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#749CFF]/10 blur-[120px] rounded-full animate-float-slow" style={{ animationDelay: '4s' }} />
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay"></div>
        </div>

        <div className="max-w-5xl mx-auto text-center relative z-10 flex flex-col items-center gap-8">
          {/* Badge */}
          <div className="animate-fade-in-up opacity-0" style={{ animationDelay: '0ms' }}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm shadow-inner shadow-white/5">
              <span className="flex h-2 w-2 rounded-full bg-[#3B82F6] animate-pulse"></span>
              <span className="text-xs font-medium text-blue-200 tracking-wide uppercase">Private Beta</span>
            </div>
          </div>

          {/* H1 Typography - EB Garamond + Reveal Animation */}
          <h1 className="font-heading text-[56px] leading-[1.05] md:text-[80px] tracking-[-0.02em] text-white flex flex-col items-center gap-2">
            <span className="block overflow-hidden">
              <span className="block animate-fade-in-up opacity-0" style={{ animationDelay: '100ms' }}>
                The <span className="italic text-white/50 font-serif">#1</span> Scanner
              </span>
            </span>
            <span className="block overflow-hidden">
              <span className="block animate-fade-in-up opacity-0 relative" style={{ animationDelay: '200ms' }}>
                for <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#749CFF] via-[#A5B4FC] to-[#749CFF] animate-gradient-flow bg-[length:200%_auto]">Vibe-Coded</span>
              </span>
            </span>
            <span className="block overflow-hidden">
              <span className="block animate-fade-in-up opacity-0" style={{ animationDelay: '300ms' }}>
                Websites
              </span>
            </span>
          </h1>

          {/* Subtext */}
          <div className="overflow-hidden">
            <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto animate-fade-in-up opacity-0" style={{ animationDelay: '400ms' }}>
              VibeCheck listens to your codebase. It catches what AI misses: security holes,
              <br className="hidden md:block" />
              leaked keys, and bad vibes.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in-up opacity-0 mt-4" style={{ animationDelay: '500ms' }}>
            <Button size="lg" asChild className="h-12 px-8 rounded-xl bg-gradient-to-b from-white to-zinc-200 text-black shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] hover:scale-[1.02] transition-transform text-base font-semibold border-0">
              <Link href="/signup">
                Start Scanning
              </Link>
            </Button>
            <div className="flex items-center gap-4 text-sm text-zinc-500">
              <div className="h-px w-10 bg-white/10"></div>
              <span>No credit card required</span>
              <div className="h-px w-10 bg-white/10"></div>
            </div>
          </div>

          {/* Hero Visual - Floating Glass Cards (Cluely Style) */}
          <div className="relative mt-20 w-full max-w-4xl h-[400px] perspective-midrange animate-fade-in-up opacity-0" style={{ animationDelay: '700ms' }}>
            <div className="absolute inset-0 bg-[#1C1C1E] rounded-t-2xl border border-white/5 shadow-2xl overflow-hidden group mask-radial-faded transform rotate-x-12">
              {/* Mock Browser Header */}
              <div className="h-10 border-b border-white/5 bg-white/5 flex items-center px-4 gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/20"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500/20"></div>
                <div className="w-3 h-3 rounded-full bg-green-500/20"></div>
              </div>
              {/* Mock Content */}
              <div className="p-8 grid grid-cols-3 gap-6 opacity-50 group-hover:opacity-100 transition-opacity duration-700">
                <div className="h-32 rounded-lg bg-white/5 animate-pulse"></div>
                <div className="h-32 rounded-lg bg-white/5 animate-pulse" style={{ animationDelay: '100ms' }}></div>
                <div className="h-32 rounded-lg bg-white/5 animate-pulse" style={{ animationDelay: '200ms' }}></div>
                <div className="h-32 rounded-lg bg-white/5 animate-pulse" style={{ animationDelay: '150ms' }}></div>
                <div className="h-32 col-span-2 rounded-lg bg-white/5 animate-pulse" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>

            {/* Floating "AI Insight" Card */}
            <div className="absolute -right-12 top-20 glass-card p-4 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-white/10 animate-float w-64 backdrop-blur-xl">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="text-xs font-medium text-white">Vibe AI</div>
              </div>
              <div className="space-y-2">
                <div className="h-2 w-3/4 bg-white/20 rounded"></div>
                <div className="h-2 w-1/2 bg-white/20 rounded"></div>
              </div>
            </div>

            {/* Floating "Score" Card */}
            <div className="absolute -left-12 bottom-40 glass-card p-4 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-white/10 animate-float-slow w-48 backdrop-blur-xl delay-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-zinc-400">Security Score</span>
                <Badge variant="outline" className="border-green-500/30 text-green-400 bg-green-500/10 text-[10px] px-1 py-0 h-5">98/100</Badge>
              </div>
              <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                <div className="bg-green-500 h-full w-[98%]"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-24 px-4 sm:px-6 lg:px-8 bg-[#0E0E10]">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0E0E10] via-purple-950/5 to-[#0E0E10]" />

        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02] mix-blend-overlay"></div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4 bg-[#749CFF]/10 border-[#749CFF]/20 text-[#749CFF]">
              Features
            </Badge>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-medium mb-4 tracking-tight text-white">
              Everything You Need to{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#749CFF] via-[#A5B4FC] to-[#749CFF] animate-gradient-flow">Ship Safely</span>
            </h2>
            <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
              Six powerful scanners that catch the issues AI coding tools commonly miss.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
            {features.map((feature, index) => (
              <Card
                key={feature.title}
                className={`group glass-card border-white/5 shadow-cluely-card hover:border-white/10 transition-all duration-300 hover-lift ${feature.glow} bg-white/[0.02]`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardHeader>
                  <div className="relative mb-4">
                    <feature.icon className={`h-12 w-12 ${feature.color} transition-transform group-hover:scale-110 animate-float`} style={{ animationDelay: `${index * 200}ms` }} />
                    <div className={`absolute inset-0 ${feature.color} blur-2xl opacity-0 group-hover:opacity-30 transition-opacity`} />
                  </div>
                  <CardTitle className="text-xl font-medium text-white">{feature.title}</CardTitle>
                  <CardDescription className="text-zinc-400">{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="relative py-24 px-4 sm:px-6 lg:px-8 bg-[#0E0E10]">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02] mix-blend-overlay"></div>
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4 bg-purple-500/10 border-purple-500/20 text-purple-300">
              Pricing
            </Badge>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-medium mb-4 tracking-tight text-white">
              Simple, <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#749CFF] via-[#A5B4FC] to-[#749CFF] animate-gradient-flow">Transparent</span> Pricing
            </h2>
            <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
              Start free. Upgrade when you need more power.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {pricingTiers.map((tier, index) => (
              <Card
                key={tier.name}
                className={`relative glass-card shadow-cluely-card hover-lift transition-all duration-300 bg-white/[0.02] ${tier.highlighted
                  ? 'border-[#749CFF]/50 glow-animated'
                  : 'border-white/5 hover:border-white/10'
                  }`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {tier.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-[#749CFF] to-[#A5B4FC] text-white border-0">
                      Most Popular
                    </Badge>
                  </div>
                )}
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-medium text-white">{tier.name}</CardTitle>
                  <CardDescription className="text-zinc-400">{tier.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-heading font-medium text-transparent bg-clip-text bg-gradient-to-r from-[#749CFF] via-[#A5B4FC] to-[#749CFF] animate-gradient-flow">{tier.price}</span>
                    <span className="text-zinc-500 text-sm ml-1">{tier.period}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 text-green-400 shrink-0 mt-0.5" />
                        <span className="text-sm text-zinc-400">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`w-full ${tier.highlighted
                      ? 'shimmer-button bg-gradient-to-r from-[#749CFF] to-[#A5B4FC] hover:from-[#749CFF] hover:to-[#A5B4FC] border-0 text-white'
                      : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'
                      }`}
                    variant={tier.highlighted ? 'default' : 'outline'}
                    asChild
                  >
                    <Link href="/signup">{tier.cta}</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 px-4 sm:px-6 lg:px-8 bg-[#0E0E10] border-t border-white/5">
        {/* Gradient orbs */}
        <div className="orb orb-blue w-64 h-64 top-0 left-1/4" />
        <div className="orb orb-blue w-48 h-48 bottom-0 right-1/4" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="glass-card shadow-cluely-card rounded-2xl p-12 bg-white/[0.02] border-white/10">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-medium mb-4 tracking-tight text-white">
              Ready to <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#749CFF] via-[#A5B4FC] to-[#749CFF] animate-gradient-flow">Ship with Confidence</span>?
            </h2>
            <p className="text-xl text-zinc-400 mb-8">
              Get your first scan free. No credit card required.
            </p>
            <Button size="lg" asChild className="text-lg px-10 py-6 shimmer-button bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 border-0 glow-on-hover text-white">
              <Link href="/signup">
                Start Your Free Scan
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center space-x-2">
              <Zap className="h-6 w-6 text-purple-500" />
              <span className="font-bold">VibeCheck</span>
            </div>
            <p className="text-muted-foreground text-sm">
              © 2026 VibeCheck. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
