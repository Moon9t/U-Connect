import React, { useEffect, useState } from 'react';
import {
  Bell,
  ChevronDown,
  LogOut,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';
import { notificationService } from '../../services/notification.service';
import { Notification } from '../../types/api';
import { Logo } from '../common/Logo';

interface NavbarProps {
  onNavigateToComplaints?: (complaintId?: number) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onNavigateToComplaints,
}) => {
  const { user, logout } = useAuth();
  const { error } = useToast();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isLoadingNotifications, setIsLoadingNotifications] =
    useState(false);

  const initial = user?.username
    ? user.username.charAt(0).toUpperCase()
    : 'U';

  const displayName = user?.username || 'User';

  const loadNotifications = async () => {
    setIsLoadingNotifications(true);

    try {
      const data = await notificationService.getNotifications();
      setNotifications(data || []);
    } catch (err: any) {
      error(err.message || 'Failed to load notifications');
    } finally {
      setIsLoadingNotifications(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadNotifications();
    } else {
      setNotifications([]);
    }
  }, [user]);

  const unreadCount = notifications.filter(
    (notification) => !notification.read_at
  ).length;

  const markNotificationAsRead = async (
    notification: Notification
  ) => {
    if (notification.read_at) {
      setNotificationsOpen(false);
      onNavigateToComplaints?.(
        notification.related_complaint_id
      );
      return;
    }

    try {
      await notificationService.markAsRead(notification.id);

      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? {
                ...item,
                read_at: new Date().toISOString(),
              }
            : item
        )
      );
    } catch {
      // Keep the notification unread when the server update fails.
    }

    setNotificationsOpen(false);
    onNavigateToComplaints?.(
      notification.related_complaint_id
    );
  };

  const markAllNotificationsAsRead = async () => {
    try {
      await notificationService.markAllAsRead();

      const timestamp = new Date().toISOString();

      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          read_at: notification.read_at || timestamp,
        }))
      );
    } catch (err: any) {
      error(err.message || 'Failed to mark notifications as read');
    }
  };

  const handleLogout = () => {
    setProfileOpen(false);
    logout();
  };

  const formatNotificationDate = (date: string) => {
    const value = new Date(date);

    if (Number.isNaN(value.getTime())) {
      return '';
    }

    return value.toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <header
      style={{
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e4e4e7',
        position: 'sticky',
        top: 0,
        zIndex: 30,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <Logo />
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        {/* Notifications */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => {
              setNotificationsOpen((open) => !open);
              setProfileOpen(false);
            }}
            aria-label="Notifications"
            className="btn"
            style={{
              position: 'relative',
              width: '40px',
              height: '40px',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'transparent',
              border: 'none',
              color: '#52525b',
            }}
          >
            <Bell size={20} />

            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  minWidth: '17px',
                  height: '17px',
                  padding: '0 4px',
                  borderRadius: '999px',
                  backgroundColor: '#18181b',
                  color: '#ffffff',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div
              style={{
                position: 'absolute',
                top: '48px',
                right: 0,
                width: '360px',
                maxWidth: 'calc(100vw - 32px)',
                backgroundColor: '#ffffff',
                border: '1px solid #e4e4e7',
                borderRadius: '12px',
                boxShadow:
                  '0 10px 30px rgba(0, 0, 0, 0.12)',
                overflow: 'hidden',
                zIndex: 50,
              }}
            >
              <div
                style={{
                  padding: '14px 16px',
                  borderBottom: '1px solid #f4f4f5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <strong
                  style={{
                    fontSize: '0.9rem',
                    color: '#18181b',
                  }}
                >
                  Notifications
                </strong>

                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllNotificationsAsRead}
                    style={{
                      border: 'none',
                      background: 'none',
                      padding: 0,
                      cursor: 'pointer',
                      color: '#52525b',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                    }}
                  >
                    Mark all as read
                  </button>
                )}
              </div>

              <div
                style={{
                  maxHeight: '360px',
                  overflowY: 'auto',
                }}
              >
                {isLoadingNotifications ? (
                  <div
                    style={{
                      padding: '24px 16px',
                      textAlign: 'center',
                      color: '#71717a',
                      fontSize: '0.8rem',
                    }}
                  >
                    Loading notifications...
                  </div>
                ) : notifications.length === 0 ? (
                  <div
                    style={{
                      padding: '24px 16px',
                      textAlign: 'center',
                      color: '#71717a',
                      fontSize: '0.8rem',
                    }}
                  >
                    No notifications.
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <button
                      type="button"
                      key={notification.id}
                      onClick={() =>
                        markNotificationAsRead(notification)
                      }
                      style={{
                        width: '100%',
                        display: 'block',
                        textAlign: 'left',
                        padding: '12px 16px',
                        border: 'none',
                        borderBottom: '1px solid #f4f4f5',
                        backgroundColor: notification.read_at
                          ? '#ffffff'
                          : '#f4f4f5',
                        cursor: 'pointer',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: '8px',
                        }}
                      >
                        <strong
                          style={{
                            fontSize: '0.8rem',
                            color: '#18181b',
                          }}
                        >
                          {notification.title}
                        </strong>

                        {!notification.read_at && (
                          <span
                            style={{
                              width: '7px',
                              height: '7px',
                              flexShrink: 0,
                              marginTop: '4px',
                              borderRadius: '50%',
                              backgroundColor: '#18181b',
                            }}
                          />
                        )}
                      </div>

                      <div
                        style={{
                          marginTop: '4px',
                          color: '#52525b',
                          fontSize: '0.75rem',
                          lineHeight: 1.4,
                        }}
                      >
                        {notification.description}
                      </div>

                      <div
                        style={{
                          marginTop: '6px',
                          color: '#a1a1aa',
                          fontSize: '0.68rem',
                        }}
                      >
                        {formatNotificationDate(
                          notification.created_at
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => {
              setProfileOpen((open) => !open);
              setNotificationsOpen(false);
            }}
            className="btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '4px 8px',
              backgroundColor: 'transparent',
              border: 'none',
              color: '#18181b',
              cursor: 'pointer',
            }}
          >
            <span
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#18181b',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.8rem',
                fontWeight: 700,
              }}
            >
              {initial}
            </span>

            <span
              style={{
                fontSize: '0.8rem',
                fontWeight: 600,
              }}
            >
              {displayName}
            </span>

            <ChevronDown size={15} />
          </button>

          {profileOpen && (
            <div
              style={{
                position: 'absolute',
                top: '44px',
                right: 0,
                width: '190px',
                backgroundColor: '#ffffff',
                border: '1px solid #e4e4e7',
                borderRadius: '10px',
                boxShadow:
                  '0 10px 30px rgba(0, 0, 0, 0.12)',
                overflow: 'hidden',
                zIndex: 50,
              }}
            >
              <div
                style={{
                  padding: '12px 14px',
                  borderBottom: '1px solid #f4f4f5',
                }}
              >
                <div
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: '#18181b',
                  }}
                >
                  {displayName}
                </div>

                <div
                  style={{
                    marginTop: '2px',
                    fontSize: '0.7rem',
                    color: '#71717a',
                    textTransform: 'capitalize',
                  }}
                >
                  {user?.role || 'user'}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setProfileOpen(false);
                  window.dispatchEvent(
                    new CustomEvent('uconnect:navigate', {
                      detail: { page: 'profile' },
                    })
                  );
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 14px',
                  border: 'none',
                  backgroundColor: '#ffffff',
                  cursor: 'pointer',
                  color: '#3f3f46',
                  fontSize: '0.8rem',
                  textAlign: 'left',
                }}
              >
                <UserIcon size={15} />
                Profile
              </button>

              <button
                type="button"
                onClick={handleLogout}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 14px',
                  border: 'none',
                  borderTop: '1px solid #f4f4f5',
                  backgroundColor: '#ffffff',
                  cursor: 'pointer',
                  color: '#3f3f46',
                  fontSize: '0.8rem',
                  textAlign: 'left',
                }}
              >
                <LogOut size={15} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};