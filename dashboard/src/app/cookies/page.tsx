import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Cookie Policy - CheckVibe',
  description: 'CheckVibe cookie policy. Learn about the cookies we use and how to manage them.',
};

export default function CookiePolicyPage() {
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

        <h1 className="text-4xl font-bold tracking-tight mb-2">Cookie Policy</h1>
        <p className="text-zinc-400 mb-1">Last updated: February 16, 2026</p>
        <p className="text-zinc-500 text-sm mb-12">Version 1.0</p>

        <div className="space-y-10 text-zinc-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">1. What Are Cookies</h2>
            <p>
              Cookies are small text files stored on your device by your web browser when you visit a
              website. They are widely used to make websites work efficiently, provide a better user
              experience, and give site owners usage information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">2. Cookies We Use</h2>
            <p className="mb-4">
              CheckVibe uses only cookies that are strictly necessary for the operation of our platform.
              We do not use advertising, tracking, or analytics cookies.
            </p>

            <div className="overflow-x-auto rounded-lg border border-white/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.03]">
                    <th className="text-left p-3 font-medium text-white">Cookie Name</th>
                    <th className="text-left p-3 font-medium text-white">Purpose</th>
                    <th className="text-left p-3 font-medium text-white">Type</th>
                    <th className="text-left p-3 font-medium text-white">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  <tr>
                    <td className="p-3 font-mono text-xs text-zinc-400">sb-*-auth-token</td>
                    <td className="p-3">Authentication session managed by Supabase. Stores your login session securely.</td>
                    <td className="p-3 text-emerald-400">Strictly Necessary</td>
                    <td className="p-3">Session / 7 days</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono text-xs text-zinc-400">sb-*-auth-token.0, .1, ...</td>
                    <td className="p-3">Chunked authentication cookies for larger session tokens.</td>
                    <td className="p-3 text-emerald-400">Strictly Necessary</td>
                    <td className="p-3">Session / 7 days</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">3. Cookie Categories</h2>

            <h3 className="text-lg font-medium text-white mt-5 mb-2">3.1 Strictly Necessary Cookies</h3>
            <p>
              These cookies are essential for the website to function and cannot be switched off. They
              are set in response to actions you take, such as logging in or filling in forms. Without
              these cookies, the service cannot operate. These cookies do not store any personally
              identifiable information beyond your authentication session.
            </p>

            <h3 className="text-lg font-medium text-white mt-5 mb-2">3.2 Cookies We Do Not Use</h3>
            <p>CheckVibe does not use:</p>
            <ul className="list-disc list-inside space-y-2 ml-2 mt-2">
              <li>
                <span className="font-medium text-white">Analytics cookies</span> &mdash; we do not
                use Google Analytics, Mixpanel, or similar tracking tools.
              </li>
              <li>
                <span className="font-medium text-white">Advertising cookies</span> &mdash; we do not
                serve ads or use retargeting pixels.
              </li>
              <li>
                <span className="font-medium text-white">Third-party tracking cookies</span> &mdash;
                we do not allow third parties to set cookies on our domain for tracking purposes.
              </li>
              <li>
                <span className="font-medium text-white">Social media cookies</span> &mdash; we do not
                embed social media widgets that set cookies.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">4. Third-Party Cookies</h2>
            <p>
              When you interact with our payment system, Stripe may set cookies on its own domain
              (stripe.com) during the checkout process. These cookies are governed by{' '}
              <a
                href="https://stripe.com/cookie-settings"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
              >
                Stripe&apos;s Cookie Policy
              </a>.
              CheckVibe has no control over these third-party cookies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">5. Managing Cookies</h2>
            <p className="mb-3">
              Since we only use strictly necessary cookies, disabling them will prevent you from logging
              in and using CheckVibe. However, you can manage cookies through your browser settings:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>
                <span className="font-medium text-white">Chrome:</span> Settings &gt; Privacy and
                Security &gt; Cookies and other site data
              </li>
              <li>
                <span className="font-medium text-white">Firefox:</span> Settings &gt; Privacy &amp;
                Security &gt; Cookies and Site Data
              </li>
              <li>
                <span className="font-medium text-white">Safari:</span> Preferences &gt; Privacy &gt;
                Manage Website Data
              </li>
              <li>
                <span className="font-medium text-white">Edge:</span> Settings &gt; Cookies and site
                permissions &gt; Cookies and site data
              </li>
            </ul>
            <p className="mt-3">
              Please note that blocking strictly necessary cookies will impair the functionality of our
              service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">6. Consent</h2>
            <p>
              Because CheckVibe only uses strictly necessary cookies that are essential for the service
              to function, we do not require separate cookie consent under the ePrivacy Directive
              (Article 5(3)) or GDPR. Strictly necessary cookies are exempt from consent requirements
              as they are required to provide the service you have requested.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">7. Changes to This Policy</h2>
            <p>
              If we introduce new categories of cookies (such as analytics or marketing cookies), we
              will update this policy and implement a cookie consent mechanism before deploying them.
              We will notify you of material changes by updating the &quot;Last updated&quot; date and
              version number.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">8. Contact Us</h2>
            <p>
              If you have questions about our use of cookies, contact us at{' '}
              <a
                href="mailto:support@checkvibe.dev"
                className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
              >
                support@checkvibe.dev
              </a>.
            </p>
          </section>

          <div className="mt-12 pt-8 border-t border-white/10 text-sm text-zinc-500">
            <p>
              See also:{' '}
              <Link href="/privacy" className="text-blue-400 hover:text-blue-300 underline underline-offset-2">Privacy Policy</Link>
              {' '}&middot;{' '}
              <Link href="/terms" className="text-blue-400 hover:text-blue-300 underline underline-offset-2">Terms of Service</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
