import React from 'react';
import { ComplaintStatus, ComplaintPriority } from '../../types/api';
import { AlertCircle, Clock, CheckCircle2, ShieldAlert, Sparkles } from 'lucide-react';

interface StatusBadgeProps {
  status: ComplaintStatus | string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const norm = status.toLowerCase();

  if (norm === 'pending') {
    return (
      <span className="status-badge status-pending">
        <span className="status-dot" />
        <span>Under Review</span>
      </span>
    );
  }
  if (norm === 'in-progress') {
    return (
      <span className="status-badge status-in-progress">
        <span className="status-dot" />
        <span>In Progress</span>
      </span>
    );
  }
  if (norm === 'resolved') {
    return (
      <span className="status-badge status-resolved">
        <span className="status-dot" />
        <span>Resolved</span>
      </span>
    );
  }
  if (norm === 'closed') {
    return (
      <span className="status-badge status-closed">
        <span className="status-dot" />
        <span>Closed</span>
      </span>
    );
  }

  return (
    <span className="status-badge status-closed">
      <span className="status-dot" />
      <span>{status}</span>
    </span>
  );
};

interface PriorityBadgeProps {
  priority: ComplaintPriority | string;
  showIcon?: boolean;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority, showIcon = true }) => {
  const norm = priority.toLowerCase();

  return (
    <span className={`priority-badge priority-${norm}`}>
      {showIcon && norm === 'critical' && <ShieldAlert size={12} strokeWidth={2.5} />}
      {showIcon && norm === 'high' && <AlertCircle size={12} strokeWidth={2.5} />}
      {showIcon && norm === 'medium' && <Clock size={12} strokeWidth={2.5} />}
      {showIcon && norm === 'low' && <CheckCircle2 size={12} strokeWidth={2.5} />}
      <span>{priority}</span>
    </span>
  );
};

export const SlaBadge: React.FC<{ breached?: boolean; escalated?: boolean }> = ({ breached, escalated }) => {
  if (breached) {
    return (
      <span
        style={{
          backgroundColor: '#fef2f2',
          color: '#b91c1c',
          border: '1px solid #fecaca',
          fontSize: '0.7rem',
          padding: '2px 7px',
          borderRadius: '6px',
          fontWeight: 700,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          letterSpacing: '-0.01em',
        }}
      >
        <AlertCircle size={11} strokeWidth={2.5} /> SLA Breached (&gt;72h)
      </span>
    );
  }
  if (escalated) {
    return (
      <span
        style={{
          backgroundColor: '#fff7ed',
          color: '#c2410c',
          border: '1px solid #fed7aa',
          fontSize: '0.7rem',
          padding: '2px 7px',
          borderRadius: '6px',
          fontWeight: 700,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          letterSpacing: '-0.01em',
        }}
      >
        <Sparkles size={11} strokeWidth={2.5} /> Auto-Escalated
      </span>
    );
  }
  return null;
};
