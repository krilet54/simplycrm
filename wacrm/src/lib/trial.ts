// src/lib/trial.ts
// Trial status utility for checking workspace trial/subscription status

export type TrialStatus = {
  status: 'trial' | 'expired' | 'subscribed';
  daysLeft: number | null;
};

export function getTrialStatus(workspace: {
  trialEndsAt: Date | null;
  plan: string;
  stripeSubscriptionId: string | null;
}): TrialStatus {
  // If they have an active paid subscription, trial status is irrelevant
  if (workspace.stripeSubscriptionId) {
    return { status: 'subscribed', daysLeft: null };
  }

  if (!workspace.trialEndsAt) {
    return { status: 'expired', daysLeft: 0 };
  }

  const now = new Date();
  const daysLeft = Math.ceil(
    (workspace.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysLeft > 0) {
    return { status: 'trial', daysLeft };
  }

  return { status: 'expired', daysLeft: 0 };
}

export function shouldShowTrialBanner(daysLeft: number | null): boolean {
  if (daysLeft === null) return false;
  return daysLeft <= 7 && daysLeft > 0;
}

export function getTrialBannerVariant(daysLeft: number): 'warning' | 'danger' {
  return daysLeft <= 3 ? 'danger' : 'warning';
}
