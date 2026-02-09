import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy - CheckVibe',
  description: 'CheckVibe privacy policy. Learn how we collect, use, and protect your data.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0E0E10] text-white">
      <div className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors mb-12"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <h1 className="text-4xl font-bold tracking-tight mb-2">Privacy Policy</h1>
        <p className="text-zinc-400 mb-12">Last updated: February 9, 2026</p>

        <div className="space-y-10 text-zinc-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">1. Introduction</h2>
            <p>
              CheckVibe (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) operates the checkvibe.online
              website and scanning platform. This Privacy Policy explains how we collect, use, disclose,
              and safeguard your information when you use our service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">2. Information We Collect</h2>
            <p className="mb-3">We collect the following types of information:</p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>
                <span className="font-medium text-white">Account information:</span> email address and
                password hash when you create an account.
              </li>
              <li>
                <span className="font-medium text-white">Usage data:</span> scan history, domains
                scanned, scan results, and feature usage patterns.
              </li>
              <li>
                <span className="font-medium text-white">Payment information:</span> billing details
                processed securely through Stripe. We do not store your full credit card number on our
                servers.
              </li>
              <li>
                <span className="font-medium text-white">Technical data:</span> IP address, browser
                type, and device information collected automatically through server logs.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">3. How We Use Your Information</h2>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>To provide, maintain, and improve our scanning services.</li>
              <li>To process transactions and manage your subscription.</li>
              <li>To send service-related communications such as scan completion notifications.</li>
              <li>To detect and prevent fraud or abuse of our platform.</li>
              <li>To comply with legal obligations.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">4. Third-Party Services</h2>
            <p className="mb-3">We use the following third-party services to operate our platform:</p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>
                <span className="font-medium text-white">Stripe</span> -- payment processing. Subject
                to{' '}
                <a
                  href="https://stripe.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
                >
                  Stripe&apos;s Privacy Policy
                </a>
                .
              </li>
              <li>
                <span className="font-medium text-white">Supabase</span> -- authentication and data
                storage.
              </li>
              <li>
                <span className="font-medium text-white">Google Safe Browsing</span> -- threat
                detection for scanned URLs.
              </li>
              <li>
                <span className="font-medium text-white">VirusTotal</span> -- malware and threat
                intelligence scanning.
              </li>
              <li>
                <span className="font-medium text-white">Shodan</span> -- infrastructure security
                analysis.
              </li>
            </ul>
            <p className="mt-3">
              These services may collect and process data according to their own privacy policies. We
              only share the minimum data necessary for each service to function.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">5. Data Retention</h2>
            <p>
              We retain your account information for as long as your account is active. Scan results are
              retained for the duration of your subscription. If you delete your account, we will remove
              your personal data within 30 days, except where we are required by law to retain it.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">6. Data Security</h2>
            <p>
              We implement industry-standard security measures to protect your data, including encrypted
              connections (TLS), secure password hashing, and role-based access controls. However, no
              method of electronic transmission or storage is completely secure, and we cannot guarantee
              absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">7. Your Rights</h2>
            <p className="mb-3">You have the right to:</p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>
                <span className="font-medium text-white">Access</span> the personal data we hold about
                you.
              </li>
              <li>
                <span className="font-medium text-white">Correct</span> inaccurate or incomplete data.
              </li>
              <li>
                <span className="font-medium text-white">Delete</span> your account and associated
                data.
              </li>
              <li>
                <span className="font-medium text-white">Export</span> your scan data in a portable
                format.
              </li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, contact us at the address below.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">8. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any material
              changes by posting the updated policy on this page and updating the &quot;Last
              updated&quot; date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">9. Contact Us</h2>
            <p>
              If you have questions about this Privacy Policy or your personal data, contact us at{' '}
              <a
                href="mailto:hello@checkvibe.dev"
                className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
              >
                hello@checkvibe.dev
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
