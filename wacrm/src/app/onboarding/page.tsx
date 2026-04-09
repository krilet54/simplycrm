// src/app/onboarding/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function OnboardingPage() {
  const [businessName, setBusinessName]       = useState('');
  const [ownerName, setOwnerName]             = useState('');
  const [loading, setLoading]                 = useState(false);
  const router = useRouter();

  async function handleFinish() {
    if (!businessName || !ownerName) {
      toast.error('Please fill in all required fields');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessName, ownerName, phoneNumberId: '', accessToken: '' }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success('Workspace created! Welcome aboard 🎉');
      router.push('/dashboard');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'var(--bg-sidebar)' }}
    >
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="p-8">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-forest-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">C</span>
            </div>
            <span className="font-bold text-lg" style={{ fontFamily: 'var(--font-display)' }}>Crebo</span>
          </div>

          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold mb-1" style={{ fontFamily: 'var(--font-display)' }}>
              Set up your workspace
            </h2>
            <p className="text-gray-500 text-sm mb-8">Tell us about your business to get started.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Business name *</label>
                <input
                  className="input"
                  placeholder="e.g. Mama Nkechi Catering"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Your name *</label>
                <input
                  className="input"
                  placeholder="e.g. Nkechi Okafor"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                />
              </div>
            </div>

            <button
              onClick={handleFinish}
              disabled={loading}
              className="btn-primary w-full justify-center mt-8 py-3"
            >
              {loading ? 'Setting up...' : 'Get Started 🚀'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
