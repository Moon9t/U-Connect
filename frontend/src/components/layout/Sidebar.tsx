import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  FileEdit,
  FileText,
  MessageSquare,
  User as UserIcon,
  LogOut,
  ClipboardList,
  Users,
  Building2,
  Tags,
  BarChart3,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'submit-complaint'
  | 'my-complaints'
  | 'complaints-mgmt'
  | 'users'
  | 'departments'
  | 'categories'
  | 'reports'
  | 'feedback'
  | 'profile';

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { role, logout } = useAuth();

  const isStudent = role === 'student';
  const isAdminOrStaff = role === 'admin' || role === 'staff';
  const isAdmin = role === 'admin';

  const getItemStyle = (tab: NavTab) => {
    const isActive = activeTab === tab;
    return {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 12px',
      borderRadius: '8px',
      fontSize: '0.825rem',
      fontWeight: isActive ? 600 : 500,
      backgroundColor: isActive ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
      color: isActive ? '#ffffff' : '#9ca3af',
      transition: 'all 0.12s ease',
      textAlign: 'left' as const,
      width: '100%',
      cursor: 'pointer',
    };
  };

  return (
    <aside
      style={{
        width: '230px',
        backgroundColor: '#111113',
        color: '#9ca3af',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        flexShrink: 0,
        borderRight: '1px solid rgba(255, 255, 255, 0.06)',
      }}
    >
      <div style={{ padding: '24px 12px 16px', overflowY: 'auto' }}>
        {/* Main Section */}
        <div style={{ marginBottom: '22px' }}>
          <div
            style={{
              padding: '0 12px',
              fontSize: '0.675rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: '#52525b',
              marginBottom: '8px',
            }}
          >
            Portal
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <button onClick={() => setActiveTab('dashboard')} style={getItemStyle('dashboard')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <LayoutDashboard size={17} strokeWidth={activeTab === 'dashboard' ? 2.2 : 1.8} />
                <span>Dashboard</span>
              </div>
            </button>

            {isStudent && (
              <>
                <button
                  onClick={() => setActiveTab('submit-complaint')}
                  style={getItemStyle('submit-complaint')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FileEdit size={17} strokeWidth={activeTab === 'submit-complaint' ? 2.2 : 1.8} />
                    <span>Submit Grievance</span>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('my-complaints')}
                  style={getItemStyle('my-complaints')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FileText size={17} strokeWidth={activeTab === 'my-complaints' ? 2.2 : 1.8} />
                    <span>My Complaints</span>
                  </div>
                </button>

                <button onClick={() => setActiveTab('feedback')} style={getItemStyle('feedback')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <MessageSquare size={17} strokeWidth={activeTab === 'feedback' ? 2.2 : 1.8} />
                    <span>Feedback</span>
                  </div>
                </button>
              </>
            )}

            {isAdminOrStaff && (
              <button
                onClick={() => setActiveTab('complaints-mgmt')}
                style={getItemStyle('complaints-mgmt')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ClipboardList size={17} strokeWidth={activeTab === 'complaints-mgmt' ? 2.2 : 1.8} />
                  <span>Complaints</span>
                </div>
              </button>
            )}
          </nav>
        </div>

        {/* Administration Section */}
        {isAdminOrStaff && (
          <div style={{ marginBottom: '22px' }}>
            <div
              style={{
                padding: '0 12px',
                fontSize: '0.675rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: '#52525b',
                marginBottom: '8px',
              }}
            >
              Management
            </div>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {isAdmin && (
                <>
                  <button onClick={() => setActiveTab('users')} style={getItemStyle('users')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Users size={17} strokeWidth={activeTab === 'users' ? 2.2 : 1.8} />
                      <span>Users</span>
                    </div>
                  </button>

                  <button onClick={() => setActiveTab('departments')} style={getItemStyle('departments')}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Building2 size={17} strokeWidth={activeTab === 'departments' ? 2.2 : 1.8} />
                      <span>Departments</span>
                    </div>
                  </button>
                </>
              )}

              <button onClick={() => setActiveTab('categories')} style={getItemStyle('categories')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Tags size={17} strokeWidth={activeTab === 'categories' ? 2.2 : 1.8} />
                  <span>Categories</span>
                </div>
              </button>

              <button onClick={() => setActiveTab('reports')} style={getItemStyle('reports')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <BarChart3 size={17} strokeWidth={activeTab === 'reports' ? 2.2 : 1.8} />
                  <span>Analytics</span>
                </div>
              </button>
            </nav>
          </div>
        )}

        {/* Account Section */}
        <div>
          <div
            style={{
              padding: '0 12px',
              fontSize: '0.675rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: '#52525b',
              marginBottom: '8px',
            }}
          >
            Account
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <button onClick={() => setActiveTab('profile')} style={getItemStyle('profile')}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <UserIcon size={17} strokeWidth={activeTab === 'profile' ? 2.2 : 1.8} />
                <span>Profile</span>
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Logout */}
      <div style={{ padding: '14px 12px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
        <button
          onClick={logout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '8px 12px',
            borderRadius: '8px',
            fontSize: '0.825rem',
            fontWeight: 500,
            color: '#71717a',
            transition: 'color 0.12s ease',
            textAlign: 'left',
            width: '100%',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#71717a')}
        >
          <LogOut size={16} />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
};
