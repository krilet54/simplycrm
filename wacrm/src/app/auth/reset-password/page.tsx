'use client';

import { useState } from 'react';
import { requireSupabaseBrowserClient } from '@/lib/supabase-browser';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const router = useRouter();

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const supabase = requireSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setResetSuccess(true);
      toast.success('Password updated. You are now logged in.');
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, 2000);
    } catch (err) {
      toast.error((err as Error).message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  }

  if (resetSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#F7F5F0' }}>
        <div className="w-full max-w-[400px] text-center">
          <div className="mb-6">
            <svg className="w-16 h-16 mx-auto text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'var(--font-display)' }}>
            Password Updated
          </h1>
          <p className="text-gray-600 mb-6">
            Your password has been successfully reset. You are now logged in. Redirecting to your dashboard...
          </p>
          <Link href="/dashboard" className="btn-primary inline-block">
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: '#F7F5F0' }}>
      <div className="w-full max-w-[400px]">
        <div className="flex items-center gap-2 mb-10">
          <div className="w-8 h-8 rounded-lg bg-forest-600 flex items-center justify-center">
            <span className="text-white font-bold text-lg">C</span>
          </div>
          <span className="font-bold text-lg" style={{ fontFamily: 'var(--font-display)' }}>Crebo</span>
        </div>

        <h1
          className="text-2xl font-bold text-gray-900 mb-1"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Set new password
        </h1>
        <p className="text-gray-500 text-sm mb-8">
          Enter your new password below. It must be at least 8 characters.
        </p>

        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">New password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
              minLength={8}
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-1">Minimum 8 characters</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm password</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
              minLength={8}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full justify-center py-3 text-base"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Saving...
              </span>
            ) : (
              'Save new password'
            )}
          </button>

          <div className="text-center pt-4">
            <Link href="/login" className="text-sm text-gray-500 hover:text-forest-600">
              Back to login
            </Link>
          </div>
        </form>

        <p className="text-xs text-gray-400 mt-6 text-center">
          Secure password reset powered by Supabase Auth
        </p>
      </div>
    </div>
  );
}
