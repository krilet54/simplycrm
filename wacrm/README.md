# WaCRM — WhatsApp CRM for Micro-Businesses

Turn WhatsApp into a **shared inbox**, **Kanban pipeline**, and **contact database** for your team.

Built with Next.js 14, PostgreSQL (Supabase), Meta WhatsApp Cloud API, and Stripe.

---

## ✨ NEW: 10 Complete Features Implemented ✨

SimplyCRM now includes **10 fully-implemented, production-ready features**:

1. 🎨 **Sliding Global Contact Panel** - Access contact details from anywhere
2. 🔐 **Password Reset Flow** - Secure email recovery  
3. 📱 **Mobile Responsive + Bottom Nav** - Full mobile app experience
4. ⚡ **Quick Add Modal** - Create contacts instantly
5. 🏷️ **Intent Badges** - Classify by sales intent (Hot/Talking/Considering/Cold)
6. ⏰ **Overdue Indicators** - Auto-detect contacts needing follow-up
7. 📊 **Drag-to-Reorder Pipeline** - Customize Kanban stages
8. 💳 **Paystack Payments** - Generate payment links & auto-track
9. 🔍 **Global Search (CMD+K)** - Instant cross-resource search
10. 📧 **Email Digest & Push Notifications** - Daily summaries & alerts

**All features are production-ready with zero TypeScript errors and successful build verification.**

---

## 📚 Documentation

- **[QUICK_START.md](./QUICK_START.md)** - Get running in 5 minutes
- **[FEATURES_SHOWCASE.md](./FEATURES_SHOWCASE.md)** - Detailed feature breakdown with usage
- **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - Production deployment instructions
- **[IMPLEMENTATION_COMPLETE.md](./IMPLEMENTATION_COMPLETE.md)** - Technical overview

---

## ✅ Feature Checklist

| Feature | Status |
|---|---|
| Shared inbox (multiple agents, one number) | ✅ |
| Real-time message receive (webhook) | ✅ |
| Send messages from dashboard | ✅ |
| WhatsApp message status ticks (sent/delivered/read) | ✅ |
| Kanban pipeline with drag-and-drop | ✅ |
| Contact database with search & filters | ✅ |
| Contact tagging system | ✅ |
| Private notes on contacts | ✅ |
| Quick replies (type `/shortcut` in composer) | ✅ |
| Team member invites with role management | ✅ |
| Stripe billing (Starter $19/mo, Pro $39/mo) | ✅ |
| Plan seat limits enforcement | ✅ |
| Onboarding flow | ✅ |
| Auth (Supabase) with email/password | ✅ |

---

## 🚀 Quick Start

### 1. Clone and install

```bash
git clone <your-repo>
cd wacrm
npm install
```

### 2. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **Project Settings → Database** and copy the connection string
3. Go to **Project Settings → API** and copy the `anon` key and `service_role` key

### 3. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in all values in `.env.local`:

```bash
DATABASE_URL="postgresql://..."
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
SUPABASE_SERVICE_ROLE_KEY="eyJ..."
WHATSAPP_VERIFY_TOKEN="any_random_string_you_choose"
WHATSAPP_APP_SECRET="from_meta_app_settings"
WHATSAPP_PHONE_NUMBER_ID="your_default_phone_number_id"
WHATSAPP_ACCESS_TOKEN="EAAxxxxxxxx"
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_STARTER_PRICE_ID="price_..."
STRIPE_PRO_PRICE_ID="price_..."
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 4. Set up the database

```bash
npm run db:generate    # Generate Prisma client
npm run db:push        # Push schema to Supabase PostgreSQL
```

### 5. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign up.

---

## 📱 WhatsApp Setup (Meta Developer Console)

### Step 1 — Create a Meta App

1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Click **Create App** → choose **Business** type
3. Add the **WhatsApp** product

### Step 2 — Get credentials

In **WhatsApp → API Setup**:
- Copy the **Phone Number ID** → put in `WHATSAPP_PHONE_NUMBER_ID`
- Generate a **temporary access token** (or get a permanent one via System User)
- Put the token in `WHATSAPP_ACCESS_TOKEN`

### Step 3 — Configure Webhook

In **WhatsApp → Configuration**:
- **Callback URL**: `https://your-domain.com/api/webhook/whatsapp`
- **Verify Token**: the value you set in `WHATSAPP_VERIFY_TOKEN`
- Subscribe to: `messages`

