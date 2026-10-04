import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Zap,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Radio,
  ExternalLink,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

interface OperationalPulseWidgetProps {
  totalMonitored?: number;
  slaBreachCount?: number;
  averageHours?: number;
  onOpenQuickSearch?: () => void;
}

export const OperationalPulseWidget: React.FC<OperationalPulseWidgetProps> = ({
  totalMonitored = 520,
  slaBreachCount = 40,
  averageHours = 24.6,
  onOpenQuickSearch,
}) => {
  const [activeEventIndex, setActiveEventIndex] = useState(0);

  const auditEvents = [
    { text: 'Auto-escalation engine active: priority rules enforced', time: '1m ago', icon: <Zap size={13} color="#eab308" /> },
    { text: '72-Hour SLA Sentinel monitoring active tickets', time: '3m ago', icon: <Clock size={13} color="#3b82f6" /> },
    { text: 'Department Facilities resolved ticket batch #481-486', time: '6m ago', icon: <CheckCircle2 size={13} color="#10b981" /> },
    { text: 'Anonymous identity mask verified across public channels', time: '9m ago', icon: <ShieldCheck size={13} color="#6366f1" /> },
    { text: 'Campus Safety alert automatically flagged Critical', time: '14m ago', icon: <AlertTriangle size={13} color="#ef4444" /> },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveEventIndex((prev) => (prev + 1) % auditEvents.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [auditEvents.length]);

  const complianceRate = totalMonitored > 0
    ? (((totalMonitored - slaBreachCount) / totalMonitored) * 100).toFixed(1)
    : '95.0';

  return (
    <div
      className="card card-interactive card-glass"
      style={{
        padding: '18px 22px',
        marginBottom: '24px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative subtle ambient background gradient */}
      <div
        style={{
          position: 'absolute',
          top: '-60px',
          right: '-40px',
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, rgba(255, 255, 255, 0) 70%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        {/* Left: System Health Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              backgroundColor: '#eff6ff',
              border: '1px solid #dbeafe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2563eb',
              boxShadow: '0 2px 6px rgba(37, 99, 235, 0.12)',
            }}
          >
            <Activity size={22} className="spin-slow" />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="pulse-emerald" />
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>
                System SLA Engine & Automated Sentinel
              </span>
              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  backgroundColor: '#e0f2fe',
                  color: '#0369a1',
                }}
              >
                Live Monitor
              </span>
            </div>

            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
              Automatic Priority Escalation • Strict 4-State Lifecycle • 72h Breach Watchdog
            </div>
          </div>
        </div>

        {/* Middle / Right: Live Metrics Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <TrendingUp size={14} color="#10b981" />
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>SLA Compliance:</span>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>
              {complianceRate}%
            </span>
          </div>

          <div
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Clock size={14} color="#3b82f6" />
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Avg Resolution:</span>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>
              {averageHours}h
            </span>
          </div>

          {onOpenQuickSearch && (
            <button
              onClick={onOpenQuickSearch}
              className="btn btn-secondary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            >
              <span>Quick Jump</span>
              <kbd style={{ fontSize: '0.65rem', padding: '0 4px' }}>⌘K</kbd>
            </button>
          )}
        </div>
      </div>

      {/* Live Animated Event Ticker */}
      <div
        style={{
          marginTop: '14px',
          paddingTop: '12px',
          borderTop: '1px solid rgba(226, 232, 240, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.7rem',
              fontWeight: 700,
              color: '#3b82f6',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            <Radio size={12} className="animate-pulse" />
            Event Stream:
          </span>

          <div
            key={activeEventIndex}
            className="animate-fade-in"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.775rem',
              color: '#334155',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {auditEvents[activeEventIndex].icon}
            <span>{auditEvents[activeEventIndex].text}</span>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>({auditEvents[activeEventIndex].time})</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {auditEvents.map((_, idx) => (
            <span
              key={idx}
              onClick={() => setActiveEventIndex(idx)}
              style={{
                width: idx === activeEventIndex ? '16px' : '6px',
                height: '5px',
                borderRadius: '9999px',
                backgroundColor: idx === activeEventIndex ? '#3b82f6' : '#cbd5e1',
                cursor: 'pointer',
                transition: 'all 0.25s ease',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
