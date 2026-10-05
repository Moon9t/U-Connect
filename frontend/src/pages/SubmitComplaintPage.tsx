import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '../components/common/Toast';
import { complaintService } from '../services/complaint.service';
import { departmentService } from '../services/department.service';
import { Department, ComplaintCategory } from '../types/api';
import { PriorityBadge } from '../components/common/Badge';
import {
  Paperclip,
  FileText,
  X,
  Shield,
  Sparkles,
  AlertCircle,
  UploadCloud,
  Image as ImageIcon,
  CheckCircle2,
  Trash2,
} from 'lucide-react';

interface SubmitComplaintPageProps {
  onSuccess: () => void;
  onCancel: () => void;
}

interface FormErrors {
  title?: string;
  category?: string;
  departmentId?: string;
  description?: string;
}

const CATEGORIES: ComplaintCategory[] = [
  'IT',
  'Facilities',
  'Academic',
  'Exam Hall',
  'Safety',
  'Finance',
  'Student Affairs',
];

export const SubmitComplaintPage: React.FC<SubmitComplaintPageProps> = ({
  onSuccess,
  onCancel,
}) => {
  const { success, error } = useToast();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [departmentId, setDepartmentId] = useState<number | ''>('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [filePreviews, setFilePreviews] = useState<{ [key: string]: string }>({});
  const [errors, setErrors] = useState<FormErrors>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadDepartments();
  }, []);

  // Generate and manage object URL previews for attached image files
  useEffect(() => {
    const newPreviews: { [key: string]: string } = {};
    selectedFiles.forEach((file) => {
      if (file.type.startsWith('image/')) {
        newPreviews[`${file.name}-${file.size}`] = URL.createObjectURL(file);
      }
    });
    setFilePreviews(newPreviews);

    return () => {
      Object.values(newPreviews).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [selectedFiles]);

  const loadDepartments = async () => {
    try {
      const data = await departmentService.getDepartments();
      setDepartments(data || []);
      if (data && data.length > 0) {
        setDepartmentId(data[0].id);
      }
    } catch {
      // ignore
    }
  };

  const calculateLivePriority = () => {
    const descLower = description.toLowerCase();
    const criticalKeywords = ['emergency', 'urgent', 'critical', 'immediate', 'danger'];

    for (const kw of criticalKeywords) {
      if (descLower.includes(kw)) {
        return {
          priority: 'critical',
          reason: `Keywords detected ("${kw}") — flagged for immediate critical triage`,
        };
      }
    }

    if (category === 'Exam Hall' || category === 'Safety') {
      return {
        priority: 'high',
        reason: `${category} concerns are auto-escalated to high priority for prompt student welfare`,
      };
    }

    return { priority: 'medium', reason: 'Standard resolution target (72h)' };
  };

  const currentEscalation = calculateLivePriority();

  const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.doc', '.docx', '.txt', '.csv'];
  const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
  const MAX_FILES = 5;

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const processFiles = (newFiles: FileList | File[]) => {
    const incoming = Array.from(newFiles);
    if (incoming.length === 0) return;

    if (selectedFiles.length + incoming.length > MAX_FILES) {
      error(`You can attach a maximum of ${MAX_FILES} files.`);
      return;
    }

    const validFiles: File[] = [];

    for (const file of incoming) {
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        error(`"${file.name}" is not a supported file type. Allowed: PDF, JPG, PNG, WEBP, DOC, DOCX, TXT, CSV.`);
        continue;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        error(`"${file.name}" exceeds the 5MB size limit (${formatFileSize(file.size)}).`);
        continue;
      }

      const isDuplicate = selectedFiles.some(
        (existing) => existing.name === file.name && existing.size === file.size
      );
      if (isDuplicate) {
        error(`"${file.name}" has already been attached.`);
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...validFiles]);
      success(`Added ${validFiles.length} file${validFiles.length > 1 ? 's' : ''}.`);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
};

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAllFiles = () => {
    setSelectedFiles([]);
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!title.trim()) {
      newErrors.title = 'Complaint title is required';
    } else if (title.trim().length < 5) {
      newErrors.title = 'Title must be at least 5 characters';
    } else if (title.trim().length > 80) {
      newErrors.title = 'Title cannot exceed 80 characters';
    }

    if (!category) {
      newErrors.category = 'Please select an institutional category';
    }

    if (!departmentId) {
      newErrors.departmentId = 'Please select a receiving department';
    }

    if (!description.trim()) {
      newErrors.description = 'Please describe the grievance in detail';
    } else if (description.trim().length < 15) {
      newErrors.description = 'Description is too brief (minimum 15 characters needed for review)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      error('Please correct the highlighted errors in the form.');
      return;
    }

    setIsSubmitting(true);
    try {
      const complaint = await complaintService.createComplaint({
        title: title.trim(),
        description: description.trim(),
        category,
        location: location.trim(),
        department_id: Number(departmentId),
        anonymous,
        files: selectedFiles,
      });

      if (selectedFiles.length > 0 && (!complaint.attachments || complaint.attachments.length === 0)) {
        for (const file of selectedFiles) {
          try {
            await complaintService.uploadAttachment(complaint.id, file);
          } catch {
            // ignore if already handled
          }
        }
      }

      success('Grievance registered and routed to department coordinators.');
      onSuccess();
    } catch (err: any) {
      error(err.message || 'Failed to submit complaint');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-container animate-fade-in" style={{ maxWidth: '920px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 className="page-title">Submit a Grievance</h1>
        <p className="page-subtitle">
          Submit your issue for institutional triage. Automated SLA timers and priority escalations apply.
        </p>
      </div>

      <div className="card" style={{ padding: '36px' }}>
        <form onSubmit={handleSubmit} noValidate>
          {/* Title with Inline Validation */}
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>
                Grievance Title <span className="required">*</span>
              </label>
              <span style={{ fontSize: '0.75rem', color: title.length > 70 ? '#dc2626' : 'var(--neutral-400)' }}>
                {title.length}/80
              </span>
            </div>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Broken AC in Exam Hall 2B, Network drop in Computer Lab"
              value={title}
              maxLength={80}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
              }}
              style={{
                borderColor: errors.title ? '#dc2626' : undefined,
                boxShadow: errors.title ? '0 0 0 3px rgba(220, 38, 38, 0.12)' : undefined,
              }}
            />
            {errors.title && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.75rem', marginTop: '4px' }}>
                <AlertCircle size={13} />
                <span>{errors.title}</span>
              </div>
            )}
          </div>

          {/* Grid: Category, Department, Location */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '18px',
              marginBottom: '20px',
            }}
          >
            {/* Category */}
            <div>
              <label className="form-label">
                Category <span className="required">*</span>
              </label>
              <select
                className="form-select"
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  if (errors.category) setErrors((prev) => ({ ...prev, category: undefined }));
                }}
                style={{
                  borderColor: errors.category ? '#dc2626' : undefined,
                  boxShadow: errors.category ? '0 0 0 3px rgba(220, 38, 38, 0.12)' : undefined,
                }}
              >
                <option value="">-- Select a category --</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              {errors.category && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.75rem', marginTop: '4px' }}>
                  <AlertCircle size={13} />
                  <span>{errors.category}</span>
                </div>
              )}
            </div>

            {/* Department */}
            <div>
              <label className="form-label">
                Receiving Department <span className="required">*</span>
              </label>
              <select
                className="form-select"
                value={departmentId}
                onChange={(e) => {
                  setDepartmentId(Number(e.target.value));
                  if (errors.departmentId) setErrors((prev) => ({ ...prev, departmentId: undefined }));
                }}
                style={{
                  borderColor: errors.departmentId ? '#dc2626' : undefined,
                  boxShadow: errors.departmentId ? '0 0 0 3px rgba(220, 38, 38, 0.12)' : undefined,
                }}
              >
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name} ({dept.code})
                  </option>
                ))}
              </select>
              {errors.departmentId && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.75rem', marginTop: '4px' }}>
                  <AlertCircle size={13} />
                  <span>{errors.departmentId}</span>
                </div>
              )}
            </div>

            {/* Location */}
            <div>
              <label className="form-label">Location / Room (optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Library 2nd Floor, Room 101"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>

          {/* Anonymous Checkbox (Rule 4) */}
          <div
            style={{
              marginBottom: '20px',
              padding: '14px 16px',
              backgroundColor: 'var(--neutral-50)',
              borderRadius: '10px',
              border: '1px solid var(--neutral-200)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <input
              type="checkbox"
              id="anonymous-check"
              checked={anonymous}
              onChange={(e) => setAnonymous(e.target.checked)}
              style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
            />
            <label
              htmlFor="anonymous-check"
              style={{
                fontSize: '0.825rem',
                color: 'var(--neutral-700)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Shield size={16} color="var(--accent-primary)" />
              <span>
                <strong>Submit anonymously (Rule 4):</strong> Your student identity will be completely masked
                from staff and visible only to system administrators.
              </span>
            </label>
          </div>

          {/* Description Textarea with Live Priority Badge */}
          <div className="form-group" style={{ marginBottom: '24px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '6px',
              }}
            >
              <label className="form-label" style={{ marginBottom: 0 }}>
                Detailed Description <span className="required">*</span>
              </label>

              {/* Priority Live Preview */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.725rem', color: 'var(--neutral-500)' }}>Calculated Priority:</span>
                <PriorityBadge priority={currentEscalation.priority} />
              </div>
            </div>

            <textarea
              className="form-textarea"
              placeholder="Provide complete details regarding the incident, hazard, or grievance..."
              rows={5}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (errors.description) setErrors((prev) => ({ ...prev, description: undefined }));
              }}
              style={{
                borderColor: errors.description ? '#dc2626' : undefined,
                boxShadow: errors.description ? '0 0 0 3px rgba(220, 38, 38, 0.12)' : undefined,
              }}
            />

            {errors.description ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.75rem', marginTop: '4px' }}>
                <AlertCircle size={13} />
                <span>{errors.description}</span>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.72rem', color: 'var(--neutral-400)' }}>
                <span>Include dates, equipment IDs, and safety impacts.</span>
                <span>{description.length} characters</span>
              </div>
            )}

            {/* Hint on Rule 1 Escalation */}
            {(currentEscalation.priority === 'critical' || currentEscalation.priority === 'high') && (
              <div
                style={{
                  marginTop: '10px',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '0.775rem',
                  backgroundColor: currentEscalation.priority === 'critical' ? '#fef2f2' : '#fff7ed',
                  color: currentEscalation.priority === 'critical' ? '#991b1b' : '#9a3412',
                  border: `1px solid ${
                    currentEscalation.priority === 'critical' ? '#fecaca' : '#fed7aa'
                  }`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontWeight: 500,
                }}
              >
                <Sparkles size={16} />
                <span>{currentEscalation.reason}</span>
              </div>
            )}
          </div>

          {/* Attach Files Dropzone */}
          <div className="form-group" style={{ marginBottom: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label className="form-label" style={{ marginBottom: 0 }}>
                Attach Supporting Evidence (optional)
              </label>
              <span style={{ fontSize: '0.75rem', color: 'var(--neutral-400)' }}>
                {selectedFiles.length}/{MAX_FILES} files
              </span>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.txt,.csv"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              style={{
                border: `2px dashed ${isDragging ? 'var(--accent-primary)' : 'var(--neutral-300)'}`,
                borderRadius: '12px',
                padding: '28px 20px',
                textAlign: 'center',
                backgroundColor: isDragging ? '#eff6ff' : 'var(--neutral-50)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                transform: isDragging ? 'scale(1.01)' : 'scale(1)',
                boxShadow: isDragging ? '0 4px 12px rgba(37, 99, 235, 0.12)' : 'none',
              }}
              onMouseEnter={(e) => {
                if (!isDragging) {
                  e.currentTarget.style.borderColor = 'var(--accent-primary)';
                  e.currentTarget.style.backgroundColor = '#f8fafc';
                }
              }}
              onMouseLeave={(e) => {
                if (!isDragging) {
                  e.currentTarget.style.borderColor = 'var(--neutral-300)';
                  e.currentTarget.style.backgroundColor = 'var(--neutral-50)';
                }
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  color: 'var(--neutral-700)',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  marginBottom: '4px',
                }}
              >
                <UploadCloud
                  size={22}
                  color={isDragging ? 'var(--accent-primary)' : 'var(--neutral-500)'}
                  style={{ transition: 'transform 0.2s ease', transform: isDragging ? 'translateY(-2px)' : 'none' }}
                />
                <span>
                  {isDragging ? (
                    <strong style={{ color: 'var(--accent-primary)' }}>Drop files now to attach</strong>
                  ) : (
                    <>
                      <strong style={{ color: 'var(--accent-primary)' }}>Click to upload files</strong> or drag and drop
                    </>
                  )}
                </span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--neutral-400)', margin: 0 }}>
                Photos, incident notes, or scan reports: PDF, JPG, PNG, WEBP, DOCX, TXT (Max 5MB each)
              </p>
            </div>

            {/* Attached files chips / cards */}
            {selectedFiles.length > 0 && (
              <div style={{ marginTop: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--neutral-600)' }}>
                    Ready for upload ({selectedFiles.length})
                  </span>
                  {selectedFiles.length > 1 && (

                    <button
                      type="button"
                      onClick={clearAllFiles}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--neutral-400)',
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--neutral-400)')}
                    >
                      <Trash2 size={12} /> Clear all
                    </button>
                  )}
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                    gap: '10px',
                  }}
                >
                  {selectedFiles.map((file, idx) => {
                    const isImg = file.type.startsWith('image/');
                    const previewUrl = filePreviews[`${file.name}-${file.size}`];
                    const isPdf = file.name.toLowerCase().endsWith('.pdf');

                    return (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '8px 12px',
                          backgroundColor: '#ffffff',
                          border: '1px solid var(--neutral-200)',
                          borderRadius: '8px',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                          position: 'relative',
                        }}
                      >
                        {isImg && previewUrl ? (
                          <img
                            src={previewUrl}
                            alt={file.name}
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '6px',
                              objectFit: 'cover',
                              border: '1px solid var(--neutral-200)',
                              flexShrink: 0,
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
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
                            title={file.name}
                            style={{
                              margin: 0,
                              fontSize: '0.78rem',
                              fontWeight: 500,
                              color: 'var(--neutral-800)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {file.name}
                          </p>
                          <span style={{ fontSize: '0.7rem', color: 'var(--neutral-400)' }}>
                            {formatFileSize(file.size)}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeFile(idx)}
                          title="Remove file"
                          style={{
                            background: 'none',
                            border: 'none',
                            padding: '4px',
                            color: 'var(--neutral-400)',
                            cursor: 'pointer',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'color 0.15s ease',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--neutral-400)')}
                        >
                          <X size={15} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary"
              style={{ minWidth: '160px', padding: '10px 20px' }}
            >
              {isSubmitting ? 'Registering...' : 'Submit Grievance'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="btn btn-secondary"
              style={{ minWidth: '90px', padding: '10px 16px' }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
