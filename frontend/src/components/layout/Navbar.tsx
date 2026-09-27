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
}

export const Navbar: React.FC<NavbarProps> = ({ onNavigateToProfile }) => {
  const { user, role, logout, switchDemoUser } = useAuth();
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
  };

  const markAllNotificationsAsRead = async () => {
    if (!unreadCount) return;

    try {
      await notificationService.markAllAsRead();

      const readAt = new Date().toISOString();

      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          read_at: notification.read_at || readAt,
        }))
      );
    } catch {
      // Keep the current state when the server update fails.
    }
  };

  return (
    <header
      style={{
        height: '64px',
        backgroundColor: '#ffffff',

        /* Subtle blue border */
        borderBottom: '1px solid rgba(30, 58, 138, 0.10)',

        padding: '0 36px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 40,
      }}
    >
      {/* Brand & Search */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '28px',
        }}
      >
        <Logo size="sm" />

        {/* Search */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',

            /* Light blue search background */
            backgroundColor: '#eff6ff',

            border: '1px solid #dbeafe',
            padding: '6px 12px',
            borderRadius: '9999px',
            width: '260px',
            color: '#64748b',
            fontSize: '0.8rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#dbeafe';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#eff6ff';
          }}
        >
          <Search size={14} color="#3b82f6" />

          <span
            style={{
              flex: 1,
              color: '#64748b',
              fontWeight: 400,
            }}
          >
            Search records...
          </span>

          <kbd
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #bfdbfe',
              borderRadius: '4px',
              padding: '1px 5px',
              fontSize: '0.65rem',
              fontWeight: 600,
              color: '#64748b',
            }}
          >
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
        }}
      >

        {/* Service Status */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',

            /* Very light blue */
            backgroundColor: '#eff6ff',

            borderRadius: '9999px',
            fontSize: '0.725rem',
            fontWeight: 500,
            color: '#1e40af',
          }}
        >
          <span className="online-pulse" />
          <span>Service Online</span>
        </div>

        {/* Role Segmented Switcher */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',

            /* Light blue container */
            backgroundColor: '#eff6ff',

            padding: '2px',
            borderRadius: '9999px',
            gap: '2px',
          }}
        >
          {(['student', 'staff', 'admin'] as const).map((r) => {
            const isActive = role === r;

            return (
              <button
                key={r}
                onClick={() => switchDemoUser(r)}
                style={{
                  padding: '4px 12px',
                  borderRadius: '9999px',

                  /* Active role = blue */
                  backgroundColor: isActive
                    ? '#2563eb'
                    : 'transparent',

                  color: isActive
                    ? '#ffffff'
                    : '#64748b',

                  textTransform: 'capitalize',
                  transition: 'all 0.15s ease',
                  fontSize: '0.75rem',
                  fontWeight: isActive ? 600 : 500,
                }}
              >
                {r}
              </button>
            );
          })}
        </div>

        {/* Notifications */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() =>
              setNotificationsOpen(!notificationsOpen)
            }
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',

              /* Blue when active */
              color: notificationsOpen
                ? '#2563eb'
                : '#64748b',

              backgroundColor: notificationsOpen
                ? '#eff6ff'
                : 'transparent',

              transition: 'background-color 0.15s ease',
              position: 'relative',
            }}
            aria-label="Notifications"
          >
            <Bell size={17} />

            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  width: '6px',
                  height: '6px',
                  backgroundColor: '#ef4444',
                  borderRadius: '50%',
                }}
              />
            )}
          </button>

          {/* Notification Dropdown */}
          {notificationsOpen && (
            <div
              style={{
                position: 'absolute',
                top: '46px',
                right: 0,
                width: '300px',
                backgroundColor: '#ffffff',
                borderRadius: '14px',
                boxShadow: 'var(--shadow-modal)',
                border: '1px solid var(--border-color)',
                zIndex: 60,
                overflow: 'hidden',
                animation: 'fadeIn 0.15s ease-out',
              }}
            >
              <div
                style={{
                  padding: '12px 16px',
                  borderBottom:
                    '1px solid var(--neutral-100)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span
                  style={{
                    fontWeight: 600,
                    fontSize: '0.825rem',
                    color: '#1e3a8a',
                  }}
                >
                  Notifications
                </span>

                <button
                  onClick={markAllNotificationsAsRead}
                  disabled={!unreadCount}
                  style={{
                    fontSize: '0.7rem',
                    color: unreadCount
                      ? '#2563eb'
                      : '#cbd5e1',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <CheckCheck size={12} />
                  <span>Mark read</span>
                </button>
              </div>

              <div>
                {notificationsLoading && (
                  <div
                    style={{
                      padding: '18px 16px',
                      color: '#64748b',
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

                        /* Unread notifications get a blue tint */
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

        {/* User Profile */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '4px 8px',
              borderRadius: '9999px',

              backgroundColor: dropdownOpen
                ? '#eff6ff'
                : 'transparent',

              transition: 'all 0.15s ease',
            }}
          >
            {/* User Avatar */}
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',

                /* Blue avatar */
                backgroundColor: '#2563eb',

                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {initial}
            </div>

            <span
              style={{
                fontSize: '0.825rem',
                fontWeight: 600,
                color: '#1e3a8a',
              }}
            >
              {displayName}
            </span>

            <ChevronDown
              size={13}
              color="#64748b"
            />
          </button>

          {/* Profile Dropdown */}
          {dropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: '46px',
                right: 0,
                width: '210px',
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                boxShadow: 'var(--shadow-modal)',
                border: '1px solid var(--border-color)',
                padding: '6px',
                zIndex: 60,
                animation: 'fadeIn 0.15s ease-out',
              }}
            >
              <div
                style={{
                  padding: '8px 12px',
                  borderBottom:
                    '1px solid var(--neutral-100)',
                }}
              >
                <div
                  style={{
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    color: '#1e3a8a',
                  }}
                >
                  {user?.name}
                </div>

                <div
                  style={{
                    fontSize: '0.725rem',
                    color: '#64748b',
                  }}
                >
                  {user?.email}
                </div>

                <div
                  style={{
                    display: 'inline-block',
                    fontSize: '0.675rem',
                    color: '#1e40af',
                    backgroundColor: '#eff6ff',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    marginTop: '6px',
                  }}
                >
                  {role}
                </div>
              </div>

              {/* My Profile */}
              {onNavigateToProfile && (
                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    onNavigateToProfile();
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    fontSize: '0.8rem',
                    color: '#334155',
                    borderRadius: '8px',
                    textAlign: 'left',
                    fontWeight: 500,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor =
                      '#eff6ff';
                    e.currentTarget.style.color =
                      '#2563eb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor =
                      'transparent';
                    e.currentTarget.style.color =
                      '#334155';
                  }}
                >
                  <UserIcon size={14} />
                  My Profile
                </button>
              )}

              {/* Sign Out */}
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  logout();
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  fontSize: '0.8rem',
                  color: '#dc2626',
                  borderRadius: '8px',
                  textAlign: 'left',
                  fontWeight: 600,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor =
                    '#fef2f2';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    'transparent';
                }}
              >
                <LogOut size={14} />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};