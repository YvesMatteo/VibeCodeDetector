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
        <p className="text-zinc-400 mb-1">Last updated: February 16, 2026</p>
        <p className="text-zinc-500 text-sm mb-12">Version 2.0</p>

        <div className="space-y-10 text-zinc-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">1. Service Description</h2>
            <p>
              CheckVibe is a website security scanning software-as-a-service (SaaS) platform operated
              by CheckVibe, based in Switzerland. CheckVibe provides security analysis, threat
              intelligence, legal compliance checks, and other automated assessments of websites. By
              creating an account or using our services, you agree to be bound by these Terms of Service.
            </p>
            <p className="mt-3">
              These terms should be read alongside our{' '}
              <Link href="/privacy" className="text-sky-400 hover:text-sky-300 underline underline-offset-2">
                Privacy Policy
              </Link>{' '}
              and{' '}
              <Link href="/cookies" className="text-sky-400 hover:text-sky-300 underline underline-offset-2">
                Cookie Policy
              </Link>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">2. Eligibility</h2>
            <p>
              You must be at least 16 years of age to use CheckVibe. By creating an account, you
              represent and warrant that you meet this age requirement and have the legal capacity to
              enter into these terms. If you are using CheckVibe on behalf of an organization, you
              represent that you have authority to bind that organization to these terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">3. Account Responsibilities</h2>
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
            <h2 className="text-xl font-semibold text-white mb-4">4. Acceptable Use</h2>
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
              <li>
                Use automated tools to access CheckVibe beyond the provided API, or scrape content
                from our platform.
              </li>
            </ul>
            <p className="mt-3">
              Violation of these rules may result in immediate account termination without refund.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">5. Subscription Plans and Payment</h2>
            <p className="mb-3">
              CheckVibe offers free and paid subscription plans (Starter, Pro, and Max). By subscribing
              to a paid plan, you agree to the following:
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
                You may cancel your subscription at any time through the Stripe billing portal. Cancellation
                takes effect at the end of the current billing period, and you will retain access until then.
              </li>
              <li>
                We reserve the right to change pricing with 30 days&apos; notice. Existing subscribers
                will be notified by email before any price change takes effect on their next renewal.
              </li>
            </ul>

            <h3 className="text-lg font-medium text-white mt-5 mb-2">5.1 Refund Policy</h3>
            <p>
              We offer a full refund within 14 days of your initial subscription purchase if you are
              not satisfied with the service. After this 14-day period, refunds are not provided for
              partial billing periods. To request a refund, contact us at{' '}
              <a href="mailto:support@checkvibe.dev" className="text-sky-400 hover:text-sky-300 underline underline-offset-2">
                support@checkvibe.dev
              </a>.
            </p>

            <h3 className="text-lg font-medium text-white mt-5 mb-2">5.2 EU Right of Withdrawal</h3>
            <p>
              If you are located in the European Union, you have the right to withdraw from your
              subscription within 14 days of purchase without giving any reason, in accordance with
              the EU Consumer Rights Directive. To exercise this right, notify us in writing at{' '}
              <a href="mailto:support@checkvibe.dev" className="text-sky-400 hover:text-sky-300 underline underline-offset-2">
                support@checkvibe.dev
              </a>. We will process your refund within 14 days of receiving your withdrawal notice.
              By using the service during the withdrawal period, you acknowledge that you may lose your
              right of withdrawal once the service has been fully performed.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">6. Intellectual Property</h2>
            <p>
              All content, features, and functionality of the CheckVibe platform &mdash; including the
              scanning algorithms, user interface, documentation, branding, logos, and trademarks &mdash;
              are owned by CheckVibe and protected by applicable intellectual property laws.
              &quot;CheckVibe&quot; and the CheckVibe logo are trademarks of CheckVibe. You may not use
              our trademarks without prior written consent.
            </p>
            <p className="mt-3">
              You retain ownership of any data you submit for scanning. By using CheckVibe, you grant
              us a limited, non-exclusive license to process your submitted data solely for the purpose
              of providing the scanning service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">7. Copyright and DMCA</h2>
            <p>
              We respect the intellectual property rights of others. If you believe that any content on
              our platform infringes your copyright, please send a notice to{' '}
              <a href="mailto:support@checkvibe.dev" className="text-sky-400 hover:text-sky-300 underline underline-offset-2">
                support@checkvibe.dev
              </a>{' '}
              containing:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2 mt-3">
              <li>A description of the copyrighted work you claim has been infringed.</li>
              <li>The URL or location of the allegedly infringing material.</li>
              <li>Your contact information (name, address, email, phone number).</li>
              <li>A statement that you have a good-faith belief that the use is not authorized.</li>
              <li>A statement, under penalty of perjury, that the information in the notice is accurate and that you are the copyright owner or authorized to act on behalf of the owner.</li>
              <li>Your physical or electronic signature.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">8. Disclaimer of Warranties</h2>
            <p>
              CheckVibe is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis, without
              warranties of any kind, either express or implied, including but not limited to implied
              warranties of merchantability, fitness for a particular purpose, and non-infringement. We
              make no warranties regarding the accuracy, completeness, or reliability of scan results.
              Our scans are automated assessments and should not be treated as a substitute for
              professional security audits, legal advice, or compliance certification.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">9. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by applicable law, CheckVibe and its officers, directors,
              employees, and agents shall not be liable for any indirect, incidental, special,
              consequential, or punitive damages, including but not limited to loss of profits, data,
              business opportunities, or goodwill, arising out of or related to your use of or inability
              to use the service, even if we have been advised of the possibility of such damages.
            </p>
            <p className="mt-3">
              Our total aggregate liability for any and all claims under these terms shall not exceed the
              amount you paid us in the twelve (12) months immediately preceding the event giving rise
              to the claim. Nothing in these terms excludes or limits liability that cannot be excluded
              under applicable law, including liability for death or personal injury caused by negligence
              or for fraud.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">10. Indemnification</h2>
            <p>
              You agree to indemnify, defend, and hold harmless CheckVibe and its officers, directors,
              employees, and agents from and against any claims, liabilities, damages, losses, costs, or
              expenses (including reasonable legal fees) arising out of or related to: (a) your use of
              the service; (b) your violation of these terms; (c) your violation of any third-party
              rights; or (d) your scanning of websites without proper authorization.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">11. Termination</h2>
            <p className="mb-3">
              We may suspend or terminate your access to CheckVibe at any time, with or without cause,
              including but not limited to:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>Violation of these Terms of Service or our Acceptable Use policy.</li>
              <li>Fraudulent or abusive behavior.</li>
              <li>Non-payment of subscription fees.</li>
              <li>At your request to close your account.</li>
            </ul>
            <p className="mt-3">
              Upon termination, your right to use the service ceases immediately. We will delete your
              data in accordance with our{' '}
              <Link href="/privacy" className="text-sky-400 hover:text-sky-300 underline underline-offset-2">
                Privacy Policy
              </Link>{' '}
              retention schedule, except where we are required by law to retain it. Sections 8, 9, 10,
              13, and 14 survive termination.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">12. Dispute Resolution</h2>

            <h3 className="text-lg font-medium text-white mt-3 mb-2">12.1 Informal Resolution</h3>
            <p>
              Before initiating any formal proceedings, you agree to first contact us at{' '}
              <a href="mailto:support@checkvibe.dev" className="text-sky-400 hover:text-sky-300 underline underline-offset-2">
                support@checkvibe.dev
              </a>{' '}
              and attempt to resolve the dispute informally for at least 30 days.
            </p>

            <h3 className="text-lg font-medium text-white mt-5 mb-2">12.2 Arbitration</h3>
            <p>
              If informal resolution fails, any dispute arising out of or relating to these terms or the
              service shall be resolved by binding arbitration administered by the Swiss Chambers&apos;
              Arbitration Institution under its Swiss Rules of International Arbitration. The arbitration
              shall be conducted in Zurich, Switzerland, in the English language, by a single arbitrator.
              The arbitrator&apos;s decision shall be final and binding.
            </p>

            <h3 className="text-lg font-medium text-white mt-5 mb-2">12.3 Class Action Waiver</h3>
            <p>
              To the fullest extent permitted by applicable law, you agree that any dispute resolution
              proceedings will be conducted only on an individual basis and not in a class, consolidated,
              or representative action. You waive any right to participate in a class action lawsuit or
              class-wide arbitration.
            </p>

            <h3 className="text-lg font-medium text-white mt-5 mb-2">12.4 Opt-Out</h3>
            <p>
              You may opt out of the arbitration and class action waiver provisions by sending written
              notice to{' '}
              <a href="mailto:support@checkvibe.dev" className="text-sky-400 hover:text-sky-300 underline underline-offset-2">
                support@checkvibe.dev
              </a>{' '}
              within 30 days of creating your account. If you opt out, disputes will be resolved in the
              courts of Zurich, Switzerland.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">13. Governing Law and Jurisdiction</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the laws of Switzerland,
              without regard to its conflict of law provisions. Subject to the arbitration provisions
              above, the courts of Zurich, Switzerland shall have exclusive jurisdiction over any
              disputes arising from these terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">14. General Provisions</h2>

            <h3 className="text-lg font-medium text-white mt-3 mb-2">14.1 Entire Agreement</h3>
            <p>
              These Terms, together with the Privacy Policy and Cookie Policy, constitute the entire
              agreement between you and CheckVibe regarding the use of our service, and supersede any
              prior agreements.
            </p>

            <h3 className="text-lg font-medium text-white mt-5 mb-2">14.2 Severability</h3>
            <p>
              If any provision of these terms is found to be unenforceable or invalid, that provision
              shall be limited or eliminated to the minimum extent necessary, and the remaining
              provisions shall remain in full force and effect.
            </p>

            <h3 className="text-lg font-medium text-white mt-5 mb-2">14.3 Waiver</h3>
            <p>
              Our failure to enforce any right or provision of these terms shall not constitute a waiver
              of such right or provision.
            </p>

            <h3 className="text-lg font-medium text-white mt-5 mb-2">14.4 Assignment</h3>
            <p>
              You may not assign or transfer your rights under these terms without our prior written
              consent. We may assign our rights and obligations under these terms without restriction,
              including in connection with a merger, acquisition, or sale of assets.
            </p>

            <h3 className="text-lg font-medium text-white mt-5 mb-2">14.5 Force Majeure</h3>
            <p>
              CheckVibe shall not be liable for any failure or delay in performance due to circumstances
              beyond our reasonable control, including but not limited to natural disasters, war,
              terrorism, pandemics, government actions, power failures, internet disruptions, or
              third-party service outages.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">15. Changes to These Terms</h2>
            <p>
              We reserve the right to modify these Terms at any time. Material changes will be
              communicated via email or a prominent notice on our website at least 30 days before they
              take effect. The version number and &quot;Last updated&quot; date will be updated
              accordingly. Continued use of the service after changes take effect constitutes acceptance
              of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">16. Contact Us</h2>
            <p className="mb-3">
              If you have questions about these Terms of Service, contact us:
            </p>
            <ul className="space-y-2 ml-2">
              <li>
                <span className="font-medium text-white">General:</span>{' '}
                <a href="mailto:support@checkvibe.dev" className="text-sky-400 hover:text-sky-300 underline underline-offset-2">
                  support@checkvibe.dev
                </a>
              </li>
              <li>
                <span className="font-medium text-white">Legal:</span>{' '}
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
              <Link href="/privacy" className="text-sky-400 hover:text-sky-300 underline underline-offset-2">Privacy Policy</Link>
              {' '}&middot;{' '}
              <Link href="/cookies" className="text-sky-400 hover:text-sky-300 underline underline-offset-2">Cookie Policy</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
