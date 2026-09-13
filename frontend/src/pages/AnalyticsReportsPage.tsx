import React, { useState, useEffect } from 'react';
import { dashboardService } from '../services/dashboard.service';
import { complaintService } from '../services/complaint.service';
import { DashboardStats } from '../types/api';
import { useToast } from '../components/common/Toast';
import {
  BarChart3,
  Download,
  AlertTriangle,
  Clock,
  CheckCircle2,
  PieChart,
  FileSpreadsheet,
  TrendingUp,
  Activity,
  Layers,
} from 'lucide-react';

export const AnalyticsReportsPage: React.FC = () => {
  const { success, error } = useToast();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      const data = await dashboardService.getStats();
      setStats(data);
    } catch (err: any) {
      error(err.message || 'Failed to load dashboard metrics');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await complaintService.exportCSV();
      success('Complaint records exported to CSV successfully');
    } catch (err: any) {
      error(err.message || 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="page-container animate-fade-in">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '28px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h1 className="page-title">Analytics & SLA Reports</h1>
          <p className="page-subtitle">
            Real-time resolution metrics, category distributions, and SLA breach surveillance.
          </p>
        </div>

        <button
          onClick={handleExport}
          disabled={isExporting}
          className="btn btn-primary"
          style={{ padding: '9px 18px' }}
        >
          <Download size={16} />
          <span>{isExporting ? 'Generating CSV...' : 'Export Full Dataset (CSV)'}</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '18px',
          marginBottom: '28px',
        }}
      >
        <div className="card card-interactive" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
              Total Grievances
            </span>
            <Activity size={16} color="#2563eb" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a' }}>
            {isLoading ? '-' : stats?.total_complaints || 0}
          </div>
          <div style={{ fontSize: '0.725rem', color: '#16a34a', marginTop: '6px', fontWeight: 600 }}>
            Live SQLite Database Registry
          </div>
        </div>

        <div className="card card-interactive" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
              SLA Breaches (&gt;72h)
            </span>
            <AlertTriangle size={16} color="#dc2626" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#dc2626' }}>
            {isLoading ? '-' : stats?.sla_breaches || 0}
          </div>
          <div style={{ fontSize: '0.725rem', color: '#dc2626', marginTop: '6px', fontWeight: 600 }}>
            Exceeded standard resolution SLA
          </div>
        </div>

        <div className="card card-interactive" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
              Average Resolution
            </span>
            <Clock size={16} color="#2563eb" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#2563eb' }}>
            {isLoading ? '-' : `${stats?.average_resolution_hours || 0}h`}
          </div>
          <div style={{ fontSize: '0.725rem', color: '#64748b', marginTop: '6px', fontWeight: 500 }}>
            Mean hours to closure
          </div>
        </div>

        <div className="card card-interactive" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
              Resolution Rate
            </span>
            <CheckCircle2 size={16} color="#16a34a" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: '#16a34a' }}>
            {isLoading || !stats || stats.total_complaints === 0
              ? '-'
              : `${Math.round(
                  ((stats.resolved_complaints + stats.closed_complaints) / stats.total_complaints) * 100
                )}%`}
          </div>
          <div style={{ fontSize: '0.725rem', color: '#16a34a', marginTop: '6px', fontWeight: 600 }}>
            Resolved & Closed cases
          </div>
        </div>
      </div>

      {/* Visual Charts: Category and Status Breakdowns */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
          gap: '24px',
        }}
      >
        {/* By Category */}
        <div className="card" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
              Complaints by Category
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Volume Share</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {stats && stats.by_category
              ? Object.entries(stats.by_category).map(([cat, count]) => {
                  const pct = stats.total_complaints > 0 ? (count / stats.total_complaints) * 100 : 0;
                  return (
                    <div key={cat}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '0.825rem',
                          marginBottom: '6px',
                        }}
                      >
                        <span style={{ fontWeight: 600, color: '#1e293b' }}>{cat}</span>
                        <span style={{ color: '#64748b', fontWeight: 500 }}>
                          {count} ({Math.round(pct)}%)
                        </span>
                      </div>
                      <div
                        style={{
                          height: '8px',
                          borderRadius: '6px',
                          backgroundColor: '#f1f5f9',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${pct}%`,
                            background: 'linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%)',
                            borderRadius: '6px',
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </div>
                    </div>
                  );
                })
              : null}
          </div>
        </div>

        {/* By Status */}
        <div className="card" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
              Complaints by Status
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Pipeline State</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {stats && stats.by_status
              ? Object.entries(stats.by_status).map(([status, count]) => {
                  const pct = stats.total_complaints > 0 ? (count / stats.total_complaints) * 100 : 0;
                  const color =
                    status === 'pending'
                      ? 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)'
                      : status === 'in-progress'
                      ? 'linear-gradient(90deg, #0ea5e9 0%, #0284c7 100%)'
                      : status === 'resolved'
                      ? 'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)'
                      : 'linear-gradient(90deg, #94a3b8 0%, #64748b 100%)';

                  const label =
                    status === 'pending'
                      ? 'Under Review'
                      : status === 'in-progress'
                      ? 'In Progress'
                      : status === 'resolved'
                      ? 'Resolved'
                      : 'Closed';

                  return (
                    <div key={status}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '0.825rem',
                          marginBottom: '6px',
                        }}
                      >
                        <span style={{ fontWeight: 600, color: '#1e293b' }}>{label}</span>
                        <span style={{ color: '#64748b', fontWeight: 500 }}>
                          {count} ({Math.round(pct)}%)
                        </span>
                      </div>
                      <div
                        style={{
                          height: '8px',
                          borderRadius: '6px',
                          backgroundColor: '#f1f5f9',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${pct}%`,
                            background: color,
                            borderRadius: '6px',
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </div>
                    </div>
                  );
                })
              : null}
          </div>
        </div>
      </div>
    </div>
  );
};
