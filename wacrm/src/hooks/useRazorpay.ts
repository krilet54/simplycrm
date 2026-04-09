// src/hooks/useRazorpay.ts
'use client';

import { useCallback } from 'react';
import toast from 'react-hot-toast';

interface RazorpayCheckoutOptions {
  key_id: string;
  order_id: string;
  amount: number;
  currency: string;
  description: string;
  prefill: {
    name: string;
    email: string;
    contact?: string;
  };
  handler: (response: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => void;
  on_error: (error: any) => void;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export function useRazorpay() {
  const openCheckout = useCallback((options: RazorpayCheckoutOptions) => {
    // Load Razorpay script if not already loaded
    if (!window.Razorpay) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => {
        if (window.Razorpay) {
          const rzp = new window.Razorpay(options);
          rzp.open();
        }
      };
      script.onerror = () => {
        toast.error('Failed to load Razorpay');
      };
      document.body.appendChild(script);
    } else {
      const rzp = new window.Razorpay(options);
      rzp.open();
    }
  }, []);

  const initiatePayment = useCallback(
    async (plan: 'STARTER' | 'PRO', onSuccess: (response: any) => void) => {
      try {
        // Call your API to create order
        const response = await fetch('/api/razorpay/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to create payment order');
        }

        const orderData = await response.json();

        // Open Razorpay checkout
        openCheckout({
          key_id: orderData.key,
          order_id: orderData.orderId,
          amount: orderData.amount,
          currency: orderData.currency,
          description: orderData.description,
          prefill: orderData.prefill,
          handler: onSuccess,
          on_error: (error) => {
            console.error('Payment error:', error);
            toast.error('Payment failed. Please try again.');
          },
        });
      } catch (error) {
        console.error('Payment initiation error:', error);
        toast.error((error as Error).message || 'Failed to initiate payment');
      }
    },
    [openCheckout]
  );

  return { initiatePayment };
}
