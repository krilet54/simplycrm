# ⚠️ MANUAL SETUP REQUIRED - Directory Creation

Due to Windows PowerShell limitations, I wasn't able to automatically create the nested directory structure for the Razorpay API routes. Here's how to do it manually:

## Step 1: Create Directory Structure

In VS Code, do the following:

1. **Create `/src/app/api/razorpay/` folder:**
   - Right-click on `/src/app/api/`
   - Select "New Folder"
   - Name it `razorpay`

2. **Create `/src/app/api/razorpay/checkout/` folder:**
   - Right-click on the new `razorpay` folder
   - Select "New Folder"
   - Name it `checkout`

3. **Create `/src/app/api/razorpay/webhook/` folder:**
   - Right-click on the `razorpay` folder
   - Select "New Folder"
   - Name it `webhook`

## Step 2: Create Files in Each Folder

### File 1: `/src/app/api/razorpay/checkout/route.ts`

Copy the entire content from: `RAZORPAY_CHECKOUT_ROUTE.txt`

Right-click on the `checkout` folder → "New File" → Name it `route.ts` → Paste the content

### File 2: `/src/app/api/razorpay/webhook/route.ts`

Copy the entire content from: `RAZORPAY_WEBHOOK_ROUTE.txt`

Right-click on the `webhook` folder → "New File" → Name it `route.ts` → Paste the content

## Step 3: Update SettingsClient.tsx

In `/src/components/SettingsClient.tsx`, line 1145:

**Find:**
```typescript
price: '$19',
```
**Replace with:**
```typescript
price: '₹499',
```

**Find (line 1147):**
```typescript
features: ['Up to 3 team members', 'Unlimited contacts', 'Shared inbox', 'Kanban pipeline', 'Quick replies'],
```
**Replace with:**
```typescript
features: ['Up to 3 team members', 'Unlimited contacts', 'Contact management', 'Kanban pipeline', 'Quick replies'],
```

**Find (line 1153):**
```typescript
price: '$39',
```
**Replace with:**
```typescript
price: '₹999',
```

**Find (line 1196-1203):**
```typescript
onClick={async () => {
  const res = await fetch('/api/stripe/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan }),
  });
  const { url, error } = await res.json();
  if (error) { toast.error(error); return; }
  if (url) window.location.href = url;
}}
```
**Replace with:**
```typescript
onClick={async () => {
  try {
    const res = await fetch('/api/razorpay/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || 'Failed to create payment order');
      return;
    }
    
    // Open Razorpay checkout
    const options = {
      key: data.key,
      order_id: data.orderId,
      amount: data.amount,
      currency: data.currency,
      description: data.description,
      prefill: data.prefill,
      handler: async (response: any) => {
        // Verify payment on backend
        const verifyRes = await fetch('/api/razorpay/webhook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: response.razorpay_order_id,
            paymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature,
            plan,
          }),
        });
        
        const verifyData = await verifyRes.json();
        if (verifyData.success) {
          toast.success('Payment successful! Your plan has been upgraded.');
          setTimeout(() => window.location.reload(), 1500);
        } else {
          toast.error(verifyData.error || 'Payment verification failed');
        }
      },
      on_error: (error: any) => {
        toast.error(error.description || 'Payment failed');
      },
    };
    
    // Open Razorpay modal
    if (window.Razorpay) {
      const rzp = new window.Razorpay(options);
      rzp.open();
    } else {
      toast.error('Razorpay not loaded');
    }
  } catch (err) {
    console.error('Payment error:', err);
    toast.error('An error occurred');
  }
}}
```

**Find (line 1218):**
```typescript
Billing is handled securely via Stripe. To cancel, email support.
```
**Replace with:**
```typescript
Billing is handled securely via Razorpay. To cancel or modify, email support@crebo.io.
```

## Step 4: Test the Setup

1. Open VS Code terminal
2. Run: `npm run dev`
3. Go to Settings → Billing
4. Click "Get Starter" or "Get Pro"
5. You should see the Razorpay checkout modal

## Need Help?

The temporary files I created contain the code:
- `RAZORPAY_CHECKOUT_ROUTE.txt` - Contains `/checkout/route.ts` code
- `RAZORPAY_WEBHOOK_ROUTE.txt` - Contains `/webhook/route.ts` code
- `RAZORPAY_INTEGRATION.md` - Complete integration guide
- `RAZORPAY_SETUP.md` - Setup checklist

## PowerShell Cheat Sheet

For future commands, use PowerShell syntax (not bash):

```powershell
# Clean and run
Remove-Item -Path .next -Recurse -Force -ErrorAction SilentlyContinue; npm run dev

# Or separate commands:
Remove-Item -Recurse -Force .next
npm run dev
```

NOT:
```bash
# ❌ DON'T use bash syntax
rm -rf .next && npm run dev
```
