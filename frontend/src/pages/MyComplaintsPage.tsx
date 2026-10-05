import React, { useState, useEffect } from 'react';
import { complaintService } from '../services/complaint.service';
import { Complaint } from '../types/api';
import { StatusBadge, PriorityBadge } from '../components/common/Badge';
import { ComplaintDetailModal } from '../components/complaints/ComplaintDetailModal';
import { SkeletonTable } from '../components/common/Skeleton';
import { EmptyState } from '../components/common/EmptyState';
import { Plus, Search, Filter, Paperclip } from 'lucide-react';

interface MyComplaintsPageProps {
  onNavigateToSubmit: () => void;
  initialComplaintId?: number;
}

export const MyComplaintsPage: React.FC<MyComplaintsPageProps> = ({ onNavigateToSubmit, initialComplaintId }) => {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadComplaints();
  }, [statusFilter]);

  useEffect(() => {
    if (!initialComplaintId) return;

    complaintService.getComplaint(initialComplaintId).then((complaint) => {
      setSelectedComplaint(complaint);
      setIsModalOpen(true);
    }).catch(() => {
      // The complaint may no longer be available to the current user.
    });
  }, [initialComplaintId]);

  const loadComplaints = async () => {
    setIsLoading(true);
    try {
      const res = await complaintService.getComplaints({
        status: statusFilter || undefined,
        page_size: 50,
      });
      setComplaints(res.data || []);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = complaints.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const ref = `UC-2025-${c.id.toString().padStart(3, '0')}`.toLowerCase();
    return ref.includes(q) || c.title.toLowerCase().includes(q);
  });

  return (
    <div className="page-container animate-fade-in">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
        }}
      >
        <div>
          <h1 className="page-title">My Complaints</h1>
          <p className="page-subtitle">Track and view updates on all grievances you have reported.</p>
        </div>

        <button onClick={onNavigateToSubmit} className="btn btn-primary">
          <Plus size={16} strokeWidth={2.5} />
          <span>Submit Complaint</span>
        </button>
      </div>

      <div
        className="card"
        style={{
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ position: 'relative', flex: '1 1 240px' }}>
          <Search
            size={16}
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
            placeholder="Search my complaints..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '36px', height: '40px' }}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="form-select"
          style={{ width: 'auto', minWidth: '150px', height: '40px' }}
        >
          <option value="">All Statuses</option>
          <option value="pending">Under Review</option>
          <option value="in-progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-container" style={{ border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Reference Number</th>
                <th>Title</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Date Submitted</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '24px 12px' }}>
                    <SkeletonTable rows={5} columns={7} />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '16px' }}>
                    <EmptyState
                      title="No complaints match your filters"
                      description={search || statusFilter ? 'Try clearing your search query or status filter to see other records.' : "You haven't logged any complaints yet."}
                      actionLabel={search || statusFilter ? undefined : "Submit a Complaint"}
                      onAction={onNavigateToSubmit}
                    />
                  </td>
                </tr>
              ) : (
                filtered.map((c) => {
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
                          onClick={() => {
                            setSelectedComplaint(c);
                            setIsModalOpen(true);
                          }}
                          className="ref-link"
                          style={{ fontFamily: 'inherit' }}
                        >
                          {refNo}
                        </button>
                      </td>
                      <td style={{ fontWeight: 500, color: '#1e293b' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>{c.title}</span>
                          {c.attachments && c.attachments.length > 0 && (
                            <span
                              title={`${c.attachments.length} attached file(s)`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                backgroundColor: '#eff6ff',
                                color: '#2563eb',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                              }}
                            >
                              <Paperclip size={11} />
                              {c.attachments.length}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>{c.category}</td>
                      <td>
                        <PriorityBadge priority={c.priority} />
                      </td>
                      <td>
                        <StatusBadge status={c.status} />
                      </td>
                      <td>{formatted}</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          onClick={() => {
                            setSelectedComplaint(c);
                            setIsModalOpen(true);
                          }}
                          style={{
                            color: '#2563eb',
                            fontWeight: 600,
                            fontSize: '0.85rem',
                          }}
                        >
                          View Details
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

      <ComplaintDetailModal
        complaint={selectedComplaint}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onStatusUpdated={(updated) => {
          setSelectedComplaint(updated);
          loadComplaints();
        }}
      />
    </div>
  );
};
