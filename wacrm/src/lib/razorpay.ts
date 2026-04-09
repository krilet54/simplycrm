// src/lib/razorpay.ts
import crypto from 'crypto';

const RAZORPAY_KEY_ID = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

export const RAZORPAY_PLANS = {
  STARTER: {
    amount: 49900, // ₹499 in paise
    amountDisplay: '₹499',
    description: 'Crebo Starter Plan',
  },
  PRO: {
    amount: 99900, // ₹999 in paise
    amountDisplay: '₹999',
    description: 'Crebo Pro Plan',
  },
};

/**
 * Create Razorpay order
 */
export async function createRazorpayOrder(
  workspaceId: string,
  userId: string,
  userEmail: string,
  userName: string,
  plan: 'STARTER' | 'PRO'
) {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay keys not configured');
  }

  const planData = RAZORPAY_PLANS[plan];

  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64')}`,
    },
    body: JSON.stringify({
      amount: planData.amount,
      currency: 'INR',
      receipt: `ORD-${workspaceId.substring(0, 8)}-${Date.now().toString().slice(-8)}`,
      description: planData.description,
      notes: {
        workspaceId,
        userId,
        plan,
        userEmail,
        userName,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Razorpay error: ${JSON.stringify(error)}`);
  }

  return response.json();
}

/**
 * Verify Razorpay signature
 */
export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  if (!RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay secret key not configured');
  }

  const body = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  return expectedSignature === signature;
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(body: string, signature: string): boolean {
  if (!RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay secret key not configured');
  }

  const hash = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  return hash === signature;
}

/**
 * Get plan features
 */
export function getPlanFeatures(plan: 'STARTER' | 'PRO') {
  const features = {
    STARTER: [
      'Everything in Free trial',
      'Up to 3 team members',
      'Email invoices to customers',
      'Email notifications',
      'Data export (CSV)',
    ],
    PRO: [
      'Everything in Starter',
      'Unlimited team members',
      'Priority email support',
      'Advanced reports',
      'Recurring invoices',
    ],
  };

  return features[plan] || [];
}
