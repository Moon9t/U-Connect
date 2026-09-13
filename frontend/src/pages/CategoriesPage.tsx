import React from 'react';
import { Tags, ShieldAlert, Clock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { PriorityBadge } from '../components/common/Badge';

const CATEGORY_RULES = [
  {
    name: 'Safety',
    sla: 'Immediate / 24 Hours',
    defaultPriority: 'high',
    autoEscalated: true,
    description: 'Physical hazards, security incidents, emergency maintenance, and medical concerns.',
  },
  {
    name: 'Exam Hall',
    sla: 'Immediate / 24 Hours',
    defaultPriority: 'high',
    autoEscalated: true,
    description: 'Examination disruptions, seating conflicts, invigilation, and critical facility issues during exam periods.',
  },
  {
    name: 'IT',
    sla: '72 Hours',
    defaultPriority: 'medium',
    autoEscalated: false,
    description: 'Campus network Wi-Fi, LMS access, student email, and laboratory equipment.',
  },
  {
    name: 'Facilities',
    sla: '72 Hours',
    defaultPriority: 'medium',
    autoEscalated: false,
    description: 'Air conditioning, plumbing, sanitation, classrooms, and electrical maintenance.',
  },
  {
    name: 'Academic',
    sla: '72 Hours',
    defaultPriority: 'medium',
    autoEscalated: false,
    description: 'Course registration, timetable conflicts, lecturer feedback, and academic records.',
  },
  {
    name: 'Finance',
    sla: '72 Hours',
    defaultPriority: 'medium',
    autoEscalated: false,
    description: 'Tuition fees, bursary processing, scholarship disbursements, and fee holds.',
  },
  {
    name: 'Student Affairs',
    sla: '72 Hours',
    defaultPriority: 'medium',
    autoEscalated: false,
    description: 'Clubs, student housing grievances, disability accommodations, and general student welfare.',
  },
];

export const CategoriesPage: React.FC = () => {
  return (
    <div className="page-container animate-fade-in">
      <div style={{ marginBottom: '24px' }}>
        <h1 className="page-title">Complaint Categories & SLA Rules</h1>
        <p className="page-subtitle">Standardized complaint categories and automated escalation policies.</p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '18px',
        }}
      >
        {CATEGORY_RULES.map((cat) => (
          <div key={cat.name} className="card" style={{ padding: '24px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px',
              }}
            >
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                {cat.name}
              </h3>
              <PriorityBadge priority={cat.defaultPriority} />
            </div>

            <p style={{ fontSize: '0.85rem', color: '#64748b', lineHeight: 1.5, marginBottom: '16px' }}>
              {cat.description}
            </p>

            <div
              style={{
                paddingTop: '12px',
                borderTop: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.8rem',
              }}
            >
              <span style={{ color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={14} color="#64748b" /> Target SLA:
              </span>
              <strong style={{ color: '#0f172a' }}>{cat.sla}</strong>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
