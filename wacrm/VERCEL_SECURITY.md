/**
 * VERCEL SECURITY BEST PRACTICES
 * 
 * Checklist and guidelines for securing your CRM on Vercel
 */

// ============================================================================
// 1. ENVIRONMENT VARIABLES SECURITY
// ============================================================================

/*
VERCEL DASHBOARD SETUP:
1. Go to Project Settings > Environment Variables
2. Add all required variables

Variables to add:
  Production:
    - DATABASE_URL (Supabase pooled connection)
    - SUPABASE_SERVICE_ROLE_KEY
    - STRIPE_SECRET_KEY
    - NEXTAUTH_SECRET
    - CRON_SECRET
    - All other sensitive keys

  Development:
    - Same as production

  Preview (for PR previews):
    - Can use staging instances

IMPORTANT:
- Mark sensitive variables as "Sensitive" to prevent preview logs
- Rotate secrets monthly: NEXTAUTH_SECRET, CRON_SECRET
- Review access logs regularly
- Use different secrets for staging/production

*/

// ============================================================================
// 2. DEPLOYMENT PROTECTION
// ============================================================================

/*
VERCEL PROJECT SETTINGS:
1. Domains > Add custom domain > Enable SSL (automatic)
2. Git > Deployments from production only
3. Source Control > Required checks before deploy:
   - Enable Git branch protection
   - Require status checks (tests pass)

BRANCH PROTECTION (in GitHub):
1. Go to Repo > Settings > Branches
2. Add rule for 'main' branch:
   - Require pull request reviews (≥2 reviewers)
   - Dismiss stale approvals
   - Require status checks to pass
   - Include administrators in restrictions

*/

// ============================================================================
// 3. BUILD SECURITY
// ============================================================================

/*
VERCEL BUILD SETTINGS:
1. Build & Development Settings:
   - Build command: npm run build
   - Output directory: .next
   - Install command: npm ci (not npm install)
   - Disable zero-downtime deployments if using sticky sessions

2. Ignore Build Step:
   - Set to deploy even if build fails (caution!)
   - Better: Fix build issues before deploying

3. Root Directory:
   - Set to ./wacrm if using monorepo structure

4. Environment variables in build:
   - Mark as "Sensitive" if contains secrets
   - Will be excluded from logs

*/

// ============================================================================
// 4. MONITORING & LOGGING
// ============================================================================

/*
VERCEL ANALYTICS:
1. Enable Web Analytics:
   - Vercel Dashboard > Analytics
   - Tracks performance metrics
   - Can identify suspicious patterns

2. Function Logs:
   - Monitor /api/* logs for errors
   - Set up alerts for 500 errors
   - Review 401/403 patterns

3. External Monitoring Setup:
   - Use Sentry for error tracking
   - Use LogRocket for user session replay (optional)
   - Monitor database performance in Supabase

CRITICAL LOGS TO MONITOR:
- Failed authentication attempts
- Unauthorized access (401/403)
- Rate limit hits (429)
- Database connection failures
- Third-party payment failures

*/

// ============================================================================
// 5. SERVERLESS FUNCTION SECURITY
// ============================================================================

/*
API ROUTE SECURITY:
1. Authentication checks on every route:
   - Verify session before processing
   - Check workspace access
   - Validate user roles

2. Input validation:
   - Use Zod for schema validation
   - Sanitize all user input
   - Limit request body size

3. Rate limiting:
   - Enable on sensitive endpoints: auth, payments, exports
   - Consider using Upstash Redis (already in your deps)
   - Set limits: auth=5/min, general=100/min

4. Timeout handling:
   - Vercel serverless: 60s default, 900s max
   - Return error instead of timeout
   - Implement graceful shutdown

5. CORS policy:
   - Only allow requests from your domain
   - Not * in production

*/

// ============================================================================
// 6. SECRET ROTATION
// ============================================================================

/*
AUTOMATIC ROTATION SCHEDULE:
1. NEXTAUTH_SECRET: Rotate monthly
   - Generate new: openssl rand -base64 32
   - Update in Vercel Environment Variables
   - Existing sessions remain valid

2. CRON_SECRET: Rotate quarterly
   - Generate new: openssl rand -base64 32
   - Update scheduled job secret

3. API Keys: On compromise or quarterly
   - Stripe: Regenerate webhook endpoint secret
   - Razorpay: Rotate API keys
   - Resend: Generate new API key if exposed

4. Database credentials: On compromise
   - Use Supabase password reset
   - Verify connection pooler settings

PROCESS:
- Update in Vercel Environment Variables
- Verify no deployments in progress
- Monitor logs for auth failures after update
- Keep old secret for 1 hour transition period

*/

// ============================================================================
// 7. PAYMENT SECURITY (Stripe/Razorpay)
// ============================================================================

