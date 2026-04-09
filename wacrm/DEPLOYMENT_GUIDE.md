# SimplyCRM - Deployment & Setup Guide

## Quick Start for Production Deployment

This guide will help you deploy SimplyCRM with all 10 implemented features to production.

---

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database (or Supabase)
- Supabase account (for authentication)
- Git
- npm or yarn

---

## Step 1: Clone & Install Dependencies

```bash
cd simplycrm/wacrm
npm install
```

---

## Step 2: Configure Environment Variables

Create a `.env.local` file in the `wacrm` directory with the following variables:

### Database
```
DATABASE_URL="postgresql://user:password@host:5432/wacrm"
```

### Supabase Authentication
```
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key-here"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"
```

### WhatsApp Integration
```
WHATSAPP_VERIFY_TOKEN="your-verify-token"
WHATSAPP_APP_SECRET="your-app-secret"
WHATSAPP_PHONE_NUMBER_ID="your-phone-number-id"
WHATSAPP_ACCESS_TOKEN="your-access-token"
```

### Email Delivery (Resend)
```
RESEND_API_KEY="re_your-api-key-here"
```

### Stripe (Subscription Management)
```
STRIPE_SECRET_KEY="sk_test_or_live_key"
STRIPE_WEBHOOK_SECRET="whsec_your-webhook-secret"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_or_live_key"
STRIPE_STARTER_PRICE_ID="price_starter_id"
STRIPE_PRO_PRICE_ID="price_pro_id"
```

### **Paystack (Feature #8 - Payment Links)**
```
PAYSTACK_SECRET_KEY="sk_test_or_live_your_paystack_secret"
PAYSTACK_PUBLIC_KEY="pk_test_or_live_your_paystack_public"
```

### Cron Jobs (Feature #10 - Notifications)
```
CRON_SECRET="your-secure-cron-secret-key"
```

### Application
```
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="run: openssl rand -base64 32"
NEXT_PUBLIC_APP_URL="https://your-domain.com"
```

---

## Step 3: Set Up Database

### If using Supabase:
1. Go to Supabase dashboard
2. Create a new project
3. Get the connection string
4. Paste it in `DATABASE_URL`

### Run Migrations:
```bash
npx prisma migrate deploy
```

### Seed Database (optional):
```bash
npx prisma db seed
```

---

## Step 4: Local Development Testing

Before deployment, test locally:

```bash
npm run dev
```

Access at `http://localhost:3000`

### Test the 10 Features:
1. **Sliding Contact Panel** - Click any contact to see the sliding drawer
2. **Password Reset** - Go to login, click "Forgot Password"
3. **Mobile Navigation** - Open on mobile device to test bottom nav
4. **Quick Add Modal** - Click + button in bottom nav or sidebar
5. **Intent Badges** - Open contact details, set HOT/TALKING/CONSIDERING/COLD
6. **Pipeline Stages** - Go to Settings > Pipeline to drag-reorder stages
7. **Paystack Payments** - Create invoice, click "Send Payment Link"
8. **Global Search** - Press CMD+K (Mac) or CTRL+K (Windows) to search
9. **Notifications** - Check settings for digest email configuration
10. **Mobile Responsive** - Resize browser to test mobile layout

---

## Step 5: Production Build

```bash
npm run build
```

This should complete with "Compiled successfully" message.

---

## Step 6: Deploy to Production

### Option A: Vercel (Recommended for Next.js)

1. Push code to GitHub
2. Connect GitHub repo to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy (automatic on push)

```bash
git push origin main
```

### Option B: Self-Hosted (AWS, DigitalOcean, etc.)

1. Build the project: `npm run build`
2. Start server: `npm run start`
3. Use PM2 or systemd to keep it running:

```bash
npm install -g pm2
pm2 start npm --name "wacrm" -- start
pm2 save
pm2 startup
```

### Option C: Docker

Create `Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

Build and run:
```bash
docker build -t wacrm .
docker run -p 3000:3000 -e DATABASE_URL="..." wacrm
```

---

## Step 7: Post-Deployment Configuration

### Paystack Webhook Setup (Feature #8)
1. Go to Paystack dashboard > Settings > API Keys & Webhooks
2. Add webhook URL: `https://your-domain.com/api/webhooks/paystack`
3. Select events: `charge.success`
4. Copy webhook secret and add to `PAYSTACK_WEBHOOK_SECRET` env var

### Email Digest Setup (Feature #10)
1. Set up a cron job to call `/api/notifications/send-digest` daily
2. Add Authorization header: `Bearer {CRON_SECRET}`
3. Examples:
   - **Vercel Cron**: Create `vercel.json`
   - **AWS EventBridge**: Schedule Lambda
   - **GitHub Actions**: Schedule workflow

### Stripe Webhook Setup (if using subscriptions)
1. Go to Stripe dashboard > Developers > Webhooks
2. Add endpoint: `https://your-domain.com/api/stripe/webhook`
3. Copy signing secret to `STRIPE_WEBHOOK_SECRET`

---

## Step 8: Verify Deployment

