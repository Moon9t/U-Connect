import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { departmentService } from '../../services/department.service';
import { Department, UserRole, CreateUserDTO } from '../../types/api';
import {
  UserPlus,
  Mail,
  Lock,
  Building,
  GraduationCap,
  UserCheck,
  Shield,
  CheckCircle2,
} from 'lucide-react';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateUserDTO) => Promise<void>;
  isLoading?: boolean;
}

export const CreateUserModal: React.FC<CreateUserModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}) => {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [departmentId, setDepartmentId] = useState<number | ''>('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName('');
      setUsername('');
      setEmail('');
      setPassword('');
      setRole('student');
      setDepartmentId('');
      setErrorMsg('');
      loadDepartments();
    }
  }, [isOpen]);

  const loadDepartments = async () => {
    try {
      const data = await departmentService.getDepartments();
      setDepartments(data || []);
    } catch {
      // fallback
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!name.trim()) {
      setErrorMsg('Full name is required');
      return;
    }

    if (!username.trim()) {
      setErrorMsg('Username is required');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('A valid institutional email is required');
      return;
    }

    try {
      await onSubmit({
        name: name.trim(),
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password: password.trim() || 'password123',
        role,
        department_id: departmentId ? Number(departmentId) : null,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create user account');
    }
  };

  const roleOptions: {
    value: UserRole;
    title: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    bg: string;
  }[] = [
    {
      value: 'student',
      title: 'Student',
      description: 'Submit & track grievances',
      icon: <GraduationCap size={18} />,
      color: '#15803d',
      bg: '#f0fdf4',
    },
    {
      value: 'staff',
      title: 'Department Staff',
      description: 'Triage, update & resolve tickets',
      icon: <UserCheck size={18} />,
      color: '#0369a1',
      bg: '#f0f9ff',
    },
    {
      value: 'admin',
      title: 'Administrator',
      description: 'System governance & reporting',
      icon: <Shield size={18} />,
      color: '#6366f1',
      bg: '#f5f3ff',
    },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Enroll New User Account">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {errorMsg && (
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              color: '#dc2626',
              fontSize: '0.825rem',
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* Role Selector Cards */}
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--neutral-700)', marginBottom: '8px' }}>
            Account Role & Permission Level *
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            {roleOptions.map((opt) => {
              const isSelected = role === opt.value;
              return (
                <div
                  key={opt.value}
                  onClick={() => setRole(opt.value)}
                  style={{
                    border: isSelected ? `2px solid ${opt.color}` : '1px solid #e2e8f0',
                    backgroundColor: isSelected ? opt.bg : '#ffffff',
                    borderRadius: '10px',
                    padding: '12px 10px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    position: 'relative',
                    textAlign: 'center',
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      backgroundColor: isSelected ? '#ffffff' : '#f1f5f9',
                      color: opt.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 8px auto',
                      boxShadow: isSelected ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
                    }}
                  >
                    {opt.icon}
                  </div>
                  <div style={{ fontSize: '0.825rem', fontWeight: 700, color: isSelected ? opt.color : '#1e293b' }}>
                    {opt.title}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px', lineHeight: 1.2 }}>
                    {opt.description}
                  </div>
                  {isSelected && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '6px',
                        right: '6px',
                        color: opt.color,
                      }}
                    >
                      <CheckCircle2 size={14} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Full Name */}
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--neutral-700)', marginBottom: '6px' }}>
            Full Name *
          </label>
          <div style={{ position: 'relative' }}>
            <UserPlus
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
              style={{ paddingLeft: '38px', height: '40px' }}
              placeholder="e.g. Dr. Helena Vance or Alex Rivera"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
        </div>
        {/* Username */}
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--neutral-700)', marginBottom: '6px' }}>
            Username *
          </label>
          <div style={{ position: 'relative' }}>
            <UserPlus
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
              style={{ paddingLeft: '38px', height: '40px' }}
              placeholder="e.g. hvance"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Email Address */}
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--neutral-700)', marginBottom: '6px' }}>
            Email Address (Institutional) *
          </label>
          <div style={{ position: 'relative' }}>
            <Mail
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
              type="email"
              className="form-input"
              style={{ paddingLeft: '38px', height: '40px' }}
              placeholder="e.g. hvance@uconnect.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Department */}
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--neutral-700)', marginBottom: '6px' }}>
            Department Affiliation {role === 'staff' ? '*' : '(Optional)'}
          </label>
          <div style={{ position: 'relative' }}>
            <Building
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
              }}
            />
            <select
              className="form-select"
              style={{ paddingLeft: '38px', height: '40px' }}
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">General / No Specific Department</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Initial Password */}
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--neutral-700)', marginBottom: '6px' }}>
            Temporary Password <span style={{ fontWeight: 400, color: '#64748b' }}>(Default: password123)</span>
          </label>
          <div style={{ position: 'relative' }}>
            <Lock
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
              type="password"
              className="form-input"
              style={{ paddingLeft: '38px', height: '40px' }}
              placeholder="Leave blank to use default (password123)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px', paddingTop: '14px', borderTop: '1px solid #f1f5f9' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <UserPlus size={16} />
            <span>{isLoading ? 'Creating Account...' : 'Enroll User'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
