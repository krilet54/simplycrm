// src/app/login/page.tsx
'use client';

import { useState } from 'react';
import { requireSupabaseBrowserClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [mode,     setMode]     = useState<'login' | 'signup' | 'reset'>('login');
  const [resetEmail, setResetEmail] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const supabase = requireSupabaseBrowserClient();

      if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
          redirectTo: `${window.location.origin}/auth/reset-password`,
        });
        if (error) throw error;
        setResetSent(true);
        toast.success('Check your email for a reset link. It expires in 1 hour.');
      } else if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast.success('Check your email to confirm your account!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#F7F5F0' }}>
      {/* Left panel */}
      <div
        className="hidden lg:flex flex-col justify-between w-[480px] shrink-0 p-12"
        style={{ background: 'var(--bg-sidebar)' }}
      >
        <div>
          <div className="flex items-center gap-3 mb-16">
            <img src="/crebo logo 2.png" alt="Crebo" className="w-9 h-9 rounded-lg" />
            <span
              className="text-white text-xl font-bold tracking-tight"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Crebo
            </span>
          </div>

          <h1
            className="text-4xl font-bold text-white leading-tight mb-6"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Your business,<br />
            credibly run.
          </h1>
          <p className="text-white/50 text-base leading-relaxed">
            Simple CRM for managing contacts, tracking deals, and getting paid faster.
            Built for teams of 1 to 5.
          </p>
        </div>

        <div className="space-y-4">
          {[
            { icon: '👥', text: 'Organize all your customers in one place' },
            { icon: '📊', text: 'Track deals through your sales pipeline' },
            { icon: '💰', text: 'Create and send invoices in seconds' },
            { icon: '⏰', text: 'Never miss a follow-up with reminders' },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-start gap-3">
              <span className="text-lg mt-0.5">{icon}</span>
              <p className="text-white/60 text-sm">{text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-forest-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">C</span>
            </div>
            <span className="font-bold text-lg" style={{ fontFamily: 'var(--font-display)' }}>Crebo</span>
          </div>

          <h2
            className="text-2xl font-bold text-gray-900 mb-1"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {mode === 'login' ? 'Welcome back' : mode === 'signup' ? 'Create your account' : 'Reset password'}
          </h2>
          <p className="text-gray-500 text-sm mb-8">
            {mode === 'login'
              ? "Don't have an account? "
              : mode === 'signup' ? 'Already have an account? '
              : 'Remember your password? '}
            <button
              onClick={() => {
                if (mode === 'reset') setMode('login');
                else setMode(mode === 'login' ? 'signup' : 'login');
                setResetSent(false);
              }}
              className="text-forest-600 font-semibold hover:underline"
            >
              {mode === 'reset' ? 'Back to login' : mode === 'login' ? 'Sign up free' : 'Sign in'}
            </button>
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'reset' ? (
              <>
                {!resetSent ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
                    <input
                      type="email"
                      required
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="input"
                      placeholder="you@business.com"
                      autoFocus
                    />
                  </div>
                ) : (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                      ✓ Reset link sent to <strong>{resetEmail}</strong>. Check your email and follow the link to reset your password. It expires in 1 hour.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input"
                    placeholder="you@business.com"
                    autoFocus={mode === 'signup'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input"
                    placeholder="••••••••"
                    minLength={8}
                  />
                </div>
                {mode === 'login' && (
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => setMode('reset')}
                      className="text-sm text-gray-500 hover:text-forest-600 transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}
              </>
            )}

            <button
              type="submit"
              disabled={loading || (mode === 'reset' && resetSent)}
              className="btn-primary w-full justify-center py-3 text-base"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  {mode === 'login' ? 'Signing in...' : mode === 'signup' ? 'Creating account...' : 'Sending...'}
                </span>
              ) : (
                mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Create account' : resetSent ? 'Link sent' : 'Send reset link'
              )}
            </button>
          </form>

          <p className="text-xs text-gray-400 mt-6 text-center">
            By signing up you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
