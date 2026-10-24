import React from 'react';
import { navigate } from '../App';

export default function LandingPage() {
  return (
    <div className="landing-hero">
      {/* ── Navigation ── */}
      <nav className="landing-nav">
        <div className="landing-nav-logo">
          <div className="landing-nav-logo-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <path d="m9 12 2 2 4-4"/>
            </svg>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>SmartCampus</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Gate Management</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/login')}>Login</button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <div className="landing-hero-content">
        <div className="hero-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          QR-Verified Campus Security System
        </div>

        <h1 className="hero-title">
          Smart Leaving &amp; Visitor
          <br />
          <span className="gradient">Entry Management</span>
        </h1>

        <p className="hero-subtitle">
          A complete digital gate pass and visitor registration platform for colleges and institutions. 
          Secure QR verification, real-time admin approvals, and automated notifications — all in one system.
        </p>

        <div className="hero-actions">
          <button className="btn btn-primary btn-xl" onClick={() => navigate('/login')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"/></svg>
            Login to Dashboard
          </button>
        </div>
      </div>

      {/* ── Feature Cards ── */}
      <div className="hero-features" style={{ position: 'relative', zIndex: 10 }}>
        {[
          {
            icon: '🎓',
            iconBg: 'var(--blue-glow-soft)',
            title: 'Student Gate Pass',
            desc: 'Students submit leaving requests online. Admins approve and a unique QR pass is generated instantly.',
          },
          {
            icon: '👥',
            iconBg: 'var(--green-glow)',
            title: 'Visitor Registration',
            desc: 'Parents and visitors register online. Meeting persons are automatically notified with full visitor details.',
          },
          {
            icon: '📱',
            iconBg: 'var(--amber-glow)',
            title: 'QR Code Verification',
            desc: 'Security staff scan QR codes at the gate for instant backend-verified pass authentication.',
          },
          {
            icon: '🔒',
            iconBg: 'rgba(139, 92, 246, 0.12)',
            title: 'Role-Based Access',
            desc: 'Admin, Student, Security Staff and Faculty each have their own secure, feature-specific dashboard.',
          },
          {
            icon: '🔔',
            iconBg: 'var(--red-glow)',
            title: 'Auto Notifications',
            desc: 'Meeting persons receive automatic in-app alerts when a visitor registers to meet them.',
          },
          {
            icon: '📊',
            iconBg: 'var(--blue-glow-soft)',
            title: 'Reports & Audit Logs',
            desc: 'Full CSV export, date-range filtering, real-time dashboard stats, and complete audit trail.',
          },
        ].map((f) => (
          <div key={f.title} className="feature-card">
            <div className="feature-icon" style={{ background: f.iconBg, fontSize: '1.5rem' }}>
              {f.icon}
            </div>
            <h3 style={{ fontSize: '1rem', marginBottom: 8 }}>{f.title}</h3>
            <p style={{ fontSize: '0.85rem', lineHeight: 1.6 }}>{f.desc}</p>
          </div>
        ))}
      </div>

      {/* ── Login Cards Section ── */}
      <div style={{ padding: '0 40px 80px', position: 'relative', zIndex: 10 }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', marginBottom: 32, fontSize: '1.5rem' }}>
            Access Your Dashboard
          </h2>
          <div className="grid-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            {[
              { role: 'Admin', icon: '👑', color: 'var(--blue-500)', desc: 'Admin Management System with pass & visitor management' },
              { role: 'Student', icon: '🎓', color: 'var(--green-500)', desc: 'Submit gate pass requests and view your QR pass' },
              { role: 'Security', icon: '🛡️', color: 'var(--amber-500)', desc: 'Scan QR codes and verify at the college gate' },
              { role: 'Faculty / Staff', icon: '👩‍🏫', color: 'var(--violet-500)', desc: 'Receive visitor alerts and view meeting schedules' },
            ].map((r) => (
              <div
                key={r.role}
                className="card"
                style={{ textAlign: 'center', cursor: 'pointer' }}
                onClick={() => navigate('/login')}
              >
                <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>{r.icon}</div>
                <h3 style={{ color: r.color, fontSize: '1rem', marginBottom: 8 }}>{r.role}</h3>
                <p style={{ fontSize: '0.8rem' }}>{r.desc}</p>
                <button className="btn btn-ghost btn-sm" style={{ marginTop: 14, width: '100%' }}>
                  Login as {r.role.split('/')[0].trim()}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer style={{
        textAlign: 'center',
        padding: '20px 40px',
        borderTop: '1px solid var(--surface-border)',
        color: 'var(--text-muted)',
        fontSize: '0.8rem',
        position: 'relative',
        zIndex: 10,
      }}>
        Smart Leaving &amp; Visitor Entry Management System — Built with MERN Stack | MongoDB Atlas &bull; Express &bull; React &bull; Node.js
      </footer>
    </div>
  );
}
