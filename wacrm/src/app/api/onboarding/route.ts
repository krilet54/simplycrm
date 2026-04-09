// src/app/api/onboarding/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { checkRateLimit } from '@/lib/rate-limit';
import { z } from 'zod';

const schema = z.object({
  businessName:  z.string().min(1).max(100),
  ownerName:     z.string().min(1).max(100),
  phoneNumberId: z.string().optional(),
  accessToken:   z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    // Strict rate limiting for onboarding
    const rateLimitResponse = await checkRateLimit(req, 'auth');
    if (rateLimitResponse) return rateLimitResponse;

    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Prevent duplicate onboarding
    const existing = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (existing) return NextResponse.json({ error: 'Already onboarded' }, { status: 409 });

    let requestBody: unknown;
    try {
      requestBody = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request payload' }, { status: 400 });
    }

    const parsed = schema.safeParse(requestBody);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const { businessName, ownerName } = parsed.data;
    const email = user.email ?? (typeof user.user_metadata?.email === 'string' ? user.user_metadata.email : null);

    if (!email) {
      return NextResponse.json({ error: 'No email found for this account' }, { status: 400 });
    }

    // Create workspace + owner in a transaction
    const workspace = await db.workspace.create({
      data: {
        businessName,
        plan: 'TRIAL',
        trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      },
    });

    await db.user.create({
      data: {
        workspaceId: workspace.id,
        supabaseId: user.id,
        name: ownerName,
        email,
        role: 'OWNER',
      },
    });

    // Seed default kanban stages
    const stages = [
      { name: 'New Lead', color: '#6366f1', position: 0, isDefault: true },
      { name: 'In Discussion', color: '#f59e0b', position: 1 },
      { name: 'Invoice Sent', color: '#3b82f6', position: 2 },
      { name: 'Closed Won', color: '#22c55e', position: 3 },
      { name: 'Closed Lost', color: '#ef4444', position: 4 },
    ];

    await db.kanbanStage.createMany({
      data: stages.map((s) => ({ ...s, workspaceId: workspace.id })),
    });

    // Seed default quick replies
    await db.quickReply.createMany({
      data: [
        { workspaceId: workspace.id, shortcut: '/hello', title: 'Greeting', content: 'Hi! Thanks for reaching out. How can I help you today? 😊' },
        { workspaceId: workspace.id, shortcut: '/hours', title: 'Business Hours', content: 'We are open Mon–Fri, 9am–6pm. We reply within 1 hour during business hours.' },
        { workspaceId: workspace.id, shortcut: '/thanks', title: 'Thank You', content: "Thank you for your business! 🙏 Don't hesitate to reach out if you need anything." },
      ],
    });

    // Seed default tags
    await db.tag.createMany({
      data: [
        { workspaceId: workspace.id, name: 'VIP', color: '#f59e0b' },
        { workspaceId: workspace.id, name: 'Supplier', color: '#6366f1' },
        { workspaceId: workspace.id, name: 'Pending Payment', color: '#ef4444' },
      ],
    });

    return NextResponse.json({ workspace }, { status: 201 });
  } catch (error) {
    console.error('Onboarding API failed:', error);
    return NextResponse.json({ error: 'Failed to create workspace. Please try again.' }, { status: 500 });
  }
}
