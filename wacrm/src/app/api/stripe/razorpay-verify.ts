// Temporarily placed here - should be moved to src/app/api/razorpay/verify/route.ts
// This is a workaround for Windows PowerShell directory creation limitations

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { verifyRazorpaySignature } from '@/lib/razorpay';

const schema = z.object({
  orderId: z.string(),
  paymentId: z.string(),
  signature: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUser = await db.user.findUnique({
      where: { supabaseId: user.id },
      include: { workspace: true },
    });

    if (!dbUser || !dbUser.workspace) {
      return NextResponse.json({ error: 'No workspace found' }, { status: 400 });
    }

    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const { orderId, paymentId, signature } = parsed.data;

    // Verify the signature
    const isValid = verifyRazorpaySignature(orderId, paymentId, signature);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 });
    }

    // Update workspace with payment info
    // In a real implementation, you'd also fetch the order amount from Razorpay API
    // and create/update a subscription record
    await db.workspace.update({
      where: { id: dbUser.workspace.id },
      data: {
        stripeSubscriptionId: paymentId, // Reusing this field to store Razorpay payment ID
        plan: 'STARTER', // You'd determine this from the order metadata
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Payment verified and plan activated',
      paymentId,
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Verification failed' },
      { status: 500 }
    );
  }
}
