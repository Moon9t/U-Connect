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
  const [departmentId, setDepartmentId] = useState<number | ''>('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<{ name: string; size: string }[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadDepartments();
  }, []);

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
        return { priority: 'critical', reason: `Keywords detected ("${kw}") — flagged for immediate critical triage` };
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newFiles = Array.from(files).map((f) => ({
      name: f.name,
      size: `${(f.size / (1024 * 1024)).toFixed(1)} MB`,
    }));

    setAttachedFiles((prev) => [...prev, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
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
    if (!departmentId) {
      error('Please select a department');
      return;
    }
    if (!description.trim()) {
      error('Please provide a description of the issue');
      return;
    }

    setIsSubmitting(true);
    try {
      const fullDescription = location.trim()
        ? `${description.trim()}\n\n[Location / Room: ${location.trim()}]`
        : description.trim();

      await complaintService.createComplaint({
        title: title.trim(),
        description: fullDescription,
        category,
        department_id: Number(departmentId),
        anonymous,
      });

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
      {/* Header matching Screen 3 */}
      <div style={{ marginBottom: '28px' }}>
        <h1 className="page-title">Submit a Complaint</h1>
        <p className="page-subtitle">Help us improve by providing the details below.</p>
      </div>

      <div className="card" style={{ padding: '36px' }}>
        <form onSubmit={handleSubmit}>
          {/* Title */}
          <div className="form-group">
            <label className="form-label">
              Title <span className="required">*</span>
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="Enter a short title for your complaint"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
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
            <div>
              <label className="form-label">
                Category <span className="required">*</span>
              </label>
              <select
                className="form-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
              >
                <option value="">-- Select a category --</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">
                Department <span className="required">*</span>
              </label>
              <select
                className="form-select"
                value={departmentId}
                onChange={(e) => setDepartmentId(Number(e.target.value))}
                required
              >
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name} ({dept.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Location (optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Library, Block A, Room 101"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>

          {/* Anonymous Checkbox (Rule 4) */}
          <div
            style={{
              marginBottom: '20px',
              padding: '12px 16px',
              backgroundColor: '#fafafa',
              borderRadius: '10px',
              border: '1px solid #e4e4e7',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <input
              type="checkbox"
              id="anonymous-check"
              checked={anonymous}
              onChange={(e) => setAnonymous(e.target.checked)}
              style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: '#18181b' }}
            />
            <label
              htmlFor="anonymous-check"
              style={{
                fontSize: '0.825rem',
                color: '#3f3f46',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Shield size={15} color="#71717a" />
              <span>
                <strong>Submit anonymously:</strong> Your name and email will be hidden from
                department staff members.
              </span>
            </label>
          </div>

          {/* Description Textarea with Live Priority Badge */}
          <div className="form-group">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '6px',
              }}
            >
              <label className="form-label" style={{ marginBottom: 0 }}>
                Description <span className="required">*</span>
              </label>

              {/* Priority Live Preview */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.725rem', color: '#71717a' }}>Priority:</span>
                <PriorityBadge priority={currentEscalation.priority} />
              </div>
            </div>

            <textarea
              className="form-textarea"
              placeholder="Provide detailed information about your complaint..."
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />

            {/* Hint on Rule 1 Escalation */}
            {(currentEscalation.priority === 'critical' || currentEscalation.priority === 'high') && (
              <div
                style={{
                  marginTop: '8px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '0.775rem',
                  backgroundColor: currentEscalation.priority === 'critical' ? '#fef2f2' : '#fff7ed',
                  color: currentEscalation.priority === 'critical' ? '#991b1b' : '#9a3412',
                  border: `1px solid ${
                    currentEscalation.priority === 'critical' ? '#fecaca' : '#fed7aa'
                  }`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 500,
                }}
              >
                <Sparkles size={14} />
                <span>{currentEscalation.reason}</span>
              </div>
            )}
          </div>

          {/* Attach Files Dropzone matching Screen 3 */}
          <div className="form-group" style={{ marginBottom: '30px' }}>
            <label className="form-label">Attach Files (optional)</label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: '1.5px dashed #d4d4d8',
                borderRadius: '10px',
                padding: '24px',
                textAlign: 'center',
                backgroundColor: '#fafafa',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#18181b';
                e.currentTarget.style.backgroundColor = '#f4f4f5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#d4d4d8';
                e.currentTarget.style.backgroundColor = '#fafafa';
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  color: '#52525b',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                }}
              >
                <Paperclip size={17} color="#18181b" />
                <span>
                  <strong style={{ color: '#18181b' }}>Click to upload</strong> or drag and drop
                </span>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#a1a1aa', marginTop: '4px' }}>
                PDF, JPG, PNG (Max 5MB)
              </p>
            </div>

            {/* Attached files chips */}
            {attachedFiles.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px',
                  marginTop: '10px',
                }}
              >
                {attachedFiles.map((file, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '4px 10px',
                      backgroundColor: '#f4f4f5',
                      border: '1px solid #e4e4e7',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      color: '#27272a',
                    }}
                  >
                    <FileText size={14} />
                    <span>{file.name}</span>
                    <span style={{ color: '#71717a', fontSize: '0.725rem' }}>({file.size})</span>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      style={{ display: 'flex', color: '#a1a1aa' }}
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action buttons matching Screen 3 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary"
              style={{ minWidth: '150px' }}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Complaint'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="btn btn-secondary"
              style={{ minWidth: '90px' }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
