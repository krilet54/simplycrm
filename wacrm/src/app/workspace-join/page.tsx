// src/app/workspace-join/page.tsx
'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

interface Workspace {
  id: string;
  businessName: string;
}

function WorkspaceJoinContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const workspaceId = searchParams.get('workspace');
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!workspaceId) {
      router.push('/dashboard');
      return;
    }

    // Fetch workspace info
    const fetchWorkspace = async () => {
      try {
        const res = await fetch(`/api/workspace?id=${workspaceId}`, {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          setWorkspace(data.workspace);
        } else {
          throw new Error('Workspace not found');
        }
      } catch (err) {
        console.error('Error fetching workspace:', err);
        toast.error('Failed to load workspace');
        router.push('/dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchWorkspace();
  }, [workspaceId, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      toast.error('Please enter your full name');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/workspace/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          fullName,
          phone,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to complete setup');
      }

      toast.success('Welcome to the team! 🎉');
      router.push('/dashboard');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-sidebar)' }}>
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-sidebar)' }}>
        <div className="text-white">Workspace not found</div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
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

          {/* Heading */}
          <h1 className="text-3xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'var(--font-display)' }}>
            Welcome to {workspace.businessName}!
          </h1>
          <p className="text-gray-600 mb-8">
            You've been invited to join this workspace. Let's complete your profile to get started.
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number (optional)</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Your phone number"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-6 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg font-medium text-sm transition-colors"
            >
              {submitting ? 'Setting up...' : 'Complete Setup'}
            </button>
          </form>

          <p className="text-xs text-gray-500 mt-6 text-center">
            By completing this setup, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function WorkspaceJoinPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-sidebar)' }}>
          <div className="text-white">Loading...</div>
        </div>
      }
    >
      <WorkspaceJoinContent />
    </Suspense>
  );
}
