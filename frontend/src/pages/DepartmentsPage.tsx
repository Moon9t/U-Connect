import React, { useState, useEffect } from 'react';
import { departmentService } from '../services/department.service';
import { Department } from '../types/api';
import { useToast } from '../components/common/Toast';
import { Modal } from '../components/common/Modal';
import { Building2, Plus, Trash2, Edit2, CheckCircle2 } from 'lucide-react';

export const DepartmentsPage: React.FC = () => {
  const { success, error } = useToast();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    setIsLoading(true);
    try {
      const data = await departmentService.getDepartments();
      setDepartments(data || []);
    } catch (err: any) {
      error(err.message || 'Failed to load departments');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      error('Department name and code are required');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await departmentService.createDepartment({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description.trim(),
      });
      setDepartments((prev) => [...prev, created]);
      success(`Department ${created.name} created`);
      setIsModalOpen(false);
      setName('');
      setCode('');
      setDescription('');
    } catch (err: any) {
      error(err.message || 'Failed to create department');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this department?')) return;
    try {
      await departmentService.deleteDepartment(id);
      setDepartments((prev) => prev.filter((d) => d.id !== id));
      success('Department deleted successfully');
    } catch (err: any) {
      error(err.message || 'Failed to delete department');
    }
  };

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
          <h1 className="page-title">University Departments</h1>
          <p className="page-subtitle">Manage campus departments handling grievances and SLA routing.</p>
        </div>

        <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
          <Plus size={16} strokeWidth={2.5} />
          <span>Add Department</span>
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '20px',
        }}
      >
        {isLoading ? (
          <div style={{ padding: '40px', color: '#94a3b8' }}>Loading departments...</div>
        ) : (
          departments.map((dept) => (
            <div key={dept.id} className="card" style={{ padding: '24px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  marginBottom: '12px',
                }}
              >
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '8px',
                    backgroundColor: '#eff6ff',
                    color: '#1d4ed8',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Building2 size={22} />
                </div>

                <span
                  style={{
                    padding: '2px 8px',
                    backgroundColor: '#f1f5f9',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#475569',
                    letterSpacing: '0.05em',
                  }}
                >
                  {dept.code}
                </span>
              </div>

              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>
                {dept.name}
              </h3>
              <p style={{ fontSize: '0.825rem', color: '#64748b', lineHeight: 1.5, minHeight: '40px' }}>
                {dept.description || 'Handles complaints routing and campus operations.'}
              </p>

              <div
                style={{
                  marginTop: '18px',
                  paddingTop: '12px',
                  borderTop: '1px solid #f1f5f9',
                  display: 'flex',
                  justifyContent: 'flex-end',
                }}
              >
                <button
                  onClick={() => handleDelete(dept.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: '#ef4444',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}
                >
                  <Trash2 size={13} />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add New Department"
        subtitle="Create a university department for ticket assignments."
      >
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label className="form-label">
              Department Name <span className="required">*</span>
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Student Housing & Residential Life"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Department Code <span className="required">*</span>
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. HOUS"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              maxLength={10}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-textarea"
              placeholder="Brief description of department responsibilities..."
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary">
              {isSubmitting ? 'Creating...' : 'Create Department'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
