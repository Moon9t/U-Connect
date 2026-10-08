import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { complaintService } from '../services/complaint.service';
import { departmentService } from '../services/department.service';
import { Complaint, Department, ComplaintCategory } from '../types/api';
import { StatusBadge, PriorityBadge } from '../components/common/Badge';
import { ComplaintDetailModal } from '../components/complaints/ComplaintDetailModal';
import { SkeletonTable } from '../components/common/Skeleton';
import { EmptyState } from '../components/common/EmptyState';
import { OperationalPulseWidget } from '../components/common/OperationalPulseWidget';
import { ConfirmModal } from '../components/common/ConfirmModal';
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
  Paperclip,
  Pencil,
  Trash2,
  Save,
  X,
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

export const AdminComplaintManagementPage: React.FC<
  AdminComplaintManagementPageProps
> = ({ initialComplaintId }) => {
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

  // Edit state
  const [editingComplaint, setEditingComplaint] =
    useState<Complaint | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete state
  const [deletingComplaint, setDeletingComplaint] =
    useState<Complaint | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    loadDepartments();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    loadComplaints();
  }, [
    page,
    debouncedSearch,
    selectedCategory,
    selectedStatus,
    selectedDepartment,
    onlySlaEscalated,
  ]);

  useEffect(() => {
    if (!initialComplaintId) return;

    complaintService
      .getComplaint(initialComplaintId)
      .then((complaint) => {
        handleOpenDetail(complaint);
      })
      .catch(() => {
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
        search: debouncedSearch.trim() || undefined,
        category: selectedCategory || undefined,
        status: selectedStatus || undefined,
        department_id: selectedDepartment
          ? Number(selectedDepartment)
          : undefined,
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

  const handleExportPDF = async () => {
    setIsExporting(true);

    try {
      await complaintService.exportPDF({
        search: debouncedSearch.trim() || undefined,
        category: selectedCategory || undefined,
        status: selectedStatus || undefined,
        department_id: selectedDepartment
          ? Number(selectedDepartment)
          : undefined,
        sla_escalated: onlySlaEscalated ? true : undefined,
      });

      success('Audit report exported to PDF successfully');
    } catch (err: any) {
      error(err.message || 'Failed to export PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setDebouncedSearch('');
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
    const refNo = c.reference_number.toLowerCase();
    const titleMatch = c.title.toLowerCase().includes(query);
    const userMatch = c.user?.name
      ? c.user.name.toLowerCase().includes(query)
      : false;

    return refNo.includes(query) || titleMatch || userMatch;
  });

  const handleOpenDetail = (complaint: Complaint) => {
    setActiveComplaint(complaint);
    setIsModalOpen(true);
    setOpenDropdownId(null);
  };

  const handleOpenEdit = (complaint: Complaint) => {
    setEditingComplaint(complaint);
    setEditTitle(complaint.title || '');
    setEditDescription(complaint.description || '');
    setEditCategory(complaint.category || '');
    setEditLocation(complaint.location || '');
    setOpenDropdownId(null);
  };

  const handleSaveEdit = async () => {
    if (!editingComplaint) return;

    if (!editTitle.trim()) {
      error('Complaint title is required');
      return;
    }

    if (editTitle.trim().length < 5) {
      error('Title must be at least 5 characters');
      return;
    }

    if (editTitle.trim().length > 80) {
      error('Title cannot exceed 80 characters');
      return;
    }

    if (!editCategory) {
      error('Please select a category');
      return;
    }

    if (!editDescription.trim()) {
      error('Complaint description is required');
      return;
    }

    if (editDescription.trim().length < 15) {
      error('Description must contain at least 15 characters');
      return;
    }

    setIsSavingEdit(true);

    try {
      const updated = await complaintService.updateComplaint(
        editingComplaint.id,
        {
          title: editTitle.trim(),
          description: editDescription.trim(),
          category: editCategory,
          location: editLocation.trim(),
        }
      );

      setComplaints((current) =>
        current.map((complaint) =>
          complaint.id === updated.id ? updated : complaint
        )
      );

      if (activeComplaint?.id === updated.id) {
        setActiveComplaint(updated);
      }

      setEditingComplaint(null);

      success(
        `Complaint ${updated.reference_number} updated successfully.`
      );

      await loadComplaints();
    } catch (err: any) {
      error(err.message || 'Could not update complaint');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteComplaint = async () => {
    if (!deletingComplaint) return;

    setIsDeleting(true);

    try {
      const deletedReference = deletingComplaint.reference_number;

      await complaintService.deleteComplaint(deletingComplaint.id);

      if (activeComplaint?.id === deletingComplaint.id) {
        setActiveComplaint(null);
        setIsModalOpen(false);
      }

      setDeletingComplaint(null);
      setOpenDropdownId(null);

      success(
        `Complaint ${deletedReference} deleted successfully.`
      );

      await loadComplaints();
    } catch (err: any) {
      error(err.message || 'Could not delete complaint');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleQuickStatusUpdate = async (
    complaintId: number,
    newStatus: string
  ) => {
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
          <p className="page-subtitle">
            View, assign, triage, and resolve institutional grievances.
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <button
            onClick={handleExportPDF}
            disabled={isExporting}
            className="btn btn-secondary"
            title="Download PDF Report"
          >
            <Download size={15} />
            <span>
              {isExporting ? 'Generating PDF...' : 'Export PDF'}
            </span>
          </button>

          <button
            onClick={() => {
              if (complaints.length > 0) {
                handleOpenDetail(complaints[0]);
              }
            }}
            className="btn btn-primary"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Assign Complaint</span>
          </button>
        </div>
      </div>

      {/* Operational Pulse Telemetry & Live Event Stream */}
      <OperationalPulseWidget
        totalMonitored={total}
        slaBreachCount={40}
        averageHours={24.6}
      />

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
        <div
          style={{
            position: 'relative',
            flex: '1 1 240px',
            minWidth: '220px',
          }}
        >
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
            style={{
              paddingLeft: '36px',
              height: '38px',
              fontSize: '0.825rem',
            }}
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
          style={{
            width: 'auto',
            minWidth: '145px',
            height: '38px',
            fontSize: '0.825rem',
          }}
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
          style={{
            width: 'auto',
            minWidth: '135px',
            height: '38px',
            fontSize: '0.825rem',
          }}
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
            setSelectedDepartment(
              e.target.value ? Number(e.target.value) : ''
            );
            setPage(1);
          }}
          style={{
            width: 'auto',
            minWidth: '155px',
            height: '38px',
            fontSize: '0.825rem',
          }}
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
            border: `1px solid ${
              onlySlaEscalated ? '#ea580c' : '#cbd5e1'
            }`,
            backgroundColor: onlySlaEscalated
              ? '#fff7ed'
              : '#ffffff',
            color: onlySlaEscalated
              ? '#c2410c'
              : '#475569',
            transition: 'all 0.15s ease',
          }}
        >
          <Clock size={14} />
          <span>SLA Escalated</span>
        </button>

        {/* Clear Filters */}
        {(searchQuery ||
          selectedCategory ||
          selectedStatus ||
          selectedDepartment ||
          onlySlaEscalated) && (
          <button
            onClick={handleResetFilters}
            className="btn btn-ghost"
            style={{
              height: '38px',
              padding: '0 10px',
              fontSize: '0.78rem',
            }}
            title="Reset all filters"
          >
            <RotateCcw size={13} />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Complaints Data Table matching Screen 4 */}
      <div
        className="card"
        style={{
          padding: 0,
          overflow: 'hidden',
        }}
      >
        <div
          className="table-container"
          style={{
            border: 'none',
          }}
        >
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
                <th style={{ textAlign: 'right' }}>
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      padding: '24px 12px',
                    }}
                  >
                    <SkeletonTable
                      rows={6}
                      columns={8}
                    />
                  </td>
                </tr>
              ) : filteredComplaints.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      padding: '16px',
                    }}
                  >
                    <EmptyState
                      title="No matching complaints found"
                      description="No records match your active category, priority, status, or search filters. Try resetting filters."
                      actionLabel="Reset Filters"
                      onAction={() => {
                        setSearchQuery('');
                        setSelectedCategory('');
                        setSelectedStatus('');
                        setSelectedDepartment('');
                        setOnlySlaEscalated(false);
                      }}
                    />
                  </td>
                </tr>
              ) : (
                filteredComplaints.map((c) => {
                  const refNo = c.reference_number;

                  const formattedDate =
                    new Date(c.created_at).toLocaleDateString(
                      'en-GB',
                      {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      }
                    );

                  // Rule 4: Complainant Anonymous Masking
                  const complainantName = c.anonymous
                    ? role === 'admin'
                      ? `${c.user?.name || 'Student'} (Anon)`
                      : 'Anonymous'
                    : c.user?.name || 'Student User';

                  const isDropdownOpen =
                    openDropdownId === c.id;

                  return (
                    <tr key={c.id}>
                      <td>
                        <button
                          onClick={() =>
                            handleOpenDetail(c)
                          }
                          className="ref-link"
                        >
                          {refNo}
                        </button>
                      </td>

                      <td
                        style={{
                          fontWeight: 600,
                          color: '#0f172a',
                          maxWidth: '240px',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <span
                            style={{
                              textOverflow: 'ellipsis',
                              overflow: 'hidden',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {c.title}
                          </span>

                          {c.attachments &&
                            c.attachments.length > 0 && (
                              <span
                                title={`${c.attachments.length} attachment(s)`}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '2px',
                                  padding: '1px 5px',
                                  borderRadius: '4px',
                                  backgroundColor: '#eff6ff',
                                  color: '#2563eb',
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                }}
                              >
                                <Paperclip size={10} />
                                {c.attachments.length}
                              </span>
                            )}

                          {c.priority === 'critical' && (
                            <PriorityBadge
                              priority="critical"
                              showIcon={false}
                            />
                          )}
                        </div>
                      </td>

                      <td
                        style={{
                          color: '#334155',
                          fontWeight: 500,
                        }}
                      >
                        {complainantName}
                      </td>

                      <td>
                        <span
                          style={{
                            fontSize: '0.8rem',
                            color: '#475569',
                          }}
                        >
                          {c.category}
                        </span>
                      </td>

                      <td>
                        <span
                          style={{
                            fontSize: '0.8rem',
                            color: '#475569',
                          }}
                        >
                          {c.department?.name || 'Department'}
                        </span>
                      </td>

                      <td>
                        <StatusBadge status={c.status} />
                      </td>

                      <td
                        style={{
                          color: '#64748b',
                          fontSize: '0.8rem',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {formattedDate}
                      </td>

                      <td
                        style={{
                          textAlign: 'right',
                          position: 'relative',
                        }}
                      >
                        <div
                          style={{
                            display: 'inline-block',
                            position: 'relative',
                          }}
                        >
                          <button
                            onClick={() =>
                              setOpenDropdownId(
                                isDropdownOpen
                                  ? null
                                  : c.id
                              )
                            }
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '5px 10px',
                              borderRadius: '6px',
                              border:
                                '1px solid #cbd5e1',
                              backgroundColor: '#ffffff',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              color: '#334155',
                              transition:
                                'all 0.12s ease',
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.backgroundColor =
                                '#f8fafc')
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.backgroundColor =
                                '#ffffff')
                            }
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
                                width: '190px',
                                backgroundColor: '#ffffff',
                                borderRadius: '8px',
                                boxShadow:
                                  'var(--shadow-xl)',
                                border:
                                  '1px solid #e2e8f0',
                                padding: '4px',
                                zIndex: 30,
                                textAlign: 'left',
                                animation:
                                  'fadeIn 0.12s ease-out',
                              }}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  handleOpenDetail(c)
                                }
                                style={{
                                  width: '100%',
                                  padding: '8px 10px',
                                  fontSize: '0.8rem',
                                  color: '#0f172a',
                                  borderRadius: '4px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  textAlign: 'left',
                                  fontWeight: 600,
                                  backgroundColor:
                                    '#ffffff',
                                  border: 'none',
                                  cursor: 'pointer',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor =
                                    '#f8fafc';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor =
                                    '#ffffff';
                                }}
                              >
                                <span>
                                  View Details & Activity
                                </span>
                              </button>

                              {/* Edit Complaint - Staff and Admin */}
                              {(role === 'staff' ||
                                role === 'admin') && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleOpenEdit(c)
                                  }
                                  style={{
                                    width: '100%',
                                    padding: '8px 10px',
                                    fontSize: '0.8rem',
                                    color: '#334155',
                                    borderRadius: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    textAlign: 'left',
                                    fontWeight: 600,
                                    backgroundColor:
                                      '#ffffff',
                                    border: 'none',
                                    cursor: 'pointer',
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor =
                                      '#f8fafc';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor =
                                      '#ffffff';
                                  }}
                                >
                                  <Pencil size={14} />
                                  <span>
                                    Edit Complaint
                                  </span>
                                </button>
                              )}

                              {/* Delete Complaint - Admin Only */}
                              {role === 'admin' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDeletingComplaint(c);
                                    setOpenDropdownId(null);
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '8px 10px',
                                    fontSize: '0.8rem',
                                    color: '#dc2626',
                                    borderRadius: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    textAlign: 'left',
                                    fontWeight: 600,
                                    backgroundColor:
                                      '#ffffff',
                                    border: 'none',
                                    cursor: 'pointer',
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor =
                                      '#fef2f2';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor =
                                      '#ffffff';
                                  }}
                                >
                                  <Trash2 size={14} />
                                  <span>
                                    Delete Complaint
                                  </span>
                                </button>
                              )}

                              <div
                                style={{
                                  borderTop:
                                    '1px solid #f1f5f9',
                                  margin: '4px 0',
                                }}
                              />

                              <div
                                style={{
                                  padding: '4px 10px',
                                  fontSize: '0.675rem',
                                  fontWeight: 700,
                                  color: '#94a3b8',
                                  textTransform:
                                    'uppercase',
                                }}
                              >
                                Transition Status:
                              </div>

                              {c.status !== 'in-progress' && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleQuickStatusUpdate(
                                      c.id,
                                      'in-progress'
                                    )
                                  }
                                  style={{
                                    width: '100%',
                                    padding: '6px 10px',
                                    fontSize: '0.78rem',
                                    color: '#0369a1',
                                    borderRadius: '4px',
                                    display: 'block',
                                    textAlign: 'left',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                  }}
                                >
                                  Mark In Progress
                                </button>
                              )}

                              {c.status !== 'resolved' && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleQuickStatusUpdate(
                                      c.id,
                                      'resolved'
                                    )
                                  }
                                  style={{
                                    width: '100%',
                                    padding: '6px 10px',
                                    fontSize: '0.78rem',
                                    color: '#15803d',
                                    borderRadius: '4px',
                                    display: 'block',
                                    textAlign: 'left',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                  }}
                                >
                                  Mark Resolved
                                </button>
                              )}

                              {c.status !== 'closed' && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleQuickStatusUpdate(
                                      c.id,
                                      'closed'
                                    )
                                  }
                                  style={{
                                    width: '100%',
                                    padding: '6px 10px',
                                    fontSize: '0.78rem',
                                    color: '#475569',
                                    borderRadius: '4px',
                                    display: 'block',
                                    textAlign: 'left',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
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
          <div
            style={{
              fontSize: '0.825rem',
              color: '#64748b',
            }}
          >
            Showing {total === 0 ? 0 : startIndex} to{' '}
            {endIndex} of {total} complaints
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <button
              onClick={() =>
                setPage((p) => Math.max(1, p - 1))
              }
              disabled={page === 1 || isLoading}
              className="btn btn-secondary"
              style={{
                padding: '6px 12px',
                fontSize: '0.8rem',
              }}
            >
              Previous
            </button>

            {Array.from(
              {
                length: Math.min(5, totalPages),
              },
              (_, idx) => {
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
                      backgroundColor: isActive
                        ? '#1d4ed8'
                        : '#ffffff',
                      color: isActive
                        ? '#ffffff'
                        : '#475569',
                      border: `1px solid ${
                        isActive
                          ? '#1d4ed8'
                          : '#cbd5e1'
                      }`,
                      transition: 'all 0.12s ease',
                    }}
                  >
                    {pageNum}
                  </button>
                );
              }
            )}

            <button
              onClick={() =>
                setPage((p) =>
                  Math.min(totalPages, p + 1)
                )
              }
              disabled={
                page === totalPages || isLoading
              }
              className="btn btn-secondary"
              style={{
                padding: '6px 12px',
                fontSize: '0.8rem',
              }}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Edit Complaint Modal */}
      {editingComplaint && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor:
              'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9998,
            padding: '24px',
          }}
          onClick={() => {
            if (!isSavingEdit) {
              setEditingComplaint(null);
            }
          }}
        >
          <div
            className="card"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '700px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '28px',
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              boxShadow:
                '0 20px 50px rgba(15, 23, 42, 0.2)',
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '24px',
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: '1.2rem',
                    fontWeight: 700,
                    color: '#0f172a',
                  }}
                >
                  Edit Complaint
                </h2>

                <p
                  style={{
                    margin: '5px 0 0',
                    fontSize: '0.8rem',
                    color: '#64748b',
                  }}
                >
                  {editingComplaint.reference_number}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setEditingComplaint(null)
                }
                disabled={isSavingEdit}
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '8px',
                  border:
                    '1px solid #e2e8f0',
                  backgroundColor: '#ffffff',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: isSavingEdit
                    ? 'not-allowed'
                    : 'pointer',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Title */}
            <div
              className="form-group"
              style={{
                marginBottom: '18px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent:
                    'space-between',
                  alignItems: 'center',
                  marginBottom: '6px',
                }}
              >
                <label
                  className="form-label"
                  style={{ marginBottom: 0 }}
                >
                  Grievance Title{' '}
                  <span className="required">
                    *
                  </span>
                </label>

                <span
                  style={{
                    fontSize: '0.75rem',
                    color:
                      editTitle.length > 70
                        ? '#dc2626'
                        : '#94a3b8',
                  }}
                >
                  {editTitle.length}/80
                </span>
              </div>

              <input
                type="text"
                className="form-input"
                value={editTitle}
                maxLength={80}
                onChange={(e) =>
                  setEditTitle(e.target.value)
                }
                disabled={isSavingEdit}
              />
            </div>

            {/* Category + Location */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '18px',
                marginBottom: '18px',
              }}
            >
              <div>
                <label className="form-label">
                  Category{' '}
                  <span className="required">
                    *
                  </span>
                </label>

                <select
                  className="form-select"
                  value={editCategory}
                  onChange={(e) =>
                    setEditCategory(e.target.value)
                  }
                  disabled={isSavingEdit}
                >
                  <option value="">
                    -- Select a category --
                  </option>

                  {CATEGORIES.map((cat) => (
                    <option
                      key={cat}
                      value={cat}
                    >
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">
                  Location / Room
                </label>

                <input
                  type="text"
                  className="form-input"
                  value={editLocation}
                  onChange={(e) =>
                    setEditLocation(e.target.value)
                  }
                  disabled={isSavingEdit}
                />
              </div>
            </div>

            {/* Description */}
            <div
              className="form-group"
              style={{
                marginBottom: '24px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent:
                    'space-between',
                  alignItems: 'center',
                  marginBottom: '6px',
                }}
              >
                <label
                  className="form-label"
                  style={{ marginBottom: 0 }}
                >
                  Detailed Description{' '}
                  <span className="required">
                    *
                  </span>
                </label>

                <span
                  style={{
                    fontSize: '0.72rem',
                    color: '#94a3b8',
                  }}
                >
                  {editDescription.length}{' '}
                  characters
                </span>
              </div>

              <textarea
                className="form-textarea"
                rows={6}
                value={editDescription}
                onChange={(e) =>
                  setEditDescription(
                    e.target.value
                  )
                }
                disabled={isSavingEdit}
              />
            </div>

            {/* Actions */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                paddingTop: '18px',
                borderTop:
                  '1px solid #e2e8f0',
              }}
            >
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() =>
                  setEditingComplaint(null)
                }
                disabled={isSavingEdit}
              >
                Cancel
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveEdit}
                disabled={isSavingEdit}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '7px',
                }}
              >
                <Save size={15} />

                {isSavingEdit
                  ? 'Saving...'
                  : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Complaint Confirmation */}
      <ConfirmModal
        isOpen={deletingComplaint !== null}
        onClose={() => {
          if (!isDeleting) {
            setDeletingComplaint(null);
          }
        }}
        onConfirm={handleDeleteComplaint}
        title="Delete Complaint Permanently"
        message={
          deletingComplaint
            ? `Are you sure you want to permanently delete complaint ${deletingComplaint.reference_number}? This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete Complaint"
        confirmVariant="danger"
        isLoading={isDeleting}
      />

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
