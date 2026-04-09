// src/app/api/notifications/subscribe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';

// Store push subscriptions (in production, use a database)
const pushSubscriptions = new Map<string, PushSubscription>();

interface PushSubscription {
  userId: string;
  endpoint: string;
  auth: string;
  p256dh: string;
}

export async function POST(request: NextRequest) {
  try {
    const { dbUser } = await getAuthenticatedUser();
    const { subscription, action } = await request.json();

    if (action === 'subscribe') {
      if (!subscription?.endpoint) {
        return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
      }

      // Store the subscription
      pushSubscriptions.set(dbUser.id, {
        userId: dbUser.id,
        endpoint: subscription.endpoint,
        auth: subscription.keys.auth,
        p256dh: subscription.keys.p256dh,
      });

      return NextResponse.json({ success: true });
    } else if (action === 'unsubscribe') {
      pushSubscriptions.delete(dbUser.id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error handling push subscription:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Send push notifications
export async function PUT(request: NextRequest) {
  try {
    const { userId, title, body, icon } = await request.json();

    const subscription = pushSubscriptions.get(userId);
    if (!subscription) {
      return NextResponse.json({ error: 'User not subscribed' }, { status: 404 });
    }

    // Send push notification (would use web-push library in production)
    console.log(`Sending notification to ${userId}: ${title}`);
    
    // Example with web-push:
    // const webpush = require('web-push');
    // await webpush.sendNotification(subscription, JSON.stringify({
    //   title,
    //   body,
    //   icon: icon || '/icon.png',
    //   badge: '/badge.png',
    //   tag: 'notification',
    //   requireInteraction: true,
    // }));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending push notification:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