```bash
# Check if server is running
curl https://your-domain.com/api/health

# Check database connection
curl https://your-domain.com/api/workspace

# Test search feature
curl "https://your-domain.com/api/search?q=test" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Test Paystack payment link
curl -X POST https://your-domain.com/api/invoices/{invoice-id}/payment-link \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Feature Endpoints Reference

### Feature 1: Sliding Contact Panel
- **GET** `/api/contacts/[id]/details` - Fetch contact with all relationships

### Feature 5: Intent Badges
- **PATCH** `/api/contacts/[id]/intent-badge` - Update badge (HOT/TALKING/CONSIDERING/COLD)

### Feature 7: Pipeline Reordering
- **GET** `/api/kanban/stages` - List all stages
- **POST** `/api/kanban/stages` - Create new stage
- **DELETE** `/api/kanban/stages/[id]` - Delete stage
- **PATCH** `/api/kanban/stages/reorder` - Reorder stages

### Feature 8: Paystack Payments
- **POST** `/api/invoices/[id]/payment-link` - Generate payment link
- **POST** `/api/webhooks/paystack` - Webhook confirmation (automatic)

### Feature 9: Global Search
- **GET** `/api/search?q=query` - Search contacts, invoices, tasks

### Feature 10: Notifications
- **POST** `/api/notifications/send-digest` - Send daily digest email
- **POST/PUT** `/api/notifications/subscribe` - Manage push subscriptions

---

## Troubleshooting

### Build Fails with TypeScript Errors
```bash
npx tsc --noEmit
# Review any errors, fix and retry
npm run build
```

### Database Connection Error
- Verify `DATABASE_URL` is correct
- Check if database server is running
- Ensure firewall allows connection

### Paystack Webhook Not Working
- Verify webhook URL is publicly accessible
- Check `PAYSTACK_SECRET_KEY` is correct
- Review Paystack dashboard for webhook logs

### Email Digest Not Sending
- Verify `RESEND_API_KEY` is valid
- Ensure `CRON_SECRET` is set
- Check email webhook logs in Resend dashboard
- Test manually: `curl -X POST https://your-domain.com/api/notifications/send-digest -H "Authorization: Bearer {CRON_SECRET}"`

### Search Not Finding Results
- Verify `DATABASE_URL` is set
- Check that contacts exist in database for your workspace
- Ensure query is at least 2 characters long

---

## Production Checklist

Before going live, verify:

- [ ] All `.env.local` variables configured
- [ ] Database migrations run: `npx prisma migrate deploy`
- [ ] Build succeeds: `npm run build`
- [ ] Supabase authentication working
- [ ] Paystack test keys working (or live keys if ready)
- [ ] Email provider (Resend) API key working
- [ ] Stripe keys configured (if using subscriptions)
- [ ] WhatsApp configuration complete
- [ ] Cron job scheduled for email digest
- [ ] Paystack webhook configured
- [ ] Stripe webhook configured (if applicable)
- [ ] Database backups configured
- [ ] SSL certificate configured (HTTPS)
- [ ] Error logging configured (Sentry, etc.)
- [ ] Monitoring set up (Vercel Analytics, etc.)

---

## Security Configuration

### 1. Rate Limiting (Recommended)

Rate limiting is implemented but requires Upstash Redis. Get a free account at https://console.upstash.com/

Add to your environment variables:
```
UPSTASH_REDIS_REST_URL="https://your-instance.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-upstash-token"
```

Rate limits applied:
- **General API routes**: 60 requests/minute
- **Sensitive operations** (CSV import, emails): 10 requests/minute
- **Auth operations** (onboarding, invites): 5 requests/minute

If not configured, rate limiting is disabled (not recommended for production).

### 2. Session Timeout

Configure session duration in Supabase dashboard:
1. Go to **Authentication > Settings > JWT Settings**
2. Set **JWT expiry** to desired duration (recommended: 3600 seconds = 1 hour)
3. Enable **Refresh Token Rotation** for security
4. Set **Refresh Token Reuse Interval** to 10 seconds

The app automatically refreshes sessions within 5 minutes of expiry.

### 3. Environment Variable Security

Ensure the following:
- `.env` and `.env.local` files are in `.gitignore` (already configured)
- Only `NEXT_PUBLIC_*` variables are exposed to the client
- Service role keys are never logged or exposed
- Rotate all secrets if you suspect a leak

### 4. Webhook Security

All payment webhooks verify signatures:
- **Stripe**: Uses `stripe.webhooks.constructEvent()` with `STRIPE_WEBHOOK_SECRET`
- **Paystack**: Verifies HMAC-SHA512 signature with `PAYSTACK_SECRET_KEY`

Ensure webhook secrets are set correctly in your environment.

---

## Support & Documentation

### Key Files to Review
- `/src/app/api/` - All API endpoints
- `/src/components/` - UI components
- `/src/context/ContactPanelContext.tsx` - Global state management
- `/prisma/schema.prisma` - Database schema
- `.env.example` - Environment variable reference

### Next Steps
1. Customize branding (logo, colors, company name)
2. Configure team members and roles
3. Set up WhatsApp integration for messaging
4. Train team on features

---

## Version Info
- Next.js 14.1.3
- TypeScript 5.x
- Prisma 5.x
- React 18.x
- Tailwind CSS 3.x

---

## Successfully Deployed! 🎉

Your SimplyCRM instance with all 10 features is now live!

For issues or questions, check:
- API logs in application dashboard
- Webhook logs in Paystack/Stripe dashboards
- Email logs in Resend dashboard
- Database query logs in Prisma Studio: `npx prisma studio`

