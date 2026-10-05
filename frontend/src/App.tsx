import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/common/Toast';
import { Navbar } from './components/layout/Navbar';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { LoginPage } from './pages/LoginPage';
import { StudentDashboardPage } from './pages/StudentDashboardPage';
import { SubmitComplaintPage } from './pages/SubmitComplaintPage';
import { AdminComplaintManagementPage } from './pages/AdminComplaintManagementPage';
import { MyComplaintsPage } from './pages/MyComplaintsPage';
import { UsersManagementPage } from './pages/UsersManagementPage';
import { DepartmentsPage } from './pages/DepartmentsPage';
import { AnalyticsReportsPage } from './pages/AnalyticsReportsPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { FeedbackPage } from './pages/FeedbackPage';
import { ProfilePage } from './pages/ProfilePage';
import { QuickSearchModal } from './components/common/QuickSearchModal';
import { ComplaintDetailModal } from './components/complaints/ComplaintDetailModal';
import { Complaint } from './types/api';

const MainLayout: React.FC = () => {
  const { isAuthenticated, role, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [notificationComplaintId, setNotificationComplaintId] = useState<number | undefined>();

  // Set default tab based on role
  useEffect(() => {
    if (role === 'admin' || role === 'staff') {
      setActiveTab('complaints-mgmt');
    } else if (role === 'student') {
      setActiveTab('dashboard');
    }
  }, [role]);

  // Global search shortcut (⌘K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchModalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f8fafc',
          color: '#64748b',
          fontSize: '0.95rem',
          fontWeight: 500,
        }}
      >
        Initializing U-Connect Portal...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <StudentDashboardPage
            onNavigateToSubmit={() => setActiveTab('submit-complaint')}
            onNavigateToMyComplaints={() => setActiveTab('my-complaints')}
          />
        );
      case 'submit-complaint':
        return (
          <SubmitComplaintPage
            onSuccess={() => setActiveTab('my-complaints')}
            onCancel={() => setActiveTab(role === 'student' ? 'dashboard' : 'complaints-mgmt')}
          />
        );
      case 'my-complaints':
        return (
          <MyComplaintsPage
            onNavigateToSubmit={() => setActiveTab('submit-complaint')}
            initialComplaintId={notificationComplaintId}
          />
        );
      case 'complaints-mgmt':
        return <AdminComplaintManagementPage initialComplaintId={notificationComplaintId} />;
      case 'users':
        return <UsersManagementPage />;
      case 'departments':
        return <DepartmentsPage />;
      case 'categories':
        return <CategoriesPage />;
      case 'reports':
        return <AnalyticsReportsPage />;
      case 'feedback':
        return <FeedbackPage />;
      case 'profile':
        return <ProfilePage />;
      default:
        return (
          <StudentDashboardPage
            onNavigateToSubmit={() => setActiveTab('submit-complaint')}
            onNavigateToMyComplaints={() => setActiveTab('my-complaints')}
          />
        );
    }
  };

  return (
    <div className="app-layout">
      {/* Sidebar with mobile drawer support */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="main-content">
        <Navbar
          activeTab={activeTab}
          onNavigateToProfile={() => setActiveTab('profile')}
          onToggleMobileSidebar={() => setMobileSidebarOpen((prev) => !prev)}
          onOpenSearch={() => setIsSearchModalOpen(true)}
          onNavigateToComplaints={(complaintId) => {
            setNotificationComplaintId(complaintId || undefined);
            setActiveTab(role === 'student' ? 'my-complaints' : 'complaints-mgmt');
          }}
        />
        <main style={{ flex: 1, overflowY: 'auto' }}>{renderContent()}</main>
      </div>

      {/* Global Quick Search / Command Palette */}
      <QuickSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        userRole={role}
        onNavigateTab={(tab) => {
          setActiveTab(tab as NavTab);
          setIsSearchModalOpen(false);
        }}
        onSelectComplaint={(c) => {
          setSelectedComplaint(c);
          setIsDetailModalOpen(true);
        }}
      />

      {/* Global Complaint Detail Modal from Search */}
      {selectedComplaint && (
        <ComplaintDetailModal
          complaint={selectedComplaint}
          isOpen={isDetailModalOpen}
          onClose={() => {
            setIsDetailModalOpen(false);
            setSelectedComplaint(null);
          }}
          onStatusUpdated={() => {
            // refresh active tab
          }}
        />
      )}
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <MainLayout />
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
