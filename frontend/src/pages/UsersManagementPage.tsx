import React, { useState, useEffect } from 'react';
import { adminService } from '../services/admin.service';
import { User, UserRole } from '../types/api';
import { useToast } from '../components/common/Toast';
import { Users, Shield, UserCheck, GraduationCap, Search } from 'lucide-react';

export const UsersManagementPage: React.FC = () => {
  const { success, error } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

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

  const filteredUsers = users.filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  return (
    <div className="page-container animate-fade-in">
      <div style={{ marginBottom: '24px' }}>
        <h1 className="page-title">User Management</h1>
        <p className="page-subtitle">Manage institutional users and role-based permissions.</p>
      </div>

      <div className="card" style={{ padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ position: 'relative', maxWidth: '360px' }}>
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
            placeholder="Search users by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '36px', height: '40px' }}
          />
        </div>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="table-container" style={{ border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email Address</th>
                <th>Department</th>
                <th>Current Role</th>
                <th>Action: Change Role</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                    Loading users...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '36px', color: '#94a3b8' }}>
                    No users found matching query.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  return (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 600, color: '#0f172a' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
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
                              fontSize: '0.8rem',
                              fontWeight: 700,
                            }}
                          >
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <span>{u.name}</span>
                        </div>
                      </td>
                      <td style={{ color: '#475569' }}>{u.email}</td>
                      <td>{u.department?.name || 'General / Unassigned'}</td>
                      <td>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
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
                      </td>
                      <td>
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                          className="form-select"
                          style={{
                            width: 'auto',
                            padding: '4px 8px',
                            fontSize: '0.8rem',
                            fontWeight: 500,
                            borderColor: '#cbd5e1',
                          }}
                        >
                          <option value="student">Student</option>
                          <option value="staff">Staff</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
