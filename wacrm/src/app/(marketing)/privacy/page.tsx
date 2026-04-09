// src/app/(marketing)/privacy/page.tsx
// Privacy Policy page

import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Privacy Policy for Crebo - Simple CRM for Small Businesses',
};

export default function PrivacyPage() {
  return (
    <div className="py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-12">
          <h1 className="font-display text-4xl font-bold text-ink mb-4">
            Privacy Policy
          </h1>
          <p className="text-gray-500 text-sm">
            Last updated: April 2025
          </p>
          <p className="text-gray-600 mt-4">
            We keep this short and readable because your privacy matters.
          </p>
        </div>

        <div className="prose prose-gray max-w-none">
          <section className="mb-8">
            <h2 className="font-display text-xl font-bold text-ink mb-4">1. What we collect</h2>
            
            <p className="text-gray-700 font-medium mb-3">Information you give us:</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-4">
              <li>Name and email when you sign up</li>
              <li>Business name and details</li>
              <li>Contact information for your customers (names, phone numbers, emails)</li>
              <li>Invoice and financial data you enter</li>
              <li>Notes and activity logs you create</li>
            </ul>

            <p className="text-gray-700 font-medium mb-3">Information collected automatically:</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-4">
              <li>Your IP address</li>
              <li>Browser type and version</li>
              <li>Pages you visit within Crebo</li>
              <li>Actions you take (for bug fixing)</li>
              <li>Time and date of actions</li>
            </ul>

            <p className="text-gray-700 font-medium mb-3">We do NOT collect:</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-600">
              <li>Payment card details (Stripe handles this directly)</li>
              <li>Biometric data</li>
              <li>Location data beyond country level</li>
              <li>Any data from people who have not interacted with Crebo</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-display text-xl font-bold text-ink mb-4">2. How we use your data</h2>
            
            <p className="text-gray-700 font-medium mb-3">To run the service:</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-4">
              <li>Power your CRM and all its features</li>
              <li>Send you transactional emails (password reset, invoice paid, etc.)</li>
              <li>Send you notification emails (morning digest, assignments, etc.)</li>
            </ul>

            <p className="text-gray-700 font-medium mb-3">To improve the service:</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-4">
              <li>Understand how features are used</li>
              <li>Fix bugs and improve performance</li>
              <li>Build new features users actually need</li>
            </ul>

            <p className="text-gray-700 font-medium mb-3">We NEVER:</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-600">
              <li>Sell your data to anyone</li>
              <li>Use your data for advertising</li>
              <li>Share your customers&apos; data with third parties (except as below)</li>
              <li>Use your data to train AI models</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-display text-xl font-bold text-ink mb-4">3. Who we share data with</h2>
            <p className="text-gray-600 mb-4">
              We share minimal data with these services to operate Crebo:
            </p>
            
            <div className="space-y-4">
              <div>
                <p className="text-gray-700 font-medium">Supabase (supabase.com)</p>
                <ul className="list-disc pl-6 text-gray-600 text-sm">
                  <li>Purpose: database and authentication</li>
                  <li>Data: your account and all CRM data</li>
                  <li>Location: their secure cloud servers</li>
                </ul>
              </div>

              <div>
                <p className="text-gray-700 font-medium">Stripe (stripe.com)</p>
                <ul className="list-disc pl-6 text-gray-600 text-sm">
                  <li>Purpose: subscription billing</li>
                  <li>Data: your email, subscription status</li>
                  <li>NOT your CRM or customer data</li>
                </ul>
              </div>

              <div>
                <p className="text-gray-700 font-medium">Resend (resend.com)</p>
                <ul className="list-disc pl-6 text-gray-600 text-sm">
                  <li>Purpose: sending emails</li>
                  <li>Data: your email address and email content we generate</li>
                </ul>
              </div>

              <div>
                <p className="text-gray-700 font-medium">Vercel (vercel.com)</p>
                <ul className="list-disc pl-6 text-gray-600 text-sm">
                  <li>Purpose: hosting the application</li>
                  <li>Data: server logs only</li>
                </ul>
              </div>
            </div>

            <p className="text-gray-600 mt-4 font-medium">
              Nobody else. That is the complete list.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-display text-xl font-bold text-ink mb-4">4. Your rights</h2>
            <p className="text-gray-600 mb-4">You have the right to:</p>
            
            <div className="space-y-3">
              <div>
                <p className="text-gray-700 font-medium">Access your data:</p>
                <p className="text-gray-600 text-sm">Export all your data anytime from Settings → Export Data.</p>
              </div>
              <div>
                <p className="text-gray-700 font-medium">Correct your data:</p>
                <p className="text-gray-600 text-sm">Edit your profile and business details in Settings at any time.</p>
              </div>
              <div>
                <p className="text-gray-700 font-medium">Delete your data:</p>
                <p className="text-gray-600 text-sm">Delete your account from Settings → Danger Zone. All data is permanently deleted within 30 days.</p>
              </div>
              <div>
                <p className="text-gray-700 font-medium">Portability:</p>
                <p className="text-gray-600 text-sm">Download your data as CSV files from Settings.</p>
              </div>
              <div>
                <p className="text-gray-700 font-medium">Object to processing:</p>
                <p className="text-gray-600 text-sm">Email us at contact@crebo.in and we will address your request within 72 hours.</p>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="font-display text-xl font-bold text-ink mb-4">5. Data security</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-600">
              <li>All data is encrypted in transit (HTTPS/TLS)</li>
              <li>Sensitive fields (API keys, tokens) are encrypted at rest</li>
              <li>Passwords are never stored — Supabase handles authentication</li>
              <li>We conduct regular security reviews</li>
              <li>Access to production data is restricted to essential personnel only</li>
              <li>We will notify you within 72 hours of any data breach that affects you</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-display text-xl font-bold text-ink mb-4">6. Data retention</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-600">
              <li>Active accounts: data kept as long as your account is active</li>
              <li>Cancelled subscriptions: data kept for 30 days in read-only mode, then permanently deleted</li>
              <li>Deleted accounts: all data permanently deleted within 30 days</li>
              <li>Backup systems: purged within 90 days</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-display text-xl font-bold text-ink mb-4">7. Cookies</h2>
            <p className="text-gray-600 mb-4">Crebo uses minimal cookies:</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-4">
              <li>Authentication cookie (required) — keeps you logged in</li>
              <li>Session cookie (required) — security and functionality</li>
            </ul>
            <p className="text-gray-700 font-medium mb-3">We do NOT use:</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-600">
              <li>Advertising cookies</li>
              <li>Tracking pixels</li>
              <li>Third-party analytics cookies</li>
            </ul>
            <p className="text-gray-600 mt-4">
              You can clear cookies in your browser settings — this will log you out.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-display text-xl font-bold text-ink mb-4">8. Children</h2>
            <p className="text-gray-600">
              Crebo is not intended for anyone under 18. We do not knowingly collect data from minors.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-display text-xl font-bold text-ink mb-4">9. Changes</h2>
            <p className="text-gray-600">
              We will notify you by email at least 14 days before any significant changes to this policy.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-display text-xl font-bold text-ink mb-4">10. Contact</h2>
            <p className="text-gray-600 mb-2">
              Data controller: Crebo
            </p>
            <ul className="list-none space-y-2 text-gray-600">
              <li>Email: <a href="mailto:support@crebo.io" className="text-forest-600 hover:underline">support@crebo.io</a></li>
            </ul>
            <p className="text-gray-600 mt-4">
              For GDPR requests or privacy concerns, email us and we will respond within 72 hours.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
