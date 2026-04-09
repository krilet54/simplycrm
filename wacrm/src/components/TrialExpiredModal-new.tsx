'use client';

import Link from 'next/link';

export function TrialExpiredModal() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 text-center">
        <h2 className="font-display text-2xl font-bold text-ink mb-4">
          Your free trial has ended.
        </h2>
        <p className="text-gray-600 mb-2">
          Thank you for trying Crebo! Choose a plan to keep your data and continue working.
        </p>
        <p className="text-gray-500 text-sm mb-8">
          Your data is safe. We never delete anything without 30 days notice.
        </p>

        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          {/* Starter Plan */}
          <div className="border border-gray-200 rounded-xl p-6 hover:border-forest-600 transition-colors">
            <h3 className="font-semibold text-lg text-ink mb-1">STARTER</h3>
            <p className="text-2xl font-bold text-ink mb-4">
              ₹499<span className="text-sm font-normal text-gray-500">/mo</span>
            </p>
            <Link
              href="/dashboard/settings#billing"
              className="block w-full px-4 py-2 bg-forest-600 text-white font-medium rounded-lg hover:bg-forest-700 transition-colors"
            >
              Choose
            </Link>
          </div>

          {/* Pro Plan */}
          <div className="border border-gray-200 rounded-xl p-6 hover:border-forest-600 transition-colors">
            <h3 className="font-semibold text-lg text-ink mb-1">PRO</h3>
            <p className="text-2xl font-bold text-ink mb-4">
              ₹999<span className="text-sm font-normal text-gray-500">/mo</span>
            </p>
            <Link
              href="/dashboard/settings#billing"
              className="block w-full px-4 py-2 bg-forest-600 text-white font-medium rounded-lg hover:bg-forest-700 transition-colors"
            >
              Choose
            </Link>
          </div>
        </div>

        <Link
          href="/dashboard/settings#export"
          className="text-gray-500 hover:text-gray-700 text-sm hover:underline"
        >
          Export my data before deciding →
        </Link>
      </div>
    </div>
  );
}
