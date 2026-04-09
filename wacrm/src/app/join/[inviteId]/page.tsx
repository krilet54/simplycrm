'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { requireSupabaseBrowserClient } from '@/lib/supabase-browser';
import toast from 'react-hot-toast';

interface InviteData {
  id: string;
  email: string;
  role: string;
  workspaceName: string;
  workspaceId: string;
}

export default function JoinWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const inviteId = params.inviteId as string;
  
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [signingUp, setSigningUp] = useState(false);

  console.log('🔧 JoinWorkspacePage loaded - Fields initialized:', { name, phoneNumber, password });

  useEffect(() => {
    async function validateInvite() {
      try {
        const res = await fetch(`/api/workspace/invite?inviteId=${inviteId}`);
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || 'Invalid invite link');
          return;
        }
        const data = await res.json();
        setInviteData(data.invite);
      } catch (err) {
        setError('Failed to validate invite');
        console.error('Error validating invite:', err);
      } finally {
        setLoading(false);
      }
    }

    validateInvite();
  }, [inviteId]);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    
    if (!name.trim() || !phoneNumber.trim() || !password || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setSigningUp(true);
    try {
      const supabase = requireSupabaseBrowserClient();

      // Sign up with Supabase
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: inviteData!.email,
        password,
      });

      if (signUpError) throw signUpError;
      if (!authData.user) throw new Error('Failed to create account');

      // Accept invite and create user in workspace with name/phone
      const res = await fetch(`/api/workspace/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          acceptInvite: true,
          inviteId,
          supabaseId: authData.user.id,
          name,
          phoneNumber
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to accept invite');
      }

      // Show success message
      toast.success('✅ Account created! Check your email to verify, then sign in.');
      
      // Redirect to login page
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err) {
      console.error('Signup error:', err);
      toast.error((err as Error).message || 'Failed to create account');
    } finally {
      setSigningUp(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F7F5F0' }}>
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-forest-600 mb-4"></div>
          <p className="text-gray-600">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error || !inviteData) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F7F5F0' }}>
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="text-center">
            <div className="text-4xl mb-4">❌</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Invitation Invalid</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <a href="/login" className="inline-block px-6 py-2 bg-forest-600 hover:bg-forest-700 text-white rounded font-medium transition-colors">
              Back to Login
            </a>
          </div>
        </div>
      </div>
    );
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
            Join Your Team
          </h1>
          <p className="text-white/50 text-base leading-relaxed">
            You've been invited to join <strong className="text-white">{inviteData.workspaceName}</strong>.
            Complete your account setup below to get started.
          </p>
        </div>

        <div className="space-y-4">
          {[
            { icon: '👥', text: 'Collaborate with your team' },
            { icon: '💬', text: 'Manage customer conversations' },
            { icon: '📊', text: 'Track leads and opportunities' },
            { icon: '⚙️', text: 'Automate your workflow' },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-start gap-3">
              <span className="text-lg mt-0.5">{icon}</span>
              <p className="text-white/60 text-sm">{text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel - Join form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[400px]">
          {/* Mobile header */}
          <div className="lg:hidden mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'var(--font-display)' }}>
              Join {inviteData.workspaceName}
            </h1>
            <p className="text-gray-600">Complete your account to get started</p>
          </div>

          <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
            {/* Invitation info */}
            <div className="mb-8 p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-gray-700">
                <strong>✅ Email verified:</strong> <br />
                <span className="font-mono text-green-700">{inviteData.email}</span>
              </p>
              <p className="text-sm text-gray-700 mt-2">
                <strong>Role:</strong> <br />
                <span className="capitalize font-medium text-green-700">{inviteData.role}</span>
              </p>
              <p className="text-sm text-gray-700 mt-2">
                <strong>Workspace:</strong> <br />
                <span className="font-medium text-green-700">{inviteData.workspaceName}</span>
              </p>
            </div>

            {/* Password form */}
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent"
                  disabled={signingUp}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Your phone number"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent"
                  disabled={signingUp}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Set Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent"
                  disabled={signingUp}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent"
                  disabled={signingUp}
                />
              </div>

              <button
                type="submit"
                disabled={signingUp}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-2.5 rounded-lg transition-colors"
              >
                {signingUp ? '⏳ Creating account...' : '✅ Create Account & Join'}
              </button>
            </form>

            {/* Info box */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-700">
                <strong>What happens next:</strong>
                <br />
                1. We'll send you an email to verify your address
                <br />
                2. Sign in with your email and password
                <br />
                3. You're in! Start collaborating with your team
              </p>
            </div>

            {/* Already have account */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <a href="/login" className="font-medium text-forest-600 hover:text-forest-700">
                  Sign in here
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
