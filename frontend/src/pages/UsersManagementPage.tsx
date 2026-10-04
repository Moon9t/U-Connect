import React, { useEffect, useState } from 'react';
import { adminService } from '../services/admin.service';
import { User, UserRole } from '../types/api';
import { useToast } from '../components/common/Toast';
import {
  Shield,
  UserCheck,
  GraduationCap,
  Search,
  UserPlus,
  X,
} from 'lucide-react';

export const UsersManagementPage: React.FC = () => {
  const { success, error } = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    password: '',
    role: 'student' as UserRole,
  });

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

  const handleCreateUser = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (
      !newUser.username.trim() ||
      !newUser.email.trim() ||
      !newUser.password
    ) {
      error('Username, email and password are required.');
      return;
    }

    if (newUser.password.length < 8) {
      error('Password must be at least 8 characters.');
      return;
    }

    setIsCreating(true);

    try {
      const createdUser = await adminService.createUser({
        username: newUser.username.trim(),
        email: newUser.email.trim(),
        password: newUser.password,
        role: newUser.role,
      });

      setUsers((prev) => [createdUser, ...prev]);

      setNewUser({
        username: '',
        email: '',
        password: '',
        role: 'student',
      });

      setShowCreateForm(false);

      success('User account created successfully.');
    } catch (err: any) {
      error(err.message || 'Failed to create user');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeactivate = async (userId: number) => {
    if (!window.confirm('Deactivate this user account?')) {
      return;
    }

    try {
      await adminService.deactivateUser(userId);

      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, is_active: false }
            : u
        )
      );

      success('User account deactivated');
    } catch (err: any) {
      error(err.message || 'Failed to deactivate user');
    }
  };

  const handleRoleChange = async (
    userId: number,
    newRole: UserRole
  ) => {
    try {
      await adminService.updateUserRole(userId, newRole);

      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, role: newRole }
            : u
        )
      );

      success(`User role updated to ${newRole}`);
    } catch (err: any) {
      error(err.message || 'Failed to update user role');
    }
  };

  const filteredUsers = users.filter((u) => {
    if (!search.trim()) {
      return true;
    }

    const q = search.toLowerCase();

    return (
      u.username.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  });

  return (
    <div className="page-container animate-fade-in">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '24px',
          gap: '16px',
        }}
      >
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">
            Manage institutional users and role-based permissions.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setShowCreateForm(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap',
          }}
        >
          <UserPlus size={16} />
          Create User
        </button>
      </div>

      {showCreateForm && (
        <div
          className="card"
          style={{
            padding: '20px',
            marginBottom: '20px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '18px',
            }}
          >
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: '1.1rem',
                  color: '#0f172a',
                }}
              >
                Create User Account
              </h2>

              <p
                style={{
                  margin: '5px 0 0',
                  fontSize: '0.85rem',
                  color: '#64748b',
                }}
              >
                Create a new institutional user account.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              aria-label="Close create user form"
              style={{
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: '#64748b',
                padding: '4px',
              }}
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleCreateUser}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '16px',
              }}
            >
              <div>
                <label
                  htmlFor="new-username"
                  className="form-label"
                >
                  Username
                </label>

                <input
                  id="new-username"
                  type="text"
                  className="form-input"
                  value={newUser.username}
                  onChange={(e) =>
                    setNewUser((prev) => ({
                      ...prev,
                      username: e.target.value,
                    }))
                  }
                  placeholder="University username"
                  minLength={3}
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="new-email"
                  className="form-label"
                >
                  Email Address
                </label>

                <input
                  id="new-email"
                  type="email"
                  className="form-input"
                  value={newUser.email}
                  onChange={(e) =>
                    setNewUser((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                  placeholder="user@uconnect.edu"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="new-password"
                  className="form-label"
                >
                  Password
                </label>

                <input
                  id="new-password"
                  type="password"
                  className="form-input"
                  value={newUser.password}
                  onChange={(e) =>
                    setNewUser((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                  placeholder="Minimum 8 characters"
                  minLength={8}
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="new-role"
                  className="form-label"
                >
                  Role
                </label>

                <select
                  id="new-role"
                  className="form-select"
                  value={newUser.role}
                  onChange={(e) =>
                    setNewUser((prev) => ({
                      ...prev,
                      role: e.target.value as UserRole,
                    }))
                  }
                >
                  <option value="student">Student</option>
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                marginTop: '20px',
              }}
            >
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowCreateForm(false)}
                disabled={isCreating}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={isCreating}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <UserPlus size={16} />

                {isCreating
                  ? 'Creating...'
                  : 'Create User'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div
        className="card"
        style={{
          padding: '16px 20px',
          marginBottom: '20px',
        }}
      >
        <div
          style={{
            position: 'relative',
            maxWidth: '360px',
          }}
        >
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
            placeholder="Search users by username or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              paddingLeft: '36px',
              height: '40px',
            }}
          />
        </div>
      </div>

      <div
        className="card"
        style={{
          overflow: 'hidden',
        }}
      >
        <div
          className="table-container"
          style={{
            border: 'none',
          }}
        >
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email Address</th>
                <th>Current Role</th>
                <th>Account Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      textAlign: 'center',
                      padding: '36px',
                      color: '#94a3b8',
                    }}
                  >
                    Loading users...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    style={{
                      textAlign: 'center',
                      padding: '36px',
                      color: '#94a3b8',
                    }}
                  >
                    No users found matching query.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isInactive =
                    u.is_active === false ||
                    u.is_active === 0;

                  return (
                    <tr key={u.id}>
                      <td
                        style={{
                          fontWeight: 600,
                          color: '#0f172a',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                          }}
                        >
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
                            {u.username
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <span>{u.username}</span>
                        </div>
                      </td>

                      <td style={{ color: '#475569' }}>
                        {u.email}
                      </td>

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
                          {u.role === 'admin' && (
                            <Shield size={12} />
                          )}

                          {u.role === 'staff' && (
                            <UserCheck size={12} />
                          )}

                          {u.role === 'student' && (
                            <GraduationCap size={12} />
                          )}

                          {u.role}
                        </span>
                      </td>

                      <td>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            backgroundColor: isInactive
                              ? '#f1f5f9'
                              : '#dcfce7',
                            color: isInactive
                              ? '#64748b'
                              : '#15803d',
                          }}
                        >
                          {isInactive
                            ? 'Inactive'
                            : 'Active'}
                        </span>
                      </td>

                      <td>
                        <div
                          style={{
                            display: 'flex',
                            gap: '8px',
                            alignItems: 'center',
                          }}
                        >
                          <select
                            value={u.role}
                            onChange={(e) =>
                              handleRoleChange(
                                u.id,
                                e.target.value as UserRole
                              )
                            }
                            className="form-select"
                            style={{
                              width: 'auto',
                              padding: '4px 8px',
                              fontSize: '0.8rem',
                              fontWeight: 500,
                              borderColor: '#cbd5e1',
                            }}
                            disabled={isInactive}
                          >
                            <option value="student">
                              Student
                            </option>
                            <option value="staff">
                              Staff
                            </option>
                            <option value="admin">
                              Admin
                            </option>
                          </select>

                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() =>
                              handleDeactivate(u.id)
                            }
                            disabled={isInactive}
                            style={{
                              padding: '5px 8px',
                              fontSize: '0.75rem',
                            }}
                          >
                            {isInactive
                              ? 'Inactive'
                              : 'Deactivate'}
                          </button>
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
    </div>
  );
};