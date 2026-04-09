# 🔒 SECURITY SETUP FOR VERCEL DEPLOYMENT

Complete security checklist and setup guide for your CRM on Vercel with Supabase.

## ✅ Pre-Deployment Checklist

### Step 1: Environment Variables Setup

**In your Vercel Dashboard:**
1. Go to Project Settings > Environment Variables
2. Add these variables **(mark as Sensitive)**:

```
Production & Preview:
- DATABASE_URL (Supabase pooled connection)
- SUPABASE_SERVICE_ROLE_KEY
- NEXTAUTH_SECRET (generate: openssl rand -base64 32)
- NEXTAUTH_URL
- CRON_SECRET (generate: openssl rand -base64 32)
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- RAZORPAY_SECRET_KEY
- RESEND_API_KEY
- UPSTASH_REDIS_REST_URL
- UPSTASH_REDIS_REST_TOKEN
```

**Never commit:**
- .env files
- Real API keys
- Database passwords
- Webhook secrets

### Step 2: Supabase Database Security

**Configure in Supabase Dashboard:**

1. **Enable SSL on database connection:**
   - Add `?sslmode=require` to DATABASE_URL

2. **Use connection pooling for serverless:**
   - Enable at: Project Settings > Database > Connection Pooling
   - Use pooler connection: `db.xxx.supabase.co:6543`

3. **Change default password:**
   - Project Settings > Database > Reset Password
   - Set strong password (25+ characters)

4. **Enable Row Level Security (RLS):**
   ```sql
   -- Example for contacts table
   ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
   
   -- Users can see contacts in their workspace only
   CREATE POLICY contacts_workspace_access
   ON contacts FOR SELECT
   USING (workspace_id = user_workspace_id());
   
   -- Only assigned user or admins can update
   CREATE POLICY contacts_update_policy
   ON contacts FOR UPDATE
   USING (assigned_to_id = auth.uid()::uuid OR is_admin());
   ```

5. **Create database role for application:**
   ```sql
   CREATE USER crm_user WITH PASSWORD 'strong-password-here';
   GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO crm_user;
   GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO crm_user;
   ```

### Step 3: Authentication Security

**Supabase Auth Configuration:**

1. Go to Authentication > Providers > Email
2. Enable: "Email verification before sign-in"
3. Set password requirements: Minimum 12 characters
4. Configure redirect URLs:
   - Production: `https://yourdomain.com/auth/callback`
   - Dev: `http://localhost:3000/auth/callback`

**NextAuth Configuration:**
- Already using Supabase as provider ✓
- Generate secrets with: `openssl rand -base64 32`
- Rotate NEXTAUTH_SECRET monthly

### Step 4: API Security

**Enable in your code:**

1. **Use the new security utilities:**
   ```typescript
   // src/lib/api-auth.ts - Auth context helpers
   // src/lib/security.ts - Input validation & headers
   
   import { withAuth } from '@/lib/api-auth';
   export const GET = withAuth(async (req, auth) => {
     // Your handler with guaranteed auth
   });
   ```

2. **Enable rate limiting:**
   - Set `UPSTASH_REDIS_REST_URL` and token in Vercel
   - Routes automatically rate limited based on type

3. **Input validation:**
   ```typescript
   import { z } from 'zod';
   
   const schema = z.object({
     email: z.string().email(),
     name: z.string().min(1).max(100),
   });
   ```

### Step 5: Payment Security (Stripe/Razorpay)

**Webhook verification:**

1. Store webhook secrets in Vercel Environment Variables
2. Verify signatures before processing:
   ```typescript
   import { verifyWebhookSignature } from '@/lib/security';
   
   const isValid = await verifyWebhookSignature(
     JSON.stringify(body),
     signature,
     webhookSecret,
     'stripe' // or 'razorpay'
   );
   ```

3. Set webhook URLs in provider dashboards:
   - Stripe: `https://yourdomain.com/api/webhooks/stripe`
   - Razorpay: `https://yourdomain.com/api/webhooks/razorpay`

### Step 6: Cron Job Security

**Protect scheduled jobs:**

1. Generate CRON_SECRET: `openssl rand -base64 32`
2. Set in Vercel Environment Variables
3. Verify in routes:
   ```typescript
   import { verifyCronSecret } from '@/lib/api-auth';
   
   if (!verifyCronSecret(req)) {
     return unauthorizedResponse();
   }
   ```

