import React, { useState, useEffect } from 'react';
import { Complaint, Comment, ComplaintStatus } from '../../types/api';
import { complaintService } from '../../services/complaint.service';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';
import { Modal } from '../common/Modal';
import { StatusBadge, PriorityBadge, SlaBadge } from '../common/Badge';
import {
  Calendar,
  Building,
  Tag,
  User as UserIcon,
  Send,
  Check,
  AlertTriangle,
  FileCheck,
} from 'lucide-react';

interface ComplaintDetailModalProps {
  complaint: Complaint | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdated?: (updated: Complaint) => void;
}

const STEPS: { status: ComplaintStatus; label: string }[] = [
  { status: 'pending', label: 'Under Review' },
  { status: 'in-progress', label: 'In Progress' },
  { status: 'resolved', label: 'Resolved' },
  { status: 'closed', label: 'Closed' },
];

export const ComplaintDetailModal: React.FC<ComplaintDetailModalProps> = ({
  complaint,
  isOpen,
  onClose,
  onStatusUpdated,
}) => {
  const { role } = useAuth();
  const { success, error } = useToast();

  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  useEffect(() => {
    if (complaint && isOpen) {
      setSelectedStatus(complaint.status);
      loadComments(complaint.id);
    }
  }, [complaint, isOpen]);

  const loadComments = async (complaintId: number) => {
    try {
      const data = await complaintService.getComments(complaintId);
      setComments(data || []);
    } catch {
      // ignore
    }
  };

  if (!complaint) return null;

  const refNumber = `UC-2025-${complaint.id.toString().padStart(3, '0')}`;
  const isStaffOrAdmin = role === 'admin' || role === 'staff';

  const getStepIndex = (status: ComplaintStatus) => {
    switch (status) {
      case 'pending':
        return 0;
      case 'in-progress':
        return 1;
      case 'resolved':
        return 2;
      case 'closed':
        return 3;
      default:
        return 0;
    }
  };

  const currentStepIndex = getStepIndex(complaint.status);

  const getAvailableTransitions = (current: ComplaintStatus) => {
    switch (current) {
      case 'pending':
        return ['pending', 'in-progress', 'resolved', 'closed'];
      case 'in-progress':
        return ['in-progress', 'resolved', 'closed', 'pending'];
      case 'resolved':
        return ['resolved', 'closed'];
      case 'closed':
        return ['closed'];
      default:
        return ['pending', 'in-progress', 'resolved', 'closed'];
    }
  };

  const handleStatusChange = async () => {
    if (selectedStatus === complaint.status) return;
    setIsUpdatingStatus(true);
    try {
      const updated = await complaintService.updateStatus(complaint.id, selectedStatus);
      success(`Status transitioned to ${selectedStatus}`);
      if (onStatusUpdated) onStatusUpdated(updated);
    } catch (err: any) {
      error(err.message || 'Failed to update status');
      setSelectedStatus(complaint.status);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsSubmittingComment(true);
    try {
      const comment = await complaintService.addComment(complaint.id, newComment.trim());
      setComments((prev) => [...prev, comment]);
      setNewComment('');
      success('Response posted');
    } catch (err: any) {
      error(err.message || 'Failed to post comment');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const formattedDate = new Date(complaint.created_at).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const complainantDisplay = complaint.anonymous
    ? role === 'admin'
      ? `${complaint.user?.name || 'Student'} (Anonymous to staff)`
      : 'Anonymous Student'
    : complaint.user?.name || 'Student User';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${refNumber} — ${complaint.title}`}
      subtitle={`Submitted on ${formattedDate}`}
      maxWidth="800px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Calm Stepper */}
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: '#fafafa',
            borderRadius: '12px',
            border: '1px solid #e4e4e7',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'relative',
            }}
          >
            {STEPS.map((step, idx) => {
              const isCompleted = idx < currentStepIndex || (idx === currentStepIndex && complaint.status === 'closed');
              const isCurrent = idx === currentStepIndex && complaint.status !== 'closed';

              return (
                <React.Fragment key={step.status}>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      position: 'relative',
                      zIndex: 2,
                    }}
                  >
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        backgroundColor: isCompleted
                          ? '#18181b'
                          : isCurrent
                          ? '#18181b'
                          : '#ffffff',
                        color: isCompleted || isCurrent ? '#ffffff' : '#a1a1aa',
                        border: isCompleted || isCurrent
                          ? '2px solid #18181b'
                          : '2px solid #d4d4d8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {isCompleted ? (
                        <Check size={14} strokeWidth={2.5} />
                      ) : (
                        <span style={{ fontSize: '0.725rem', fontWeight: 600 }}>{idx + 1}</span>
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: '0.725rem',
                        fontWeight: isCurrent ? 700 : 500,
                        color: isCurrent ? '#09090b' : '#71717a',
                        marginTop: '5px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {step.label}
                    </span>
                  </div>

                  {idx < STEPS.length - 1 && (
                    <div
                      style={{
                        flex: 1,
                        height: '1.5px',
                        backgroundColor: idx < currentStepIndex ? '#18181b' : '#e4e4e7',
                        margin: '0 6px',
                        marginTop: '-18px',
                      }}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Top Info Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            padding: '12px 16px',
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e4e4e7',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: '#71717a' }}>Status:</span>
            <StatusBadge status={complaint.status} />
            <PriorityBadge priority={complaint.priority} />
            <SlaBadge escalated={complaint.sla_escalated} />
          </div>

          {/* Status Transition Selector for Staff/Admin */}
          {isStaffOrAdmin && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                disabled={complaint.status === 'closed' || isUpdatingStatus}
                className="form-select"
                style={{
                  padding: '5px 10px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  width: 'auto',
                  cursor: complaint.status === 'closed' ? 'not-allowed' : 'pointer',
                }}
              >
                {getAvailableTransitions(complaint.status).map((s) => (
                  <option key={s} value={s}>
                    {s === 'pending'
                      ? 'Under Review'
                      : s === 'in-progress'
                      ? 'In Progress'
                      : s === 'resolved'
                      ? 'Resolved'
                      : 'Closed'}
                  </option>
                ))}
              </select>

              {selectedStatus !== complaint.status && (
                <button
                  onClick={handleStatusChange}
                  disabled={isUpdatingStatus}
                  className="btn btn-primary"
                  style={{ padding: '5px 12px', fontSize: '0.78rem' }}
                >
                  Update
                </button>
              )}
            </div>
          )}
        </div>

        {/* Details Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
            fontSize: '0.8rem',
            backgroundColor: '#fafafa',
            padding: '12px 16px',
            borderRadius: '10px',
            border: '1px solid #e4e4e7',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#71717a' }}>
            <Tag size={14} />
            <span>Category:</span>
            <strong style={{ color: '#18181b' }}>{complaint.category}</strong>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#71717a' }}>
            <Building size={14} />
            <span>Department:</span>
            <strong style={{ color: '#18181b' }}>
              {complaint.department?.name || 'Assigned Department'}
            </strong>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#71717a' }}>
            <UserIcon size={14} />
            <span>Submitted by:</span>
            <strong style={{ color: '#18181b' }}>{complainantDisplay}</strong>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#71717a' }}>
            <Calendar size={14} />
            <span>Date:</span>
            <strong style={{ color: '#18181b' }}>{formattedDate}</strong>
          </div>
        </div>

        {/* Description */}
        <div>
          <h4 style={{ fontSize: '0.825rem', fontWeight: 600, color: '#18181b', marginBottom: '6px' }}>
            Description
          </h4>
          <div
            style={{
              padding: '14px 16px',
              backgroundColor: '#ffffff',
              border: '1px solid #e4e4e7',
              borderRadius: '10px',
              fontSize: '0.85rem',
              color: '#3f3f46',
              whiteSpace: 'pre-wrap',
              lineHeight: 1.6,
            }}
          >
            {complaint.description}
          </div>
        </div>

        {/* SLA Notice */}
        {complaint.sla_escalated && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
              backgroundColor: '#fff7ed',
              borderRadius: '8px',
              border: '1px solid #fed7aa',
              color: '#9a3412',
              fontSize: '0.8rem',
            }}
          >
            <AlertTriangle size={16} />
            <span>
              <strong>Automated SLA Escalation active:</strong> This complaint received high priority
              routing for student safety.
            </span>
          </div>
        )}

        {/* Comments / Discussion Thread */}
        <div style={{ borderTop: '1px solid #f4f4f5', paddingTop: '16px' }}>
          <h4
            style={{
              fontSize: '0.85rem',
              fontWeight: 600,
              color: '#18181b',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <FileCheck size={16} />
            Responses ({comments.length})
          </h4>

          {/* Comments List */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              maxHeight: '220px',
              overflowY: 'auto',
              marginBottom: '14px',
            }}
          >
            {comments.length === 0 ? (
              <div
                style={{
                  padding: '20px',
                  textAlign: 'center',
                  color: '#a1a1aa',
                  fontSize: '0.8rem',
                  backgroundColor: '#fafafa',
                  borderRadius: '8px',
                }}
              >
                No updates or comments yet.
              </div>
            ) : (
              comments.map((c) => {
                const isStaffComment = c.role === 'staff' || c.role === 'admin';
                const commentDate = new Date(c.created_at).toLocaleString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={c.id}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      backgroundColor: isStaffComment ? '#fafafa' : '#ffffff',
                      border: `1px solid ${isStaffComment ? '#e4e4e7' : '#f4f4f5'}`,
                      fontSize: '0.825rem',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '4px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 600, color: '#18181b' }}>
                          {c.user?.name || (isStaffComment ? 'Support Staff' : 'Student')}
                        </span>
                        <span
                          style={{
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            padding: '1px 5px',
                            borderRadius: '4px',
                            backgroundColor: '#f4f4f5',
                            color: '#52525b',
                            textTransform: 'uppercase',
                          }}
                        >
                          {c.role}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.7rem', color: '#a1a1aa' }}>{commentDate}</span>
                    </div>
                    <div style={{ color: '#3f3f46', lineHeight: 1.5 }}>{c.content}</div>
                  </div>
                );
              })
            )}
          </div>

          {/* Add Comment Input */}
          <form onSubmit={handlePostComment} style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder="Write a response..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="form-input"
              style={{ flex: 1, padding: '8px 12px' }}
            />
            <button
              type="submit"
              disabled={isSubmittingComment || !newComment.trim()}
              className="btn btn-primary"
              style={{ padding: '8px 16px' }}
            >
              <Send size={14} />
              <span>Send</span>
            </button>
          </form>
        </div>
      </div>
    </Modal>
  );
};
