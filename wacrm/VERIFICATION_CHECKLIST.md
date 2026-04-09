# SimplyCRM - Verification Checklist

**Use this checklist to verify all 10 features are working correctly after setup.**

## Pre-Verification Setup
- [ ] Ran `npm install`
- [ ] Configured `.env.local` with all required variables
- [ ] Ran `npx prisma migrate deploy`
- [ ] Started dev server: `npm run dev`
- [ ] Server running at http://localhost:3000

---

## Feature Verification Tests

### Feature 1: Sliding Global Contact Panel ✓
- [ ] Navigate to Contacts page
- [ ] Click on any contact in the list
- [ ] Right-side panel slides open (should see 5 tabs: Info, Activity, Notes, Invoices, Email)
- [ ] Panel shows contact name at top
- [ ] Can scroll through contact data in panel
- [ ] Press ESC key - panel closes
- [ ] Click overlay - panel closes
- **Expected**: Smooth sliding animation, all tabs load contact data

### Feature 2: Password Reset Flow ✓
- [ ] Go to login page
- [ ] Click "Forgot Password" link
- [ ] Enter valid email address
- [ ] Submit form
- [ ] Check email for password reset link
- [ ] Click link (should redirect to password reset page)
- [ ] Enter new password
- [ ] Submit - redirected to login
- [ ] Login with new password
- **Expected**: Email received, reset works, can login with new password

### Feature 3: Mobile Responsive Design ✓
- [ ] Open app on iPhone/Android (or use Chrome DevTools mobile emulation)
- [ ] See bottom navigation bar with 5 tabs (Home, People, Money, Follow-ups, Settings)
- [ ] Desktop sidebar is hidden
- [ ] See floating + button for quick add
- [ ] Tap each tab to navigate
- [ ] Go to desktop - see sidebar instead of bottom nav
- [ ] Resize browser - layout changes at md: breakpoint
- **Expected**: Full functionality on mobile, responsive layout switching

### Feature 4: Quick Add Contact Modal ✓
- [ ] Click + button (mobile or desktop)
- [ ] Modal appears with contact form
- [ ] Try submit without name - error shown
- [ ] Try submit without phone - error shown
- [ ] Enter name: "Test Contact"
- [ ] Enter phone: "+1234567890"
- [ ] Select a pipeline stage (if available)
- [ ] Select a tag (if available)
- [ ] Click "Add Contact"
- [ ] Modal closes, contact appears in list
- **Expected**: Validation works, contact created, modal closes

### Feature 5: Intent Badges ✓
- [ ] Open any contact detail
- [ ] Scroll to "Sales Intent" section
- [ ] See 4 badge buttons: 🔥 Hot, 💬 Talking, 🤔 Considering, ❄️ Cold
- [ ] Click "Hot" badge
- [ ] Badge highlights/fills
- [ ] Go to Kanban board - see badge on contact card (top-left corner)
- [ ] Click different badge - updates
- [ ] Refresh page - badge persists
- [ ] Click badge again - toggles off
- **Expected**: Badges save to database, appear on Kanban cards, persist across refresh

### Feature 6: Overdue Indicators ✓
- [ ] Go to Kanban board
- [ ] Look at contact cards
- [ ] Find a contact with red dot (🔴) indicator
- [ ] Hover over red dot - tooltip shows "No activity in X days"
- [ ] Only appears on contacts with >48h inactivity
- [ ] Create activity on that contact
- [ ] Red dot disappears
- **Expected**: Red dot appears for inactive contacts, disappears when activity logged

### Feature 7: Drag-to-Reorder Pipeline Stages ✓
- [ ] Go to Settings → Pipeline tab
- [ ] See list of pipeline stages
- [ ] Each stage has drag handle (⋮⋮) on left
- [ ] Click and drag a stage up/down
- [ ] Stage reorders in real-time
- [ ] Refresh page - order persists
- [ ] Click + Add Stage
- [ ] Enter stage name and pick color
- [ ] New stage appears in list
- [ ] Go to Kanban - new stage appears as column
- [ ] Click X on a stage - delete confirmation
- [ ] Delete a stage - it's removed from Kanban
- **Expected**: Full drag-drop reordering, CRUD operations work, persists on refresh

