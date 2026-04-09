'use client';

import Link from 'next/link';
import { AlertTriangle, Clock } from 'lucide-react';

interface TrialBannerProps {
  daysLeft: number;
}

export function TrialBanner({ daysLeft }: TrialBannerProps) {
  const isUrgent = daysLeft <= 3;

  if (daysLeft > 7) return null;

  return (
    <div
      className={`px-4 py-3 text-sm flex items-center justify-between gap-4 ${
        isUrgent
          ? 'bg-red-50 text-red-800 border-b border-red-100'
          : 'bg-amber-50 text-amber-800 border-b border-amber-100'
      }`}
    >
      <div className="flex items-center gap-2">
        {isUrgent ? (
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
        ) : (
          <Clock className="w-4 h-4 flex-shrink-0" />
        )}
        <span>
          {isUrgent
            ? `⚠️ Trial ending in ${daysLeft} day${daysLeft === 1 ? '' : 's'}! Subscribe now to avoid losing access.`
            : `⏳ Your free trial ends in ${daysLeft} days. Choose a plan to keep your data.`}
        </span>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <Link
          href="/dashboard/settings#billing"
          className={`font-medium hover:underline ${
            isUrgent ? 'text-red-900' : 'text-amber-900'
          }`}
        >
          {isUrgent ? 'Choose a plan →' : 'View plans →'}
        </Link>
        {isUrgent && (
          <Link
            href="/dashboard/settings#export"
            className="text-red-700 hover:underline text-xs"
          >
            Export my data
          </Link>
        )}
      </div>
    </div>
  );
}
