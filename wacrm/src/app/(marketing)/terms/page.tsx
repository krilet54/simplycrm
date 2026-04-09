// src/app/(marketing)/terms/page.tsx
// Terms of Service page

import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms of Service for Crebo - Simple CRM for Small Businesses',
};

export default function TermsPage() {
  return (
    <div className="py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-12">
          <h1 className="font-display text-4xl font-bold text-ink mb-4">
            Terms of Service
          </h1>
          <p className="text-gray-500 text-sm">
            Last updated: April 2025 · 5 minute read
          </p>
        </div>

        <div className="prose prose-gray max-w-none">
          <p className="text-gray-600 mb-8">
            These terms govern your use of Crebo. By creating an account, you agree to these terms. 
            If you disagree, please do not use Crebo.
          </p>
          <p className="text-gray-600 mb-8">
            We have written these in plain English because we believe you deserve to understand 
            what you are agreeing to.
          </p>

          <section className="mb-8">
            <h2 className="font-display text-xl font-bold text-ink mb-4">1. What Crebo is</h2>
            <p className="text-gray-600">
              Crebo is a customer relationship management tool for small businesses. It helps you 
              organise contacts, track your sales pipeline, create invoices, and manage your team&apos;s work.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-display text-xl font-bold text-ink mb-4">2. Your account</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-600">
              <li>You must be 18 or older to create an account</li>
              <li>You are responsible for keeping your password secure</li>
              <li>You are responsible for all activity on your account</li>
              <li>One account per business — do not share accounts between businesses</li>
              <li>You must provide accurate information when signing up</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-display text-xl font-bold text-ink mb-4">3. Your data</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-600">
              <li>You own your data. Always.</li>
              <li>We store it securely on your behalf.</li>
              <li>We never sell your data to third parties.</li>
              <li>We never use your customers&apos; data for advertising.</li>
              <li>You can export your data at any time from Settings.</li>
              <li>You can delete your account and all data at any time from Settings.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-display text-xl font-bold text-ink mb-4">4. What you can and cannot do</h2>
            <p className="text-gray-700 font-medium mb-3">You CAN:</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-600 mb-4">
              <li>Use Crebo for any legitimate business</li>
              <li>Invite team members to your workspace</li>
              <li>Export and download your data</li>
              <li>Cancel your subscription at any time</li>
            </ul>
            <p className="text-gray-700 font-medium mb-3">You CANNOT:</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-600">
              <li>Use Crebo to send spam or unsolicited messages</li>
              <li>Use Crebo for illegal activities</li>
              <li>Attempt to access other users&apos; data</li>
              <li>Reverse engineer or copy the software</li>
              <li>Resell or white-label Crebo without written permission</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-display text-xl font-bold text-ink mb-4">5. Payments and billing</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-600">
              <li>Subscriptions are billed monthly via Razorpay</li>
              <li>Your trial is free for 14 days with no card required</li>
              <li>After your trial, a subscription is required to continue</li>
              <li>You can cancel anytime — cancellation takes effect at the end of your current billing period</li>
              <li>We do not offer refunds for partial months except where required by law</li>
              <li>Prices are in INR and may change with 30 days notice</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-display text-xl font-bold text-ink mb-4">6. Third party services</h2>
            <p className="text-gray-600 mb-4">Crebo integrates with:</p>
            <ul className="list-disc pl-6 space-y-2 text-gray-600">
              <li>Supabase (authentication and database)</li>
              <li>Razorpay (payment processing)</li>
              <li>Resend (email delivery)</li>
            </ul>
            <p className="text-gray-600 mt-4">
              Each service has its own terms. Your use of these services through Crebo is subject to their terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-display text-xl font-bold text-ink mb-4">7. Uptime and reliability</h2>
            <ul className="list-disc pl-6 space-y-2 text-gray-600">
              <li>We aim for 99.9% uptime but cannot guarantee it</li>
              <li>We are not liable for losses caused by downtime or data loss</li>
              <li>We will notify users of planned maintenance in advance</li>
              <li>We back up data regularly but recommend you export your data periodically</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="font-display text-xl font-bold text-ink mb-4">8. Limitation of liability</h2>
            <p className="text-gray-600">
              Crebo is provided as-is. We are not liable for indirect, incidental, or consequential damages. 
              Our total liability is limited to the amount you paid us in the last 3 months.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-display text-xl font-bold text-ink mb-4">9. Changes to these terms</h2>
            <p className="text-gray-600">
              We may update these terms. We will notify you by email and in-app notification at least 
              14 days before changes take effect. Continuing to use Crebo after changes means you accept the new terms.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="font-display text-xl font-bold text-ink mb-4">10. Contact</h2>
            <p className="text-gray-600">
              For questions about these terms:
            </p>
            <ul className="list-none space-y-2 text-gray-600 mt-2">
              <li>Email: <a href="mailto:contact@crebo.in" className="text-forest-600 hover:underline">contact@crebo.in</a></li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
