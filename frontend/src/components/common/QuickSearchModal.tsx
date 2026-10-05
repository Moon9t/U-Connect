import React, { useState, useEffect, useRef } from 'react';
import { complaintService } from '../../services/complaint.service';
import { Complaint } from '../../types/api';
import { StatusBadge, PriorityBadge } from './Badge';
import {
  Search,
  X,
  FileText,
  Building,
  Tag,
  ArrowRight,
  Sparkles,
  Command,
  LayoutDashboard,
  Users,
  BarChart3,
  PlusCircle,
  Clock,
} from 'lucide-react';

interface QuickSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectComplaint?: (complaint: Complaint) => void;
  onNavigateTab?: (tab: string) => void;
  userRole?: string | null;
}

export const QuickSearchModal: React.FC<QuickSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectComplaint,
  onNavigateTab,
  userRole = 'student',
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await complaintService.getComplaints({
          search: query.trim(),
          page: 1,
          page_size: 8,
        });
        setResults(res.data || []);
        setSelectedIndex(0);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        onSelectComplaint?.(results[selectedIndex]);
        onClose();
      }
    }
  };

  if (!isOpen) return null;

  const quickNavItems = [
    { label: 'Overview Dashboard', tab: 'dashboard', icon: <LayoutDashboard size={15} /> },
    ...(userRole === 'admin'
      ? [
          { label: 'Grievance Management', tab: 'complaints-mgmt', icon: <FileText size={15} /> },
          { label: 'User Directory & Access', tab: 'users', icon: <Users size={15} /> },
          { label: 'Analytics & SLA Reports', tab: 'reports', icon: <BarChart3 size={15} /> },
        ]
      : userRole === 'staff'
      ? [
          { label: 'Grievance Queue', tab: 'complaints-mgmt', icon: <FileText size={15} /> },
          { label: 'Analytics & SLA Reports', tab: 'reports', icon: <BarChart3 size={15} /> },
        ]
      : [
          { label: 'File New Grievance', tab: 'submit-complaint', icon: <PlusCircle size={15} /> },
          { label: 'My Submitted Grievances', tab: 'my-complaints', icon: <FileText size={15} /> },
        ]),
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '12vh',
        paddingLeft: '16px',
        paddingRight: '16px',
        animation: 'fadeIn 0.15s ease-out',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '640px',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(226, 232, 240, 0.8)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '16px 20px',
            borderBottom: '1px solid #f1f5f9',
            backgroundColor: '#ffffff',
          }}
        >
          <Search size={20} color="#3b82f6" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search records, reference numbers (#42), or departments..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: '1rem',
              color: '#0f172a',
              fontWeight: 500,
              backgroundColor: 'transparent',
            }}
          />
          {isLoading && (
            <div
              style={{
                width: '16px',
                height: '16px',
                border: '2px solid #e2e8f0',
                borderTopColor: '#3b82f6',
                borderRadius: '50%',
                animation: 'spin 0.6s linear infinite',
              }}
            />
          )}
          {query && !isLoading && (
            <button
              onClick={() => setQuery('')}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '4px',
              }}
            >
              <X size={16} />
            </button>
          )}
          <kbd
            style={{
              fontSize: '0.7rem',
              fontWeight: 600,
              color: '#64748b',
              backgroundColor: '#f1f5f9',
              padding: '2px 6px',
              borderRadius: '4px',
              border: '1px solid #e2e8f0',
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Results / Navigation Body */}
        <div style={{ maxHeight: '420px', overflowY: 'auto', padding: '8px' }}>
          {query.trim() ? (
            results.length > 0 ? (
              <div>
                <div
                  style={{
                    padding: '8px 12px 4px 12px',
                    fontSize: '0.725rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    color: '#94a3b8',
                    letterSpacing: '0.05em',
                  }}
                >
                  Matching Complaints ({results.length})
                </div>
                {results.map((c, idx) => {
                  const isSelected = idx === selectedIndex;
                  const refNo = `UC-2025-${c.id.toString().padStart(3, '0')}`;
                  return (
                    <div
                      key={c.id}
                      onClick={() => {
                        onSelectComplaint?.(c);
                        onClose();
                      }}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        backgroundColor: isSelected ? '#eff6ff' : 'transparent',
                        transition: 'all 0.1s ease',
                        border: isSelected ? '1px solid #bfdbfe' : '1px solid transparent',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            backgroundColor: isSelected ? '#3b82f6' : '#f1f5f9',
                            color: isSelected ? '#ffffff' : '#64748b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            transition: 'all 0.1s ease',
                          }}
                        >
                          <FileText size={16} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span
                              style={{
                                fontFamily: 'monospace',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                color: '#3b82f6',
                              }}
                            >
                              {refNo}
                            </span>
                            <span
                              style={{
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                color: '#1e293b',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {c.title}
                            </span>
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              marginTop: '2px',
                              fontSize: '0.725rem',
                              color: '#64748b',
                            }}
                          >
                            <span>{c.department?.name || 'Department'}</span>
                            <span>•</span>
                            <span>{c.category}</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        <PriorityBadge priority={c.priority} />
                        <StatusBadge status={c.status} />
                        <ArrowRight size={14} color={isSelected ? '#3b82f6' : '#cbd5e1'} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : !isLoading ? (
              <div style={{ padding: '36px 20px', textAlign: 'center' }}>
                <p style={{ fontSize: '0.9rem', color: '#64748b', margin: 0 }}>
                  No grievances found matching "{query}"
                </p>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
                  Try searching for keywords like "WiFi", "Library", "Exam", or reference numbers like "#10"
                </p>
              </div>
            ) : null
          ) : (
            <div>
              <div
                style={{
                  padding: '8px 12px 4px 12px',
                  fontSize: '0.725rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: '#94a3b8',
                  letterSpacing: '0.05em',
                }}
              >
                Quick System Navigation
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '6px', padding: '4px' }}>
                {quickNavItems.map((item) => (
                  <div
                    key={item.tab}
                    onClick={() => {
                      onNavigateTab?.(item.tab);
                      onClose();
                    }}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      cursor: 'pointer',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #f1f5f9',
                      color: '#334155',
                      fontSize: '0.825rem',
                      fontWeight: 500,
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#eff6ff';
                      e.currentTarget.style.borderColor = '#dbeafe';
                      e.currentTarget.style.color = '#1d4ed8';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#f8fafc';
                      e.currentTarget.style.borderColor = '#f1f5f9';
                      e.currentTarget.style.color = '#334155';
                    }}
                  >
                    <div style={{ color: '#3b82f6' }}>{item.icon}</div>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>

              <div
                style={{
                  margin: '12px 8px 4px 8px',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  backgroundColor: '#f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.75rem',
                  color: '#475569',
                }}
              >
                <Sparkles size={14} color="#6366f1" />
                <span>
                  <strong>Tip:</strong> Press <kbd style={{ padding: '1px 4px', background: '#fff', borderRadius: '3px' }}>⌘K</kbd> or <kbd style={{ padding: '1px 4px', background: '#fff', borderRadius: '3px' }}>Ctrl+K</kbd> anywhere in the application to launch this quick search.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div
          style={{
            padding: '8px 16px',
            backgroundColor: '#f8fafc',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.725rem',
            color: '#64748b',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span><kbd>↑</kbd> <kbd>↓</kbd> Navigate</span>
            <span><kbd>↵</kbd> Select</span>
            <span><kbd>ESC</kbd> Close</span>
          </div>
          <div>
            <span>U-Connect Global Search Engine</span>
          </div>
        </div>
      </div>
    </div>
  );
};
