import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { navigate } from '../App';

export default function LoginPage() {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email.trim() || !form.password.trim()) {
      setError('Please enter both email and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { user } = await login(form);
      if (user.role === 'admin') navigate('/admin');
      else if (user.role === 'student') navigate('/student');
      else if (user.role === 'security') navigate('/security');
      else if (user.role === 'staff') navigate('/staff');
      else navigate('/student');
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--navy-950)' }}>
      {/* Left panel */}
      <div style={{
        flex: 1,
        display: 'none',
        background: 'linear-gradient(135deg, var(--navy-800) 0%, var(--navy-900) 100%)',
        position: 'relative',
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 20,
        padding: 60,
      }} className="left-panel">
        <div style={{
          position: 'absolute', top: -100, left: -100, width: 500, height: 500,
          background: 'radial-gradient(ellipse, rgba(43,127,255,0.08) 0%, transparent 70%)',
        }} />
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <div style={{
            width: 80, height: 80, borderRadius: 'var(--radius-lg)',
            background: 'linear-gradient(135deg, var(--blue-600), var(--blue-500))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px', boxShadow: 'var(--shadow-blue)',
          }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <path d="m9 12 2 2 4-4"/>
            </svg>
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', marginBottom: 12 }}>
            Smart Campus
          </h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: 320, lineHeight: 1.7 }}>
            Gate Pass & Visitor Entry Management System for modern educational institutions
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', maxWidth: 300 }}>
          {['QR-verified gate passes', 'Real-time admin approvals', 'Auto visitor notifications', 'Role-based secure access'].map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--green-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--green-400)" strokeWidth="3"><path d="M20 6 9 17l-5-5"/></svg>
              </div>
              {f}
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — Login Form */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
      }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 36 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, var(--blue-600), var(--blue-500))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: 'var(--shadow-blue)',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>SmartCampus</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Gate Management System</div>
            </div>
          </div>

          <h1 style={{ fontSize: '1.8rem', marginBottom: 6 }}>Welcome back</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 28, fontSize: '0.9rem' }}>
            Sign in to access your portal or dashboard
          </p>

          {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                id="login-email"
                className="form-control"
                type="email"
                name="email"
                placeholder="your@email.com"
                value={form.email}
                onChange={handleChange}
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                id="login-password"
                className="form-control"
                type="password"
                name="password"
                placeholder="Enter your password"
                value={form.password}
                onChange={handleChange}
              />
            </div>
            <button id="login-btn" type="submit" className="btn btn-primary" style={{ marginTop: 4, padding: '13px 20px' }} disabled={loading}>
              {loading ? <><div className="spinner" style={{ width: 18, height: 18 }} /> Signing in...</> : 'Sign In'}
            </button>
          </form>

          <div style={{ marginTop: 24, textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Don't have an account?{' '}
            <button onClick={() => navigate('/register')} style={{ background: 'none', border: 'none', color: 'var(--blue-400)', cursor: 'pointer', fontWeight: 600 }}>
              Create Account
            </button>
          </div>

          <div style={{ marginTop: 12, textAlign: 'center' }}>
            <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem' }}>
              ← Back to Home
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @media (min-width: 900px) {
          .left-panel { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
