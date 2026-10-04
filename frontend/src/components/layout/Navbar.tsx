import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { notificationService } from '../../services/notification.service';
import { Notification } from '../../types/api';
import { Logo } from '../common/Logo';

import {
  Bell,
  ChevronDown,
  LogOut,
  User as UserIcon,
  Search,
  CheckCheck,
} from 'lucide-react';

interface NavbarProps {
  onNavigateToProfile?: () => void;
  onNavigateToComplaints?: (complaintId?: number) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onNavigateToProfile,
  onNavigateToComplaints,
}) => {
  const { user, role, logout } = useAuth();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  const initial = user?.name
    ? user.name.charAt(0).toUpperCase()
    : role === 'admin'
      ? 'A'
      : 'S';

  const roleLabel =
    role === 'admin'
      ? 'Administrator'
      : role === 'staff'
        ? 'Staff Member'
        : 'Student';

  const displayName =
    user?.name ||
    (role === 'admin' ? 'Admin User' : 'Student User');

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    setNotificationsLoading(true);

    notificationService
      .getNotifications()
      .then(setNotifications)
      .catch(() => setNotifications([]))
      .finally(() => setNotificationsLoading(false));
  }, [user?.id]);

  const unreadCount = notifications.filter(
    (notification) => !notification.read_at
  ).length;

  const formatNotificationTime = (createdAt: string) => {
    const elapsedMinutes = Math.max(
      0,
      Math.floor(
        (Date.now() - new Date(createdAt).getTime()) / 60000
      )
    );

    if (elapsedMinutes < 1) return 'Just now';

    if (elapsedMinutes < 60) {
      return `${elapsedMinutes}m ago`;
    }

    const elapsedHours = Math.floor(elapsedMinutes / 60);

    if (elapsedHours < 24) {
      return `${elapsedHours}h ago`;
    }

    return `${Math.floor(elapsedHours / 24)}d ago`;
  };

  const markNotificationAsRead = async (
    notification: Notification
  ) => {
    if (notification.read_at) return;

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
    onNavigateToComplaints?.(notification.related_complaint_id);
  };

  return (
    <header
      style={{
        height: '72px',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid var(--border-subtle)',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 40,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        <Logo />

        <div
          style={{
            position: 'relative',
            width: '280px',
          }}
        >
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8',
            }}
          />

          <input
            type="text"
            placeholder="Search..."
            style={{
              width: '100%',
              height: '38px',
              border: '1px solid var(--neutral-200)',
              borderRadius: '8px',
              padding: '0 12px 0 38px',
              outline: 'none',
              fontSize: '0.85rem',
              color: '#334155',
              backgroundColor: '#f8fafc',
            }}
          />
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}
      >
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() =>
              setNotificationsOpen((current) => !current)
            }
            style={{
              width: '40px',
              height: '40px',
              border: 'none',
              backgroundColor: notificationsOpen
                ? '#f1f5f9'
                : 'transparent',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              position: 'relative',
            }}
            aria-label="Notifications"
          >
            <Bell size={20} color= 'var(--neutral-600)' />

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
                  backgroundColor: '#2563eb',
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
                right: 0,
                top: '48px',
                width: '360px',
                backgroundColor: '#ffffff',
                border: '1px solid var(--neutral-200)',
                borderRadius: '10px',
                boxShadow:
                  '0 10px 30px rgba(15, 23, 42, 0.12)',
                overflow: 'hidden',
                zIndex: 100,
              }}
            >
              <div
                style={{
                  padding: '14px 16px',
                  borderBottom:
                    '1px solid var(--neutral-100)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    color: 'var(--neutral-800)',
                  }}
                >
                  Notifications
                </div>

                {unreadCount > 0 && (
                  <div
                    style={{
                      fontSize: '0.75rem',
                      color: '#2563eb',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <CheckCheck size={14} />
                    {unreadCount} unread
                  </div>
                )}
              </div>

              <div
                style={{
                  maxHeight: '360px',
                  overflowY: 'auto',
                }}
              >
                {notificationsLoading && (
                  <div
                    style={{
                      padding: '18px 16px',
                      color: 'var(--neutral-500)',
                      fontSize: '0.8rem',
                    }}
                  >
                    Loading notifications...
                  </div>
                )}

                {!notificationsLoading &&
                  notifications.length === 0 && (
                    <div
                      style={{
                        padding: '18px 16px',
                        color: '#64748b',
                        fontSize: '0.8rem',
                      }}
                    >
                      You have no notifications.
                    </div>
                  )}

                {!notificationsLoading &&
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => markNotificationAsRead(n)}
                      style={{
                        padding: '12px 16px',
                        borderBottom:
                          '1px solid var(--neutral-100)',
                        fontSize: '0.8rem',
                        backgroundColor: n.read_at
                          ? '#ffffff'
                          : '#eff6ff',
                        cursor: n.read_at
                          ? 'default'
                          : 'pointer',
                      }}
                    >
                      <div
                        style={{
                          fontWeight: n.read_at ? 500 : 700,
                          color: '#1e3a8a',
                        }}
                      >
                        {n.title}
                      </div>

                      <div
                        style={{
                          color: '#64748b',
                          marginTop: '2px',
                          lineHeight: 1.4,
                        }}
                      >
                        {n.description}
                      </div>

                      <div
                        style={{
                          color: '#94a3b8',
                          fontSize: '0.7rem',
                          marginTop: '4px',
                        }}
                      >
                        {formatNotificationTime(n.created_at)}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() =>
              setDropdownOpen((current) => !current)
            }
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                backgroundColor: '#dbeafe',
                color: '#1d4ed8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
              }}
            >
              {initial}
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
              }}
            >
              <span
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: '#1e293b',
                }}
              >
                {displayName}
              </span>

              <span
                style={{
                  fontSize: '0.7rem',
                  color: '#64748b',
                }}
              >
                {roleLabel}
              </span>
            </div>

            <ChevronDown
              size={16}
              color="#64748b"
            />
          </button>

          {dropdownOpen && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: '52px',
                width: '200px',
                backgroundColor: '#ffffff',
                border: '1px solid var(--neutral-200)',
                borderRadius: '8px',
                boxShadow:
                  '0 10px 25px rgba(15, 23, 42, 0.12)',
                padding: '6px',
                zIndex: 100,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setDropdownOpen(false);
                  onNavigateToProfile?.();
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  color: '#334155',
                  textAlign: 'left',
                }}
              >
                <UserIcon size={17} />
                Profile
              </button>

              <button
                type="button"
                onClick={async () => {
                  setDropdownOpen(false);
                  await logout();
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  color: '#dc2626',
                  textAlign: 'left',
                }}
              >
                <LogOut size={17} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
