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
        <p className="text-zinc-400 mb-1">Last updated: March 1, 2026</p>
        <p className="text-zinc-500 text-sm mb-12">Version 2.1</p>

        <div className="space-y-10 text-zinc-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">1. Introduction</h2>
            <p>
              CheckVibe (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) is operated by CheckVibe,
              based in Switzerland. We operate the{' '}
              <a href="https://checkvibe.dev" className="text-sky-400 hover:text-sky-300 underline underline-offset-2">
                checkvibe.dev
              </a>{' '}
              website and scanning platform. This Privacy Policy explains how we collect, use, disclose,
              and safeguard your information when you use our service.
            </p>
            <p className="mt-3">
              By using CheckVibe, you agree to the collection and use of information in accordance with
              this policy. This policy should be read alongside our{' '}
              <Link href="/terms" className="text-sky-400 hover:text-sky-300 underline underline-offset-2">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/cookies" className="text-sky-400 hover:text-sky-300 underline underline-offset-2">
                Cookie Policy
              </Link>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">2. Information We Collect</h2>
            <p className="mb-3">We collect the following types of information:</p>

            <h3 className="text-lg font-medium text-white mt-5 mb-2">2.1 Account Information</h3>
            <p>Email address and password hash when you create an account.</p>

            <h3 className="text-lg font-medium text-white mt-5 mb-2">2.2 Usage Data</h3>
            <p>Scan history, domains scanned, scan results, project configurations, and feature usage patterns.</p>

            <h3 className="text-lg font-medium text-white mt-5 mb-2">2.3 Payment Information</h3>
            <p>
              Billing details processed securely through Stripe. We do not store your full credit card
              number on our servers. Stripe may collect additional information as described in{' '}
              <a
                href="https://stripe.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-400 hover:text-sky-300 underline underline-offset-2"
              >
                Stripe&apos;s Privacy Policy
              </a>.
            </p>

            <h3 className="text-lg font-medium text-white mt-5 mb-2">2.4 Technical Data</h3>
            <p>IP address, browser type, device information, and session data collected automatically through server logs and cookies.</p>

            <h3 className="text-lg font-medium text-white mt-5 mb-2">2.5 User-Provided Credentials</h3>
            <p>
              If you choose to connect integrations, you may provide credentials such as GitHub repository
              URLs, Supabase project URLs, and Supabase access tokens (PATs). These are stored encrypted
              in our database and used solely to perform security scans you initiate. They are never shared
              with third parties beyond the specific scanning services required. You can delete these
              credentials at any time by removing the associated project.
            </p>

            <h3 className="text-lg font-medium text-white mt-5 mb-2">2.6 Email and Outreach Data</h3>
            <p>
              If you use our outreach features, we process email addresses and message content you provide
              for the purpose of sending bulk or individual communications on your behalf via our email
              delivery provider (Resend). Email delivery metadata such as send status and timestamps is
              retained for service operation and troubleshooting.
            </p>

            <h3 className="text-lg font-medium text-white mt-5 mb-2">2.7 Threat Detection Data</h3>
            <p>
              Our real-time threat detection feature may deploy a lightweight JavaScript snippet on scanned
              pages to collect visitor interaction data such as IP addresses, user agents, and behavioral
              signals. This data is used exclusively for identifying malicious activity and security threats
              and is not used for advertising or profiling purposes.
            </p>

            <h3 className="text-lg font-medium text-white mt-5 mb-2">2.8 Support Ticket Data</h3>
            <p>
              When you submit a support request, we collect your email address, message content, and any
              attachments you provide. This information is used to respond to your inquiry and improve our
              support processes. Support correspondence is retained for the duration of your account plus
              30 days after closure.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">3. Legal Bases for Processing (GDPR)</h2>
            <p className="mb-3">
              Under the EU General Data Protection Regulation (GDPR) and Swiss Federal Act on Data
              Protection (FADP), we process your data on the following legal bases:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>
                <span className="font-medium text-white">Contract performance (Art. 6(1)(b)):</span>{' '}
                Processing your account data, scan data, and payment information to provide our services.
              </li>
              <li>
                <span className="font-medium text-white">Legitimate interest (Art. 6(1)(f)):</span>{' '}
                Fraud prevention, service improvement, security monitoring, and analytics to maintain
                and improve our platform.
              </li>
              <li>
                <span className="font-medium text-white">Consent (Art. 6(1)(a)):</span>{' '}
                Optional marketing communications and non-essential cookies. You can withdraw consent
                at any time.
              </li>
              <li>
                <span className="font-medium text-white">Legal obligation (Art. 6(1)(c)):</span>{' '}
                Where we are required to retain data to comply with applicable laws.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">4. How We Use Your Information</h2>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>To provide, maintain, and improve our scanning services.</li>
              <li>To process transactions and manage your subscription.</li>
              <li>To send service-related communications such as scan completion notifications.</li>
              <li>To detect and prevent fraud or abuse of our platform.</li>
              <li>To comply with legal obligations.</li>
              <li>To respond to your support requests.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">5. Third-Party Services</h2>
            <p className="mb-3">We use the following third-party services to operate our platform:</p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>
                <span className="font-medium text-white">Stripe</span> &mdash; payment processing ({' '}
                <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:text-sky-300 underline underline-offset-2">privacy policy</a>).
              </li>
              <li>
                <span className="font-medium text-white">Supabase</span> &mdash; authentication and database hosting ({' '}
                <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:text-sky-300 underline underline-offset-2">privacy policy</a>).
              </li>
              <li>
                <span className="font-medium text-white">Vercel</span> &mdash; web hosting and deployment ({' '}
                <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:text-sky-300 underline underline-offset-2">privacy policy</a>).
              </li>
              <li>
                <span className="font-medium text-white">GitHub API</span> &mdash; repository security scanning (only when you connect a repository).
              </li>
              <li>
                <span className="font-medium text-white">Google Safe Browsing</span> &mdash; threat detection for scanned URLs.
              </li>
              <li>
                <span className="font-medium text-white">Google Gemini API</span> &mdash; AI-based analysis for vibe-coding detection.
              </li>
              <li>
                <span className="font-medium text-white">National Vulnerability Database (NVD)</span> &mdash; CVE lookup for dependency scanning.
              </li>
              <li>
                <span className="font-medium text-white">Resend</span> &mdash; transactional email delivery for support notifications and outreach communications ({' '}
                <a href="https://resend.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:text-sky-300 underline underline-offset-2">privacy policy</a>).
              </li>
            </ul>
            <p className="mt-3">
              These services may collect and process data according to their own privacy policies. We
              only share the minimum data necessary for each service to function.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">6. International Data Transfers</h2>
            <p>
              Our servers and third-party service providers may be located outside of your country of
              residence, including in the United States and the European Economic Area (EEA). When we
              transfer data outside of Switzerland or the EEA, we ensure appropriate safeguards are in
              place, including Standard Contractual Clauses (SCCs) approved by the European Commission
              or reliance on the recipient&apos;s participation in recognized frameworks such as the
              EU-U.S. Data Privacy Framework.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">7. Data Retention</h2>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>
                <span className="font-medium text-white">Account data:</span> Retained for as long as
                your account is active, plus 30 days after deletion.
              </li>
              <li>
                <span className="font-medium text-white">Scan results:</span> Retained for the duration
                of your subscription. Deleted within 30 days of account closure.
              </li>
              <li>
                <span className="font-medium text-white">Payment records:</span> Retained for up to 7
                years as required by tax and accounting laws.
              </li>
              <li>
                <span className="font-medium text-white">Server logs:</span> Retained for up to 90 days
                for security and debugging purposes.
              </li>
              <li>
                <span className="font-medium text-white">User-provided credentials:</span> Deleted
                immediately when you remove the associated project or account.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">8. Cookies and Tracking</h2>
            <p>
              We use cookies and similar technologies for authentication and session management. For
              detailed information about the cookies we use and how to manage them, please see our{' '}
              <Link href="/cookies" className="text-sky-400 hover:text-sky-300 underline underline-offset-2">
                Cookie Policy
              </Link>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">9. Data Security</h2>
            <p>
              We implement industry-standard security measures to protect your data, including encrypted
              connections (TLS), secure password hashing, role-based access controls, and row-level
              security on our database. User-provided credentials (such as Supabase PATs) are stored
              encrypted. However, no method of electronic transmission or storage is completely secure,
              and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">10. Your Rights Under GDPR</h2>
            <p className="mb-3">
              If you are located in the EEA, Switzerland, or the UK, you have the following rights under
              applicable data protection law:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>
                <span className="font-medium text-white">Access</span> &mdash; request a copy of the
                personal data we hold about you.
              </li>
              <li>
                <span className="font-medium text-white">Rectification</span> &mdash; request correction
                of inaccurate or incomplete data.
              </li>
              <li>
                <span className="font-medium text-white">Erasure</span> &mdash; request deletion of your
                personal data (&quot;right to be forgotten&quot;).
              </li>
              <li>
                <span className="font-medium text-white">Portability</span> &mdash; receive your data in
                a structured, machine-readable format.
              </li>
              <li>
                <span className="font-medium text-white">Restriction</span> &mdash; request that we limit
                processing of your data in certain circumstances.
              </li>
              <li>
                <span className="font-medium text-white">Objection</span> &mdash; object to processing
                based on legitimate interests.
              </li>
              <li>
                <span className="font-medium text-white">Withdraw consent</span> &mdash; where processing
                is based on consent, withdraw it at any time without affecting prior processing.
              </li>
              <li>
                <span className="font-medium text-white">Lodge a complaint</span> &mdash; file a complaint
                with your local data protection authority. In Switzerland, this is the{' '}
                <a href="https://www.edoeb.admin.ch/" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:text-sky-300 underline underline-offset-2">
                  Federal Data Protection and Information Commissioner (FDPIC)
                </a>.
              </li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, contact us at{' '}
              <a href="mailto:support@checkvibe.dev" className="text-sky-400 hover:text-sky-300 underline underline-offset-2">
                support@checkvibe.dev
              </a>. We will respond within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">11. Your Rights Under CCPA/CPRA</h2>
            <p className="mb-3">
              If you are a California resident, you have additional rights under the California Consumer
              Privacy Act (CCPA) and the California Privacy Rights Act (CPRA):
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>
                <span className="font-medium text-white">Right to know</span> &mdash; request details
                about the categories and specific pieces of personal information we have collected.
              </li>
              <li>
                <span className="font-medium text-white">Right to delete</span> &mdash; request deletion
                of your personal information.
              </li>
              <li>
                <span className="font-medium text-white">Right to opt-out of sale</span> &mdash; we do
                not sell your personal information to third parties. We do not share personal information
                for cross-context behavioral advertising.
              </li>
              <li>
                <span className="font-medium text-white">Right to non-discrimination</span> &mdash; we
                will not discriminate against you for exercising your privacy rights.
              </li>
            </ul>
            <p className="mt-3">
              To exercise these rights, contact us at{' '}
              <a href="mailto:support@checkvibe.dev" className="text-sky-400 hover:text-sky-300 underline underline-offset-2">
                support@checkvibe.dev
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">12. Children&apos;s Privacy</h2>
            <p>
              CheckVibe is not intended for use by anyone under the age of 16. We do not knowingly
              collect personal data from children under 16. If you are a parent or guardian and believe
              your child has provided us with personal data, please contact us and we will promptly
              delete it.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">13. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any material
              changes by posting the updated policy on this page, updating the &quot;Last updated&quot;
              date, and incrementing the version number. For significant changes, we will also notify
              you by email.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">14. Contact Us</h2>
            <p className="mb-3">
              If you have questions about this Privacy Policy, your personal data, or wish to exercise
              your rights, contact us:
            </p>
            <ul className="space-y-2 ml-2">
              <li>
                <span className="font-medium text-white">Email:</span>{' '}
                <a href="mailto:support@checkvibe.dev" className="text-sky-400 hover:text-sky-300 underline underline-offset-2">
                  support@checkvibe.dev
                </a>
              </li>
              <li>
                <span className="font-medium text-white">General inquiries:</span>{' '}
                <a href="mailto:support@checkvibe.dev" className="text-sky-400 hover:text-sky-300 underline underline-offset-2">
                  support@checkvibe.dev
                </a>
              </li>
              <li>
                <span className="font-medium text-white">Website:</span>{' '}
                <a href="https://checkvibe.dev" className="text-sky-400 hover:text-sky-300 underline underline-offset-2">
                  checkvibe.dev
                </a>
              </li>
            </ul>
          </section>

          <div className="mt-12 pt-8 border-t border-white/10 text-sm text-zinc-500">
            <p>
              See also:{' '}
              <Link href="/terms" className="text-sky-400 hover:text-sky-300 underline underline-offset-2">Terms of Service</Link>
              {' '}&middot;{' '}
              <Link href="/cookies" className="text-sky-400 hover:text-sky-300 underline underline-offset-2">Cookie Policy</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
