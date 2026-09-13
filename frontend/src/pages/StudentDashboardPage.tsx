import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { complaintService } from '../services/complaint.service';
import { dashboardService } from '../services/dashboard.service';
import { Complaint, DashboardStats } from '../types/api';
import { StatusBadge, PriorityBadge } from '../components/common/Badge';
import { ComplaintDetailModal } from '../components/complaints/ComplaintDetailModal';
import {
  FileText,
  Clock,
  Settings,
  CheckCircle2,
  Plus,
  ArrowRight,
  Calendar,
} from 'lucide-react';

interface StudentDashboardPageProps {
  onNavigateToSubmit: () => void;
  onNavigateToMyComplaints: () => void;
}

export const StudentDashboardPage: React.FC<StudentDashboardPageProps> = ({
  onNavigateToSubmit,
  onNavigateToMyComplaints,
}) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentComplaints, setRecentComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [statsData, complaintsData] = await Promise.all([
        dashboardService.getStats().catch(() => null),
        complaintService.getComplaints({ page: 1, page_size: 6 }),
      ]);

      if (statsData) {
        setStats(statsData);
      }
      setRecentComplaints(complaintsData.data || []);
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewComplaint = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setIsModalOpen(true);
  };

  const todayString = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const totalCount = stats ? stats.total_complaints : recentComplaints.length;
  const pendingCount = stats ? stats.pending_complaints : recentComplaints.filter((c) => c.status === 'pending').length;
  const inProgressCount = stats ? stats.in_progress_complaints : recentComplaints.filter((c) => c.status === 'in-progress').length;
  const resolvedCount = stats
    ? stats.resolved_complaints + stats.closed_complaints
    : recentComplaints.filter((c) => c.status === 'resolved' || c.status === 'closed').length;

  return (
    <div className="page-container animate-fade-in">
      {/* Human Greeting Banner matching Screen 2 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '32px',
        }}
      >
        <div>
          <h1 className="page-title">Welcome, {user?.name || 'Student User'}!</h1>
          <p className="page-subtitle">Your voice helps make our university a better place.</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              fontSize: '0.8rem',
              color: '#71717a',
              fontWeight: 500,
              padding: '6px 12px',
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
            }}
          >
            {todayString}
          </div>

          <button
            onClick={onNavigateToSubmit}
            className="btn btn-primary"
            style={{ padding: '8px 16px' }}
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>Submit Complaint</span>
          </button>
        </div>
      </div>

      {/* 4 Stat Metric Cards matching Screen 2 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '32px',
        }}
      >
        {/* Total Complaints */}
        <div
          className="card card-interactive"
          style={{
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '18px',
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              backgroundColor: '#f4f4f5',
              color: '#18181b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <FileText size={20} strokeWidth={2} />
          </div>
          <div>
            <div style={{ fontSize: '1.65rem', fontWeight: 700, color: '#09090b', lineHeight: 1.1 }}>
              {isLoading ? '-' : totalCount}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#71717a', marginTop: '3px' }}>
              Total Complaints
            </div>
          </div>
        </div>

        {/* Under Review */}
        <div
          className="card card-interactive"
          style={{
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '18px',
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              backgroundColor: '#fefce8',
              color: '#ca8a04',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Clock size={20} strokeWidth={2} />
          </div>
          <div>
            <div style={{ fontSize: '1.65rem', fontWeight: 700, color: '#09090b', lineHeight: 1.1 }}>
              {isLoading ? '-' : pendingCount}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#71717a', marginTop: '3px' }}>
              Under Review
            </div>
          </div>
        </div>

        {/* In Progress */}
        <div
          className="card card-interactive"
          style={{
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '18px',
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              backgroundColor: '#f0f9ff',
              color: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Settings size={20} strokeWidth={2} />
          </div>
          <div>
            <div style={{ fontSize: '1.65rem', fontWeight: 700, color: '#09090b', lineHeight: 1.1 }}>
              {isLoading ? '-' : inProgressCount}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#71717a', marginTop: '3px' }}>
              In Progress
            </div>
          </div>
        </div>

        {/* Resolved */}
        <div
          className="card card-interactive"
          style={{
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '18px',
          }}
        >
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              backgroundColor: '#f0fdf4',
              color: '#16a34a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <CheckCircle2 size={20} strokeWidth={2} />
          </div>
          <div>
            <div style={{ fontSize: '1.65rem', fontWeight: 700, color: '#09090b', lineHeight: 1.1 }}>
              {isLoading ? '-' : resolvedCount}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#71717a', marginTop: '3px' }}>
              Resolved
            </div>
          </div>
        </div>
      </div>

      {/* Recent Complaints Section */}
      <div className="card" style={{ padding: '24px 28px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '18px',
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#09090b' }}>
              Recent Complaints
            </h2>
          </div>

          <button
            onClick={onNavigateToMyComplaints}
            style={{
              fontSize: '0.8rem',
              color: '#18181b',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>View All</span>
            <ArrowRight size={13} />
          </button>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Reference Number</th>
                <th>Title</th>
                <th>Category</th>
                <th>Status</th>
                <th>Date Submitted</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: '#a1a1aa' }}>
                    Loading complaints...
                  </td>
                </tr>
              ) : recentComplaints.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: '#a1a1aa' }}>
                    No complaints recorded yet. Click "+ Submit Complaint" to share your feedback.
                  </td>
                </tr>
              ) : (
                recentComplaints.map((c) => {
                  const refNo = `UC-2025-${c.id.toString().padStart(3, '0')}`;
                  const formatted = new Date(c.created_at).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  });

                  return (
                    <tr key={c.id}>
                      <td>
                        <button
                          onClick={() => handleViewComplaint(c)}
                          className="ref-link"
                        >
                          {refNo}
                        </button>
                      </td>
                      <td style={{ fontWeight: 500, color: '#18181b', maxWidth: '300px' }}>
                        {c.title}
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8rem', color: '#52525b' }}>{c.category}</span>
                      </td>
                      <td>
                        <StatusBadge status={c.status} />
                      </td>
                      <td style={{ color: '#71717a', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                        {formatted}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => handleViewComplaint(c)}
                          style={{
                            color: '#18181b',
                            fontWeight: 600,
                            fontSize: '0.8rem',
                            textDecoration: 'underline',
                            textUnderlineOffset: '3px',
                          }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      <ComplaintDetailModal
        complaint={selectedComplaint}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onStatusUpdated={(updated) => {
          setSelectedComplaint(updated);
          loadDashboardData();
        }}
      />
    </div>
  );
};
