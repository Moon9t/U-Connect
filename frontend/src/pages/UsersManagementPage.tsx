import React, { useState, useEffect } from 'react';
import { adminService } from '../services/admin.service';
import { User, UserRole, CreateUserDTO } from '../types/api';
import { useToast } from '../components/common/Toast';
import { CreateUserModal } from '../components/admin/CreateUserModal';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { EmptyState } from '../components/common/EmptyState';
import {
  Users,
  Shield,
  UserCheck,
  GraduationCap,
  Search,
  UserPlus,
  Power,
  Trash2,
  CheckCircle2,
  XCircle,
  Filter,
  UserX,
} from 'lucide-react';

export const UsersManagementPage: React.FC = () => {
  const { success, error } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [targetUserForStatus, setTargetUserForStatus] = useState<User | null>(null);
  const [targetUserForDelete, setTargetUserForDelete] = useState<User | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const data = await adminService.getUsers();
      setUsers(data || []);
    } catch (err: any) {
      error(err.message || 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async (dto: CreateUserDTO) => {
    setIsSubmitting(true);
    try {
      const created = await adminService.createUser(dto);
      setUsers((prev) => [...prev, created]);
      success(`User ${created.name} enrolled successfully with default password`);
    } catch (err: any) {
      error(err.message || 'Failed to create user');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleChange = async (userId: number, newRole: UserRole) => {
    try {
      await adminService.updateUserRole(userId, newRole);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
      success(`User role updated to ${newRole}`);
    } catch (err: any) {
      error(err.message || 'Failed to update user role');
    }
  };

  const handleConfirmToggleStatus = async () => {
    if (!targetUserForStatus) return;
    const newStatus = targetUserForStatus.is_active === false ? true : false;
    setIsSubmitting(true);
    try {
      await adminService.toggleUserStatus(targetUserForStatus.id, newStatus);
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUserForStatus.id ? { ...u, is_active: newStatus } : u))
      );
      success(
        `User ${targetUserForStatus.name} has been ${newStatus ? 'reactivated' : 'deactivated'}`
      );
      setTargetUserForStatus(null);
    } catch (err: any) {
      error(err.message || 'Failed to update user activation state');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!targetUserForDelete) return;
    setIsSubmitting(true);
    try {
      await adminService.deleteUser(targetUserForDelete.id);
      setUsers((prev) => prev.filter((u) => u.id !== targetUserForDelete.id));
      success(`User ${targetUserForDelete.name} has been removed from directory`);
      setTargetUserForDelete(null);
    } catch (err: any) {
      error(err.message || 'Failed to delete user');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Metrics calculation
  const totalUsersCount = users.length;
  const activeUsersCount = users.filter((u) => u.is_active !== false).length;
  const staffAdminCount = users.filter((u) => u.role === 'staff' || u.role === 'admin').length;
  const deactivatedCount = users.filter((u) => u.is_active === false).length;

  const filteredUsers = users.filter((u) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const match =
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.department?.name && u.department.name.toLowerCase().includes(q));
      if (!match) return false;
    }

    if (roleFilter !== 'all' && u.role !== roleFilter) {
      return false;
    }

    if (statusFilter === 'active' && u.is_active === false) {
      return false;
    }
    if (statusFilter === 'deactivated' && u.is_active !== false) {
      return false;
    }

    return true;
  });

  return (
    <div className="page-container animate-fade-in">
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h1 className="page-title">User Directory & Access Control</h1>
          <p className="page-subtitle">
            Manage institutional users, role assignments, department affiliations, and account activation states.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <UserPlus size={16} />
          <span>Enroll New User</span>
        </button>
      </div>

      {/* Metric Stat Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              backgroundColor: '#eff6ff',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Users size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              Total Users
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
              {totalUsersCount}
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              backgroundColor: '#ecfdf5',
              color: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              Active Accounts
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#059669' }}>
              {activeUsersCount}
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              backgroundColor: '#f5f3ff',
              color: '#6366f1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Shield size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              Staff & Admins
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#4f46e5' }}>
              {staffAdminCount}
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              backgroundColor: '#fff1f2',
              color: '#e11d48',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <UserX size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              Deactivated
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: deactivatedCount > 0 ? '#e11d48' : '#64748b' }}>
              {deactivatedCount}
            </div>
          </div>
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
          justifyContent: 'space-between',
          gap: '12px',
        }}
      >
        <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
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
            placeholder="Search by name, email, or dept..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '36px', height: '38px', fontSize: '0.85rem' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>Role:</span>
            <select
              className="form-select"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              style={{ height: '38px', fontSize: '0.85rem', width: 'auto' }}
            >
              <option value="all">All Roles</option>
              <option value="student">Students</option>
              <option value="staff">Staff</option>
              <option value="admin">Admins</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>Status:</span>
            <select
              className="form-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ height: '38px', fontSize: '0.85rem', width: 'auto' }}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="deactivated">Deactivated Only</option>
            </select>
          </div>

          {(search || roleFilter !== 'all' || statusFilter !== 'all') && (
            <button
              onClick={() => {
                setSearch('');
                setRoleFilter('all');
                setStatusFilter('all');
              }}
              style={{
                fontSize: '0.75rem',
                color: '#6366f1',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
                padding: '4px 8px',
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Users Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="table-container" style={{ border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>User Details</th>
                <th>Institutional Email</th>
                <th>Department</th>
                <th>Role & Permissions</th>
                <th>Account Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      <span className="spinner-border" />
                      <span>Loading user directory...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px' }}>
                    <EmptyState
                      icon="users"
                      title="No Users Found"
                      description="No user accounts match your search query or filter selection."
                    />
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isActive = u.is_active !== false;
                  const isRootAdmin = u.email === 'admin@test.com' || u.id === 1;

                  return (
                    <tr
                      key={u.id}
                      style={{
                        backgroundColor: isActive ? 'transparent' : '#fafafa',
                        opacity: isActive ? 1 : 0.75,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <td style={{ fontWeight: 600, color: '#0f172a' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '50%',
                              backgroundColor:
                                u.role === 'admin'
                                  ? '#312e81'
                                  : u.role === 'staff'
                                  ? '#0369a1'
                                  : '#15803d',
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.825rem',
                              fontWeight: 700,
                              boxShadow: '0 2px 4px rgba(0,0,0,0.06)',
                            }}
                          >
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ color: isActive ? '#0f172a' : '#64748b' }}>{u.name}</div>
                            <div style={{ fontSize: '0.725rem', color: '#94a3b8', fontWeight: 400 }}>
                              ID #{u.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ color: '#475569', fontSize: '0.85rem' }}>{u.email}</td>
                      <td>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            backgroundColor: '#f1f5f9',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            color: '#334155',
                            fontWeight: 500,
                          }}
                        >
                          {u.department?.name || 'General / Unassigned'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              fontSize: '0.725rem',
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              backgroundColor:
                                u.role === 'admin'
                                  ? '#ede9fe'
                                  : u.role === 'staff'
                                  ? '#e0f2fe'
                                  : '#dcfce7',
                              color:
                                u.role === 'admin'
                                  ? '#5b21b6'
                                  : u.role === 'staff'
                                  ? '#0369a1'
                                  : '#15803d',
                            }}
                          >
                            {u.role === 'admin' && <Shield size={12} />}
                            {u.role === 'staff' && <UserCheck size={12} />}
                            {u.role === 'student' && <GraduationCap size={12} />}
                            {u.role}
                          </span>

                          {!isRootAdmin && (
                            <select
                              value={u.role}
                              onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                              className="form-select"
                              style={{
                                width: 'auto',
                                padding: '2px 6px',
                                fontSize: '0.75rem',
                                fontWeight: 500,
                                borderColor: '#cbd5e1',
                              }}
                            >
                              <option value="student">Student</option>
                              <option value="staff">Staff</option>
                              <option value="admin">Admin</option>
                            </select>
                          )}
                        </div>
                      </td>
                      <td>
                        {isActive ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '3px 8px',
                              borderRadius: '9999px',
                              fontSize: '0.725rem',
                              fontWeight: 600,
                              backgroundColor: '#ecfdf5',
                              color: '#059669',
                              border: '1px solid #a7f3d0',
                            }}
                          >
                            <span
                              style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                backgroundColor: '#10b981',
                              }}
                            />
                            Active
                          </span>
                        ) : (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '3px 8px',
                              borderRadius: '9999px',
                              fontSize: '0.725rem',
                              fontWeight: 600,
                              backgroundColor: '#fff1f2',
                              color: '#e11d48',
                              border: '1px solid #fecdd3',
                            }}
                          >
                            <XCircle size={10} />
                            Deactivated
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          {!isRootAdmin ? (
                            <>
                              <button
                                type="button"
                                onClick={() => setTargetUserForStatus(u)}
                                title={isActive ? 'Deactivate Account' : 'Reactivate Account'}
                                style={{
                                  padding: '5px 8px',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  borderRadius: '6px',
                                  border: '1px solid',
                                  borderColor: isActive ? '#fecaca' : '#a7f3d0',
                                  backgroundColor: isActive ? '#fef2f2' : '#ecfdf5',
                                  color: isActive ? '#dc2626' : '#059669',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                <Power size={12} />
                                <span>{isActive ? 'Deactivate' : 'Reactivate'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setTargetUserForDelete(u)}
                                title="Delete user permanently"
                                style={{
                                  padding: '5px 8px',
                                  fontSize: '0.75rem',
                                  borderRadius: '6px',
                                  border: '1px solid #e2e8f0',
                                  backgroundColor: '#ffffff',
                                  color: '#64748b',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  transition: 'all 0.15s ease',
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.color = '#dc2626';
                                  e.currentTarget.style.borderColor = '#fca5a5';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.color = '#64748b';
                                  e.currentTarget.style.borderColor = '#e2e8f0';
                                }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </>
                          ) : (
                            <span style={{ fontSize: '0.725rem', color: '#94a3b8', fontStyle: 'italic' }}>
                              Root Admin
                            </span>
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
      </div>

      {/* Enroll New User Modal */}
      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateUser}
        isLoading={isSubmitting}
      />

      {/* Confirm Deactivation / Reactivation Modal */}
      {targetUserForStatus && (
        <ConfirmModal
          isOpen={Boolean(targetUserForStatus)}
          onClose={() => setTargetUserForStatus(null)}
          onConfirm={handleConfirmToggleStatus}
          title={
            targetUserForStatus.is_active === false
              ? `Reactivate ${targetUserForStatus.name}?`
              : `Deactivate ${targetUserForStatus.name}?`
          }
          message={
            targetUserForStatus.is_active === false
              ? `Are you sure you want to restore access for ${targetUserForStatus.name} (${targetUserForStatus.email})? They will be able to log in immediately.`
              : `Are you sure you want to deactivate ${targetUserForStatus.name} (${targetUserForStatus.email})? Deactivating will immediately revoke login sessions and block new authentication.`
          }
          confirmLabel={targetUserForStatus.is_active === false ? 'Reactivate Account' : 'Deactivate Account'}
          confirmVariant={targetUserForStatus.is_active === false ? 'primary' : 'danger'}
          isLoading={isSubmitting}
        />
      )}

      {/* Confirm Deletion Modal */}
      {targetUserForDelete && (
        <ConfirmModal
          isOpen={Boolean(targetUserForDelete)}
          onClose={() => setTargetUserForDelete(null)}
          onConfirm={handleConfirmDelete}
          title={`Permanently Delete ${targetUserForDelete.name}?`}
          message={`This will permanently delete the user account (${targetUserForDelete.email}). Any existing complaints submitted by this user will remain for institutional record integrity.`}
          confirmLabel="Delete User"
          confirmVariant="danger"
          isLoading={isSubmitting}
        />
      )}
    </div>
  );
};
