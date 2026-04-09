// src/app/api/stripe/checkout/route.ts
// Now using Razorpay instead of Stripe
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { z } from 'zod';
import { createRazorpayOrder, RAZORPAY_PLANS, verifyRazorpaySignature } from '@/lib/razorpay';

const schema = z.object({
  plan: z.enum(['STARTER', 'PRO']),
});

const verifySchema = z.object({
  orderId: z.string(),
  paymentId: z.string(),
  signature: z.string(),
  plan: z.enum(['STARTER', 'PRO']),
});

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dbUser = await db.user.findUnique({
      where: { supabaseId: user.id },
      include: { workspace: true },
    });
    if (!dbUser || !['OWNER', 'ADMIN'].includes(dbUser.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const planData = RAZORPAY_PLANS[parsed.data.plan];

    // Create Razorpay order
    const order = await createRazorpayOrder(
      dbUser.workspaceId,
      dbUser.id,
      dbUser.email,
      dbUser.name || 'User',
      parsed.data.plan
    );

    return NextResponse.json({
      orderId: order.id,
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount: planData.amount,
      currency: 'INR',
      description: planData.description,
      plan: parsed.data.plan,
      prefill: {
        name: dbUser.name || '',
        email: dbUser.email || '',
        contact: dbUser.phoneNumber || undefined,
      },
    });
  } catch (error) {
    console.error('Razorpay checkout error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Checkout failed' },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dbUser = await db.user.findUnique({
      where: { supabaseId: user.id },
      include: { workspace: true },
    });
    if (!dbUser || !['OWNER', 'ADMIN'].includes(dbUser.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const parsed = verifySchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

    const { orderId, paymentId, signature, plan } = parsed.data;

    // Verify the signature
    const isValid = verifyRazorpaySignature(orderId, paymentId, signature);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });
    }

    // Update workspace with payment info
    await db.workspace.update({
      where: { id: dbUser.workspaceId },
      data: {
        stripeSubscriptionId: paymentId, // Reusing this field to store Razorpay payment ID
        plan: plan,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Payment verified and plan activated',
      paymentId,
      plan,
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Verification failed' },
      { status: 500 }
    );
  }
}
