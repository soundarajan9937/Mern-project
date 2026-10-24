import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { navigate } from '../App';

export default function StudentLoginPage() {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email.trim() || !form.password.trim()) {
      setError('Please enter both student email and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { user } = await login(form);
      // Student portal login navigates directly to student portal
      if (user.role === 'student' || user.role === 'admin') {
        navigate('/student');
      } else if (user.role === 'security') {
        navigate('/security');
      } else if (user.role === 'staff') {
        navigate('/staff');
      } else {
        navigate('/student');
      }
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Invalid student credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at top, #0f2147 0%, var(--navy-950) 65%, #050b18 100%)',
      padding: '30px 20px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Decorative ambient lights */}
      <div style={{
        position: 'absolute',
        top: -120,
        left: '20%',
        width: 480,
        height: 480,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(37,99,235,0.18) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute',
        bottom: -100,
        right: '15%',
        width: 420,
        height: 420,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        width: '100%',
        maxWidth: 440,
        background: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(16px)',
        border: '1px solid var(--surface-border-bright)',
        borderRadius: 'var(--radius-xl)',
        padding: '36px 32px',
        boxShadow: '0 24px 60px rgba(0, 0, 0, 0.6), 0 0 1px 1px rgba(255, 255, 255, 0.05)',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Header Icon & Branding */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 68,
            height: 68,
            borderRadius: 'var(--radius-lg)',
            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 50%, #059669 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 18px',
            fontSize: '2rem',
            boxShadow: '0 10px 25px rgba(37,99,235,0.4)',
          }}>
            🎓
          </div>
          <div style={{
            display: 'inline-block',
            padding: '3px 12px',
            borderRadius: 999,
            background: 'rgba(37, 99, 235, 0.15)',
            border: '1px solid rgba(37, 99, 235, 0.35)',
            color: 'var(--blue-400)',
            fontSize: '0.72rem',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: 10,
          }}>
            Campus Student Portal
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 8px', color: 'var(--text-primary)' }}>
            Student Login
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: 0, lineHeight: 1.5 }}>
            Sign in to submit gate pass requests, check visitor alerts, and manage your profile
          </p>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 20 }}>
            <span>⚠️</span>
            <div>{error}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Email Field */}
          <div className="form-group">
            <label className="form-label" htmlFor="student-email" style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.04em' }}>
              STUDENT EMAIL ADDRESS <span style={{ color: 'var(--red-400)' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="student-email"
                className="form-control"
                type="email"
                name="email"
                placeholder="e.g. student@example.com"
                value={form.email}
                onChange={handleChange}
                autoFocus
                required
                style={{ paddingLeft: 42, height: 46 }}
              />
              <span style={{
                position: 'absolute',
                left: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '1rem',
                opacity: 0.65,
                pointerEvents: 'none',
              }}>
                ✉️
              </span>
            </div>
          </div>

          {/* Password Field */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label className="form-label" htmlFor="student-password" style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.04em' }}>
                PASSWORD <span style={{ color: 'var(--red-400)' }}>*</span>
              </label>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                id="student-password"
                className="form-control"
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="Enter your student password"
                value={form.password}
                onChange={handleChange}
                required
                style={{ paddingLeft: 42, paddingRight: 42, height: 46 }}
              />
              <span style={{
                position: 'absolute',
                left: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '1rem',
                opacity: 0.65,
                pointerEvents: 'none',
              }}>
                🔒
              </span>
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  padding: 4,
                }}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            id="student-login-btn"
            type="submit"
            className="btn btn-primary"
            style={{
              marginTop: 6,
              height: 48,
              fontSize: '0.95rem',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              boxShadow: '0 6px 20px rgba(37,99,235,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
            }}
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="spinner spinner-sm" />
                <span>Signing into Student Portal...</span>
              </>
            ) : (
              <>
                <span>Enter Student Portal</span>
                <span style={{ fontSize: '1.1rem' }}>→</span>
              </>
            )}
          </button>
        </form>

        {/* Portal Switching & Footer Links */}
        <div style={{
          marginTop: 24,
          paddingTop: 20,
          borderTop: '1px solid var(--surface-border)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          textAlign: 'center',
          fontSize: '0.84rem',
        }}>
          <div style={{ color: 'var(--text-secondary)' }}>
            Admin or Security Officer?{' '}
            <button
              onClick={() => navigate('/login')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--blue-400)',
                cursor: 'pointer',
                fontWeight: 600,
                textDecoration: 'underline',
              }}
            >
              Main Dashboard Login
            </button>
          </div>

          <div>
            <button
              onClick={() => navigate('/')}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '0.8rem',
              }}
            >
              ← Back to Campus Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
