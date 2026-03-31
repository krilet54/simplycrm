// src/app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' });

const PRICE_TO_PLAN: Record<string, 'STARTER' | 'PRO'> = {
  [process.env.STRIPE_STARTER_PRICE_ID ?? '']: 'STARTER',
  [process.env.STRIPE_PRO_PRICE_ID ?? '']:     'PRO',
};

export async function POST(req: NextRequest) {
  const body      = await req.text();
  const signature = req.headers.get('stripe-signature') ?? '';

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return new NextResponse(`Webhook Error: ${(err as Error).message}`, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const workspaceId = session.metadata?.workspaceId;
      if (!workspaceId) break;

      await db.workspace.update({
        where: { id: workspaceId },
        data: {
          stripeCustomerId:     session.customer as string,
          stripeSubscriptionId: session.subscription as string,
        },
      });
      break;
    }

    case 'customer.subscription.updated':
    case 'customer.subscription.created': {
      const sub = event.data.object as Stripe.Subscription;
      const priceId = sub.items.data[0]?.price.id;
      const plan = PRICE_TO_PLAN[priceId] ?? 'STARTER';

      await db.workspace.updateMany({
        where: { stripeSubscriptionId: sub.id },
        data: { plan, stripePriceId: priceId },
      });
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      await db.workspace.updateMany({
        where: { stripeSubscriptionId: sub.id },
        data: { plan: 'TRIAL', stripeSubscriptionId: null },
      });
      break;
    }
  }

  return NextResponse.json({ received: true });
}
