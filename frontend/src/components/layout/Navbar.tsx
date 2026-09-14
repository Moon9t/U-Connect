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
  Shield,
  Search,
  CheckCheck,
} from 'lucide-react';

interface NavbarProps {
  onNavigateToProfile?: () => void;
  onNavigateToComplaints?: (complaintId?: number) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onNavigateToProfile, onNavigateToComplaints }) => {
  const { user, role, logout, switchDemoUser } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  const initial = user?.name ? user.name.charAt(0).toUpperCase() : (role === 'admin' ? 'A' : 'S');
  const roleLabel = role === 'admin' ? 'Administrator' : role === 'staff' ? 'Staff Member' : 'Student';
  const displayName = user?.name || (role === 'admin' ? 'Admin User' : 'Student User');

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

  const unreadCount = notifications.filter((notification) => !notification.read_at).length;

  const formatNotificationTime = (createdAt: string) => {
    const elapsedMinutes = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000));
    if (elapsedMinutes < 1) return 'Just now';
    if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`;
    const elapsedHours = Math.floor(elapsedMinutes / 60);
    if (elapsedHours < 24) return `${elapsedHours}h ago`;
    return `${Math.floor(elapsedHours / 24)}d ago`;
  };

  const markNotificationAsRead = async (notification: Notification) => {
    if (!notification.read_at) {
      try {
        await notificationService.markAsRead(notification.id);
        setNotifications((current) => current.map((item) => item.id === notification.id
          ? { ...item, read_at: new Date().toISOString() }
          : item));
      } catch {
        // Keep the notification unread when the server update fails.
      }
    }

    setNotificationsOpen(false);
    onNavigateToComplaints?.(notification.related_complaint_id);
  };

  const markAllNotificationsAsRead = async () => {
    if (!unreadCount) return;
    try {
      await notificationService.markAllAsRead();
      const readAt = new Date().toISOString();
      setNotifications((current) => current.map((notification) => ({ ...notification, read_at: notification.read_at || readAt })));
    } catch {
      // Keep the current state when the server update fails.
    }
  };

  return (
    <header
      style={{
        height: '64px',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid rgba(0, 0, 0, 0.07)',
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
        <Logo size="sm" />

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: '#f4f4f5',
            border: '1px solid transparent',
            padding: '6px 12px',
            borderRadius: '9999px',
            width: '260px',
            color: '#71717a',
            fontSize: '0.8rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#ececee')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f4f4f5')}
        >
          <Search size={14} color="#a1a1aa" />
          <span style={{ flex: 1, color: '#71717a', fontWeight: 400 }}>Search records...</span>
          <kbd
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e4e4e7',
              borderRadius: '4px',
              padding: '1px 5px',
              fontSize: '0.65rem',
              fontWeight: 600,
              color: '#71717a',
            }}
          >
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Service status */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            backgroundColor: '#f4f4f5',
            borderRadius: '9999px',
            fontSize: '0.725rem',
            fontWeight: 500,
            color: '#52525b',
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
            backgroundColor: '#f4f4f5',
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
                  backgroundColor: isActive ? '#18181b' : 'transparent',
                  color: isActive ? '#ffffff' : '#71717a',
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
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: notificationsOpen ? '#18181b' : '#71717a',
              backgroundColor: notificationsOpen ? '#f4f4f5' : 'transparent',
              transition: 'background-color 0.15s ease',
              position: 'relative',
            }}
            aria-label="Notifications"
          >
            <Bell size={17} />
            {unreadCount > 0 && <span
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                width: '6px',
                height: '6px',
                backgroundColor: '#ef4444',
                borderRadius: '50%',
              }}
            />}
          </button>

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
                  borderBottom: '1px solid #f4f4f5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span style={{ fontWeight: 600, fontSize: '0.825rem', color: '#18181b' }}>
                  Notifications
                </span>
                <button
                  onClick={markAllNotificationsAsRead}
                  disabled={!unreadCount}
                  style={{
                    fontSize: '0.7rem',
                    color: unreadCount ? '#71717a' : '#d4d4d8',
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

              <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
                {notificationsLoading && (
                  <div style={{ padding: '18px 16px', color: '#71717a', fontSize: '0.8rem' }}>
                    Loading notifications...
                  </div>
                )}
                {!notificationsLoading && notifications.length === 0 && (
                  <div style={{ padding: '18px 16px', color: '#71717a', fontSize: '0.8rem' }}>
                    You have no notifications.
                  </div>
                )}
                {!notificationsLoading && notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => markNotificationAsRead(n)}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid #f4f4f5',
                      fontSize: '0.8rem',
                      backgroundColor: n.read_at ? '#ffffff' : '#fafafa',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontWeight: n.read_at ? 500 : 700, color: '#18181b' }}>{n.title}</div>
                    <div style={{ color: '#71717a', marginTop: '2px', lineHeight: 1.4 }}>
                      {n.description}
                    </div>
                    <div style={{ color: '#a1a1aa', fontSize: '0.7rem', marginTop: '4px' }}>
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
              backgroundColor: dropdownOpen ? '#f4f4f5' : 'transparent',
              transition: 'all 0.15s ease',
            }}
          >
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                backgroundColor: '#18181b',
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

            <span style={{ fontSize: '0.825rem', fontWeight: 600, color: '#18181b' }}>
              {displayName}
            </span>

            <ChevronDown size={13} color="#a1a1aa" />
          </button>

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
              <div style={{ padding: '8px 12px', borderBottom: '1px solid #f4f4f5' }}>
                <div style={{ fontSize: '0.825rem', fontWeight: 600, color: '#18181b' }}>
                  {user?.name}
                </div>
                <div style={{ fontSize: '0.725rem', color: '#71717a' }}>{user?.email}</div>
                <div
                  style={{
                    display: 'inline-block',
                    fontSize: '0.675rem',
                    color: '#52525b',
                    backgroundColor: '#f4f4f5',
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
                    color: '#27272a',
                    borderRadius: '8px',
                    textAlign: 'left',
                    fontWeight: 500,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f4f4f5')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <UserIcon size={14} /> My Profile
                </button>
              )}

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
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fef2f2')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
