import React from 'react';
import { Check, Clock, AlertCircle, CheckCircle2, Lock } from 'lucide-react';
import { ComplaintStatus } from '../../types/api';

interface LifecycleStepperProps {
  status: ComplaintStatus;
  createdAt: string;
  resolvedAt?: string | null;
}

const STAGES: { key: ComplaintStatus; label: string; icon: React.ReactNode }[] = [
  { key: 'pending', label: 'Pending Intake', icon: <Clock size={14} /> },
  { key: 'in-progress', label: 'In Investigation', icon: <AlertCircle size={14} /> },
  { key: 'resolved', label: 'Action Resolved', icon: <CheckCircle2 size={14} /> },
  { key: 'closed', label: 'Closed (Terminal)', icon: <Lock size={14} /> },
];

export const LifecycleStepper: React.FC<LifecycleStepperProps> = ({
  status,
  createdAt,
  resolvedAt,
}) => {
  const getStageIndex = (s: ComplaintStatus): number => {
    switch (s) {
      case 'pending':
        return 0;
      case 'in-progress':
        return 1;
      case 'resolved':
        return 2;
      case 'closed':
        return 3;
      default:
        return 0;
    }
  };

  const currentIndex = getStageIndex(status);
  const progressPercent = (currentIndex / (STAGES.length - 1)) * 100;

  return (
    <div style={{ margin: '16px 0 24px', padding: '16px', background: 'var(--neutral-50)', borderRadius: '12px', border: '1px solid var(--neutral-200)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--neutral-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Workflow Progression Timeline
        </span>
        <span style={{ fontSize: '0.75rem', color: 'var(--neutral-500)' }}>
          Created: {new Date(createdAt).toLocaleDateString()}
          {resolvedAt && ` • Resolved: ${new Date(resolvedAt).toLocaleDateString()}`}
        </span>
      </div>

      <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        {/* Background track line */}
        <div
          style={{
            position: 'absolute',
            top: '16px',
            left: '30px',
            right: '30px',
            height: '3px',
            backgroundColor: 'var(--neutral-200)',
            zIndex: 1,
          }}
        >
          {/* Active progress fill */}
          <div
            style={{
              height: '100%',
              backgroundColor: status === 'closed' ? '#16a34a' : 'var(--accent-primary)',
              width: `${progressPercent}%`,
              transition: 'width 0.4s ease',
            }}
          />
        </div>

        {/* Steps */}
        {STAGES.map((stage, idx) => {
          const isCompleted = idx < currentIndex;
          const isCurrent = idx === currentIndex;

          return (
            <div
              key={stage.key}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                zIndex: 2,
                flex: 1,
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  backgroundColor: isCompleted
                    ? '#16a34a'
                    : isCurrent
                    ? 'var(--accent-primary)'
                    : '#ffffff',
                  color: isCompleted || isCurrent ? '#ffffff' : 'var(--neutral-400)',
                  border: isCompleted
                    ? '2px solid #16a34a'
                    : isCurrent
                    ? '2px solid var(--accent-primary)'
                    : '2px solid var(--neutral-300)',
                  boxShadow: isCurrent ? '0 0 0 4px rgba(37, 99, 235, 0.2)' : 'none',
                  transition: 'all 0.25s ease',
                }}
              >
                {isCompleted ? <Check size={16} strokeWidth={3} /> : stage.icon}
              </div>

              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: isCurrent ? 700 : 500,
                  color: isCurrent ? 'var(--neutral-900)' : 'var(--neutral-500)',
                  marginTop: '8px',
                }}
              >
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
