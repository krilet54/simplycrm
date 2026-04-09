import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { markNotificationAsRead, markAllNotificationsAsRead, getUnreadNotificationCount, setBroadcastFunction } from "@/lib/notifications";

// Store active SSE clients by userId
const sseClients = new Map<string, Set<ReadableStreamDefaultController<Uint8Array>>>();

// Broadcast helper used by this route and injected into notifications library
function broadcastToUser(userId: string, notification: any) {
  const clients = sseClients.get(userId);
  if (!clients || clients.size === 0) return;

  const encoder = new TextEncoder();
  const data = encoder.encode(
    `data: ${JSON.stringify({ 
      type: 'NOTIFICATION',
      notification,
      timestamp: new Date().toISOString(),
    })}\n\n`
  );

  clients.forEach((controller) => {
    try {
      controller.enqueue(data);
    } catch (e) {
      console.error('Error sending to SSE client:', e);
      clients.delete(controller);
    }
  });
}

function broadcastToUsers(userIds: string[], notification: any) {
  userIds.forEach(userId => broadcastToUser(userId, notification));
}

// Register the broadcast function in notifications library
setBroadcastFunction(broadcastToUser);

async function getUser() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return db.user.findUnique({ where: { supabaseId: user.id } });
}

export async function GET(request: NextRequest) {
  try {
    const dbUser = await getUser();
    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    // SSE Stream for real-time notifications
    if (action === "stream") {
      return handleSSEStream(request, dbUser);
    }

    if (action === "count") {
      // Get unread notification count
      const count = await getUnreadNotificationCount(dbUser.workspaceId, dbUser.id);
      return NextResponse.json({ unreadCount: count });
    }

    // Default: Get unread notifications
    const notifications = await db.notification.findMany({
      where: {
        workspaceId: dbUser.workspaceId,
        userId: dbUser.id,
        isRead: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 20,
    });

    return NextResponse.json({ notifications });
  } catch (error: any) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

// SSE Stream handler for real-time updates
function handleSSEStream(request: NextRequest, dbUser: any) {
  const userId = dbUser.id;
  const encoder = new TextEncoder();
  let lastNotificationId = '';

  const stream = new ReadableStream({
    async start(controller) {
      // Register this client
      if (!sseClients.has(userId)) {
        sseClients.set(userId, new Set());
      }
      sseClients.get(userId)!.add(controller);

      console.log(`✅ SSE Client connected for user ${userId}`);

      // Send initial connection message
      try {
        controller.enqueue(
          encoder.encode(`:connected\n\n`)
        );
      } catch (e) {
        console.error('Error sending connection message:', e);
      }

      // Send existing unread notifications on connect
      try {
        const notifications = await db.notification.findMany({
          where: {
            userId,
            isRead: false,
          },
          orderBy: { createdAt: 'desc' },
          take: 20,
        });

        if (notifications.length > 0) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ 
                type: 'INITIAL_NOTIFICATIONS',
                notifications,
                count: notifications.length,
              })}\n\n`
            )
          );
          lastNotificationId = notifications[0]?.id || '';
        }
      } catch (e) {
        console.error('Error fetching initial notifications:', e);
      }

      // Poll for new notifications every 2 seconds as fallback
      const pollInterval = setInterval(async () => {
        try {
          const newNotifications = await db.notification.findMany({
            where: {
              userId,
              isRead: false,
            },
            orderBy: { createdAt: 'desc' },
            take: 20,
          });

          if (newNotifications.length > 0) {
            const latestId = newNotifications[0]?.id;
            if (latestId !== lastNotificationId) {
              lastNotificationId = latestId;
              
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ 
                    type: 'NEW_NOTIFICATIONS',
                    notifications: newNotifications,
                    count: newNotifications.length,
                  })}\n\n`
                )
              );
            }
          }
        } catch (e) {
          console.error('Error polling notifications for SSE:', e);
        }
      }, 2000);

      // Cleanup on disconnect
      request.signal.addEventListener('abort', () => {
        clearInterval(pollInterval);
        const clients = sseClients.get(userId);
        if (clients) {
          clients.delete(controller);
          if (clients.size === 0) {
            sseClients.delete(userId);
          }
        }
        console.log(`🔌 SSE Client disconnected for user ${userId}`);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

export async function PATCH(request: NextRequest) {
  try {
    const dbUser = await getUser();
    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { notificationId, action } = body;

    if (action === "read" && notificationId) {
      // Mark specific notification as read
      await markNotificationAsRead(notificationId);
      return NextResponse.json({ success: true });
    }

    if (action === "read-all") {
      // Mark all notifications as read
      await markAllNotificationsAsRead(dbUser.workspaceId, dbUser.id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Error updating notifications:", error);
    return NextResponse.json(
      { error: "Failed to update notifications" },
      { status: 500 }
    );
  }
}