### Feature 8: Paystack Payment Links ✓
- [ ] Create a new invoice or open existing
- [ ] Fill invoice details (amount, description, etc.)
- [ ] Save invoice
- [ ] Click "Generate Payment Link" button
- [ ] Payment link generated (modal or notification appears)
- [ ] Link includes invoice ID: `INV-{invoiceId}`
- [ ] Share link with customer (or test in browser if test key)
- [ ] Customer completes payment
- [ ] Invoice status updates to PAID
- [ ] Activity log shows payment received
- **Expected**: Payment link generated with Paystack format, invoice status updates on payment

### Feature 9: Global Search (CMD+K) ✓
- [ ] From any page, press **CMD+K** (Mac) or **CTRL+K** (Windows)
- [ ] Search dialog appears with input field
- [ ] Type "test" (search term)
- [ ] Results appear (contacts, invoices, tasks containing "test")
- [ ] Results show type labels: "Contact", "Invoice", "Task"
- [ ] Click a result - navigated to that resource
- [ ] Search dialog closes
- [ ] Press CMD+K again - dialog reopens
- [ ] Press ESC - dialog closes
- [ ] Try search with <2 characters - no results
- **Expected**: Fast search with keyboard shortcut, proper filtering, navigation works

### Feature 10: Email Digest & Push Notifications ✓
**Email Digest**:
- [ ] Go to Settings → Notifications
- [ ] See email digest configuration options
- [ ] Configure daily digest email
- [ ] (In production, set up cron job to call `/api/notifications/send-digest`)
- [ ] Email sent daily with contact stats
- **Expected**: Configuration accessible, digest endpoint responsive

**Push Notifications**:
- [ ] Go to Settings → Push Notifications
- [ ] Click "Enable Notifications"
- [ ] Browser permission prompt appears
- [ ] Allow notifications
- [ ] Subscription saved
- [ ] Make a change (create contact, update invoice)
- [ ] Browser receives notification
- **Expected**: Subscription works, notifications deliverable

---

## API Verification Tests

### Test Contact Details API (Feature 1)
```bash
curl -X GET http://localhost:3000/api/contacts/[contact-id]/details \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```
**Expected Response**: Contact with activities, notes, invoices, emails

### Test Intent Badge API (Feature 5)
```bash
curl -X PATCH http://localhost:3000/api/contacts/[contact-id]/intent-badge \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"intentBadge": "HOT"}'
```
**Expected**: 200 OK, contact returned with updated intentBadge

### Test Pipeline Stages API (Feature 7)
```bash
curl -X GET http://localhost:3000/api/kanban/stages \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```
**Expected**: 200 OK, array of stages with id, name, color, position

### Test Search API (Feature 9)
```bash
curl -X GET "http://localhost:3000/api/search?q=test" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```
**Expected**: 200 OK, results array with contacts, invoices, tasks

### Test Paystack Webhook (Feature 8)
```bash
# In Paystack test dashboard, trigger test webhook
# Or send manual test:
curl -X POST http://localhost:3000/api/webhooks/paystack \
  -H "Content-Type: application/json" \
  -H "x-paystack-signature: YOUR_SIGNATURE" \
  -d '{
    "event": "charge.success",
    "data": {
      "reference": "INV-123456",
      "amount": 50000
    }
  }'
```
**Expected**: 200 OK, invoice updated to PAID status

---

## Database Verification

### Check Contact with Intent Badge
```bash
npx prisma studio
# Navigate to Contact model
# Find a contact
# Verify intentBadge field has value (HOT/TALKING/CONSIDERING/COLD)
```

### Check Pipeline Stages
```bash
npx prisma studio
# Navigate to KanbanStage model
# Verify stages exist with position field
# Verify they're ordered by position
```

