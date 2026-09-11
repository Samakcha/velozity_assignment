import React, { useEffect, useState } from 'react';
import { FiBell } from 'react-icons/fi';
import { connectSocket } from '../socket/socket';

export interface NotificationItem {
  id: string;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  task?: { id: string; title: string } | null;
}

export const NotificationBell: React.FC<{ accessToken: string }> = ({ accessToken }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(false);

  // Fetch initial notifications & unread count
  useEffect(() => {
    if (!accessToken) return;

    fetch('/api/notifications', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          setNotifications(res.data || []);
        }
      })
      .catch((err) => console.error('Failed to fetch notifications:', err));

    fetch('/api/notifications/unread-count', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          setUnreadCount(res.data?.unreadCount || 0);
        }
      })
      .catch((err) => console.error('Failed to fetch unread count:', err));
  }, [accessToken]);

  // Attach Socket.io listeners
  useEffect(() => {
    if (!accessToken) return;

    const socket = connectSocket(accessToken);

    const handleNewNotification = (newNotif: NotificationItem) => {
      setNotifications((prev) => {
        if (prev.some((n) => n.id === newNotif.id)) return prev;
        if (!newNotif.isRead) {
          setUnreadCount((count) => count + 1);
        }
        return [newNotif, ...prev];
      });
    };

    const handleUnreadCount = (data: { unreadCount: number }) => {
      if (typeof data?.unreadCount === 'number') {
        setUnreadCount(data.unreadCount);
      }
    };

    socket.on('notification:new', handleNewNotification);
    socket.on('notification:unread_count', handleUnreadCount);

    return () => {
      socket.off('notification:new', handleNewNotification);
      socket.off('notification:unread_count', handleUnreadCount);
    };
  }, [accessToken]);

  const handleMarkAsRead = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}` },
      }).then((r) => r.json());

      if (res.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount(res.data.unreadCount);
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch('/api/notifications/read-all', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken}` },
      }).then((r) => r.json());

      if (res.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          color: '#fff',
          padding: '0.6rem 1rem',
          borderRadius: '12px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontWeight: 600,
        }}
      >
        <FiBell /> Notifications
        {unreadCount > 0 && (
          <span
            style={{
              background: '#ef4444',
              color: '#fff',
              borderRadius: '9999px',
              padding: '0.15rem 0.5rem',
              fontSize: '0.75rem',
              fontWeight: 700,
            }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: '120%',
            width: '320px',
            background: '#121827',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.75rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
              paddingBottom: '0.5rem',
            }}
          >
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#818cf8',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                }}
              >
                Mark all as read
              </button>
            )}
          </div>

          <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ color: '#9ca3af', fontSize: '0.85rem', padding: '0.5rem 0' }}>
                No notifications
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.isRead && handleMarkAsRead(n.id)}
                  style={{
                    padding: '0.5rem',
                    borderRadius: '8px',
                    marginBottom: '0.4rem',
                    background: n.isRead ? 'transparent' : 'rgba(99, 102, 241, 0.1)',
                    borderLeft: n.isRead ? 'none' : '3px solid #6366f1',
                    cursor: n.isRead ? 'default' : 'pointer',
                    fontSize: '0.825rem',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ color: '#f3f4f6', fontWeight: n.isRead ? 400 : 600 }}>
                    {n.message}
                  </div>
                  <div style={{ color: '#9ca3af', fontSize: '0.7rem', marginTop: '0.2rem' }}>
                    {new Date(n.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
