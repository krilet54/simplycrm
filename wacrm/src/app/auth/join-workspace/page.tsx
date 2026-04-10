'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';

// Ensure this page is rendered dynamically on the server, not statically
export const dynamic = 'force-dynamic';

interface InviteData {
  id: string;
  email: string;
  role: string;
  workspaceName: string;
  workspaceId: string;
}

function JoinWorkspaceForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Support both old query params and new inviteId approach
  const inviteId = searchParams.get('inviteId') || '';
  const email = searchParams.get('email') || '';
  const workspace = searchParams.get('workspace') || '';
  const role = searchParams.get('role') || 'AGENT';
  
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSigningUp, setIsSigningUp] = useState(false);

  useEffect(() => {
    // If inviteId is provided, validate it
    if (inviteId) {
      async function validateInvite() {
        try {
          const res = await fetch(`/api/workspace/invite?inviteId=${encodeURIComponent(inviteId)}`);
          if (!res.ok) {
            const data = await res.json();
            setError(data.error || 'Invalid invite');
            setLoading(false);
            return;
          }
          const data = await res.json();
          setInviteData(data.invite);
          setLoading(false);
        } catch (err) {
          setError('Failed to validate invite');
          setLoading(false);
        }
      }
      validateInvite();
    } else if (email && workspace) {
      // Old query param approach
      setLoading(false);
    } else {
      // Invalid - redirect to login
      router.push('/login');
    }
  }, [inviteId, email, workspace, router]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // For new invite flow, don't require full name
    if (!inviteData && !fullName.trim()) {
      toast.error('Please enter your full name');
      return;
    }
    
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsSigningUp(true);
    try {
      const inviteEmail = inviteData?.email || email;
      const inviteRole = inviteData?.role || role;
      const workspaceId = inviteData?.workspaceId || workspace;

      // 1. Create auth user through server-side signup endpoint
      const signupRes = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          password,
        }),
      });

      const signupData = await signupRes.json();
      if (!signupRes.ok) {
        throw new Error(typeof signupData.error === 'string' ? signupData.error : 'Failed to create account');
      }

      if (!signupData.user?.id) {
        throw new Error('Sign up failed - no user returned');
      }

      // 2. Call API to create workspace user record
      const res = await fetch('/api/workspace/join-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          supabaseId: signupData.user.id,
          email: inviteEmail,
          fullName: inviteData ? inviteEmail.split('@')[0] : fullName,
          workspaceId,
          role: inviteRole as any,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to join workspace');
      }

      // 3. If invite-based, mark it as accepted
      if (inviteId) {
        await fetch('/api/workspace/invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ markAccepted: true, inviteId }),
        });
      }

      toast.success('Verification email sent. Please verify your email, then sign in.');
      
      // Redirect to login
      setTimeout(() => {
        router.push('/login');
      }, 1500);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setIsSigningUp(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F7F5F0' }}>
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-forest-600 mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#F7F5F0' }}>
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="text-center">
            <div className="text-4xl mb-4">❌</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
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
            <div className="w-9 h-9 rounded-lg bg-forest-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">C</span>
            </div>
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
            {inviteData ? 'Join Your Team' : 'Your business, credibly run.'}
          </h1>
          <p className="text-white/50 text-base leading-relaxed">
            {inviteData 
              ? `You've been invited to join ${inviteData.workspaceName}. Complete your account setup below to get started.`
              : 'Track contacts, manage your pipeline, send invoices, and follow up — all in one simple CRM.'}
          </p>
        </div>

        <div className="space-y-4">
          {[
            { icon: '👥', text: inviteData ? 'Collaborate with your team' : '📊 Organize all your contacts in one place' },
            { icon: '💬', text: inviteData ? 'Manage customer conversations' : '🗂️ Track leads with Kanban pipeline' },
            { icon: '📊', text: inviteData ? 'Track leads and opportunities' : '💰 Send professional invoices easily' },
            { icon: '⚙️', text: inviteData ? 'Automate your workflow' : '⏰ Set follow-up reminders' },
          ].map(({ icon, text }, i) => (
            <div key={i} className="flex items-start gap-3">
              <span className="text-lg mt-0.5">{icon}</span>
              <p className="text-white/60 text-sm">{text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[400px]">
          {/* Mobile header */}
          <div className="lg:hidden mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'var(--font-display)' }}>
              {inviteData ? `Join ${inviteData.workspaceName}` : 'Create Account'}
            </h1>
            <p className="text-gray-600">
              {inviteData ? 'Complete your account to get started' : 'Join Crebo today'}
            </p>
          </div>

          <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
            {/* Invitation info - only for invite flow */}
            {inviteData && (
              <div className="mb-8 p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm text-gray-700">
                  <strong>✅ Email:</strong> <br />
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
            )}

            <form onSubmit={handleSignup} className="space-y-4">
              {/* Full name - only for old flow */}
              {!inviteData && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent"
                    disabled={isSigningUp}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent"
                  disabled={isSigningUp}
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
                  disabled={isSigningUp}
                />
              </div>

              <button
                type="submit"
                disabled={isSigningUp}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-2.5 rounded-lg transition-colors"
              >
                {isSigningUp ? '⏳ Creating account...' : inviteData ? '✅ Create Account & Join' : '✅ Create Account'}
              </button>
            </form>

            {/* Info box */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs text-blue-700">
                <strong>What happens next:</strong>
                <br />
                1. Your account is created
                <br />
                2. Verify your email from the Supabase confirmation mail
                <br />
                3. Sign in with your email and password
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

export default function JoinWorkspacePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <JoinWorkspaceForm />
    </Suspense>
  );
}