/*
PCI COMPLIANCE:
1. Never handle raw credit card data (Stripe/Razorpay handles this)
2. Only handle payment tokens/IDs
3. Use HTTPS only (Vercel enforces this)

WEBHOOK SECURITY:
1. Verify webhook signatures before processing
2. Use endpoint secret for verification
3. Idempotent webhook handling (process same webhook safely twice)
4. Log all webhook events
5. Implement retry logic for failed webhook processing

TESTING:
- Use Stripe/Razorpay test keys in development
- Test in Preview deployments before production
- Verify webhook delivery in provider dashboard

REGULAR AUDITS:
- Review failed payments weekly
- Check for unusual patterns
- Alert on multiple failed attempts from same user

*/

// ============================================================================
// 8. DDoS & ABUSE PROTECTION
// ============================================================================

/*
VERCEL BUILT-IN PROTECTION:
- Global edge network protects from DDoS
- Automatic rate limiting at edge
- WAF (Web Application Firewall) at Pro+ plans

ADDITIONAL MEASURES:
1. Geographic restrictions (if needed):
   - Restrict API to specific countries
   - Implement in middleware

2. User-based rate limiting:
   - Track requests per user ID
   - Track requests per IP
   - Escalate after threshold

3. CAPTCHA (optional):
   - Add to login form if abuse detected
   - Use Cloudflare Turnstile (free)

*/

// ============================================================================
// 9. BACKUP & DISASTER RECOVERY
// ============================================================================

/*
BACKUP STRATEGY:
1. Database backups:
   - Supabase: Daily automated
   - Test restore monthly

2. Code backups:
   - Git repository is your backup
   - Regular commits to main
   - Tagged releases for major versions

3. User data exports:
   - Implement monthly export feature
   - Store in secure cloud storage (encrypted)

4. Disaster recovery plan:
   - Document recovery procedures
   - Test recovery in staging
   - Maintain RTO (Recovery Time Objective): 4 hours
   - Maintain RPO (Recovery Point Objective): 1 hour

*/

// ============================================================================
// 10. COMPLIANCE & AUDITING
// ============================================================================

/*
GDPR REQUIREMENTS:
1. Privacy Policy:
   - Clearly state what data you collect
   - Link from login/settings
   - Update annually

2. Terms of Service:
   - Define acceptable use
   - Include data deletion policy
   - Include liability limitations

3. Data Subject Rights:
   - Right to access: Export user data endpoint
   - Right to deletion: Soft delete with anonymization
   - Right to portability: Export in standard format
   - Right to rectification: Allow users to update profile

4. Consent Management:
   - Track user consent for emails/marketing
   - Respect user preferences

5. Audit Logs:
   - Log all sensitive actions (data access, modifications)
   - Retain for 90 days
   - Regular review for suspicious activity

HIPAA (if handling health data):
- Implement Business Associate Agreement (BAA)
- Encrypt data in transit and at rest
- Audit logging required
- Access controls stricter

*/

// ============================================================================
// 11. INCIDENT RESPONSE PLAN
// ============================================================================

/*
BEFORE INCIDENT:
1. Establish communication channels:
   - Incident response team
   - On-call rotation
   - Status page (use Vercel status or custom)

2. Documentation:
   - Playbooks for common incidents
   - Contact list for vendors (Supabase, Stripe, etc.)
   - Customer communication templates

DURING INCIDENT:
1. Immediate response:
   - Acknowledge the issue
   - Start incident war room (Slack channel)
   - Notify stakeholders

2. Investigation:
   - Check Vercel logs
   - Check Supabase logs
   - Review recent deployments
   - Review security logs

3. Mitigation:
   - Rollback if needed
   - Isolate affected systems
   - Implement temporary fix
   - Deploy permanent fix

AFTER INCIDENT:
1. Post-mortem:
   - Document what happened
   - Timeline of events
   - Root cause analysis

2. Prevention:
   - Implement monitoring to prevent recurrence
   - Add monitoring/alerts
   - Update security measures
   - Train team

*/

// ============================================================================
// 12. DEPLOYMENT CHECKLIST
// ============================================================================

const DEPLOYMENT_CHECKLIST = {
  preDeployment: [
    '[ ] All tests passing',
    '[ ] Build succeeds locally (npm run build)',
    '[ ] No secrets in code or .env files',
    '[ ] .env is in .gitignore',
    '[ ] Security headers configured',
    '[ ] Input validation implemented',
    '[ ] Rate limiting enabled',
    '[ ] Authentication verified',
    '[ ] CORS properly configured',
    '[ ] Database migrations tested',
    '[ ] Backup created',
    '[ ] Staging deployment tested',
    '[ ] No console.log of sensitive data',
  ],
  deployment: [
    '[ ] Environment variables set in Vercel',
    '[ ] Build and deploy initiated',
    '[ ] Monitor deployment progress',
    '[ ] Smoke tests passed',
    '[ ] Check error logs for issues',
    '[ ] Verify SSL certificate',
    '[ ] Test critical workflows',
  ],
  postDeployment: [
    '[ ] Monitor error rate for 1 hour',
    '[ ] Check database connections',
    '[ ] Verify email delivery',
    '[ ] Test payment processing',
    '[ ] Monitor API performance',
    '[ ] Check user reports in Slack',
    '[ ] Document deployment notes',
  ],
};

export default DEPLOYMENT_CHECKLIST;
