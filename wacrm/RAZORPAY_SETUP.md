# Razorpay Integration Guide

## Setup Complete ✅

Test API Keys configured in `.env`:
- **NEXT_PUBLIC_RAZORPAY_KEY_ID**: rzp_test_Sb2A3eFztFenqC
- **RAZORPAY_KEY_SECRET**: GzUyyRRunRaMVBWiFxtQBv1W

## Pricing Updated ✅

- **Starter Plan**: ₹499/month (was $9)
- **Pro Plan**: ₹999/month (was $25)

## Next Steps to Complete Razorpay Setup

1. **Create Razorpay API Routes** (files to create):
   ```
   src/app/api/razorpay/checkout/route.ts  - Create order
   src/app/api/razorpay/webhook/route.ts   - Handle payment verification
   ```

2. **Create Subscription Table in Database**:
   ```sql
   CREATE TABLE "subscription" (
     id TEXT PRIMARY KEY DEFAULT uuid_v4(),
     "workspaceId" TEXT NOT NULL UNIQUE,
     plan TEXT NOT NULL,
     status TEXT NOT NULL DEFAULT 'PENDING',
     "razorpayOrderId" TEXT NOT NULL UNIQUE,
     "razorpayPaymentId" TEXT,
     amount DECIMAL NOT NULL,
     currency TEXT DEFAULT 'INR',
     "paidAt" TIMESTAMP,
     "expiresAt" TIMESTAMP,
     "createdAt" TIMESTAMP DEFAULT NOW(),
     "updatedAt" TIMESTAMP DEFAULT NOW(),
     FOREIGN KEY ("workspaceId") REFERENCES "Workspace"(id) ON DELETE CASCADE
   );
   ```

3. **Create Frontend Payment Component** (for billing settings):
   - Show Razorpay payment modal
   - Handle payment response
   - Show success/failure messages

4. **Update SettingsClient Component**:
   - Add "Upgrade Plan" button
   - Call `/api/razorpay/checkout` to get order details
   - Open Razorpay checkout modal

5. **Configure Razorpay Webhook**:
   - Go to Razorpay Dashboard > Account Settings > Webhooks
   - Add webhook URL: `https://your-domain.com/api/razorpay/webhook`
   - Subscribe to events:
     - `payment.authorized`
     - `payment.captured`
     - `payment.failed`

## Files Updated

✅ `.env` - Razorpay API keys added
✅ `src/app/page.tsx` - Pricing updated to ₹499, ₹999
✅ `src/app/(marketing)/page.tsx` - Pricing updated
✅ `src/components/TrialExpiredModal.tsx` - Pricing updated

## Testing

1. Use test card: `4111 1111 1111 1111`
2. Any future expiry date and CVV
3. Verify webhook in Razorpay dashboard

## Migration from Stripe

The `stripeSubscriptionId` field in Workspace table is reused to store Razorpay payment ID for now. This can be refactored later.
