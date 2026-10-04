import React, { useState, useRef } from 'react';

import { useToast } from '../components/common/Toast';
import { complaintService } from '../services/complaint.service';
import { ComplaintCategory } from '../types/api';
import { PriorityBadge } from '../components/common/Badge';

import {
  Paperclip,
  FileText,
  X,
  Sparkles,
} from 'lucide-react';

interface SubmitComplaintPageProps {
  onSuccess: () => void;
  onCancel: () => void;
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
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const calculateLivePriority = () => {
    const descLower = description.toLowerCase();

    const criticalKeywords = [
      'emergency',
      'urgent',
      'critical',
      'immediate',
      'danger',
    ];

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

    return {
      priority: 'medium',
      reason: 'Standard resolution target (72h)',
    };
  };

  const currentEscalation = calculateLivePriority();

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;

    if (!files) return;

    setAttachedFiles((prev) => [
      ...prev,
      ...Array.from(files),
    ]);

    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setAttachedFiles((prev) =>
      prev.filter((_, i) => i !== index)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      error('Please enter a complaint title');
      return;
    }

    if (!category) {
      error('Please select a category');
      return;
    }

    if (!location.trim()) {
      error('Please enter the location where the issue occurred');
      return;
    }

    if (!description.trim()) {
      error('Please provide a description of the issue');
      return;
    }

    setIsSubmitting(true);

    try {
      const complaint = await complaintService.createComplaint({
        title: title.trim(),
        description: description.trim(),
        category,
        location: location.trim(),
      });

      for (const file of attachedFiles) {
        await complaintService.uploadAttachment(
          complaint.id,
          file
        );
      }

      success(
        'Grievance registered successfully.'
      );

      onSuccess();
    } catch (err: any) {
      error(err.message || 'Failed to submit complaint');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-container animate-fade-in">
      <div style={{ marginBottom: '24px' }}>
        <h1 className="page-title">Submit Complaint</h1>
        <p className="page-subtitle">
          Register an institutional grievance for review and resolution.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ padding: '28px' }}>
          <div className="form-group">
            <label className="form-label">
              Complaint Title <span className="required">*</span>
            </label>

            <input
              type="text"
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Briefly describe the issue"
              maxLength={255}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Category <span className="required">*</span>
            </label>

            <select
              className="form-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
            >
              <option value="">Select a category</option>

              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">
              Location <span className="required">*</span>
            </label>

            <input
              type="text"
              className="form-input"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Where did the issue occur?"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Description <span className="required">*</span>
            </label>

            <textarea
              className="form-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide a detailed description of the complaint..."
              rows={7}
              required
              style={{ resize: 'vertical' }}
            />
          </div>

          <div
            style={{
              marginBottom: '20px',
              padding: '14px 16px',
              backgroundColor: '#f8fafc',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <Sparkles size={17} color="#2563eb" />

              <div>
                <div
                  style={{
                    fontSize: '0.8rem',
                    color: '#64748b',
                    fontWeight: 600,
                    marginBottom: '3px',
                  }}
                >
                  Suggested Priority
                </div>

                <PriorityBadge
                  priority={currentEscalation.priority}
                  showIcon
                />
              </div>
            </div>

            <div
              style={{
                fontSize: '0.75rem',
                color: '#64748b',
                maxWidth: '420px',
              }}
            >
              {currentEscalation.reason}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              Supporting Files
            </label>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip size={15} />
              Attach Files
            </button>

            {attachedFiles.length > 0 && (
              <div
                style={{
                  marginTop: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                {attachedFiles.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                      padding: '9px 12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '7px',
                      backgroundColor: '#f8fafc',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        minWidth: 0,
                      }}
                    >
                      <FileText size={15} color="#64748b" />

                      <span
                        style={{
                          fontSize: '0.8rem',
                          color: '#334155',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {file.name}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        color: '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title="Remove file"
                    >
                      <X size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              marginTop: '28px',
              paddingTop: '20px',
              borderTop: '1px solid #e2e8f0',
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? 'Submitting...'
                : 'Submit Complaint'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
