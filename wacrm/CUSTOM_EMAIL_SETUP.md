# Setting Up Custom Domain Email with Resend

## Step-by-Step Configuration

### 1. **Add Your Domain to Resend**

1. Go to [Resend Dashboard](https://resend.com/domains)
2. Click **"Add Domain"**
3. Enter your domain: `yourdomain.com` (e.g., `simplycrmtrack.com`)
4. Click **"Add Domain"**

### 2. **Configure DNS Records in GoDaddy**

Resend will give you DNS records to add. In GoDaddy:

1. Go to **GoDaddy Dashboard** → **My Products**
2. Find your domain and click **"DNS"**
3. Scroll to **"MX Records"** and delete any existing records
4. Add the MX record that Resend provides:
   - **Type**: MX
   - **Value**: (copy from Resend)
   - **Priority**: 10

5. Add the CNAME record:
   - **Type**: CNAME
   - **Name**: `default._domainkey` (or similar)
   - **Value**: (copy from Resend)

6. Add the TXT record for DKIM:
   - **Type**: TXT
   - **Name**: (copy from Resend)
   - **Value**: (copy from Resend)

7. **Save all changes**

### 3. **Verify Domain in Resend**

1. Return to Resend Dashboard
2. Your domain should show as **"Pending"**
3. Click **"Verify"**
4. Wait 5-10 minutes for DNS to propagate
5. Once verified, you'll see a **green checkmark** ✅

### 4. **Configure Your App**

Add these environment variables to your `.env.local` and `.env`:

```env
# Resend Configuration
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=noreply@yourdomain.com
NEXT_PUBLIC_APP_NAME=SimplyCRM
NEXT_PUBLIC_APP_DOMAIN=yourdomain.com
```

**Get your API key:**
- Go to Resend Dashboard → **API Keys**
- Copy your API key
- Add it to your environment variables

### 5. **Update Environment on Vercel**

1. Go to Vercel Dashboard → Your Project
2. Go to **Settings** → **Environment Variables**
3. Add/Update these variables:
   ```
   RESEND_API_KEY=re_your_api_key
   RESEND_FROM_EMAIL=noreply@yourdomain.com
   NEXT_PUBLIC_APP_NAME=SimplyCRM
   NEXT_PUBLIC_APP_DOMAIN=yourdomain.com
   ```
4. Click **Deploy** to apply changes

### 6. **Test Your Setup**

Run this in your terminal from the `wacrm` directory:

```bash
npx tsx -e "
import { sendTemplateEmail, welcomeEmailTemplate } from './src/lib/email';

(async () => {
  try {
    const html = welcomeEmailTemplate({
      recipientName: 'Your Name',
      businessName: 'SimplyCRM',
      email: 'your-email@gmail.com',
      actionUrl: 'https://yourdomain.com/dashboard'
    });
    
    const result = await sendTemplateEmail({
      to: 'your-email@gmail.com',
      subject: 'Welcome to SimplyCRM!',
      html,
      replyTo: 'support@yourdomain.com'
    });
    
    console.log('✅ Email sent successfully!', result);
  } catch (error) {
    console.error('❌ Error:', error);
  }
})();
"
```

---

## Email Templates Available

You now have **10 professional email templates** ready to use:

### 1. **Welcome Email**
```typescript
import { welcomeEmailTemplate, sendTemplateEmail } from '@/lib/email';

const html = welcomeEmailTemplate({
  recipientName: 'John',
  businessName: 'Your Business',
  email: 'user@example.com',
  actionUrl: 'https://yourdomain.com/dashboard'
});

await sendTemplateEmail({
  to: 'user@example.com',
  subject: 'Welcome to SimplyCRM! 🎉',
  html
});
```

### 2. **Email Verification**
```typescript
import { verificationEmailTemplate, sendTemplateEmail } from '@/lib/email';

const html = verificationEmailTemplate({
  recipientName: 'John',
  businessName: 'Your Business',
  email: 'user@example.com',
  verificationUrl: 'https://yourdomain.com/verify?token=xxx'
});

await sendTemplateEmail({
  to: 'user@example.com',
  subject: 'Verify Your Email Address',
  html
});
```

### 3. **Password Reset**
```typescript
import { passwordResetEmailTemplate, sendTemplateEmail } from '@/lib/email';

const html = passwordResetEmailTemplate({
  recipientName: 'John',
  resetUrl: 'https://yourdomain.com/reset-password?token=xxx'
});

await sendTemplateEmail({
  to: 'user@example.com',
  subject: 'Reset Your Password',
  html
});
```

### 4. **Team Invitation**
```typescript
import { teamInviteEmailTemplate, sendTemplateEmail } from '@/lib/email';

const html = teamInviteEmailTemplate({
  recipientName: 'John',
  businessName: 'Your Business',
  inviterName: 'Sarah',
  inviteUrl: 'https://yourdomain.com/join?invite=xxx',
  role: 'Admin'
});

await sendTemplateEmail({
  to: 'john@example.com',
  subject: 'You\'re Invited to Join SimplyCRM!',
  html
});
```

### 5. **Invoice Sent**
```typescript
import { invoiceSentEmailTemplate, sendTemplateEmail } from '@/lib/email';

const html = invoiceSentEmailTemplate({
  recipientName: 'Customer Name',
  businessName: 'Your Business',
  invoiceNumber: 'INV-001',
  amount: '₹5,000',
  dueDate: 'April 20, 2026',
  viewUrl: 'https://yourdomain.com/invoice/123'
});

await sendTemplateEmail({
  to: 'customer@example.com',
  subject: 'Invoice Sent: #INV-001',
  html
});
```

### 6. **Follow-up Reminder**
```typescript
import { followupReminderEmailTemplate, sendTemplateEmail } from '@/lib/email';

const html = followupReminderEmailTemplate({
  recipientName: 'John',
  contactName: 'Acme Corp',
  followupDate: 'April 15, 2026',
  actionUrl: 'https://yourdomain.com/contacts/123'
});

await sendTemplateEmail({
  to: 'john@example.com',
  subject: '⏰ Upcoming Follow-up Reminder',
  html
});
```

### 7. **Task Assignment**
```typescript
import { taskAssignmentEmailTemplate, sendTemplateEmail } from '@/lib/email';

const html = taskAssignmentEmailTemplate({
  recipientName: 'John',
  taskTitle: 'Follow up with Acme Corp',
  assignerName: 'Sarah',
  dueDate: 'April 12, 2026',
  taskUrl: 'https://yourdomain.com/tasks/123'
});

await sendTemplateEmail({
  to: 'john@example.com',
  subject: '🎯 New Task Assigned',
  html
});
```

### 8. **Contact Assignment**
```typescript
import { contactAssignmentEmailTemplate, sendTemplateEmail } from '@/lib/email';

const html = contactAssignmentEmailTemplate({
  recipientName: 'John',
  contactName: 'Sarah Johnson',
  assignerName: 'Admin',
  note: 'Hot lead - follow up today',
  contactUrl: 'https://yourdomain.com/contacts/123'
});

await sendTemplateEmail({
  to: 'john@example.com',
  subject: '👤 New Contact Assigned',
  html
});
```

### 9. **General Notification**
```typescript
import { notificationEmailTemplate, sendTemplateEmail } from '@/lib/email';

const html = notificationEmailTemplate({
  recipientName: 'John',
  title: '🔔 Important Update',
  message: 'Your invoice has been paid!',
  actionUrl: 'https://yourdomain.com/invoices/123',
  actionText: 'View Invoice'
});

await sendTemplateEmail({
  to: 'john@example.com',
  subject: 'Important Update',
  html
});
```

### 10. **Trial Ending Soon**
```typescript
import { trialEndingSoonEmailTemplate, sendTemplateEmail } from '@/lib/email';

const html = trialEndingSoonEmailTemplate({
  recipientName: 'John',
  businessName: 'Your Business',
  daysLeft: 3,
  upgradeUrl: 'https://yourdomain.com/pricing'
});

await sendTemplateEmail({
  to: 'john@example.com',
  subject: '⏰ Your Trial Ends in 3 Days',
  html
});
```

---

## Using Templates in Your Code

### **In API Routes:**

```typescript
// src/app/api/auth/signup/route.ts
import { welcomeEmailTemplate, sendTemplateEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  // ... your signup logic
  
  const html = welcomeEmailTemplate({
    recipientName: user.name,
    businessName: workspace.businessName,
    email: user.email,
    actionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`
  });
  
  await sendTemplateEmail({
    to: user.email,
    subject: 'Welcome to SimplyCRM! 🎉',
    html,
    replyTo: 'support@yourdomain.com'
  });
}
```

### **In Server Components:**

```typescript
// src/app/dashboard/page.tsx
import { invoiceSentEmailTemplate, sendTemplateEmail } from '@/lib/email';

