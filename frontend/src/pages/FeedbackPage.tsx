import React, { useEffect, useState } from 'react';
import { complaintService } from '../services/complaint.service';
import { Complaint } from '../types/api';
import { useToast } from '../components/common/Toast';
import { Star, MessageSquare } from 'lucide-react';

export const FeedbackPage: React.FC = () => {
  const { success, error } = useToast();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [selectedComplaintId, setSelectedComplaintId] = useState<number | ''>('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadResolvedComplaints = async () => {
      setIsLoading(true);
      try {
        const res = await complaintService.getComplaints({ status: 'resolved', page: 1, page_size: 100 });
        const eligible: Complaint[] = [];
        for (const complaint of res.data || []) {
          const existing = await complaintService.getFeedback(complaint.id);
          if (existing.length === 0) eligible.push(complaint);
        }
        setComplaints(eligible);
        if (eligible.length > 0) setSelectedComplaintId(eligible[0].id);
      } catch (err: any) {
        error(err.message || 'Failed to load resolved complaints');
      } finally {
        setIsLoading(false);
      }
    };
    void loadResolvedComplaints();
  }, [error]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaintId) {
      error('Please select a resolved complaint');
      return;
    }

    setIsSubmitting(true);
    try {
      await complaintService.submitFeedback(Number(selectedComplaintId), rating, comment.trim() || undefined);
      setComplaints((prev) => prev.filter((c) => c.id !== Number(selectedComplaintId)));
      setSelectedComplaintId('');
      setComment('');
      setRating(5);
      success('Thank you. Your complaint feedback has been submitted.');
    } catch (err: any) {
      error(err.message || 'Failed to submit feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-container animate-fade-in" style={{ maxWidth: '760px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 className="page-title">Complaint Feedback</h1>
        <p className="page-subtitle">Rate a resolved complaint and share comments with the university.</p>
      </div>

      <div className="card" style={{ padding: '32px' }}>
        {isLoading ? (
          <p style={{ color: '#71717a' }}>Loading resolved complaints...</p>
        ) : complaints.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 10px', color: '#71717a' }}>
            <MessageSquare size={30} style={{ marginBottom: '10px' }} />
            <p style={{ fontWeight: 600, color: '#27272a' }}>No resolved complaints awaiting feedback.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Resolved Complaint</label>
              <select
                className="form-select"
                value={selectedComplaintId}
                onChange={(e) => setSelectedComplaintId(e.target.value ? Number(e.target.value) : '')}
              >
                {complaints.map((complaint) => (
                  <option key={complaint.id} value={complaint.id}>
                    {complaint.reference_number} — {complaint.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginTop: '20px' }}>
              <label className="form-label">Rating</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(value)}
                    aria-label={`${value} out of 5`}
                    style={{ background: 'transparent', padding: '4px' }}
                  >
                    <Star size={26} fill={value <= rating ? 'currentColor' : 'none'} />
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group" style={{ marginTop: '20px' }}>
              <label className="form-label">Comment (optional)</label>
              <textarea
                className="form-input"
                rows={5}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Tell us about your experience..."
              />
            </div>

            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
