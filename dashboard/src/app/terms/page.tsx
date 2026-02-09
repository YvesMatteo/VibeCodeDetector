import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Terms of Service - CheckVibe',
  description: 'CheckVibe terms of service. Read our terms and conditions for using the platform.',
};

export default function TermsPage() {
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

        <h1 className="text-4xl font-bold tracking-tight mb-2">Terms of Service</h1>
        <p className="text-zinc-400 mb-12">Last updated: February 9, 2026</p>

        <div className="space-y-10 text-zinc-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">1. Service Description</h2>
            <p>
              CheckVibe is a website scanning software-as-a-service (SaaS) platform that provides
              security analysis, threat intelligence, legal compliance checks, and other automated
              assessments of websites. By creating an account or using our services, you agree to be
              bound by these Terms of Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">2. Account Responsibilities</h2>
            <p className="mb-3">When you create an account with CheckVibe, you agree to:</p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>Provide accurate and complete registration information.</li>
              <li>Maintain the security of your account credentials.</li>
              <li>Notify us immediately of any unauthorized access to your account.</li>
              <li>Accept responsibility for all activity that occurs under your account.</li>
            </ul>
            <p className="mt-3">
              We reserve the right to suspend or terminate accounts that violate these terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">3. Acceptable Use</h2>
            <p className="mb-3">You agree to use CheckVibe only for lawful purposes. Specifically, you must not:</p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>
                Scan websites that you do not own or do not have explicit authorization to scan.
              </li>
              <li>
                Use scan results to exploit vulnerabilities or conduct malicious activities against any
                website or service.
              </li>
              <li>
                Attempt to circumvent rate limits, usage quotas, or other technical restrictions.
              </li>
              <li>
                Use the service to harass, abuse, or harm others.
              </li>
              <li>
                Reverse-engineer, decompile, or attempt to extract the source code of our scanning
                engines.
              </li>
              <li>
                Resell or redistribute scan results without our written permission.
              </li>
            </ul>
            <p className="mt-3">
              Violation of these rules may result in immediate account termination without refund.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">4. Payment Terms</h2>
            <p className="mb-3">
              CheckVibe offers subscription-based pricing. By subscribing to a paid plan, you agree to
              the following:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>
                All payments are processed securely through Stripe. We do not store your payment card
                details on our servers.
              </li>
              <li>
                Subscriptions renew automatically at the end of each billing cycle (monthly or annual)
                unless cancelled before the renewal date.
              </li>
              <li>
                You may cancel your subscription at any time. Cancellation takes effect at the end of
                the current billing period, and you will retain access until then.
              </li>
              <li>
                Refunds are handled on a case-by-case basis. Contact us if you believe you are entitled
                to a refund.
              </li>
              <li>
                We reserve the right to change pricing with 30 days&apos; notice. Existing subscribers
                will be notified before any price change takes effect.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">5. Intellectual Property</h2>
            <p>
              All content, features, and functionality of the CheckVibe platform -- including the
              scanning algorithms, user interface, documentation, and branding -- are owned by
              CheckVibe and protected by applicable intellectual property laws. You retain ownership of
              any data you submit for scanning.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">6. Disclaimer of Warranties</h2>
            <p>
              CheckVibe is provided on an &quot;as is&quot; and &quot;as available&quot; basis. We make
              no warranties, express or implied, regarding the accuracy, completeness, or reliability
              of scan results. Our scans are automated assessments and should not be treated as a
              substitute for professional security audits, legal advice, or compliance certification.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">7. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, CheckVibe and its officers, directors, employees,
              and agents shall not be liable for any indirect, incidental, special, consequential, or
              punitive damages arising out of or related to your use of the service. Our total liability
              for any claims under these terms shall not exceed the amount you paid us in the twelve
              (12) months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">8. Termination</h2>
            <p className="mb-3">
              We may suspend or terminate your access to CheckVibe at any time, with or without cause,
              including but not limited to:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>Violation of these Terms of Service.</li>
              <li>Fraudulent or abusive behavior.</li>
              <li>Non-payment of subscription fees.</li>
              <li>At your request to close your account.</li>
            </ul>
            <p className="mt-3">
              Upon termination, your right to use the service ceases immediately. We may retain certain
              data as required by law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">9. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with applicable law, without
              regard to conflict of law principles. Any disputes arising from these terms or your use
              of the service shall be resolved through binding arbitration.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">10. Changes to These Terms</h2>
            <p>
              We reserve the right to modify these Terms at any time. Material changes will be
              communicated via email or a prominent notice on our website. Continued use of the service
              after changes take effect constitutes acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">11. Contact Us</h2>
            <p>
              If you have questions about these Terms of Service, contact us at{' '}
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
