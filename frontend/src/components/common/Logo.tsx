import React from 'react';
import { GraduationCap } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ size = 'md', showTagline = false }) => {
  const iconSize = size === 'lg' ? 26 : size === 'md' ? 20 : 16;
  const textSize = size === 'lg' ? '1.5rem' : size === 'md' ? '1.2rem' : '1rem';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div
        style={{
          width: size === 'lg' ? '42px' : size === 'md' ? '34px' : '28px',
          height: size === 'lg' ? '42px' : size === 'md' ? '34px' : '28px',
          backgroundColor: '#2563eb',
          color: '#ffffff',
          borderRadius: '9px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
        }}
      >
        <GraduationCap size={iconSize} strokeWidth={2} />
      </div>

      <div>
        <div
          style={{
            fontSize: textSize,
            fontWeight: 800,
            color: '#2563eb',
            letterSpacing: '-0.035em',
            display: 'flex',
            alignItems: 'baseline',
          }}
        >
          <span>UConnect</span>
        </div>
        {showTagline && (
          <div
            style={{
              fontSize: '0.75rem',
              color: '#2563eb',
              fontWeight: 400,
              marginTop: '1px',
              letterSpacing: '-0.01em',
            }}
          >
            Your Voice. A Better University.
          </div>
        )}
      </div>
    </div>
  );
};
