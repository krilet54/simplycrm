# SimplyCRM - Quick Start Development Guide

Get SimplyCRM running locally in 5 minutes.

## Prerequisites
- Node.js 18+
- PostgreSQL (or Supabase)
- Git

## 1. Clone Repository
```bash
cd simplycrm/wacrm
```

## 2. Install Dependencies
```bash
npm install
```

## 3. Set Environment Variables
Copy `.env.example` to `.env.local` and fill in:
- `DATABASE_URL` - Your PostgreSQL connection string
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key

For testing without external services:
```
PAYSTACK_SECRET_KEY="sk_test_dummy"
PAYSTACK_PUBLIC_KEY="pk_test_dummy"
CRON_SECRET="test-secret"
```

## 4. Set Up Database
```bash
# Run migrations
npx prisma migrate deploy

# (Optional) Open Prisma Studio to view database
npx prisma studio
```

## 5. Start Development Server
```bash
npm run dev
```

Server runs at `http://localhost:3000`

---

## Testing the 10 Features

### 1. Sliding Contact Panel
- Navigate to any contact view
- Click a contact to open the global sliding panel on the right
- Panel shows: Info, Activity, Notes, Invoices, Email tabs

### 2. Password Reset
- Go to login page
- Click "Forgot Password"
- Enter email and follow reset link

### 3. Mobile Responsive + Bottom Nav
- Open app on mobile or resize browser to mobile width
- See bottom navigation with Home, People, Money, Follow-ups, Settings
- Desktop sidebar hidden, replaced with floating menu

### 4. Quick Add Modal
- Click + button in bottom nav (mobile) or sidebar (desktop)
- Fill in name and phone, optional tags and pipeline stage
- Modal fetches available stages and tags dynamically

### 5. Intent Badges
- Open any contact's Info tab
- Click one of: 🔥 Hot, 💬 Talking, 🤔 Considering, ❄️ Cold
- Badge saves automatically
- Appears on Kanban cards

### 6. Overdue Indicators
- Go to Kanban board
- Look for red dot on contacts with no activity >48 hours
- Hover to see "No activity in X days"

### 7. Drag-to-Reorder Pipeline
- Go to Settings → Pipeline
- See list of Kanban stages
- Drag handles (⋮⋮) to reorder stages
- Click + to add new stage
- Click X to delete stage

### 8. Paystack Payments
- Create an invoice
- Open any invoice detail
- Click "Generate Payment Link"
- Link generated with Paystack integration

### 9. Global Search
- Press **CMD+K** (Mac) or **CTRL+K** (Windows)
- Type to search contacts, invoices, tasks
- Click result to navigate
- ESC to close

### 10. Email Digest & Notifications
- Go to Settings
- Configure notification preferences
- Digest emails sent daily (requires cron setup in production)
- Push subscriptions manageable via API

---

## Common Commands

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Check TypeScript errors
npx tsc --noEmit

# Format code
npm run lint

# Open database GUI
npx prisma studio

# Create new migration
npx prisma migrate dev --name feature_name

# View Prisma schema
cat prisma/schema.prisma
```

---

## Project Structure

```
src/
├── app/
│   ├── api/                    # All API endpoints
│   │   ├── contacts/          # Contact operations
│   │   ├── kanban/            # Pipeline & stages
│   │   ├── invoices/          # Invoice & payments
│   │   ├── notifications/     # Digest & push emails
│   │   ├── search/            # Global search
│   │   └── webhooks/          # Paystack webhook
│   ├── dashboard/             # Main app layout
│   ├── login/                 # Authentication
│   └── onboarding/            # Initial setup
├── components/
│   ├── GlobalContactPanel.tsx          # Feature 1
│   ├── GlobalSearch.tsx                # Feature 9
│   ├── shared/MobileBottomNav.tsx      # Feature 3
│   ├── settings/PipelineSettings.tsx   # Feature 7
│   └── contact-profile/
│       └── InfoTab.tsx                 # Feature 5
├── context/
│   └── ContactPanelContext.tsx         # Global state
├── hooks/
│   └── useContactPanel.ts              # Context hook
├── lib/
│   ├── db.ts                           # Prisma client
│   ├── auth.ts                         # Auth helpers
│   └── supabase-*.ts                   # Supabase clients
└── types/
    └── index.ts                        # TypeScript types

prisma/
└── schema.prisma                       # Database schema
```

---

## API Reference

### Contacts
- `GET /api/contacts` - List all contacts
- `GET /api/contacts/[id]` - Get contact  
- `GET /api/contacts/[id]/details` - Get with activities, notes, invoices (Feature 1)
- `PATCH /api/contacts/[id]` - Update contact
- `PATCH /api/contacts/[id]/intent-badge` - Update badge (Feature 5)
- `DELETE /api/contacts/[id]` - Delete contact

### Kanban Stages (Feature 7)
- `GET /api/kanban/stages` - List stages
- `POST /api/kanban/stages` - Create stage
- `DELETE /api/kanban/stages/[id]` - Delete stage
- `PATCH /api/kanban/stages/reorder` - Reorder stages

### Invoices & Payments (Feature 8)
- `GET /api/invoices` - List invoices
- `POST /api/invoices` - Create invoice
- `POST /api/invoices/[id]/payment-link` - Generate Paystack link
- `POST /api/webhooks/paystack` - Paystack webhook

### Search (Feature 9)
- `GET /api/search?q=query` - Search all resources

### Notifications (Feature 10)
- `POST /api/notifications/send-digest` - Send daily email digest
- `POST /api/notifications/subscribe` - Subscribe to push
- `PUT /api/notifications/subscribe` - Send push notification

---

## Debugging

### Check if feature is working
1. Open browser DevTools (F12)
2. Go to Network tab
3. Trigger feature (e.g., open contact panel)
4. Look for API calls
5. Check response in Response tab

### View database
```bash
npx prisma studio
# Opens http://localhost:5555
```

### Check build errors
```bash
npm run build 2>&1 | grep -i error
```

### View server logs
Check terminal where `npm run dev` is running

---

## Next Steps

- Customize theme in `tailwind.config.js`
- Add your company logo and branding
- Invite team members in Settings
- Configure WhatsApp integration
- Set up payment provider webhooks

---

## Need Help?

1. Check existing code in `src/components/` for examples
2. Review Prisma schema: `npx prisma schema view`
3. Check API responses in browser Network tab
4. Review database with `npx prisma studio`

All 10 features are production-ready. Happy building! 🚀

