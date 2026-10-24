import React, { useState } from 'react';
import { authAPI } from '../services/api';
import { navigate } from '../App';

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPw: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim() || !form.password || !form.confirmPw) {
      setError('Please fill in all required fields.');
      return;
    }
    if (form.phone.trim().length < 10) {
      setError('Please enter a valid phone number (at least 10 digits).');
      return;
    }
    if (form.password !== form.confirmPw) {
      setError('Passwords do not match.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await authAPI.registerStudent({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        password: form.password,
      });
      setSuccess(true);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--navy-950)', padding: 24 }}>
        <div className="card" style={{ maxWidth: 440, width: '100%', textAlign: 'center', padding: 40 }}>
          <div style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'var(--green-glow)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            fontSize: '2rem',
          }}>
            ✓
          </div>
          <h2 style={{ marginBottom: 12 }}>Account Created!</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: '0.95rem', lineHeight: 1.6 }}>
            Your account has been successfully created. You can now sign in to your dashboard.
          </p>
          <button className="btn btn-primary w-full" onClick={() => navigate('/login')}>
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--navy-950)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
      <div style={{ width: '100%', maxWidth: 460 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', marginBottom: 4 }}>Create Account</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Create your Smart Campus account</p>
          </div>
          <button onClick={() => navigate('/login')} className="btn btn-ghost btn-sm">
            ← Login
          </button>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 20 }}>
            {error}
          </div>
        )}

        <div className="card" style={{ padding: 32 }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input
                id="register-name"
                className="form-control"
                type="text"
                name="name"
                placeholder="Enter your full name"
                value={form.name}
                onChange={handleChange}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email Address *</label>
              <input
                id="register-email"
                className="form-control"
                type="email"
                name="email"
                placeholder="your@email.com"
                value={form.email}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number *</label>
              <input
                id="register-phone"
                className="form-control"
                type="tel"
                name="phone"
                placeholder="e.g., 9876543210"
                value={form.phone}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Password *</label>
              <input
                id="register-password"
                className="form-control"
                type="password"
                name="password"
                placeholder="Min 6 characters"
                value={form.password}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Confirm Password *</label>
              <input
                id="register-confirm-password"
                className="form-control"
                type="password"
                name="confirmPw"
                placeholder="Repeat password"
                value={form.confirmPw}
                onChange={handleChange}
              />
            </div>

            <button
              id="register-submit-btn"
              type="submit"
              className="btn btn-primary"
              style={{ marginTop: 8, padding: '13px 20px', width: '100%' }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="spinner" style={{ width: 18, height: 18 }} /> Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <div style={{ marginTop: 24, textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Already have an account?{' '}
            <button
              onClick={() => navigate('/login')}
              style={{ background: 'none', border: 'none', color: 'var(--blue-400)', cursor: 'pointer', fontWeight: 600 }}
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