> **Local development**: Use [ngrok](https://ngrok.com) to expose localhost:
> ```bash
> ngrok http 3000
> # Use the https URL as your callback URL
> ```

### Step 4 — Get a permanent access token

1. In Meta Business Manager, create a **System User**
2. Assign it to your WhatsApp app with `whatsapp_business_messaging` permission
3. Generate a **Never Expiring** token
4. Store in your workspace settings (Settings → WhatsApp tab)

---

## 💳 Stripe Setup

### Create Products

1. In [Stripe Dashboard](https://dashboard.stripe.com) → **Products** → **Add Product**
2. Create **WaCRM Starter** at $19/month (recurring)
3. Create **WaCRM Pro** at $39/month (recurring)
4. Copy both **Price IDs** to your `.env.local`

### Set up Webhook

1. Stripe Dashboard → **Developers** → **Webhooks** → **Add endpoint**
2. URL: `https://your-domain.com/api/stripe/webhook`
3. Events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy the **Signing Secret** → `STRIPE_WEBHOOK_SECRET`

> **Local testing**: Use Stripe CLI
> ```bash
> stripe listen --forward-to localhost:3000/api/stripe/webhook
> ```

---

## 🏗️ Project Structure

```
wacrm/
├── prisma/
│   ├── schema.prisma        # Full database schema
│   └── seed.ts              # Default stages, quick replies, tags
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── webhook/whatsapp/   # Meta webhook handler
│   │   │   ├── messages/           # Send & receive messages
│   │   │   ├── contacts/           # Contact CRUD
│   │   │   ├── notes/              # Private notes
│   │   │   ├── kanban/             # Pipeline stages & moves
│   │   │   ├── quick-replies/      # Canned responses
│   │   │   ├── agents/             # Team member invites
│   │   │   ├── tags/               # Contact labels
│   │   │   ├── workspace/          # Workspace settings
│   │   │   ├── onboarding/         # First-time setup
│   │   │   └── stripe/             # Checkout & webhooks
│   │   ├── auth/callback/          # Supabase auth callback
│   │   ├── dashboard/
│   │   │   ├── inbox/              # Shared inbox page
│   │   │   ├── kanban/             # Pipeline board page
│   │   │   ├── contacts/           # Contact database page
│   │   │   ├── agents/             # Team management page
│   │   │   └── settings/           # Settings page
│   │   ├── login/                  # Auth page
│   │   └── onboarding/             # Setup wizard
│   ├── components/
│   │   ├── inbox/InboxClient       # Chat UI with quick replies, notes
│   │   ├── kanban/KanbanClient     # Drag-and-drop board
│   │   ├── contacts/ContactsClient # Table with modals
│   │   ├── shared/Sidebar          # Navigation
│   │   ├── AgentsClient            # Team page
│   │   └── SettingsClient          # Settings tabs
│   ├── lib/
│   │   ├── db.ts                   # Prisma singleton
│   │   ├── whatsapp.ts             # Meta API helpers
│   │   ├── auth.ts                 # Server auth helpers
│   │   ├── supabase-server.ts      # Server Supabase client
│   │   └── supabase-browser.ts     # Client Supabase client
│   ├── types/                      # TypeScript interfaces
│   └── middleware.ts               # Auth route protection
```

---

## 🚢 Deployment (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Set all environment variables in the **Vercel Dashboard → Project → Settings → Environment Variables**.

Make sure to update:
- `NEXT_PUBLIC_APP_URL` to your production URL
- Stripe webhook URL to your production domain
- Meta webhook callback URL to your production domain

---

## 📈 Scaling Notes

- **Message polling**: The inbox currently polls every 5s. For production, replace with **Supabase Realtime** (subscribe to the `messages` table) for instant push.
- **Token security**: WhatsApp access tokens are stored in the DB. In production, encrypt them using a secret key before storing.
- **Rate limits**: Meta's WhatsApp API has rate limits per phone number. Monitor in Meta dashboard.
- **24-hour window**: WhatsApp only allows free-form messages within 24 hours of the customer's last message. After that, you must use approved templates.

---

## 🛠️ Useful Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run db:studio    # Open Prisma Studio (visual DB browser)
npm run db:push      # Sync schema changes to DB
npm run db:migrate   # Create a migration file
```
