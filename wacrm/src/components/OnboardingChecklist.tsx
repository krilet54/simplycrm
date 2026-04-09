'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface OnboardingChecklistProps {
  hasContacts: boolean;
  hasInvoices: boolean;
  hasTeamMembers: boolean;
  userName: string;
}

export default function OnboardingChecklist({
  hasContacts,
  hasInvoices,
  hasTeamMembers,
  userName,
}: OnboardingChecklistProps) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  const steps = [
    {
      id: 'contact',
      title: 'Add your first customer',
      description: 'Import or create a contact to start tracking relationships',
      completed: hasContacts,
      href: '/dashboard/contacts',
      action: '+ Add Contact',
    },
    {
      id: 'invoice',
      title: 'Create your first invoice',
      description: 'Generate and send professional invoices in seconds',
      completed: hasInvoices,
      href: '/dashboard/money',
      action: '+ Create Invoice',
    },
    {
      id: 'team',
      title: 'Invite a team member',
      description: 'Collaborate with your team to manage customers together',
      completed: hasTeamMembers,
      href: '/dashboard/settings',
      action: '+ Invite Member',
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const allCompleted = completedCount === steps.length;
  const progress = (completedCount / steps.length) * 100;

  // Auto-complete onboarding when all steps are done
  useEffect(() => {
    if (allCompleted && !dismissed) {
      // Silently mark onboarding as complete in the background
      fetch('/api/workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'completeOnboarding' }),
      }).catch(() => {});
    }
  }, [allCompleted, dismissed]);

  const handleDismiss = async () => {
    setDismissing(true);
    try {
      const res = await fetch('/api/workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'completeOnboarding' }),
      });
      if (res.ok) {
        setDismissed(true);
      }
    } catch (error) {
      console.error('Failed to dismiss onboarding:', error);
    } finally {
      setDismissing(false);
    }
  };

  if (dismissed) return null;

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-6 mb-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Welcome to Crebo, {userName.split(' ')[0]}! 🎉
          </h2>
          <p className="text-gray-600 text-sm mt-1">
            Complete these steps to get the most out of your CRM
          </p>
        </div>
        {allCompleted && (
          <button
            onClick={handleDismiss}
            disabled={dismissing}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            {dismissing ? 'Saving...' : 'Dismiss'}
          </button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            {completedCount} of {steps.length} completed
          </span>
          <span className="text-sm text-gray-500">{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={`flex items-center gap-4 p-4 rounded-lg transition-all ${
              step.completed
                ? 'bg-white/50 border border-green-200'
                : 'bg-white border border-gray-200 hover:border-blue-300 hover:shadow-sm'
            }`}
          >
            {/* Step Number / Check */}
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                step.completed
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-500 border border-gray-300'
              }`}
            >
              {step.completed ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span className="text-sm font-semibold">{index + 1}</span>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3
                className={`font-medium ${
                  step.completed ? 'text-gray-500 line-through' : 'text-gray-900'
                }`}
              >
                {step.title}
              </h3>
              <p className="text-sm text-gray-500 mt-0.5">{step.description}</p>
            </div>

            {/* Action Button */}
            {!step.completed && (
              <Link
                href={step.href}
                className="shrink-0 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {step.action}
              </Link>
            )}
            {step.completed && (
              <span className="shrink-0 px-3 py-1.5 bg-green-100 text-green-700 text-sm font-medium rounded-lg">
                Done ✓
              </span>
            )}
          </div>
        ))}
      </div>

      {/* All Complete Message */}
      {allCompleted && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-center">
          <p className="text-green-800 font-medium">
            🎊 You're all set! Your CRM is ready to use.
          </p>
          <button
            onClick={handleDismiss}
            disabled={dismissing}
            className="mt-2 text-sm text-green-700 hover:text-green-800 underline transition-colors"
          >
            {dismissing ? 'Saving...' : 'Hide this guide'}
          </button>
        </div>
      )}
    </div>
  );
}