### Check Invoice Status
```bash
npx prisma studio
# Navigate to Invoice model
# Find an invoice
# Verify status field has value (DRAFT/SENT/PAID/OVERDUE)
# Verify paidAt is set for PAID invoices
```

---

## Performance Tests

### Feature 1: Panel Load Time
- [ ] Open contact panel
- [ ] Check browser DevTools Network tab
- [ ] `/api/contacts/[id]/details` call completes in <500ms
- **Expected**: Fast load, no waterfall requests

### Feature 9: Search Response Time
- [ ] Type in search box
- [ ] Observe debounce delay (should be ~300ms)
- [ ] Results load in <1s
- **Expected**: Debounce prevents spam, fast response

### Feature 7: Drag-Drop Performance
- [ ] Drag a stage
- [ ] Observe smooth animation
- [ ] No lag or stuttering
- **Expected**: 60fps animation, no jank

---

## Error Handling Tests

### Test Missing Environment Variables
- [ ] Remove `PAYSTACK_SECRET_KEY` from `.env.local`
- [ ] Try to generate payment link
- **Expected**: User-friendly error message, no crashes

### Test Invalid Token
```bash
curl -X GET http://localhost:3000/api/contacts \
  -H "Authorization: Bearer invalid_token"
```
**Expected**: 401 Unauthorized response

### Test Non-Existent Contact
```bash
curl -X GET http://localhost:3000/api/contacts/invalid-id/details \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```
**Expected**: 404 Not Found response

---

## Mobile-Specific Tests

- [ ] Bottom nav visible on mobile
- [ ] Quick add modal works on mobile
- [ ] Search dialog full-screen on mobile
- [ ] Contact panel spans full width on mobile
- [ ] Touch gestures work (swipe, tap)
- [ ] Forms responsive on small screens
- [ ] No horizontal scrolling

---

## Responsive Breakpoint Tests

- [ ] Resize to 320px - mobile layout
- [ ] Resize to 768px - tablet layout  
- [ ] Resize to 1024px - desktop layout
- [ ] Sidebar hidden until 768px
- [ ] Bottom nav hidden above 768px
- [ ] All features work at each breakpoint

---

## Browser Compatibility Tests

- [ ] Chrome/Edge (Windows)
- [ ] Safari (Mac)
- [ ] Firefox (all)
- [ ] Mobile browsers (iOS Safari, Chrome Mobile)
- [ ] No console errors in DevTools

---

## Final Production Checklist

- [ ] All 10 features verified working
- [ ] All API endpoints respond correctly
- [ ] Database queries fast (<500ms)
- [ ] No TypeScript errors: `npx tsc --noEmit`
- [ ] Build succeeds: `npm run build`
- [ ] All pages load without errors
- [ ] No 404s or missing resources
- [ ] Mobile and desktop layouts work
- [ ] Authentication working
- [ ] Error handling proper
- [ ] Performance acceptable
- [ ] Ready for production deployment

---

## Troubleshooting

**Feature not working?**
1. Check browser console (F12) for errors
2. Check terminal for server errors
3. Verify `.env.local` has required variables
4. Run `npx tsc --noEmit` to check TypeScript
5. Try rebuilding: `npm run build`

**API returning 401?**
- Verify JWT token in Authorization header
- Check Supabase auth is working
- Verify user has workspace access

**Database values not persisting?**
- Check migrations ran: `npx prisma migrate deploy`
- Verify database connection in `.env.local`
- Check database is running
- Use `npx prisma studio` to inspect data directly

**Build failing?**
```bash
rm -rf .next node_modules
npm install
npm run build
```

---

## Sign-Off

Once all tests pass, SimplyCRM is verified production-ready:

- [ ] All 10 features tested and working
- [ ] APIs responding correctly
- [ ] Database operations confirmed
- [ ] Mobile and desktop layouts verified
- [ ] Error handling tested
- [ ] Build succeeds
- [ ] Ready for production deployment ✅

**Date Verified**: ________________  
**Verified By**: ________________

