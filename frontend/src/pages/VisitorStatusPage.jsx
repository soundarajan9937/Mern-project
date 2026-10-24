import React, { useState, useEffect } from 'react';
import { visitorAPI } from '../services/api';
import { navigate } from '../App';
import { getSafeImageUrl } from '../utils/imageUrl';

export default function VisitorStatusPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [visitor, setVisitor] = useState(null);
  const [visitorsList, setVisitorsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Try to load from URL query param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (id) {
      setSearchTerm(id);
      fetchStatus(id);
    }
  }, []);

  const fetchStatus = async (term) => {
    const query = term || searchTerm;
    if (!query.trim()) {
      setError('Please enter a Visitor Name or Visitor ID');
      return;
    }
    setLoading(true);
    setError('');
    setVisitor(null);
    setVisitorsList([]);

    try {
      const res = await visitorAPI.getById(query.trim());
      if (res.data.visitors && res.data.visitors.length > 1) {
        setVisitorsList(res.data.visitors);
        setVisitor(res.data.visitor);
      } else {
        setVisitor(res.data);
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'No visitor record found for that name or ID');
      setVisitor(null);
      setVisitorsList([]);
    } finally {
      setLoading(false);
    }
  };

  const selectVisitor = (v) => {
    setVisitor({
      visitor: v,
      timestamps: {
        submittedAt: v.submittedAt ? new Date(v.submittedAt).toLocaleString('en-IN') : 'N/A',
      },
    });
  };

  const getBadgeClass = (s) => {
    if (s === 'Approved' || s === 'Checked-In' || s === 'Completed' || s === 'Registration Successful')
      return 'badge-approved';
    if (s === 'Rejected') return 'badge-rejected';
    return 'badge-pending';
  };

  const currentVisitor = visitor?.visitor || visitor;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--navy-950)', padding: '60px 24px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <h1 style={{ fontSize: '1.8rem', marginBottom: 8 }}>Check Visitor Status</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Enter your Visitor Name or Visitor ID to view registration details
          </p>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              id="visitor-search-input"
              className="form-control"
              placeholder="Enter Visitor Name or ID (e.g. John Doe or VIS-2026-0001)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchStatus()}
              autoFocus
            />
            <button
              id="visitor-search-btn"
              className="btn btn-primary"
              onClick={() => fetchStatus()}
              disabled={loading}
              style={{ flexShrink: 0, padding: '10px 20px' }}
            >
              {loading ? <div className="spinner" style={{ width: 18, height: 18 }} /> : 'Check'}
            </button>
          </div>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

        {/* Multiple Matches Selection List */}
        {visitorsList.length > 1 && (
          <div className="card" style={{ marginBottom: 20, padding: 18 }}>
            <h4 style={{ margin: '0 0 12px', fontSize: '0.92rem', color: 'var(--text-secondary)' }}>
              Found {visitorsList.length} matching visitors. Select to view details:
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {visitorsList.map((v) => (
                <div
                  key={v._id || v.visitorId}
                  onClick={() => selectVisitor(v)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: currentVisitor?._id === v._id ? 'var(--surface-3)' : 'var(--surface-2)',
                    border: currentVisitor?._id === v._id ? '1px solid var(--blue-500)' : '1px solid var(--surface-border)',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <strong style={{ fontSize: '0.95rem' }}>{v.fullName}</strong>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: 8 }}>
                      ({v.visitorId} · Visiting {v.meetingPersonName})
                    </span>
                  </div>
                  <span className={`badge ${getBadgeClass(v.status)}`} style={{ fontSize: '0.75rem' }}>
                    {v.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Visitor Card */}
        {currentVisitor && (
          <div className="card" style={{ marginBottom: 20, padding: 28 }}>
            <div className="profile-card" style={{ marginBottom: 20, alignItems: 'center' }}>
              <div
                className="profile-photo"
                style={{
                  width: 68,
                  height: 68,
                  borderRadius: '50%',
                  overflow: 'hidden',
                  background: 'var(--surface-2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.8rem',
                }}
              >
                {currentVisitor.photoUrl ? (
                  <img src={getSafeImageUrl(currentVisitor.photoUrl)} alt="Visitor" onError={(e) => { e.currentTarget.style.display = 'none'; }} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  '👤'
                )}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ marginBottom: 4, fontSize: '1.2rem' }}>{currentVisitor.fullName}</h3>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className={`badge ${getBadgeClass(currentVisitor.status)}`}>
                    {currentVisitor.status === 'Approved' ? 'Registration Successful' : currentVisitor.status}
                  </span>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    ID: <code>{currentVisitor.visitorId}</code>
                  </span>
                </div>
              </div>
            </div>

            {/* QR Code if present */}
            {currentVisitor.qrCodeDataUrl && (
              <div style={{ textAlign: 'center', margin: '20px 0', background: 'var(--surface-2)', padding: 16, borderRadius: 'var(--radius-lg)' }}>
                <img
                  src={currentVisitor.qrCodeDataUrl}
                  alt="Visitor Pass QR"
                  style={{ width: 170, height: 170, background: '#fff', padding: 8, borderRadius: 'var(--radius-md)', display: 'inline-block' }}
                />
                <p style={{ margin: '8px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Show this QR code at campus security gate for fast entry verification
                </p>
              </div>
            )}

            <div className="detail-grid" style={{ fontSize: '0.86rem' }}>
              <div className="detail-item">
                <span className="detail-label">Relationship</span>
                <span className="detail-value">{currentVisitor.relationship || 'Visitor'}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Purpose</span>
                <span className="detail-value">{currentVisitor.purpose}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Meeting Person</span>
                <span className="detail-value">{currentVisitor.meetingPersonName}</span>
              </div>
              {currentVisitor.meetingPersonContact && (
                <div className="detail-item">
                  <span className="detail-label">Meeting Contact</span>
                  <span className="detail-value">{currentVisitor.meetingPersonContact}</span>
                </div>
              )}
              {currentVisitor.place && (
                <div className="detail-item">
                  <span className="detail-label">Place / City</span>
                  <span className="detail-value">{currentVisitor.place}</span>
                </div>
              )}
              {visitor.timestamps?.submittedAt && (
                <div className="detail-item">
                  <span className="detail-label">Submitted At</span>
                  <span className="detail-value">{visitor.timestamps.submittedAt}</span>
                </div>
              )}
              {currentVisitor.status === 'Rejected' && (
                <div className="detail-item" style={{ gridColumn: '1 / -1' }}>
                  <span className="detail-label">Rejection Reason</span>
                  <span className="detail-value" style={{ color: 'var(--red-400)' }}>
                    {currentVisitor.rejectionReason}
                  </span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              {currentVisitor.qrCodeDataUrl && (
                <button className="btn btn-secondary" onClick={() => window.print()} style={{ flex: 1 }}>
                  🖨️ Print Pass
                </button>
              )}
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/')}>
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
