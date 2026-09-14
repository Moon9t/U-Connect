import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { complaintService } from '../services/complaint.service';
import { departmentService } from '../services/department.service';
import { Complaint, Department, ComplaintCategory } from '../types/api';
import { StatusBadge, PriorityBadge } from '../components/common/Badge';
import { ComplaintDetailModal } from '../components/complaints/ComplaintDetailModal';
import {
  Search,
  Download,
  Plus,
  ChevronDown,
  Clock,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Building,
  Tag,
  Shield,
} from 'lucide-react';

const CATEGORIES: ComplaintCategory[] = [
  'IT',
  'Facilities',
  'Academic',
  'Exam Hall',
  'Safety',
  'Finance',
  'Student Affairs',
];

const STATUSES: { value: string; label: string }[] = [
  { value: 'pending', label: 'Under Review' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

interface AdminComplaintManagementPageProps {
  initialComplaintId?: number;
}

export const AdminComplaintManagementPage: React.FC<AdminComplaintManagementPageProps> = ({ initialComplaintId }) => {
  const { role } = useAuth();
  const { success, error } = useToast();

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Filters matching Screen 4
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<number | ''>('');
  const [onlySlaEscalated, setOnlySlaEscalated] = useState<boolean>(false);

  // Modal state
  const [activeComplaint, setActiveComplaint] = useState<Complaint | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);

  useEffect(() => {
    loadDepartments();
  }, []);

  useEffect(() => {
    loadComplaints();
  }, [page, selectedCategory, selectedStatus, selectedDepartment, onlySlaEscalated]);

  useEffect(() => {
    if (!initialComplaintId) return;

    complaintService.getComplaint(initialComplaintId).then((complaint) => {
      handleOpenDetail(complaint);
    }).catch(() => {
      // The complaint may no longer be available to the current user.
    });
  }, [initialComplaintId]);

  const loadDepartments = async () => {
    try {
      const data = await departmentService.getDepartments();
      setDepartments(data || []);
    } catch {
      // ignore
    }
  };

  const loadComplaints = async () => {
    setIsLoading(true);
    try {
      const res = await complaintService.getComplaints({
        page,
        page_size: pageSize,
        category: selectedCategory || undefined,
        status: selectedStatus || undefined,
        department_id: selectedDepartment ? Number(selectedDepartment) : undefined,
        sla_escalated: onlySlaEscalated ? true : undefined,
      });

      setComplaints(res.data || []);
      setTotal(res.total || 0);
      setTotalPages(res.total_pages || 1);
    } catch (err: any) {
      error(err.message || 'Failed to load complaints');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      await complaintService.exportCSV({
        category: selectedCategory || undefined,
        status: selectedStatus || undefined,
        department_id: selectedDepartment ? Number(selectedDepartment) : undefined,
        sla_escalated: onlySlaEscalated ? true : undefined,
      });
      success('Complaint records exported to CSV successfully');
    } catch (err: any) {
      error(err.message || 'Failed to export CSV');
    } finally {
      setIsExporting(false);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setSelectedStatus('');
    setSelectedDepartment('');
    setOnlySlaEscalated(false);
    setPage(1);
  };

  // Client-side quick search filtering by Ref No, Title or Complainant
  const filteredComplaints = complaints.filter((c) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const refNo = `UC-2025-${c.id.toString().padStart(3, '0')}`.toLowerCase();
    const titleMatch = c.title.toLowerCase().includes(query);
    const userMatch = c.user?.name ? c.user.name.toLowerCase().includes(query) : false;
    return refNo.includes(query) || titleMatch || userMatch;
  });

  const handleOpenDetail = (complaint: Complaint) => {
    setActiveComplaint(complaint);
    setIsModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleQuickStatusUpdate = async (complaintId: number, newStatus: string) => {
    try {
      await complaintService.updateStatus(complaintId, newStatus);
      success(`Updated status to ${newStatus}`);
      setOpenDropdownId(null);
      loadComplaints();
    } catch (err: any) {
      error(err.message || 'Could not update status');
    }
  };

  const startIndex = (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, total);

  return (
    <div className="page-container animate-fade-in">
      {/* Header matching Screen 4 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div>
          <h1 className="page-title">Complaint Management</h1>
          <p className="page-subtitle">View, assign, triage, and resolve institutional grievances.</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={handleExportCSV}
            disabled={isExporting}
            className="btn btn-secondary"
            title="Download CSV Report"
          >
            <Download size={15} />
            <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
          </button>

          <button
            onClick={() => {
              if (complaints.length > 0) handleOpenDetail(complaints[0]);
            }}
            className="btn btn-primary"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Assign Complaint</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div
        className="card"
        style={{
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        {/* Search input */}
        <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '220px' }}>
          <Search
            size={15}
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
            className="form-input"
            placeholder="Search by ref, title, or user..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '36px', height: '38px', fontSize: '0.825rem' }}
          />
        </div>

        {/* All Categories Dropdown */}
        <select
          className="form-select"
          value={selectedCategory}
          onChange={(e) => {
            setSelectedCategory(e.target.value);
            setPage(1);
          }}
          style={{ width: 'auto', minWidth: '145px', height: '38px', fontSize: '0.825rem' }}
        >
          <option value="">All Categories</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        {/* All Statuses Dropdown */}
        <select
          className="form-select"
          value={selectedStatus}
          onChange={(e) => {
            setSelectedStatus(e.target.value);
            setPage(1);
          }}
          style={{ width: 'auto', minWidth: '135px', height: '38px', fontSize: '0.825rem' }}
        >
          <option value="">All Statuses</option>
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        {/* All Departments Dropdown */}
        <select
          className="form-select"
          value={selectedDepartment}
          onChange={(e) => {
            setSelectedDepartment(e.target.value ? Number(e.target.value) : '');
            setPage(1);
          }}
          style={{ width: 'auto', minWidth: '155px', height: '38px', fontSize: '0.825rem' }}
        >
          <option value="">All Departments</option>
          {departments.map((dept) => (
            <option key={dept.id} value={dept.id}>
              {dept.name}
            </option>
          ))}
        </select>

        {/* SLA Escalation Filter Toggle */}
        <button
          type="button"
          onClick={() => {
            setOnlySlaEscalated(!onlySlaEscalated);
            setPage(1);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '0 12px',
            height: '38px',
            borderRadius: '8px',
            fontSize: '0.8rem',
            fontWeight: 600,
            border: `1px solid ${onlySlaEscalated ? '#ea580c' : '#cbd5e1'}`,
            backgroundColor: onlySlaEscalated ? '#fff7ed' : '#ffffff',
            color: onlySlaEscalated ? '#c2410c' : '#475569',
            transition: 'all 0.15s ease',
          }}
        >
          <Clock size={14} />
          <span>SLA Escalated</span>
        </button>

        {/* Clear Filters */}
        {(searchQuery || selectedCategory || selectedStatus || selectedDepartment || onlySlaEscalated) && (
          <button
            onClick={handleResetFilters}
            className="btn btn-ghost"
            style={{ height: '38px', padding: '0 10px', fontSize: '0.78rem' }}
            title="Reset all filters"
          >
            <RotateCcw size={13} />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Complaints Data Table matching Screen 4 */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container" style={{ border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Reference No.</th>
                <th>Title</th>
                <th>Complainant</th>
                <th>Category</th>
                <th>Department</th>
                <th>Status</th>
                <th>Date Submitted</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    Loading institutional grievance records...
                  </td>
                </tr>
              ) : filteredComplaints.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    No matching complaints found. Try clearing your filters or search term.
                  </td>
                </tr>
              ) : (
                filteredComplaints.map((c) => {
                  const refNo = `UC-2025-${c.id.toString().padStart(3, '0')}`;
                  const formattedDate = new Date(c.created_at).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  });

                  // Rule 4: Complainant Anonymous Masking
                  const complainantName = c.anonymous
                    ? role === 'admin'
                      ? `${c.user?.name || 'Student'} (Anon)`
                      : 'Anonymous'
                    : c.user?.name || 'Student User';

                  const isDropdownOpen = openDropdownId === c.id;

                  return (
                    <tr key={c.id}>
                      <td>
                        <button
                          onClick={() => handleOpenDetail(c)}
                          className="ref-link"
                        >
                          {refNo}
                        </button>
                      </td>
                      <td style={{ fontWeight: 600, color: '#0f172a', maxWidth: '240px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {c.title}
                          </span>
                          {c.priority === 'critical' && <PriorityBadge priority="critical" showIcon={false} />}
                        </div>
                      </td>
                      <td style={{ color: '#334155', fontWeight: 500 }}>{complainantName}</td>
                      <td>
                        <span style={{ fontSize: '0.8rem', color: '#475569' }}>{c.category}</span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8rem', color: '#475569' }}>
                          {c.department?.name || 'Department'}
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={c.status} />
                      </td>
                      <td style={{ color: '#64748b', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                        {formattedDate}
                      </td>
                      <td style={{ textAlign: 'right', position: 'relative' }}>
                        <div style={{ display: 'inline-block', position: 'relative' }}>
                          <button
                            onClick={() =>
                              setOpenDropdownId(isDropdownOpen ? null : c.id)
                            }
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '5px 10px',
                              borderRadius: '6px',
                              border: '1px solid #cbd5e1',
                              backgroundColor: '#ffffff',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              color: '#334155',
                              transition: 'all 0.12s ease',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                          >
                            <span>View</span>
                            <ChevronDown size={13} />
                          </button>

                          {/* Action Dropdown Menu */}
                          {isDropdownOpen && (
                            <div
                              style={{
                                position: 'absolute',
                                right: 0,
                                top: '34px',
                                width: '180px',
                                backgroundColor: '#ffffff',
                                borderRadius: '8px',
                                boxShadow: 'var(--shadow-xl)',
                                border: '1px solid #e2e8f0',
                                padding: '4px',
                                zIndex: 30,
                                textAlign: 'left',
                                animation: 'fadeIn 0.12s ease-out',
                              }}
                            >
                              <button
                                onClick={() => handleOpenDetail(c)}
                                style={{
                                  width: '100%',
                                  padding: '8px 10px',
                                  fontSize: '0.8rem',
                                  color: '#0f172a',
                                  borderRadius: '4px',
                                  display: 'block',
                                  textAlign: 'left',
                                  fontWeight: 600,
                                }}
                              >
                                View Details & Activity
                              </button>

                              <div style={{ borderTop: '1px solid #f1f5f9', margin: '4px 0' }} />

                              <div
                                style={{
                                  padding: '4px 10px',
                                  fontSize: '0.675rem',
                                  fontWeight: 700,
                                  color: '#94a3b8',
                                  textTransform: 'uppercase',
                                }}
                              >
                                Transition Status:
                              </div>

                              {c.status !== 'in-progress' && (
                                <button
                                  onClick={() => handleQuickStatusUpdate(c.id, 'in-progress')}
                                  style={{
                                    width: '100%',
                                    padding: '6px 10px',
                                    fontSize: '0.78rem',
                                    color: '#0369a1',
                                    borderRadius: '4px',
                                    display: 'block',
                                    textAlign: 'left',
                                  }}
                                >
                                  Mark In Progress
                                </button>
                              )}

                              {c.status !== 'resolved' && (
                                <button
                                  onClick={() => handleQuickStatusUpdate(c.id, 'resolved')}
                                  style={{
                                    width: '100%',
                                    padding: '6px 10px',
                                    fontSize: '0.78rem',
                                    color: '#15803d',
                                    borderRadius: '4px',
                                    display: 'block',
                                    textAlign: 'left',
                                  }}
                                >
                                  Mark Resolved
                                </button>
                              )}

                              {c.status !== 'closed' && (
                                <button
                                  onClick={() => handleQuickStatusUpdate(c.id, 'closed')}
                                  style={{
                                    width: '100%',
                                    padding: '6px 10px',
                                    fontSize: '0.78rem',
                                    color: '#475569',
                                    borderRadius: '4px',
                                    display: 'block',
                                    textAlign: 'left',
                                  }}
                                >
                                  Close Complaint
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer with Pagination matching Screen 4 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 24px',
            borderTop: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ fontSize: '0.825rem', color: '#64748b' }}>
            Showing {total === 0 ? 0 : startIndex} to {endIndex} of {total} complaints
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || isLoading}
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
            >
              Previous
            </button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
              const pageNum = idx + 1;
              const isActive = page === pageNum;
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    fontSize: '0.825rem',
                    fontWeight: 700,
                    backgroundColor: isActive ? '#1d4ed8' : '#ffffff',
                    color: isActive ? '#ffffff' : '#475569',
                    border: `1px solid ${isActive ? '#1d4ed8' : '#cbd5e1'}`,
                    transition: 'all 0.12s ease',
                  }}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || isLoading}
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <ComplaintDetailModal
        complaint={activeComplaint}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onStatusUpdated={(updated) => {
          setActiveComplaint(updated);
          loadComplaints();
        }}
      />
    </div>
  );
};
