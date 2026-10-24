import React, { useState, useRef } from 'react';
import { visitorAPI } from '../services/api';
import { navigate } from '../App';

const RELATIONSHIPS = ['Father', 'Mother', 'Brother', 'Sister', 'Guardian', 'Relative', 'Friend', 'Other'];
const DEPTS = ['Computer Science & Engineering', 'Electronics & Communication', 'Mechanical Engineering', 'Civil Engineering', 'Electrical Engineering', 'Information Technology', 'Other'];

export default function VisitorRegistrationPage() {
  const [form, setForm] = useState({
    fullName: '', relationship: '', phone: '', place: '',
    meetingPersonName: '', meetingPersonContact: '',
    studentRollNumber: '', department: '', purpose: '', expectedMeetingDate: '',
    consentGiven: false,
  });
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const fileRef = useRef();

  const handleChange = (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((p) => ({ ...p, [e.target.name]: val }));
    setError('');
  };

  const handlePhoto = (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('Photo must be under 5MB'); return; }
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.fullName.trim() || !form.relationship || !form.phone.trim() || !form.place.trim() || !form.meetingPersonName.trim() || !form.meetingPersonContact.trim() || !form.purpose.trim()) {
      setError('Please fill all required fields'); return;
    }
    if (!form.consentGiven) { setError('You must provide consent to proceed'); return; }

    setLoading(true);
    setError('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (photo) fd.append('photo', photo);
      const res = await visitorAPI.register(fd);
      setSuccess(res.data);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (success) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--navy-950)', padding: 24 }}>
      <div className="card" style={{ maxWidth: 520, width: '100%', textAlign: 'center', padding: 36 }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--green-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '2.2rem' }}>✓</div>
        <h2 style={{ marginBottom: 8, color: 'var(--green-400)' }}>Registration Successful!</h2>
        <p style={{ marginBottom: 20, color: 'var(--text-secondary)', fontSize: '0.92rem' }}>
          Your visitor registration is complete.
        </p>

        {success.qrCodeDataUrl && (
          <div style={{ background: '#fff', padding: 14, borderRadius: 'var(--radius-lg)', display: 'inline-block', margin: '0 auto 20px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
            <img src={success.qrCodeDataUrl} alt="Visitor Pass QR" style={{ width: 190, height: 190, display: 'block' }} />
          </div>
        )}

        <div className="card" style={{ background: 'var(--surface-2)', marginBottom: 20, textAlign: 'left' }}>
          <div className="detail-grid">
            <div className="detail-item"><span className="detail-label">Visitor ID</span><span className="detail-value" style={{ color: 'var(--blue-400)', fontWeight: 700 }}>{success.visitorId}</span></div>
            <div className="detail-item"><span className="detail-label">Status</span><span className="badge badge-approved">Registration Successful</span></div>
            <div className="detail-item"><span className="detail-label">Visitor Name</span><span className="detail-value">{success.visitor?.fullName}</span></div>
            <div className="detail-item"><span className="detail-label">Meeting Person</span><span className="detail-value">{success.visitor?.meetingPersonName}</span></div>
            {success.visitor?.meetingPersonContact && (
              <div className="detail-item"><span className="detail-label">Meeting Contact</span><span className="detail-value">{success.visitor?.meetingPersonContact}</span></div>
            )}
            <div className="detail-item"><span className="detail-label">Submitted At</span><span className="detail-value">{success.visitor?.submittedAt}</span></div>
          </div>
        </div>

        <div className="alert alert-info" style={{ marginBottom: 24, textAlign: 'left', fontSize: '0.86rem', lineHeight: 1.5 }}>
          📲 <strong>Automatic Notification:</strong> An automatic message notification with your registration details has been dispatched to <strong>{success.visitor?.meetingPersonName}</strong> ({success.visitor?.meetingPersonContact || 'phone'}). No approval or rejection action is required.
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          {success.qrCodeDataUrl && (
            <button className="btn btn-secondary" onClick={() => window.print()} style={{ flex: 1 }}>
              🖨️ Print Pass
            </button>
          )}
          <button className="btn btn-primary" onClick={() => navigate('/')} style={{ flex: 1 }}>
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--navy-950)', padding: '40px 24px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: '1.7rem', marginBottom: 4 }}>Visitor Registration</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Parent / Visitor Entry Request — All fields marked * are required</p>
          </div>
          <button onClick={() => navigate('/')} className="btn btn-ghost btn-sm">← Back</button>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* Personal Information */}
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--surface-border)' }}>👤 Personal Information</h3>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input className="form-control" name="fullName" placeholder="Your full name" value={form.fullName} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Relationship to Student *</label>
                <select className="form-control" name="relationship" value={form.relationship} onChange={handleChange}>
                  <option value="">Select relationship</option>
                  {RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number *</label>
                <input className="form-control" name="phone" placeholder="+91 98765 12345" value={form.phone} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Place / City *</label>
                <input className="form-control" name="place" placeholder="e.g., Mumbai, Maharashtra" value={form.place} onChange={handleChange} />
              </div>
            </div>
          </div>

          {/* Meeting Details */}
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--surface-border)' }}>🤝 Meeting Details</h3>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Meeting Person's Name *</label>
                <input className="form-control" name="meetingPersonName" placeholder="Name of faculty/staff/warden" value={form.meetingPersonName} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Meeting Person's Phone / Email *</label>
                <input className="form-control" name="meetingPersonContact" placeholder="Phone or email for notification" value={form.meetingPersonContact} onChange={handleChange} />
              </div>
              <div className="form-group col-span-2">
                <label className="form-label">Purpose of Visit *</label>
                <textarea className="form-control" name="purpose" rows={3} placeholder="Describe the purpose of your visit in detail..." value={form.purpose} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Department</label>
                <select className="form-control" name="department" value={form.department} onChange={handleChange}>
                  <option value="">Select department (optional)</option>
                  {DEPTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Expected Meeting Date</label>
                <input className="form-control" type="date" name="expectedMeetingDate" value={form.expectedMeetingDate} onChange={handleChange} min={new Date().toISOString().split('T')[0]} />
              </div>
            </div>
          </div>

          {/* Consent */}
          <div className="card" style={{ marginBottom: 20 }}>
            <label style={{ display: 'flex', gap: 12, cursor: 'pointer', alignItems: 'flex-start' }}>
              <input
                type="checkbox"
                name="consentGiven"
                checked={form.consentGiven}
                onChange={handleChange}
                style={{ marginTop: 3, accentColor: 'var(--blue-500)', width: 18, height: 18, flexShrink: 0 }}
              />
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                <strong style={{ color: 'var(--text-primary)' }}>I give consent</strong> for my personal details and visit information to be stored and used by the college administration for campus security and visitor verification purposes. *
              </span>
            </label>
          </div>

          <div className="alert alert-info" style={{ marginBottom: 20 }}>
            🔔 The designated meeting person will be automatically notified of your registration once submitted.
            Your registration will remain <strong>pending</strong> until reviewed by admin.
          </div>

          <button id="visitor-submit-btn" type="submit" className="btn btn-success" style={{ width: '100%', padding: '14px 20px', fontSize: '1rem' }} disabled={loading}>
            {loading ? <><div className="spinner" style={{ width: 20, height: 20 }} /> Submitting Registration...</> : '✓ Submit Visitor Registration'}
          </button>
        </form>
      </div>
    </div>
  );
}
