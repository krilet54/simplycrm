import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  relatedType?: string;
  relatedId?: string;
}

interface NotificationEvent {
  type: string;
  notification?: Notification;
  notifications?: Notification[];
  count?: number;
  timestamp?: string;
}

interface UseRealtimeNotificationsOptions {
  onNotificationReceived?: (notification: Notification) => void;
  onNotificationsUpdate?: (notifications: Notification[]) => void;
  showToast?: boolean;
}

/**
 * Hook for real-time notifications using Server-Sent Events (SSE)
 * Connects to /api/notifications?action=stream endpoint
 * Only works on client-side (browser environment)
 */
export function useRealtimeNotifications(options: UseRealtimeNotificationsOptions = {}) {
  const { 
    onNotificationReceived, 
    onNotificationsUpdate,
    showToast = true,
  } = options;

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Only run on client-side (not during server-side rendering)
    if (typeof EventSource === 'undefined') {
      console.warn('⚠️ EventSource not available - SSE notifications disabled');
      return;
    }

    let isMounted = true;
    let reconnectAttempts = 0;
    const MAX_RECONNECT_ATTEMPTS = 5;

    const connect = () => {
      try {
        // Close existing connection
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
        }

        console.log('🔌 Connecting to real-time notifications...');
        const eventSource = new EventSource('/api/notifications?action=stream');
        eventSourceRef.current = eventSource;

        // Handle connection open
        eventSource.addEventListener('open', () => {
          if (isMounted) {
            console.log('✅ Real-time notification connection established');
            reconnectAttempts = 0;
          }
        });

        // Handle incoming messages
        eventSource.addEventListener('message', (event) => {
          if (!isMounted) return;

          try {
            const data = JSON.parse(event.data) as NotificationEvent;
            
            if (data.type === 'INITIAL_NOTIFICATIONS' && data.notifications) {
              // Initial batch of notifications on connect
              console.log(`📬 Received ${data.notifications.length} initial notifications`);
              onNotificationsUpdate?.(data.notifications);
            } else if (data.type === 'NEW_NOTIFICATIONS' && data.notifications) {
              // New notifications added
              console.log(`📨 Received ${data.notifications.length} new notifications`);
              onNotificationsUpdate?.(data.notifications);
            } else if (data.type === 'NOTIFICATION' && data.notification) {
              // Single new notification
              const notification = data.notification as Notification;
              console.log(`🔔 New notification: ${notification.title}`);
              
              onNotificationReceived?.(notification);
              
              // Show toast for important notifications
              if (showToast) {
                showNotificationToast(notification);
              }
            }
          } catch (e) {
            console.error('Error parsing notification event:', e);
          }
        });

        // Handle errors
        eventSource.addEventListener('error', () => {
          if (!isMounted) return;

          console.warn('❌ Real-time notification connection error');
          eventSource.close();

          // Attempt to reconnect with exponential backoff
          if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            const delayMs = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
            reconnectAttempts++;
            
            console.log(`🔄 Attempting to reconnect in ${delayMs}ms (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
            
            reconnectTimeoutRef.current = setTimeout(() => {
              if (isMounted) {
                connect();
              }
            }, delayMs);
          } else {
            console.error('❌ Max reconnection attempts reached. Real-time notifications disabled.');
            // Polling fallback is still active via NotificationBadge
          }
        });

      } catch (error) {
        console.error('Error connecting to real-time notifications:', error);
        if (isMounted && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts++;
          const delayMs = Math.min(1000 * Math.pow(2, reconnectAttempts - 1), 30000);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isMounted) {
              connect();
            }
          }, delayMs);
        }
      }
    };

    connect();

    // Cleanup on unmount
    return () => {
      isMounted = false;
      
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [onNotificationReceived, onNotificationsUpdate, showToast]);

  return {
    isConnected: typeof EventSource !== 'undefined' && eventSourceRef.current?.readyState === 1, // 1 = OPEN
    disconnect: () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    },
  };
}

/**
 * Show toast notification based on notification type
 */
function showNotificationToast(notification: Notification) {
  const { title, type } = notification;
  
  const toastConfig = {
    duration: 4000,
    position: 'top-right' as const,
  };

  switch (type) {
    case 'CONTACT_ASSIGNED':
      toast.success(`📩 ${title}`, toastConfig);
      break;
    case 'TASK_ASSIGNED':
      toast.success(`✅ ${title}`, toastConfig);
      break;
    case 'FOLLOWUP_ASSIGNED':
      toast.success(`📞 ${title}`, toastConfig);
      break;
    case 'TASK_DUE':
      toast.error(`⏰ ${title}`, toastConfig);
      break;
    case 'FOLLOWUP_DUE':
      toast.error(`⏰ ${title}`, toastConfig);
      break;
    default:
      toast.success(`📬 ${title}`, toastConfig);
  }
}
