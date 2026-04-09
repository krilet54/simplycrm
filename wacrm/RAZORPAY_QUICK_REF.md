# Razorpay Integration - Quick Reference

## What Changed

### Dashboard Billing Section
- ✅ Prices updated: $19/$39 → ₹499/₹999
- ✅ Payment provider: Stripe → Razorpay
- ✅ Checkout flow: Redirects to Stripe → Opens Razorpay modal
- ✅ Support email: support → support@crebo.io

### API Endpoints
- `POST /api/stripe/checkout` → Creates Razorpay order
- `PUT /api/stripe/checkout` → Verifies & activates payment
  
### Features
- Razorpay modal opens in-page (no redirects)
- Test mode: Use card 4111 1111 1111 1111
- Automatic plan activation on payment
- Error handling with user-friendly messages

---

## Test Now

1. Go to Settings → Billing
2. Click "Get Starter" (₹499/month)
3. Enter test card: 4111 1111 1111 1111
4. Any future expiry + any CVV
5. Done! Plan activated

---

## Cost Breakdown

| Plan | Price | Razorpay Fee | You Receive |
|------|-------|--------------|-------------|
| Starter | ₹499 | ₹12.98 | ₹486.02 |
| Pro | ₹999 | ₹22.98 | ₹976.02 |

**Fee calculation:** 2% + ₹3

---

## Environment
```
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_Sb2A3eFztFenqC
RAZORPAY_KEY_SECRET=GzUyyRRunRaMVBWiFxtQBv1W
```

---

## Files Modified
1. `src/components/SettingsClient.tsx` - Pricing & payment flow
2. `src/app/api/stripe/checkout/route.ts` - Order & verification
3. `.env` - Razorpay credentials (already configured)

---

## No Additional Setup Needed
Everything is ready to use. Just test with the credentials provided!

---

## Status: ✅ COMPLETE
