// src/app/onboarding/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function OnboardingPage() {
  const [step, setStep]                       = useState(1);
  const [businessName, setBusinessName]       = useState('');
  const [ownerName, setOwnerName]             = useState('');
  const [phoneNumberId, setPhoneNumberId]     = useState('');
  const [accessToken, setAccessToken]         = useState('');
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
        body: JSON.stringify({ businessName, ownerName, phoneNumberId, accessToken }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success('Workspace created! Welcome aboard 🎉');
      router.push('/dashboard/inbox');
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
        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-[#25D366] transition-all duration-500"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        <div className="p-8">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-[#25D366] flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
            </div>
            <span className="font-bold text-lg" style={{ fontFamily: 'var(--font-display)' }}>WaCRM</span>
          </div>

          {step === 1 && (
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
                onClick={() => { if (businessName && ownerName) setStep(2); else toast.error('Fill in all fields'); }}
                className="btn-primary w-full justify-center mt-8 py-3"
              >
                Continue →
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="animate-fade-in">
              <h2 className="text-2xl font-bold mb-1" style={{ fontFamily: 'var(--font-display)' }}>
                Connect WhatsApp
              </h2>
              <p className="text-gray-500 text-sm mb-2">
                Connect your Meta WhatsApp Cloud API to start receiving messages.
              </p>
              <a
                href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-forest-600 hover:underline mb-6 block"
              >
                How to get your API credentials →
              </a>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Phone Number ID
                    <span className="text-gray-400 font-normal ml-1">(from Meta dashboard)</span>
                  </label>
                  <input
                    className="input font-mono text-sm"
                    placeholder="123456789012345"
                    value={phoneNumberId}
                    onChange={(e) => setPhoneNumberId(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Access Token
                    <span className="text-gray-400 font-normal ml-1">(long-lived)</span>
                  </label>
                  <input
                    className="input font-mono text-sm"
                    placeholder="EAAxxxxxxxx..."
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                  />
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-4 text-xs text-amber-700">
                <strong>Tip:</strong> You can skip this step and add credentials later in Settings. Your webhook URL will be:{' '}
                <code className="font-mono">{typeof window !== 'undefined' ? window.location.origin : ''}/api/webhook/whatsapp</code>
              </div>

              <div className="flex gap-3 mt-8">
                <button onClick={() => setStep(1)} className="btn-secondary flex-1 justify-center py-3">
                  ← Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="btn-primary flex-1 justify-center py-3"
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-fade-in">
              <h2 className="text-2xl font-bold mb-1" style={{ fontFamily: 'var(--font-display)' }}>
                One thing to know about WhatsApp fees 💡
              </h2>
              <p className="text-gray-500 text-sm mb-6">Understanding our pricing and Meta's charges.</p>

              {/* Section 1: WaCRM charges */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-4">
                <h3 className="font-bold text-gray-900 mb-2" style={{ fontFamily: 'var(--font-display)' }}>What WaCRM charges you</h3>
                <p className="text-sm text-gray-700">
                  <strong>$19/month</strong>. That's it from us.<br/>
                  No per-message fees. No hidden costs. Ever.
                </p>
              </div>

              {/* Section 2: Meta charges */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-4">
                <h3 className="font-bold text-gray-900 mb-3" style={{ fontFamily: 'var(--font-display)' }}>What WhatsApp (Meta) charges separately</h3>
                <p className="text-sm text-gray-700 mb-4">
                  Meta charges a small fee when YOU message a customer first — like after 24 hours of silence or future broadcast messages. These fees go directly to Meta, not to us. We never touch that money.
                </p>

                {/* Fee table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <tbody>
                      <tr className="border-b border-blue-100">
                        <td className="py-2 text-gray-700">Customer messages you first</td>
                        <td className="py-2 text-right font-medium text-gray-900">Free ✅</td>
                      </tr>
                      <tr className="border-b border-blue-100">
                        <td className="py-2 text-gray-700">You reply within 24 hours</td>
                        <td className="py-2 text-right font-medium text-gray-900">Free ✅</td>
                      </tr>
                      <tr className="border-b border-blue-100">
                        <td className="py-2 text-gray-700">Customer scans your QR code</td>
                        <td className="py-2 text-right font-medium text-gray-900">Free ✅</td>
                      </tr>
                      <tr className="border-b border-blue-100">
                        <td className="py-2 text-gray-700">You message after 24hr window</td>
                        <td className="py-2 text-right font-medium text-amber-600">~$0.04 ⚡</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-gray-700">Broadcast to contacts (Pro feature)</td>
                        <td className="py-2 text-right font-medium text-amber-600">~$0.04 ⚡</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 3: Good news */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6">
                <h3 className="font-bold text-gray-900 mb-2" style={{ fontFamily: 'var(--font-display)' }}>The good news for most shops</h3>
                <p className="text-sm text-gray-700">
                  If you respond to customers quickly and use your QR code for walk-ins, your Meta bill is $0 most months. We always warn you before any action that costs money.
                </p>
              </div>

              <div className="flex gap-3 mt-8">
                <button onClick={() => setStep(2)} className="btn-secondary flex-1 justify-center py-3">
                  ← Back
                </button>
                <button
                  onClick={handleFinish}
                  disabled={loading}
                  className="btn-primary flex-1 justify-center py-3"
                >
                  {loading ? 'Setting up...' : "Got it, let's go! 🚀"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
