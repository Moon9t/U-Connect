import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/common/Toast';
import { Logo } from '../components/common/Logo';
import {
  User as UserIcon,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  UserCheck,
  GraduationCap,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { error, success } = useToast();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      error('Please enter both email and password');
      return;
    }

    setIsLoading(true);
    try {
      await login(email, password);
      success('Authenticated successfully');
    } catch (err: any) {
      error(err.message || 'Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail: string) => {
    setIsLoading(true);
    setEmail(demoEmail);
    setPassword('password123');
    try {
      await login(demoEmail, 'password123');
      success(`Authenticated as ${demoEmail}`);
    } catch (err: any) {
      error(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        backgroundColor: '#fbfbfb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        padding: '24px',
      }}
    >
      {/* Left Editorial Slogan matching UI.png */}
      <div
        style={{
          position: 'absolute',
          left: '10%',
          bottom: '20%',
          maxWidth: '220px',
          display: 'none',
        }}
        className="slogan-left"
      >
        <p
          style={{
            fontSize: '1.45rem',
            fontWeight: 700,
            color: '#18181b',
            lineHeight: 1.3,
            letterSpacing: '-0.025em',
          }}
        >
          A safer, better university starts with you.
        </p>
        <div
          style={{
            width: '36px',
            height: '2px',
            backgroundColor: '#18181b',
            marginTop: '14px',
          }}
        />
      </div>

      {/* Right Editorial Slogan matching UI.png */}
      <div
        style={{
          position: 'absolute',
          right: '10%',
          top: '36%',
          maxWidth: '220px',
          display: 'none',
        }}
        className="slogan-right"
      >
        <p
          style={{
            fontSize: '1.75rem',
            fontWeight: 700,
            color: '#18181b',
            lineHeight: 1.3,
            letterSpacing: '-0.025em',
          }}
        >
          Report.
          <br />
          Track.
          <br />
          Resolve.
          <br />
          Together.
        </p>
        <div
          style={{
            width: '46px',
            height: '3px',
            backgroundColor: '#18181b',
            marginTop: '14px',
          }}
        />
      </div>

      {/* Center Sign In Card matching UI.png */}
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '38px 36px',
          boxShadow: '0 4px 20px -4px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(0, 0, 0, 0.06)',
          position: 'relative',
          zIndex: 10,
        }}
      >
        {/* Brand Logo */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            marginBottom: '26px',
          }}
        >
          <Logo size="md" showTagline={true} />
        </div>

        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h2
            style={{
              fontSize: '1.4rem',
              fontWeight: 700,
              color: '#09090b',
              letterSpacing: '-0.03em',
            }}
          >
            Sign In
          </h2>
          <p style={{ fontSize: '0.825rem', color: '#71717a', marginTop: '3px' }}>
            Enter your university credentials to continue
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Username / Email */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <div style={{ position: 'relative' }}>
              <span
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#a1a1aa',
                  display: 'flex',
                  pointerEvents: 'none',
                }}
              >
                <UserIcon size={17} />
              </span>
              <input
                type="email"
                placeholder="Username or University Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="form-input"
                style={{
                  paddingLeft: '38px',
                  borderRadius: '10px',
                  height: '44px',
                }}
              />
            </div>
          </div>

          {/* Password */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <div style={{ position: 'relative' }}>
              <span
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#a1a1aa',
                  display: 'flex',
                  pointerEvents: 'none',
                }}
              >
                <Lock size={17} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="form-input"
                style={{
                  paddingLeft: '38px',
                  paddingRight: '38px',
                  borderRadius: '10px',
                  height: '44px',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#a1a1aa',
                  padding: '4px',
                  display: 'flex',
                }}
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Remember Me & Forgot Password */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
              fontSize: '0.8rem',
            }}
          >
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#52525b',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: '#18181b' }}
              />
              <span>Remember me</span>
            </label>

            <button
              type="button"
              style={{
                color: '#18181b',
                fontWeight: 600,
                fontSize: '0.8rem',
                textDecoration: 'underline',
                textUnderlineOffset: '2px',
              }}
              onClick={() => error('Password reset requires university IT administrator clearance.')}
            >
              Forgot your password?
            </button>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="btn btn-primary"
            style={{
              width: '100%',
              height: '44px',
              borderRadius: '10px',
              fontSize: '0.875rem',
              fontWeight: 600,
            }}
          >
            {isLoading ? 'Signing In...' : 'Login'}
          </button>
        </form>

        {/* Demo Roles in Clean Human Pills */}
        <div
          style={{
            marginTop: '22px',
            paddingTop: '16px',
            borderTop: '1px solid #f4f4f5',
          }}
        >
          <p
            style={{
              fontSize: '0.7rem',
              color: '#71717a',
              fontWeight: 600,
              textAlign: 'center',
              marginBottom: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Quick Sign In
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            <button
              onClick={() => handleQuickLogin('student1@uconnect.edu')}
              className="btn btn-secondary"
              style={{ padding: '6px 4px', fontSize: '0.75rem' }}
              title="student1@uconnect.edu"
            >
              <GraduationCap size={14} color="#18181b" />
              <span>Student</span>
            </button>

            <button
              onClick={() => handleQuickLogin('staff1@uconnect.edu')}
              className="btn btn-secondary"
              style={{ padding: '6px 4px', fontSize: '0.75rem' }}
              title="staff1@uconnect.edu"
            >
              <UserCheck size={14} color="#18181b" />
              <span>Staff</span>
            </button>

            <button
              onClick={() => handleQuickLogin('admin@test.com')}
              className="btn btn-secondary"
              style={{ padding: '6px 4px', fontSize: '0.75rem' }}
              title="admin@test.com"
            >
              <ShieldCheck size={14} color="#18181b" />
              <span>Admin</span>
            </button>
          </div>
        </div>

        {/* Support Help Footer */}
        <div style={{ textAlign: 'center', marginTop: '18px' }}>
          <p style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>
            Need help? Contact the UConnect Support Team.
          </p>
        </div>
      </div>

      <style>{`
        @media (min-width: 1024px) {
          .slogan-left, .slogan-right {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
};
