import React, { useState } from 'react';
import { useToast } from '../components/common/Toast';
import { MessageSquare, Send, CheckCircle2 } from 'lucide-react';

export const FeedbackPage: React.FC = () => {
  const { success, error } = useToast();
  const [topic, setTopic] = useState('General Campus Services');
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState('5');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) {
      error('Please write your feedback before sending');
      return;
    }
    setSubmitted(true);
    success('Thank you! Your feedback has been sent to university administration.');
  };

  return (
    <div className="page-container animate-fade-in" style={{ maxWidth: '720px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 className="page-title">University Feedback & Suggestions</h1>
        <p className="page-subtitle">Help improve campus amenities, digital platforms, and student life.</p>
      </div>

      <div className="card" style={{ padding: '32px' }}>
        {submitted ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                backgroundColor: '#dcfce7',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <CheckCircle2 size={32} />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>
              Feedback Received
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '6px' }}>
              Your suggestions have been recorded and shared with student governance.
            </p>
            <button
              onClick={() => {
                setSubmitted(false);
                setFeedback('');
              }}
              className="btn btn-secondary"
              style={{ marginTop: '20px' }}
            >
              Submit Another Response
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Feedback Focus Area</label>
              <select
                className="form-select"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              >
                <option value="General Campus Services">General Campus Services</option>
                <option value="U-Connect Portal UX">U-Connect Portal Experience</option>
                <option value="Library & Study Areas">Library & Study Facilities</option>
                <option value="Cafeteria & Dining">Dining & Food Services</option>
                <option value="Campus Transportation">Transportation & Parking</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Satisfaction Rating (1-5)</label>
              <select
                className="form-select"
                value={rating}
                onChange={(e) => setRating(e.target.value)}
              >
                <option value="5">5 - Excellent</option>
                <option value="4">4 - Good</option>
                <option value="3">3 - Satisfactory</option>
                <option value="2">2 - Needs Improvement</option>
                <option value="1">1 - Poor</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Your Suggestion or Commentary</label>
              <textarea
                className="form-textarea"
                rows={4}
                placeholder="Share your experience or recommendations..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              <Send size={15} />
              <span>Submit Feedback</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