4. Configure in vercel.json (already done ✓):
   ```json
   {
     "crons": [{
       "path": "/api/cron/trial-expiry",
       "schedule": "0 8 * * *"
     }]
   }
   ```

### Step 7: CORS & Headers

**Already configured in vercel.json** ✓

Security headers applied to all `/api/*` routes:
- `X-Content-Type-Options: nosniff` - Prevent MIME sniffing
- `X-Frame-Options: SAMEORIGIN` - Prevent clickjacking
- `X-XSS-Protection: 1; mode=block` - Enable XSS filter
- `Referrer-Policy: strict-origin-when-cross-origin` - Control referrer info

### Step 8: Backup & Disaster Recovery

**Supabase Backups:**

1. Enable automated daily backups:
   - Project Settings > Backups
   - Set retention to 7+ days
   - Test restore monthly

2. Create manual backup before each major deployment:
   - Dashboard > Backups > Backup now

3. Export critical data monthly:
   - Store in encrypted cloud storage

### Step 9: Monitoring & Logging

**Set up monitoring:**

1. **Vercel Analytics:**
   - Dashboard > Analytics > Enable Web Analytics
   - Monitor performance metrics

2. **Error tracking (optional):**
   - Install Sentry: `npm install @sentry/nextjs`
   - Monitor 404/500 errors

3. **Database monitoring:**
   - Supabase > Database > Query Performance
   - Alert on slow queries (>1s)

4. **Alert on suspicious activity:**
   - Multiple failed logins
   - Unusual API access patterns
   - Rate limit breaches

### Step 10: Deployment & Testing

**Before pushing to production:**

1. ✅ All tests passing
2. ✅ Build succeeds locally: `npm run build`
3. ✅ No console.log of sensitive data
4. ✅ .env file in .gitignore
5. ✅ Database migrations tested
6. ✅ Backup created
7. ✅ Staging deployment tested

**After deployment:**

1. Monitor error rate for 1 hour
2. Verify email delivery working
3. Test payment processing
4. Check API response times
5. Monitor database connections
6. Review access logs for anomalies

## 🚀 Deployment Commands

```bash
# Install dependencies securely
npm ci

# Build and test
npm run build

# Verify no secrets in code
grep -r "sk_" src/ # Should find nothing
grep -r "password" .env* # Should find nothing in .env

# Deploy to Vercel (after git push)
# Vercel auto-deploys from main branch
```

## 🔑 Secret Rotation Schedule

- **Monthly:** `NEXTAUTH_SECRET`, `CRON_SECRET`
- **Quarterly:** API keys from integrations
- **On compromise:** Immediately rotate all related keys
- **Annually:** Review and audit all security measures

## 📋 Security Documentation Files

Your security setup includes:
- `src/lib/env-validation.ts` - Environment variable validation
- `src/lib/security.ts` - Security utilities (headers, validation, webhooks)
- `src/lib/api-auth.ts` - API authentication & authorization
- `src/lib/rate-limit.ts` - Rate limiting (Upstash Redis or memory)
- `.env.example` - Template for environment variables
- `vercel.json` - Security headers & build config
- `SUPABASE_SECURITY.md` - Supabase-specific security
- `VERCEL_SECURITY.md` - Vercel deployment security

## 🆘 Incident Response

If you suspect a security breach:

1. **Immediate actions:**
   - Check Vercel logs for unauthorized access
   - Review Supabase activity logs
   - Check payment provider dashboards

2. **Mitigation:**
   - Rotate all API keys immediately
   - Review and revoke suspicious sessions
   - Deploy security patches

3. **Investigation:**
   - Export logs for analysis
   - Check git history for leaks
   - Review database access patterns

4. **Communication:**
   - Notify affected users
   - Update status page
   - Document incident details

## 📞 Support Resources

- **Supabase Security:** https://supabase.com/docs/guides/auth
- **Vercel Security:** https://vercel.com/docs/security
- **OWASP Guide:** https://owasp.org/www-project-top-ten/
- **Next.js Security:** https://nextjs.org/docs/basic-features/built-in-security

---

**Last Updated:** April 9, 2026
**Status:** Ready for Production Deployment
