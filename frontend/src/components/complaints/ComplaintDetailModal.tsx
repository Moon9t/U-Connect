import React, { useState, useEffect, useRef } from 'react';
import { Complaint, Comment, ComplaintStatus, Attachment, Department } from '../../types/api';
import { complaintService } from '../../services/complaint.service';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../common/Toast';
import { Modal } from '../common/Modal';
import { ConfirmModal } from '../common/ConfirmModal';
import { StatusBadge, PriorityBadge, SlaBadge } from '../common/Badge';
import { LifecycleStepper } from './LifecycleStepper';
import { Skeleton } from '../common/Skeleton';
import { departmentService } from '../../services/department.service';
import {
  Calendar,
  Building,
  Tag,
  User as UserIcon,
  Send,
  AlertTriangle,
  FileCheck,
  Paperclip,
  Download,
  ExternalLink,
  Plus,
  FileText,
  X as CloseIcon,
} from 'lucide-react';

interface ComplaintDetailModalProps {
  complaint: Complaint | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdated?: (updated: Complaint) => void;
}

export const ComplaintDetailModal: React.FC<ComplaintDetailModalProps> = ({
  complaint,
  isOpen,
  onClose,
  onStatusUpdated,
}) => {
  const { role } = useAuth();
  const { success, error } = useToast();

  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingStatusTarget, setPendingStatusTarget] = useState<string>('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<number | ''>('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);
    const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const attachInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (complaint && isOpen) {
      setSelectedStatus(complaint.status);
      setAttachments(complaint.attachments || []);
      loadComments(complaint.id);
      loadComplaintDetails(complaint.id);
      departmentService.getDepartments().then(setDepartments).catch(() => {});
    }
  }, [complaint, isOpen]);

  const loadComplaintDetails = async (complaintId: number) => {
    try {
      const fresh = await complaintService.getComplaint(complaintId);
      if (fresh && fresh.attachments) {
        setAttachments(fresh.attachments);
      }
    } catch {
      // ignore
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDownloadAttachment = async (attId: number, fileName: string) => {
    try {
      await complaintService.downloadAttachment(attId, fileName);
      success(`Downloaded "${fileName}"`);
    } catch (err: any) {
      error(err.message || 'Failed to download file');
    }
  };

  const handleOpenInline = (att: Attachment) => {
    const viewUrl = complaintService.getAttachmentViewUrl(att.id);
    if (att.file_type.startsWith('image/')) {
      setPreviewImage({ url: viewUrl, name: att.file_name });
    } else {
      window.open(viewUrl, '_blank');
    }
  };

  const handleUploadSupplementary = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!complaint) return;
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingAttachment(true);
    try {
      const newAtts = await complaintService.addAttachments(complaint.id, Array.from(files));
      setAttachments((prev) => [...prev, ...newAtts]);
      success(`Attached ${newAtts.length} supplementary file${newAtts.length > 1 ? 's' : ''}`);
      e.target.value = '';
    } catch (err: any) {
      error(err.message || 'Failed to upload supplementary files');
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  const loadComments = async (complaintId: number) => {
    setIsLoadingComments(true);
    try {
      const data = await complaintService.getComments(complaintId);
      setComments(data || []);
    } catch {
      // ignore
    } finally {
      setIsLoadingComments(false);
    }
  };

  if (!complaint) return null;

  const refNumber = complaint.reference_number;
  const isStaffOrAdmin = role === 'admin' || role === 'staff';
  const handleAssignDepartment = async () => {
    if (!selectedDepartment) return;
    setIsAssigning(true);
    try {
      await complaintService.assignComplaint(complaint.id, Number(selectedDepartment));
      success('Department assigned successfully');
      if (onStatusUpdated) onStatusUpdated();
      onClose();
    } catch (err: any) {
      error(err.message || 'Failed to assign department');
    } finally {
      setIsAssigning(false);
    }
};
    const openEdit = () => {
    setEditTitle(complaint.title);
    setEditDescription(complaint.description);
    setEditCategory(complaint.category || '');
    setEditLocation(complaint.location || '');
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    setIsSavingEdit(true);
    try {
      await complaintService.updateComplaint(complaint.id, {
        title: editTitle,
        description: editDescription,
        category: editCategory,
        location: editLocation,
      });
      success('Complaint updated successfully');
      if (onStatusUpdated) onStatusUpdated();
      setIsEditing(false);
      onClose();
    } catch (err: any) {
      error(err.message || 'Failed to update complaint');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    try {
      await complaintService.deleteComplaint(complaint.id);
      success('Complaint deleted successfully');
      if (onStatusUpdated) onStatusUpdated();
      setShowDeleteConfirm(false);
      onClose();
    } catch (err: any) {
      error(err.message || 'Failed to delete complaint');
    }
  };

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

  const initiateStatusChange = (newStatus: string) => {
    setSelectedStatus(newStatus);
    if (newStatus === 'closed' || newStatus === 'resolved') {
      setPendingStatusTarget(newStatus);
      setShowConfirmModal(true);
    } else {
      executeStatusUpdate(newStatus);
    }
  };

  const executeStatusUpdate = async (targetStatus?: string) => {
    const statusToApply = targetStatus || selectedStatus;
    if (statusToApply === complaint.status) return;

    setIsUpdatingStatus(true);
    try {
      const updated = await complaintService.updateStatus(complaint.id, statusToApply);
      success(`Status transitioned to ${statusToApply}`);
      setShowConfirmModal(false);
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
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`${refNumber} — ${complaint.title}`}
        subtitle={`Submitted on ${formattedDate}`}
        maxWidth="800px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Visual Lifecycle Stepper */}
          <LifecycleStepper
            status={complaint.status}
            createdAt={complaint.created_at}
            resolvedAt={complaint.resolved_at}
          />

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
              border: '1px solid var(--neutral-200)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--neutral-500)' }}>Status:</span>
              <StatusBadge status={complaint.status} />
              <PriorityBadge priority={complaint.priority} />
              <SlaBadge escalated={complaint.sla_escalated} />
            </div>

            {/* Status Transition Selector for Staff/Admin */}
            {isStaffOrAdmin && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <select
                  value={selectedStatus}
                  onChange={(e) => initiateStatusChange(e.target.value)}
                  disabled={complaint.status === 'closed' || isUpdatingStatus}
                  className="form-select"
                  style={{
                    padding: '6px 12px',
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
                        : 'Closed (Terminal)'}
                    </option>
                  ))}
                </select>
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
              backgroundColor: 'var(--neutral-50)',
              padding: '14px 16px',
              borderRadius: '10px',
              border: '1px solid var(--neutral-200)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--neutral-600)' }}>
              <Tag size={14} />
              <span>Category:</span>
              <strong style={{ color: 'var(--neutral-900)' }}>{complaint.category}</strong>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--neutral-600)' }}>
              <Building size={14} />
              <span>Department:</span>
              <strong style={{ color: 'var(--neutral-900)' }}>
                {complaint.department?.name || 'Assigned Department'}
              </strong>
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '6px', justifyContent: 'flex-end', marginTop: '4px' }}>
        <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto', marginTop: '8px' }}>
          <button
            className="btn btn-secondary"
            style={{ height: '30px', fontSize: '0.75rem', padding: '0 10px' }}
            onClick={openEdit}
            disabled={complaint.status === 'closed'}
          >
            Edit
          </button>
          {role === 'admin' && (
            <button
              className="btn btn-secondary"
              style={{ height: '30px', fontSize: '0.75rem', padding: '0 10px', color: '#dc2626', borderColor: '#fecaca' }}
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete
            </button>
          )}
        </div>
        <select
                    className="form-select"
                    style={{ height: '30px', fontSize: '0.75rem', padding: '0 8px' }}
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value ? Number(e.target.value) : '')}
                  >
                    <option value="">Change department...</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                  <button
                    className="btn btn-primary"
                    style={{ height: '30px', fontSize: '0.75rem', padding: '0 10px' }}
                    onClick={handleAssignDepartment}
                    disabled={!selectedDepartment || isAssigning}
                  >
                    {isAssigning ? '...' : 'Assign'}
                  </button>
               </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--neutral-600)' }}>
              <UserIcon size={14} />
              <span>Submitted by:</span>
              <strong style={{ color: 'var(--neutral-900)' }}>{complainantDisplay}</strong>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--neutral-600)' }}>
              <Calendar size={14} />
              <span>Date:</span>
              <strong style={{ color: 'var(--neutral-900)' }}>{formattedDate}</strong>
            </div>
          </div>

          {/* Description */}
          <div>
            <h4 style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--neutral-900)', marginBottom: '6px' }}>
              Description
            </h4>
            <div
              style={{
                padding: '14px 16px',
                backgroundColor: '#ffffff',
                border: '1px solid var(--neutral-200)',
                borderRadius: '10px',
                fontSize: '0.85rem',
                color: 'var(--neutral-800)',
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
                padding: '12px 14px',
                backgroundColor: '#fff7ed',
                borderRadius: '8px',
                border: '1px solid #fed7aa',
                color: '#9a3412',
                fontSize: '0.8rem',
              }}
            >
              <AlertTriangle size={18} />
              <span>
                <strong>Automated SLA Escalation active:</strong> This complaint exceeded the 72-hour
                resolution SLA window and has been tagged for prioritized administrative review.
              </span>
            </div>
          )}

          {/* Supporting Evidence Attachments */}
          <div style={{ borderTop: '1px solid var(--neutral-200)', paddingTop: '16px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px',
              }}
            >
              <h4
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--neutral-900)',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Paperclip size={16} color="var(--accent-primary)" />
                Supporting Evidence ({attachments.length})
              </h4>

              <div>
                <input
                  type="file"
                  ref={attachInputRef}
                  onChange={handleUploadSupplementary}
                  style={{ display: 'none' }}
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.txt,.csv"
                />
                <button
                  type="button"
                  onClick={() => attachInputRef.current?.click()}
                  disabled={isUploadingAttachment}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    backgroundColor: 'var(--neutral-100)',
                    border: '1px solid var(--neutral-200)',
                    padding: '5px 10px',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    color: 'var(--neutral-700)',
                    cursor: 'pointer',
                    fontWeight: 500,
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#eff6ff';
                    e.currentTarget.style.borderColor = 'var(--accent-primary)';
                    e.currentTarget.style.color = 'var(--accent-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--neutral-100)';
                    e.currentTarget.style.borderColor = 'var(--neutral-200)';
                    e.currentTarget.style.color = 'var(--neutral-700)';
                  }}
                >
                  <Plus size={13} />
                  <span>{isUploadingAttachment ? 'Uploading...' : 'Add Evidence'}</span>
                </button>
              </div>
            </div>

            {attachments.length === 0 ? (
              <div
                style={{
                  padding: '16px',
                  textAlign: 'center',
                  color: 'var(--neutral-400)',
                  fontSize: '0.8rem',
                  backgroundColor: 'var(--neutral-50)',
                  borderRadius: '8px',
                  border: '1px dashed var(--neutral-200)',
                }}
              >
                No evidence files attached to this grievance yet.
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
                  gap: '10px',
                }}
              >
                {attachments.map((att) => {
                  const isImg = att.file_type.startsWith('image/');
                  const isPdf = att.file_name.toLowerCase().endsWith('.pdf') || att.file_type.includes('pdf');
                  const viewUrl = complaintService.getAttachmentViewUrl(att.id);

                  return (
                    <div
                      key={att.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '8px 12px',
                        backgroundColor: '#ffffff',
                        border: '1px solid var(--neutral-200)',
                        borderRadius: '8px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {isImg ? (
                        <img
                          src={viewUrl}
                          alt={att.file_name}
                          onClick={() => setPreviewImage({ url: viewUrl, name: att.file_name })}
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '6px',
                            objectFit: 'cover',
                            border: '1px solid var(--neutral-200)',
                            cursor: 'pointer',
                            flexShrink: 0,
                          }}
                          title="Click to zoom image preview"
                        />
                      ) : (
                        <div
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '6px',
                            backgroundColor: isPdf ? '#fef2f2' : '#f0fdf4',
                            color: isPdf ? '#dc2626' : '#16a34a',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <FileText size={18} />
                        </div>
                      )}

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          title={att.file_name}
                          style={{
                            margin: 0,
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            color: 'var(--neutral-900)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {att.file_name}
                        </p>
                        <span style={{ fontSize: '0.7rem', color: 'var(--neutral-400)' }}>
                          {formatFileSize(att.file_size || 0)}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenInline(att)}
                          title={isImg ? 'Preview image' : 'Open in new tab'}
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: '5px',
                            color: 'var(--neutral-400)',
                            cursor: 'pointer',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-primary)')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--neutral-400)')}
                        >
                          <ExternalLink size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadAttachment(att.id, att.file_name)}
                          title="Download file"
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: '5px',
                            color: 'var(--neutral-400)',
                            cursor: 'pointer',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-primary)')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--neutral-400)')}
                        >
                          <Download size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Comments / Discussion Thread */}
          <div style={{ borderTop: '1px solid var(--neutral-200)', paddingTop: '16px' }}>
            <h4
              style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--neutral-900)',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <FileCheck size={16} />
              Verified Case Responses ({comments.length})
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
              {isLoadingComments ? (
                <>
                  <Skeleton width="100%" height={48} />
                  <Skeleton width="100%" height={48} />
                </>
              ) : comments.length === 0 ? (
                <div
                  style={{
                    padding: '20px',
                    textAlign: 'center',
                    color: 'var(--neutral-400)',
                    fontSize: '0.8rem',
                    backgroundColor: 'var(--neutral-50)',
                    borderRadius: '8px',
                  }}
                >
                  No responses or case notes yet.
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
                        padding: '12px 14px',
                        borderRadius: '8px',
                        backgroundColor: isStaffComment ? '#f8fafc' : '#ffffff',
                        border: `1px solid ${isStaffComment ? 'var(--neutral-200)' : 'var(--neutral-100)'}`,
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
                          <span style={{ fontWeight: 600, color: 'var(--neutral-900)' }}>
                            {c.user?.name || (isStaffComment ? 'Support Staff' : 'Student')}
                          </span>
                          <span
                            style={{
                              fontSize: '0.65rem',
                              fontWeight: 600,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: isStaffComment ? '#eff6ff' : 'var(--neutral-100)',
                              color: isStaffComment ? 'var(--accent-primary)' : 'var(--neutral-600)',
                              textTransform: 'uppercase',
                            }}
                          >
                            {c.role}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.7rem', color: 'var(--neutral-400)' }}>{commentDate}</span>
                      </div>
                      <div style={{ color: 'var(--neutral-700)', lineHeight: 1.5 }}>{c.content}</div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Add Comment Input */}
            <form onSubmit={handlePostComment} style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Write an official response or update..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="form-input"
                style={{ flex: 1, padding: '9px 12px' }}
              />
              <button
                type="submit"
                disabled={isSubmittingComment || !newComment.trim()}
                className="btn btn-primary"
                style={{ padding: '9px 18px', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Send size={14} />
                <span>Send</span>
              </button>
            </form>
          </div>
        </div>
      </Modal>

            {isEditing && (
        <Modal isOpen={isEditing} onClose={() => setIsEditing(false)} title="Edit Complaint">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>Title</label>
              <input className="form-input" style={{ width: '100%', height: '40px' }} value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>Description</label>
              <textarea className="form-input" style={{ width: '100%', minHeight: '100px', padding: '8px' }} value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>Category</label>
              <input className="form-input" style={{ width: '100%', height: '40px' }} value={editCategory} onChange={(e) => setEditCategory(e.target.value)} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>Location</label>
              <input className="form-input" style={{ width: '100%', height: '40px' }} value={editLocation} onChange={(e) => setEditLocation(e.target.value)} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <button className="btn btn-secondary" onClick={() => setIsEditing(false)} disabled={isSavingEdit}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveEdit} disabled={isSavingEdit}>
                {isSavingEdit ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Complaint"
        message="Are you sure you want to permanently delete this complaint? This action cannot be undone."
      />
{/* Confirmation Modal for Destructive Actions */}
      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => {
          setShowConfirmModal(false);
          setSelectedStatus(complaint.status);
        }}
        onConfirm={() => executeStatusUpdate(pendingStatusTarget)}
        title={pendingStatusTarget === 'closed' ? 'Close Grievance Permanently' : 'Mark Grievance Resolved'}
        message={
          pendingStatusTarget === 'closed'
            ? "Are you sure you want to transition this grievance to 'closed'? Under Rule 2 state machine rules, 'closed' is a permanent terminal state and no further transitions or edits will be permitted."
            : "Are you sure you want to mark this grievance as 'resolved'? A resolution timestamp will be recorded and an in-app notification dispatched to the student."
        }
        confirmLabel={pendingStatusTarget === 'closed' ? 'Permanently Close' : 'Confirm Resolution'}
        confirmVariant={pendingStatusTarget === 'closed' ? 'danger' : 'primary'}
        isLoading={isUpdatingStatus}
      />

      {/* Full Size Image Preview Modal / Lightbox */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '24px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '85vh',
              backgroundColor: '#18181b',
              borderRadius: '12px',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
                marginBottom: '10px',
                color: '#f4f4f5',
                fontSize: '0.85rem',
                fontWeight: 500,
              }}
            >
              <span>{previewImage.name}</span>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  color: '#ffffff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CloseIcon size={16} />
              </button>
            </div>
            <img
              src={previewImage.url}
              alt={previewImage.name}
              style={{
                maxWidth: '100%',
                maxHeight: '75vh',
                borderRadius: '8px',
                objectFit: 'contain',
              }}
            />
          </div>
        </div>
      )}
    </>
  );
};