export default async function DashboardPage() {
  // ... your component logic
  
  // Send invoice email
  const html = invoiceSentEmailTemplate({
    recipientName: contact.name,
    businessName: workspace.businessName,
    invoiceNumber: invoice.number,
    amount: `₹${invoice.total}`,
    dueDate: invoice.dueDate.toLocaleDateString(),
    viewUrl: `${process.env.NEXT_PUBLIC_APP_URL}/invoices/${invoice.id}`
  });
  
  await sendTemplateEmail({
    to: contact.email,
    subject: `Invoice Sent: #${invoice.number}`,
    html
  });
}
```

---

## Troubleshooting

### **Email Not Sending?**

1. **Check Resend API Key**
   - Verify `RESEND_API_KEY` is correct in environment variables
   - Make sure it starts with `re_`

2. **Verify Domain is Active**
   - In Resend Dashboard, domain should show ✅ verified
   - DNS records should be properly propagated (wait up to 24 hours)

3. **Check Email Address**
   - Make sure inbox is not in spam
   - Check Resend Dashboard → Emails to see delivery status

4. **Check Logs**
   ```bash
   # View function logs in Vercel
   vercel logs
   ```

### **Domain Shows as Pending?**

- Wait 5-15 minutes for DNS propagation
- Check GoDaddy DNS records are correct
- Clear DNS cache: `ipconfig /flushdns` (Windows) or `sudo dscacheutil -flushcache` (Mac)

### **Customizing Templates**

Edit `/wacrm/src/lib/email-templates.ts` to:
- Change colors (currently using `#1a7f64` and `#15634f`)
- Update logo/branding
- Modify layouts
- Add new template types

---

## Next Steps

1. ✅ Configure your domain in Resend
2. ✅ Add DNS records to GoDaddy
3. ✅ Set environment variables
4. ✅ Test email sending
5. ✅ Integrate templates into your signup/notifications

You're all set! Your emails will now be sent from your professional domain with beautiful formatting! 🚀
