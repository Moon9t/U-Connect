import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Mail, Shield, Calendar } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, role } = useAuth();

  const username = user?.username || 'User';
  const initial = username.charAt(0).toUpperCase();

  return (
    <div
      className="page-container animate-fade-in"
      style={{ maxWidth: '780px' }}
    >
      <div style={{ marginBottom: '24px' }}>
        <h1 className="page-title">User Profile</h1>
        <p className="page-subtitle">
          Your credentials and role settings within U-Connect.
        </p>
      </div>

      <div className="card" style={{ padding: '32px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            paddingBottom: '24px',
            borderBottom: '1px solid #e2e8f0',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: role === 'admin' ? '#0f172a' : '#1d4ed8',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.75rem',
              fontWeight: 800,
            }}
          >
            {initial}
          </div>

          <div>
            <h2
              style={{
                fontSize: '1.35rem',
                fontWeight: 700,
                color: '#0f172a',
              }}
            >
              {username}
            </h2>

            <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
              {user?.email}
            </p>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                marginTop: '6px',
                padding: '2px 8px',
                borderRadius: '4px',
                backgroundColor: '#eff6ff',
                color: '#1d4ed8',
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'uppercase',
              }}
            >
              <Shield size={12} />
              {role}
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '20px',
          }}
        >
          <div>
            <label
              className="form-label"
              style={{ color: '#64748b', fontSize: '0.8rem' }}
            >
              Username
            </label>

            <div
              style={{
                fontSize: '0.95rem',
                fontWeight: 600,
                color: '#0f172a',
              }}
            >
              {user?.username}
            </div>
          </div>

          <div>
            <label
              className="form-label"
              style={{ color: '#64748b', fontSize: '0.8rem' }}
            >
              University Email
            </label>

            <div
              style={{
                fontSize: '0.95rem',
                fontWeight: 600,
                color: '#0f172a',
              }}
            >
              {user?.email}
            </div>
          </div>

          <div>
            <label
              className="form-label"
              style={{ color: '#64748b', fontSize: '0.8rem' }}
            >
              Role Boundary
            </label>

            <div
              style={{
                fontSize: '0.95rem',
                fontWeight: 600,
                color: '#0f172a',
              }}
            >
              {role === 'admin'
                ? 'System Administrator (Full Oversight)'
                : role === 'staff'
                ? 'Departmental Staff (Resolution Authority)'
                : 'Student Grievance Submitter'}
            </div>
          </div>

          <div>
            <label
              className="form-label"
              style={{ color: '#64748b', fontSize: '0.8rem' }}
            >
              Account Status
            </label>

            <div
              style={{
                fontSize: '0.95rem',
                fontWeight: 600,
                color: user?.is_active ? '#16a34a' : '#dc2626',
              }}
            >
              {user?.is_active ? 'Active' : 'Inactive'}
            </div>
          </div>

          <div>
            <label
              className="form-label"
              style={{ color: '#64748b', fontSize: '0.8rem' }}
            >
              Account Created
            </label>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.95rem',
                fontWeight: 600,
                color: '#0f172a',
              }}
            >
              <Calendar size={15} />

              {user?.created_at
                ? new Date(user.created_at).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })
                : 'Not available'}
            </div>
          </div>

          <div>
            <label
              className="form-label"
              style={{ color: '#64748b', fontSize: '0.8rem' }}
            >
              Contact Email
            </label>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.95rem',
                fontWeight: 600,
                color: '#0f172a',
              }}
            >
              <Mail size={15} />
              {user?.email}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};