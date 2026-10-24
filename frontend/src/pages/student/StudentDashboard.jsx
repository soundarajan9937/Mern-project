import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { gatePassAPI, visitorAPI, notificationAPI } from '../../services/api';
import { navigate } from '../../App';
import { getSafeImageUrl } from '../../utils/imageUrl';
import ProfileView from '../../components/profile/ProfileView';

function formatDT(d) {
  if (!d) return 'N/A';
  return new Date(d).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

// ─── Visitor Notification Parser & Line-by-Line Renderer ──────────────────────
function parseVisitorNotification(message) {
  if (!message) return null;
  const isVisitor = message.toLowerCase().includes('visitor');
  if (!isVisitor) return null;

  const rawSegments = message.split(/[\n•]/).map((s) => s.trim()).filter(Boolean);
  const fields = [];
  let note = '';
  let intro = '';

  for (const seg of rawSegments) {
    if (seg.toLowerCase().startsWith('campus visitor notification')) continue;
    if (seg.toLowerCase().includes('a visitor has registered')) {
      intro = 'A visitor has registered to meet you on campus.';
      continue;
    }
    if (seg.toLowerCase().startsWith('note:')) {
      note = seg;
      continue;
    }

    const colonIdx = seg.indexOf(':');
    if (colonIdx > 0 && colonIdx < 35) {
      let label = seg.slice(0, colonIdx).trim();
      let value = seg.slice(colonIdx + 1).trim();

      const lower = label.toLowerCase();
      if (lower === 'visitor name') label = 'Visitor Name';
      else if (lower === 'relationship') label = 'Relationship';
      else if (lower.includes('phone')) label = 'Phone Number';
      else if (lower.includes('place') || lower.includes('city')) label = 'Place';
      else if (lower.includes('purpose')) label = 'Purpose of Visit';
      else if (lower.includes('registration date')) label = 'Registration Date & Time';
      else if (lower.includes('expected visit')) label = 'Expected Visit Date';

      const noteIdx = value.toLowerCase().indexOf('note:');
      if (noteIdx !== -1) {
        note = value.slice(noteIdx).trim();
        value = value.slice(0, noteIdx).trim();
      }

      if (value) {
        fields.push({ label, value });
      }
    } else {
      if (!intro && seg.length > 5) intro = seg;
    }
  }

  if (fields.length === 0) return null;
  return { intro, fields, note };
}

function NotificationMessageView({ notification }) {
  const parsed = useMemo(
    () => parseVisitorNotification(notification.message),
    [notification.message]
  );

  if (!parsed) {
    return (
      <p style={{ margin: '0 0 8px', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
        {notification.message}
      </p>
    );
  }

  return (
    <div style={{ margin: '6px 0 10px' }}>
      {parsed.intro && (
        <p style={{ margin: '0 0 10px', fontSize: '0.86rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
          {parsed.intro}
        </p>
      )}

      {/* Line by line aligned grid */}
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.65)',
          border: '1px solid var(--surface-border)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {parsed.fields.map((f, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'baseline',
              fontSize: '0.84rem',
              lineHeight: 1.5,
              paddingBottom: i < parsed.fields.length - 1 ? 6 : 0,
              borderBottom: i < parsed.fields.length - 1 ? '1px dashed rgba(255,255,255,0.06)' : 'none',
            }}
          >
            <span
              style={{
                width: 180,
                minWidth: 150,
                flexShrink: 0,
                color: 'var(--text-muted)',
                fontWeight: 600,
                display: 'flex',
                justifyContent: 'space-between',
                paddingRight: 10,
              }}
            >
              <span>{f.label}</span>
              <span>:</span>
            </span>
            <span
              style={{
                color: 'var(--text-primary)',
                fontWeight: 500,
                flex: 1,
                wordBreak: 'break-word',
              }}
            >
              {f.value}
            </span>
          </div>
        ))}
      </div>

      {parsed.note && (
        <div
          style={{
            marginTop: 8,
            fontSize: '0.78rem',
            color: 'var(--text-muted)',
            background: 'rgba(59, 130, 246, 0.08)',
            borderLeft: '3px solid var(--blue-500)',
            padding: '6px 10px',
            borderRadius: 4,
            lineHeight: 1.45,
          }}
        >
          ℹ️ {parsed.note}
        </div>
      )}
    </div>
  );
}


// ─── Large Student Photo Preview Lightbox Modal ──────────────────────────────
function PhotoPreviewModal({ data, onClose }) {
  if (!data || !data.photoUrl) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      style={{
        zIndex: 9999,
        background: 'rgba(4, 11, 26, 0.88)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 480,
          width: '100%',
          padding: 24,
          borderRadius: 22,
          textAlign: 'center',
          background: 'var(--navy-800)',
          border: '1px solid var(--surface-border-bright)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.75)',
          animation: 'slideUp 0.25s ease',
          position: 'relative',
        }}
      >
        {/* Header with Student Name & Close button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div style={{ textAlign: 'left', minWidth: 0, flex: 1, paddingRight: 10 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--blue-400)', marginBottom: 2 }}>
              Student Photo Preview
            </div>
            <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {data.name || 'Student'}
            </h3>
            {(data.rollNumber || data.department) && (
              <p style={{ margin: '2px 0 0', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                {data.rollNumber} {data.department ? `• ${data.department}` : ''}
              </p>
            )}
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            style={{
              fontSize: '1.2rem',
              padding: '6px 10px',
              borderRadius: 10,
              background: 'var(--surface-2)',
              border: '1px solid var(--surface-border)',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* Big Size Photo Frame */}
        <div
          style={{
            width: '100%',
            height: 380,
            maxHeight: '65vh',
            borderRadius: 16,
            overflow: 'hidden',
            background: '#040b1a',
            border: '2px solid rgba(59, 130, 246, 0.4)',
            boxShadow: '0 12px 35px rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
          }}
        >
          <img
            src={getSafeImageUrl(data.photoUrl)}
            alt={data.name || 'Student'}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              display: 'block',
            }}
          />
        </div>

        {/* Footer info / actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            🔍 Tap outside or click Close
          </span>
          <button
            className="btn btn-primary btn-sm"
            style={{ padding: '8px 20px', borderRadius: 10, fontWeight: 700 }}
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Student Details Modal (WITHOUT QR CODE) ─────────────────────────────────
function StudentDetailsModal({ pass, onClose, onOpenQR, onPreviewPhoto }) {
  if (!pass) return null;

  const statusBadgeClass = (st) => {
    const map = {
      Approved: 'badge-approved',
      Pending: 'badge-pending',
      Rejected: 'badge-rejected',
      'Checked-Out': 'badge-checkedout',
      Completed: 'badge-completed',
    };
    return map[st] || 'badge-pending';
  };

  const studentName = pass.studentDetails?.fullName || pass.student?.fullName || 'Student';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 520, padding: 24, borderRadius: 'var(--radius-lg)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>Student Details</h3>
            <span className={`badge ${statusBadgeClass(pass.status)}`} style={{ fontSize: '0.75rem' }}>
              {pass.status}
            </span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ fontSize: '1.1rem', padding: '4px 8px' }}>
            ✕
          </button>
        </div>

        {/* Student Profile Card (Without QR Code) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            background: 'var(--surface-2)',
            padding: '16px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--surface-border)',
            marginBottom: 20,
          }}
        >
          <div
            onClick={() => {
              if (pass.studentDetails?.photoUrl && onPreviewPhoto) {
                onPreviewPhoto({
                  photoUrl: pass.studentDetails.photoUrl,
                  name: studentName,
                  rollNumber: pass.studentDetails?.rollNumber,
                  department: pass.studentDetails?.department,
                });
              }
            }}
            style={{
              width: 64,
              height: 64,
              borderRadius: 12,
              overflow: 'hidden',
              background: 'var(--surface-3)',
              border: '2px solid var(--blue-500)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              fontSize: '1.8rem',
              cursor: pass.studentDetails?.photoUrl ? 'pointer' : 'default',
              transition: 'transform 0.2s ease',
            }}
            title={pass.studentDetails?.photoUrl ? 'Touch / Click to enlarge photo' : ''}
            onMouseEnter={(e) => {
              if (pass.studentDetails?.photoUrl) e.currentTarget.style.transform = 'scale(1.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'none';
            }}
          >
            {pass.studentDetails?.photoUrl ? (
              <img
                src={getSafeImageUrl(pass.studentDetails.photoUrl)}
                alt="Student"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            ) : (
              '🎓'
            )}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h3 style={{ fontSize: '1.15rem', margin: '0 0 3px', fontWeight: 800, color: 'var(--text-primary)' }}>
              {studentName}
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0 0 2px' }}>
              Roll No: <strong style={{ color: 'var(--text-primary)' }}>{pass.studentDetails?.rollNumber || 'N/A'}</strong>
              {pass.studentDetails?.department && ` • ${pass.studentDetails.department}`}
            </p>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
              {pass.studentDetails?.year ? `${pass.studentDetails.year} • ` : ''}
              Hostel: {pass.studentDetails?.hostelBlock || 'Block A'} - {pass.studentDetails?.hostelRoom || 'Room'}
            </p>
          </div>
        </div>

        {/* Detailed Information Grid */}
        <div
          style={{
            background: 'var(--surface-1)',
            border: '1px solid var(--surface-border)',
            borderRadius: 'var(--radius-md)',
            padding: '14px 16px',
            marginBottom: 20,
          }}
        >
          <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: 12 }}>
            Pass & Journey Information
          </div>
          <div className="detail-grid" style={{ fontSize: '0.84rem' }}>
            <div className="detail-item">
              <span className="detail-label">Destination</span>
              <span className="detail-value" style={{ fontWeight: 600 }}>{pass.destination}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Reason</span>
              <span className="detail-value">{pass.reason}</span>
            </div>
            {pass.studentDetails?.phone && (
              <div className="detail-item">
                <span className="detail-label">Contact Phone</span>
                <span className="detail-value">{pass.studentDetails.phone}</span>
              </div>
            )}
            {pass.expectedReturnDateTime && (
              <div className="detail-item">
                <span className="detail-label">Expected Return</span>
                <span className="detail-value">{formatDT(pass.expectedReturnDateTime)}</span>
              </div>
            )}
            {pass.actualEntryTime && (
              <div className="detail-item">
                <span className="detail-label">Actual Return Time</span>
                <span className="detail-value" style={{ color: 'var(--green-400)' }}>{formatDT(pass.actualEntryTime)}</span>
              </div>
            )}
            <div className="detail-item">
              <span className="detail-label">Submitted On</span>
              <span className="detail-value">{formatDT(pass.submittedAt)}</span>
            </div>
            {pass.rejectionReason && (
              <div className="detail-item">
                <span className="detail-label">Rejection Reason</span>
                <span className="detail-value" style={{ color: 'var(--red-400)' }}>{pass.rejectionReason}</span>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          {(pass.status === 'Approved' || pass.status === 'Completed' || pass.status === 'Checked-Out' || pass.qrToken || pass.qrCodeDataUrl) && onOpenQR && (
            <button
              className="btn btn-primary"
              style={{ padding: '8px 16px' }}
              onClick={() => {
                onClose();
                onOpenQR(pass);
              }}
            >
              📱 Show QR Code
            </button>
          )}
          <button className="btn btn-ghost" style={{ padding: '8px 18px' }} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Universal Base URL Resolver for Mobile QR Codes ─────────────────────────
function getUniversalQrBaseUrl() {
  const custom = localStorage.getItem('qr_custom_host');
  if (custom && custom.trim()) {
    let clean = custom.trim().replace(/\/+$/, '');
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = `${window.location.protocol}//${clean}`;
    }
    return clean;
  }
  const hostname = window.location.hostname;
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    return window.location.origin;
  }
  return (
    import.meta.env.VITE_PUBLIC_URL ||
    (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/+$/, '') : '') ||
    'https://smart-leaving-backend.onrender.com'
  );
}

// ─── Digital QR Pass Modal (STUDENT NAME ON TOP OF QR) ─────────────────────────
function PassQRModal({ pass, onClose }) {
  if (!pass) return null;

  const [qrSrc, setQrSrc] = useState(pass.qrCodeDataUrl || '');

  const studentName = pass.studentDetails?.fullName || pass.student?.fullName || 'Student';
  const rollNumber = pass.studentDetails?.rollNumber || '';

  const baseUrl = getUniversalQrBaseUrl();
  const verifyUrl = `${baseUrl}/verify-outpass?passId=${encodeURIComponent(pass.passId)}${pass.qrToken ? `&token=${encodeURIComponent(pass.qrToken)}` : ''}`;

  useEffect(() => {
    let cancelled = false;
    const generateQR = async () => {
      try {
        const QRCode = await import('qrcode');
        const dataUrl = await QRCode.default.toDataURL(verifyUrl, {
          width: 260,
          margin: 2,
          errorCorrectionLevel: 'M',
          color: { dark: '#0F172A', light: '#FFFFFF' },
        });
        if (!cancelled) setQrSrc(dataUrl);
      } catch (err) {
        console.error('Failed to generate pass QR:', err);
        if (!cancelled && pass.qrCodeDataUrl) setQrSrc(pass.qrCodeDataUrl);
      }
    };
    generateQR();
    return () => { cancelled = true; };
  }, [pass, verifyUrl]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 420, padding: 26, textAlign: 'center', borderRadius: 'var(--radius-lg)' }}
      >
        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span className={`badge ${pass.status === 'Completed' ? 'badge-completed' : 'badge-approved'}`} style={{ fontSize: '0.75rem', letterSpacing: '0.05em' }}>
            {pass.status === 'Completed' ? 'PASS COMPLETED' : 'OFFICIAL GATE PASS'}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ fontSize: '1.1rem', padding: '4px 8px' }}>
            ✕
          </button>
        </div>

        {/* QR TOP: Display Student Name Prominently */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--blue-400)', fontWeight: 700, marginBottom: 4 }}>
            Student Pass
          </div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, margin: '0 0 4px', color: 'var(--text-primary)' }}>
            {studentName}
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
            {rollNumber ? `${rollNumber} • ` : ''}<code>{pass.passId}</code>
          </p>
        </div>

        {/* The QR Code Card */}
        <div
          style={{
            background: '#ffffff',
            padding: 18,
            borderRadius: 18,
            display: 'inline-block',
            margin: '0 auto 12px',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)',
          }}
        >
          {qrSrc ? (
            <img
              src={qrSrc}
              alt={`${studentName} Gate Pass QR`}
              style={{ width: 230, height: 230, display: 'block' }}
            />
          ) : (
            <div style={{ width: 230, height: 230, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontSize: '0.85rem' }}>
              <div className="spinner spinner-md" />
            </div>
          )}
        </div>

        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 14px', lineHeight: 1.4 }}>
          Scan this QR code with mobile camera to verify out pass.
        </p>



        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" style={{ flex: 1, padding: '10px' }} onClick={handlePrint}>
            🖨️ Print Pass
          </button>
          <button className="btn btn-primary" style={{ flex: 1, padding: '10px' }} onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Compact Unique Student QR Code for Pass Cards ──────────────────────────
function PassCardQRCode({ pass, onClick }) {
  const [qrSrc, setQrSrc] = useState(pass.qrCodeDataUrl || '');

  const baseUrl = getUniversalQrBaseUrl();
  const verifyUrl = `${baseUrl}/verify-outpass?passId=${encodeURIComponent(pass.passId)}${pass.qrToken ? `&token=${encodeURIComponent(pass.qrToken)}` : ''}`;

  useEffect(() => {
    let cancelled = false;
    const generateQR = async () => {
      try {
        const QRCode = await import('qrcode');
        const dataUrl = await QRCode.default.toDataURL(verifyUrl, {
          width: 160,
          margin: 1,
          errorCorrectionLevel: 'M',
          color: { dark: '#0F172A', light: '#FFFFFF' },
        });
        if (!cancelled) setQrSrc(dataUrl);
      } catch (err) {
        console.error('Failed to generate pass card QR:', err);
        if (!cancelled && pass.qrCodeDataUrl) setQrSrc(pass.qrCodeDataUrl);
      }
    };
    generateQR();
    return () => { cancelled = true; };
  }, [pass, verifyUrl]);

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px 14px',
        borderRadius: 14,
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(59, 130, 246, 0.35)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        flexShrink: 0,
        boxShadow: '0 4px 18px rgba(0,0,0,0.25)',
      }}
      title="Click to view full QR code"
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.8)';
        e.currentTarget.style.background = 'rgba(59, 130, 246, 0.09)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.35)';
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
        e.currentTarget.style.transform = 'none';
      }}
    >
      <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--blue-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
        <span>📱 Student QR Code</span>
      </div>
      <div style={{ background: '#ffffff', padding: 6, borderRadius: 10, display: 'inline-block', boxShadow: '0 4px 12px rgba(0,0,0,0.35)' }}>
        {qrSrc ? (
          <img src={qrSrc} alt="Unique Student Pass QR" style={{ width: 96, height: 96, display: 'block' }} />
        ) : (
          <div style={{ width: 96, height: 96, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="spinner spinner-sm" />
          </div>
        )}
      </div>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 6, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
        <span>🔍 Click to expand</span>
      </div>
    </div>
  );
}

const PassModal = PassQRModal;

// ─── Digital Visitor Pass Modal ─────────────────────────────────────────────
function VisitorPassModal({ visitor, onClose }) {
  if (!visitor) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440, padding: 24, textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span className="badge badge-approved" style={{ fontSize: '0.8rem' }}>CAMPUS VISITOR PASS</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        <div style={{ background: '#fff', padding: 16, borderRadius: 'var(--radius-lg)', display: 'inline-block', margin: '0 auto 16px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
          {visitor.qrCodeDataUrl ? (
            <img src={visitor.qrCodeDataUrl} alt="Visitor Pass QR" style={{ width: 220, height: 220, display: 'block' }} />
          ) : (
            <div style={{ width: 220, height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
              No QR available
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'var(--surface-2)', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--surface-border)', marginBottom: 16, textAlign: 'left' }}>
          <div style={{ width: 56, height: 56, borderRadius: 10, overflow: 'hidden', background: 'var(--surface-3)', border: '1px solid var(--surface-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '1.6rem' }}>
            {visitor.photoUrl ? (
              <img src={getSafeImageUrl(visitor.photoUrl)} alt="Visitor" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            ) : (
              '👤'
            )}
          </div>
          <div>
            <h3 style={{ fontSize: '1.05rem', margin: '0 0 2px', fontWeight: 700 }}>{visitor.fullName}</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
              <code>{visitor.visitorId}</code> · {visitor.relationship} · {visitor.place}
            </p>
          </div>
        </div>

        <div className="detail-grid" style={{ textAlign: 'left', fontSize: '0.82rem', marginBottom: 20 }}>
          <div className="detail-item"><span className="detail-label">Visiting</span><span className="detail-value">{visitor.meetingPersonName}</span></div>
          <div className="detail-item"><span className="detail-label">Contact</span><span className="detail-value">{visitor.phone}</span></div>
          <div className="detail-item"><span className="detail-label">Purpose</span><span className="detail-value">{visitor.purpose}</span></div>
          <div className="detail-item"><span className="detail-label">Status</span><span className="detail-value">{visitor.status}</span></div>
          {visitor.expectedMeetingDate && (
            <div className="detail-item"><span className="detail-label">Visit Date</span><span className="detail-value">{formatDT(visitor.expectedMeetingDate)}</span></div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => window.print()}>
            🖨️ Print Pass
          </button>
          <button className="btn btn-primary" style={{ flex: 1 }} onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── QR Launcher Page (Desktop → Phone Scan) ────────────────────────────────
function QRLauncherPage({ user }) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [qrLoading, setQrLoading] = useState(true);

  // Compute active base URL for QR code (works on any mobile & any network without local IP)
  const activeBaseUrl = useMemo(() => {
    const hostname = window.location.hostname;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return window.location.origin;
    }
    return (
      import.meta.env.VITE_PUBLIC_URL ||
      (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/+$/, '') : '') ||
      'https://smart-leaving-backend.onrender.com'
    );
  }, []);

  const applyUrl = `${activeBaseUrl}/apply-outpass${user ? `?name=${encodeURIComponent(user.name || '')}` : ''}`;

  useEffect(() => {
    let cancelled = false;
    setQrLoading(true);
    const generateQR = async () => {
      try {
        const QRCode = await import('qrcode');
        const dataUrl = await QRCode.default.toDataURL(applyUrl, {
          errorCorrectionLevel: 'M',
          margin: 2,
          width: 280,
          color: { dark: '#0F172A', light: '#FFFFFF' },
        });
        if (!cancelled) {
          setQrDataUrl(dataUrl);
          setQrLoading(false);
        }
      } catch (err) {
        console.error('QR generate error:', err);
        if (!cancelled) setQrLoading(false);
      }
    };
    generateQR();
    return () => { cancelled = true; };
  }, [applyUrl]);

  return (
    <div style={{ maxWidth: 680 }}>
      <div className="card" style={{ padding: '28px 24px', textAlign: 'center', animation: 'fadeIn 0.3s ease' }}>

        {/* Header */}
        <div style={{
          width: 64, height: 64, borderRadius: 16,
          background: 'linear-gradient(135deg, var(--blue-600), var(--blue-700))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px', fontSize: '2rem',
          boxShadow: '0 6px 20px rgba(37,99,235,0.35)'
        }}>🎓</div>
        <h2 style={{ fontSize: '1.4rem', marginBottom: 8 }}>New Gate Pass Request</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: 460, margin: '0 auto 24px' }}>
          Scan the QR code below with <strong>any mobile phone</strong> camera to open the Out Pass application directly.
        </p>

        {/* QR Code Box */}
        <div style={{
          background: '#fff',
          padding: 18,
          borderRadius: 18,
          display: 'inline-block',
          boxShadow: '0 8px 30px rgba(0,0,0,0.35)',
          marginBottom: 26,
          position: 'relative',
        }}>
          {qrLoading ? (
            <div style={{ width: 280, height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div className="spinner spinner-lg" />
            </div>
          ) : qrDataUrl ? (
            <img src={qrDataUrl} alt="Scan to Apply for Out Pass" style={{ width: 280, height: 280, display: 'block' }} />
          ) : (
            <div style={{ width: 280, height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
              Unable to generate QR. Use the button below.
            </div>
          )}
        </div>

        {/* Instruction Steps */}
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 24,
          flexWrap: 'wrap', marginBottom: 28
        }}>
          {[
            { icon: '📱', step: '1', text: 'Scan with any phone camera' },
            { icon: '📸', step: '2', text: 'Take student photo on mobile' },
            { icon: '📝', step: '3', text: 'Fill all required details' },
            { icon: '🚀', step: '4', text: 'Click Get Out Pass' },
          ].map(({ icon, step, text }) => (
            <div key={step} style={{ textAlign: 'center', maxWidth: 120 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: 'var(--surface-2)',
                border: '1px solid var(--surface-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 8px', fontSize: '1.3rem'
              }}>{icon}</div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{text}</span>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '0 0 20px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--surface-border)' }} />
          or open directly on this device
          <div style={{ flex: 1, height: 1, background: 'var(--surface-border)' }} />
        </div>

        {/* Direct Open Button */}
        <button
          className="btn btn-primary"
          style={{ width: '100%', padding: '13px', fontSize: '1rem', fontWeight: 700, boxShadow: '0 4px 16px rgba(37,99,235,0.35)' }}
          onClick={() => navigate('/apply-outpass' + (user ? `?name=${encodeURIComponent(user.name || '')}` : ''))}
        >
          📱 Open Out Pass Form on This Device
        </button>

        <p style={{ marginTop: 12, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          The form allows photo capture, all student fields, real-time approval status & digital QR pass.
        </p>
      </div>
    </div>
  );
}

// ─── Main Student Dashboard Component ─────────────────────────────────────────
export default function StudentDashboard() {
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [passes, setPasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPassForModal, setSelectedPassForModal] = useState(null);
  const [selectedPassForDetails, setSelectedPassForDetails] = useState(null);
  const [selectedPassForQR, setSelectedPassForQR] = useState(null);
  const [selectedPhotoPreview, setSelectedPhotoPreview] = useState(null);
  const [selectedVisitorForModal, setSelectedVisitorForModal] = useState(null);
  const [visitors, setVisitors] = useState([]);
  const [visitorsLoading, setVisitorsLoading] = useState(false);
  const [passSearchQuery, setPassSearchQuery] = useState('');

  // Notification States
  const [notifications, setNotifications] = useState([]);
  const [notifsLoading, setNotifsLoading] = useState(false);
  const [notifFilter, setNotifFilter] = useState('all'); // 'all' | 'unread' | 'pass' | 'visitor'

  const basePath = user?.role === 'admin' ? '/admin' : '/student';

  const fetchMyPasses = useCallback(async (isSilent = false) => {
    if (user?.role !== 'admin') {
      setLoading(false);
      return;
    }
    if (!isSilent) setLoading(true);
    try {
      const res = await gatePassAPI.getAll();
      setPasses(res.data.gatePasses || []);
    } catch (err) {
      console.error('Failed to load passes:', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [user?.role]);

  const fetchMyVisitors = useCallback(async () => {
    setVisitorsLoading(true);
    try {
      const res = user?.role === 'admin' ? await visitorAPI.getAll() : await visitorAPI.getMyVisitors();
      setVisitors(res.data.visitors || []);
    } catch (err) {
      console.error('Failed to load visitors:', err);
    } finally {
      setVisitorsLoading(false);
    }
  }, [user?.role]);

  const fetchNotifications = useCallback(async () => {
    setNotifsLoading(true);
    try {
      const res = await notificationAPI.getAll();
      setNotifications(res.data.notifications || []);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setNotifsLoading(false);
    }
  }, []);

  const handleMarkNotificationRead = async (id) => {
    try {
      await notificationAPI.markRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      await notificationAPI.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const handleApprove = async (id) => {
    try {
      const res = await gatePassAPI.updateStatus(id, { status: 'Approved' });
      fetchMyPasses();
      if (res?.data?.gatePass) {
        setSelectedPassForQR(res.data.gatePass);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve pass');
    }
  };

  const handleReject = async (id) => {
    const reason = window.prompt('Enter rejection reason:') || 'Rejected by administration';
    try {
      await gatePassAPI.updateStatus(id, { status: 'Rejected', rejectionReason: reason });
      fetchMyPasses();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reject pass');
    }
  };

  const handleDeletePass = async (id, passId) => {
    if (!window.confirm(`Are you sure you want to delete gate pass ${passId || ''}?`)) return;
    try {
      await gatePassAPI.delete(id);
      fetchMyPasses();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete gate pass');
    }
  };

  const handleDeleteVisitor = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete visitor record for ${name || ''}?`)) return;
    try {
      await visitorAPI.delete(id);
      fetchMyVisitors();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete visitor');
    }
  };

  useEffect(() => {
    fetchMyPasses();
    fetchMyVisitors();
    fetchNotifications();
  }, [fetchMyPasses, fetchMyVisitors, fetchNotifications]);

  // Auto-refresh passes in background silently without triggering full-screen loading spinner
  useEffect(() => {
    if (user?.role !== 'admin') return;
    const iv = setInterval(() => {
      fetchMyPasses(true);
    }, 10000);
    return () => clearInterval(iv);
  }, [fetchMyPasses, user?.role]);

  // Route synchronization
  useEffect(() => {
    const p = window.location.pathname;
    if (user?.role === 'student') {
      if (p.includes('/notifications')) {
        setCurrentPage('notifications');
        fetchNotifications();
      } else {
        setCurrentPage('profile');
      }
    } else {
      if (p === '/admin' || p === '/admin/') setCurrentPage('dashboard');
      else if (p.includes('/passes')) setCurrentPage('my-passes');
      else if (p.includes('/new-pass')) setCurrentPage('new-pass');
      else if (p.includes('/visitors')) setCurrentPage('visitors');
      else if (p.includes('/notifications')) {
        setCurrentPage('notifications');
        fetchNotifications();
      } else if (p.includes('/profile')) {
        setCurrentPage('profile');
      }
    }
  }, [user?.role, fetchNotifications]);

  useEffect(() => {
    const onPop = () => {
      const p = window.location.pathname;
      if (user?.role === 'student') {
        if (p.includes('/notifications')) {
          setCurrentPage('notifications');
          fetchNotifications();
        } else {
          setCurrentPage('profile');
        }
      } else {
        if (p === '/admin' || p === '/admin/') setCurrentPage('dashboard');
        else if (p.includes('/passes')) setCurrentPage('my-passes');
        else if (p.includes('/new-pass')) setCurrentPage('new-pass');
        else if (p.includes('/visitors')) setCurrentPage('visitors');
        else if (p.includes('/notifications')) {
          setCurrentPage('notifications');
          fetchNotifications();
        } else if (p.includes('/profile')) {
          setCurrentPage('profile');
        }
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [user?.role, fetchNotifications]);

  const pendingCount = passes.filter(p => p.status === 'Pending').length;
  const approvedCount = passes.filter(p => p.status === 'Approved' || p.status === 'Completed').length;
  const rejectedCount = passes.filter(p => p.status === 'Rejected').length;

  const statusBadge = (st) => {
    const map = {
      Approved: 'badge-approved',
      Pending: 'badge-pending',
      Rejected: 'badge-rejected',
      'Checked-Out': 'badge-checkedout',
      Completed: 'badge-completed',
    };
    return map[st] || 'badge-pending';
  };

  const pageTitle = user?.role === 'student'
    ? (currentPage === 'notifications' ? 'Notifications' : 'My Profile & Settings')
    : (currentPage === 'profile' ? 'Admin Profile & Settings' : 'Admin Management System');

  return (
    <DashboardLayout title={pageTitle} currentPage={currentPage}>
      {selectedPassForDetails && (
        <StudentDetailsModal
          pass={selectedPassForDetails}
          onClose={() => setSelectedPassForDetails(null)}
          onOpenQR={(p) => setSelectedPassForQR(p)}
          onPreviewPhoto={(data) => setSelectedPhotoPreview(data)}
        />
      )}
      {selectedPhotoPreview && (
        <PhotoPreviewModal
          data={selectedPhotoPreview}
          onClose={() => setSelectedPhotoPreview(null)}
        />
      )}
      {selectedPassForQR && (
        <PassQRModal pass={selectedPassForQR} onClose={() => setSelectedPassForQR(null)} />
      )}
      {selectedPassForModal && (
        <PassQRModal pass={selectedPassForModal} onClose={() => setSelectedPassForModal(null)} />
      )}
      {selectedVisitorForModal && (
        <VisitorPassModal visitor={selectedVisitorForModal} onClose={() => setSelectedVisitorForModal(null)} />
      )}

      {/* SUB-PAGE: DASHBOARD HOME */}
      {currentPage === 'dashboard' && (
        <div>

          {/* Quick Stats Grid */}
          <div className="grid-4" style={{ marginBottom: 28 }}>
            <div className="stat-card">
              <div className="stat-icon blue">🎫</div>
              <div>
                <div className="stat-value">{passes.length}</div>
                <div className="stat-label">Total Passes</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon amber">⏳</div>
              <div>
                <div className="stat-value">{pendingCount}</div>
                <div className="stat-label">Pending Approval</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon green">✅</div>
              <div>
                <div className="stat-value">{approvedCount}</div>
                <div className="stat-label">Approved Passes</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon red">❌</div>
              <div>
                <div className="stat-value">{rejectedCount}</div>
                <div className="stat-label">Rejected Passes</div>
              </div>
            </div>
          </div>

          {/* Action Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3>Recent Gate Passes</h3>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => { setCurrentPage('new-pass'); navigate(`${basePath}/new-pass`); }}
            >
              ➕ Request Gate Pass
            </button>
          </div>

          {/* Recent Passes List */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {loading && passes.length === 0 ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner spinner-lg" /></div>
            ) : passes.length === 0 ? (
              <div className="empty-state" style={{ padding: 40 }}>
                <span style={{ fontSize: '2.5rem' }}>🎫</span>
                <h3>No gate pass requests yet</h3>
                <p style={{ fontSize: '0.85rem', marginBottom: 16 }}>Need to leave the campus? Submit a leaving request now.</p>
                <button className="btn btn-primary" onClick={() => { setCurrentPage('new-pass'); navigate(`${basePath}/new-pass`); }}>
                  Submit First Pass
                </button>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Destination</th>
                      <th>Expected Leaving</th>
                      <th>Expected Return</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {passes.slice(0, 5).map((p) => (
                      <tr key={p._id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div
                              onClick={() => {
                                if (p.studentDetails?.photoUrl) {
                                  setSelectedPhotoPreview({
                                    photoUrl: p.studentDetails.photoUrl,
                                    name: p.studentDetails?.fullName || p.student?.fullName || 'Student',
                                    rollNumber: p.studentDetails?.rollNumber,
                                    department: p.studentDetails?.department,
                                  });
                                }
                              }}
                              style={{
                                width: 50,
                                height: 50,
                                borderRadius: 10,
                                overflow: 'hidden',
                                background: 'var(--surface-3)',
                                border: '1px solid var(--surface-border)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                                cursor: p.studentDetails?.photoUrl ? 'pointer' : 'default',
                                transition: 'all 0.2s ease',
                              }}
                              title={p.studentDetails?.photoUrl ? 'Touch / Click to enlarge photo' : ''}
                              onMouseEnter={(e) => {
                                if (p.studentDetails?.photoUrl) {
                                  e.currentTarget.style.transform = 'scale(1.08)';
                                  e.currentTarget.style.borderColor = 'var(--blue-400)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'none';
                                e.currentTarget.style.borderColor = 'var(--surface-border)';
                              }}
                            >
                              {p.studentDetails?.photoUrl ? (
                                <img src={getSafeImageUrl(p.studentDetails.photoUrl)} alt={p.studentDetails?.fullName || 'Student'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                              ) : (
                                <span style={{ fontSize: '1.3rem' }}>🎓</span>
                              )}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                                {p.studentDetails?.fullName || p.student?.fullName || 'Student'}
                              </div>
                              {p.studentDetails?.rollNumber && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                  {p.studentDetails.rollNumber}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td style={{ fontWeight: 500 }}>{p.destination}</td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{formatDT(p.expectedLeavingDateTime)}</td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{formatDT(p.expectedReturnDateTime)}</td>
                        <td><span className={`badge ${statusBadge(p.status)}`}>{p.status}</span></td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '5px 10px', fontSize: '0.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
                              onClick={() => setSelectedPassForDetails(p)}
                              title="View student details without QR code"
                            >
                              👁️ View
                            </button>
                            {(p.status === 'Approved' || p.status === 'Completed' || p.status === 'Checked-Out' || p.qrToken || p.qrCodeDataUrl) && (
                              <button
                                className="btn btn-primary btn-sm"
                                style={{ padding: '5px 10px', fontSize: '0.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
                                onClick={() => setSelectedPassForQR(p)}
                                title="Show QR code"
                              >
                                📱 Show QR
                              </button>
                            )}
                            {user?.role === 'admin' && p.status === 'Pending' && (
                              <>
                                <button className="btn btn-sm" style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: 6, fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600 }} onClick={() => handleApprove(p._id)}>
                                  ✓ Approve
                                </button>
                                <button className="btn btn-sm" style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: 6, fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600 }} onClick={() => handleReject(p._id)}>
                                  ✕ Reject
                                </button>
                              </>
                            )}
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ color: '#ef4444', padding: '5px 8px' }}
                              title="Delete Pass"
                              onClick={() => handleDeletePass(p._id, p.passId)}
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Visitor System Quick Banner */}
          <div
            className="card"
            style={{
              marginTop: 24,
              background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.9))',
              border: '1px solid var(--surface-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 16,
              padding: '20px 24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--blue-glow-soft)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.5rem',
                }}
              >
                👥
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '1rem' }}>Campus Visitor Management</h4>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Expecting parents or relatives? Pre-register their visit or track incoming guests.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setCurrentPage('visitors');
                  navigate(`${basePath}/visitors`);
                }}
              >
                Go to Visitor System →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-PAGE: NEW PASS REQUEST (QR Launcher) */}
      {currentPage === 'new-pass' && (
        <QRLauncherPage user={user} />
      )}

      {/* SUB-PAGE: MY PASSES LIST */}
      {currentPage === 'my-passes' && (() => {
        const filteredPasses = passes.filter((p) => {
          if (!passSearchQuery.trim()) return true;
          const q = passSearchQuery.toLowerCase().trim();
          const studentName = (p.studentDetails?.fullName || p.student?.fullName || p.studentDetails?.name || p.student?.name || '').toLowerCase();
          const rollNumber = (p.studentDetails?.rollNumber || '').toLowerCase();
          const department = (p.studentDetails?.department || '').toLowerCase();
          const phone = (p.studentDetails?.phone || '').toLowerCase();
          const destination = (p.destination || '').toLowerCase();
          const reason = (p.reason || '').toLowerCase();
          const status = (p.status || '').toLowerCase();
          const passId = (p.passId || '').toLowerCase();

          return (
            studentName.includes(q) ||
            rollNumber.includes(q) ||
            department.includes(q) ||
            phone.includes(q) ||
            destination.includes(q) ||
            reason.includes(q) ||
            status.includes(q) ||
            passId.includes(q)
          );
        });
        return (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ fontSize: '1.4rem', margin: 0 }}>Gate Passes History</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '4px 0 0' }}>All your requested and active passes</p>
            </div>
            <button className="btn btn-primary" onClick={() => { setCurrentPage('new-pass'); navigate(`${basePath}/new-pass`); }}>
              ➕ New Request
            </button>
          </div>

          {/* Search Bar */}
          <div style={{
            position: 'relative',
            marginBottom: 20,
          }}>
            <div style={{
              position: 'absolute',
              left: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
              fontSize: '1rem',
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search by student name, roll number, destination, status..."
              value={passSearchQuery}
              onChange={(e) => setPassSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px 12px 42px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--surface-border)',
                background: 'var(--surface-2)',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
                outline: 'none',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--blue-500)';
                e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.15)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--surface-border)';
                e.target.style.boxShadow = 'none';
              }}
            />
            {passSearchQuery && (
              <button
                onClick={() => setPassSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'var(--surface-3)',
                  border: '1px solid var(--surface-border)',
                  borderRadius: '50%',
                  width: 24,
                  height: 24,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  fontSize: '0.75rem',
                  padding: 0,
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => { e.target.style.background = 'var(--surface-border)'; }}
                onMouseLeave={(e) => { e.target.style.background = 'var(--surface-3)'; }}
              >
                ✕
              </button>
            )}
          </div>

          {passSearchQuery.trim() && (
            <div style={{ marginBottom: 14, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              Showing <strong style={{ color: 'var(--text-primary)' }}>{filteredPasses.length}</strong> of {passes.length} passes
              {filteredPasses.length === 0 && (
                <span style={{ marginLeft: 8, color: 'var(--amber-400)' }}>— no matches found</span>
              )}
            </div>
          )}

          {loading && passes.length === 0 ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 50 }}><div className="spinner spinner-lg" /></div>
          ) : filteredPasses.length === 0 && passSearchQuery.trim() ? (
            <div className="empty-state" style={{ padding: 40 }}>
              <span style={{ fontSize: '2.5rem' }}>🔍</span>
              <h3 style={{ marginTop: 12 }}>No passes match your search</h3>
              <p style={{ color: 'var(--text-secondary)', maxWidth: 360, margin: '8px auto 16px' }}>
                Try a different keyword or clear the search to see all passes.
              </p>
              <button className="btn btn-ghost btn-sm" onClick={() => setPassSearchQuery('')}>
                Clear Search
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {filteredPasses.map((p) => (
                <div key={p._id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div
                        onClick={() => {
                          if (p.studentDetails?.photoUrl) {
                            setSelectedPhotoPreview({
                              photoUrl: p.studentDetails.photoUrl,
                              name: p.studentDetails?.fullName || p.student?.fullName || 'Student',
                              rollNumber: p.studentDetails?.rollNumber,
                              department: p.studentDetails?.department,
                            });
                          }
                        }}
                        style={{
                          width: 72,
                          height: 72,
                          borderRadius: 14,
                          overflow: 'hidden',
                          background: 'var(--surface-3)',
                          border: '2px solid var(--surface-border)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          fontSize: '2rem',
                          boxShadow: '0 4px 14px rgba(0,0,0,0.3)',
                          cursor: p.studentDetails?.photoUrl ? 'pointer' : 'default',
                          transition: 'all 0.2s ease',
                        }}
                        title={p.studentDetails?.photoUrl ? 'Touch / Click to enlarge photo' : ''}
                        onMouseEnter={(e) => {
                          if (p.studentDetails?.photoUrl) {
                            e.currentTarget.style.transform = 'scale(1.06)';
                            e.currentTarget.style.borderColor = 'var(--blue-400)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'none';
                          e.currentTarget.style.borderColor = 'var(--surface-border)';
                        }}
                      >
                        {p.studentDetails?.photoUrl ? (
                          <img src={getSafeImageUrl(p.studentDetails.photoUrl)} alt={p.studentDetails?.fullName || 'Student'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                        ) : (
                          '🎓'
                        )}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                            {p.studentDetails?.fullName || p.student?.fullName || 'Student'}
                          </h3>
                          <span className={`badge ${statusBadge(p.status)}`}>{p.status}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, fontSize: '0.85rem' }}>
                          <span style={{ fontWeight: 600, color: 'var(--blue-400)' }}>{p.destination}</span>
                          {p.studentDetails?.rollNumber && (
                            <span style={{ color: 'var(--text-muted)' }}>• Roll: <strong style={{ color: 'var(--text-secondary)' }}>{p.studentDetails.rollNumber}</strong></span>
                          )}
                        </div>
                        <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Reason: {p.reason}</p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '8px 14px', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}
                        onClick={() => setSelectedPassForDetails(p)}
                      >
                        👁️ View Details
                      </button>
                      {(p.status === 'Approved' || p.status === 'Completed' || p.status === 'Checked-Out' || p.qrToken || p.qrCodeDataUrl) && (
                        <button
                          className="btn btn-primary btn-sm"
                          style={{ padding: '8px 14px', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}
                          onClick={() => setSelectedPassForQR(p)}
                        >
                          📱 Show QR
                        </button>
                      )}
                      {user?.role === 'admin' && p.status === 'Pending' && (
                        <>
                          <button className="btn btn-sm" style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }} onClick={() => handleApprove(p._id)}>
                            ✓ Approve Pass
                          </button>
                          <button className="btn btn-sm" style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }} onClick={() => handleReject(p._id)}>
                            ✕ Reject
                          </button>
                        </>
                      )}
                      <button
                        className="btn btn-sm"
                        style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.35)', color: '#f87171', padding: '8px 14px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                        onClick={() => handleDeletePass(p._id, p.passId)}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>

                  <div className="divider" style={{ margin: '14px 0' }} />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
                    <div className="detail-grid" style={{ fontSize: '0.82rem', flex: 1, minWidth: 260 }}>
                      <div className="detail-item"><span className="detail-label">Submitted At</span><span className="detail-value">{formatDT(p.submittedAt)}</span></div>
                      <div className="detail-item"><span className="detail-label">Expected Return</span><span className="detail-value">{formatDT(p.expectedReturnDateTime)}</span></div>
                      {p.actualEntryTime && <div className="detail-item"><span className="detail-label">Actual Return</span><span className="detail-value" style={{ color: 'var(--green-400)' }}>{formatDT(p.actualEntryTime)}</span></div>}
                      {p.rejectionReason && <div className="detail-item"><span className="detail-label">Rejection Reason</span><span className="detail-value" style={{ color: 'var(--red-400)' }}>{p.rejectionReason}</span></div>}
                    </div>

                    {(p.status === 'Approved' || p.status === 'Completed' || p.status === 'Checked-Out' || p.qrToken || p.qrCodeDataUrl) && (
                      <PassCardQRCode pass={p} onClick={() => setSelectedPassForQR(p)} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        );
      })()}

      {/* SUB-PAGE: VISITOR SYSTEM */}
      {currentPage === 'visitors' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ fontSize: '1.35rem', marginBottom: 4 }}>👥 Campus Visitor System</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Track visits, view QR passes, and pre-register parents or relatives visiting you
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="btn btn-primary"
                onClick={() => navigate('/visitor-registration')}
                style={{ padding: '9px 18px' }}
              >
                ➕ Pre-Register Visitor
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => navigate('/visitor-status')}
                style={{ padding: '9px 16px' }}
              >
                🔍 Track Visitor Status
              </button>
            </div>
          </div>

          {/* Total Visitors Summary */}
          <div style={{ marginBottom: 24, display: 'flex' }}>
            <div className="stat-card" style={{ maxWidth: 260, width: '100%' }}>
              <div className="stat-icon blue">👥</div>
              <div>
                <div className="stat-value">{visitors.length}</div>
                <div className="stat-label">Total Visitors</div>
              </div>
            </div>
          </div>

          {/* Visitors List */}
          {visitorsLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <div className="spinner spinner-lg" />
            </div>
          ) : visitors.length === 0 ? (
            <div className="empty-state">
              <span style={{ fontSize: '3rem' }}>👥</span>
              <h3>No Visitors Registered Yet</h3>
              <p style={{ maxWidth: 420, margin: '8px auto 20px', color: 'var(--text-secondary)' }}>
                When parents, guardians, or friends register to visit you, their passes and verification status will appear here.
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button className="btn btn-primary" onClick={() => navigate('/visitor-registration')}>
                  ➕ Pre-Register a Visitor
                </button>
                <button className="btn btn-ghost" onClick={fetchMyVisitors}>
                  🔄 Refresh
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {visitors.map((v) => (
                <div key={v._id || v.visitorId} className="card" style={{ padding: '20px 24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{
                        width: 46,
                        height: 46,
                        borderRadius: '50%',
                        background: 'var(--surface-2)',
                        border: '1px solid var(--surface-border)',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.4rem'
                      }}>
                        {v.photoUrl ? (
                          <img src={v.photoUrl} alt={v.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : '👤'}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <h4 style={{ margin: 0, fontSize: '1.05rem' }}>{v.fullName}</h4>
                          <span className="badge badge-primary" style={{ fontSize: '0.72rem' }}>{v.relationship}</span>
                        </div>
                        <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          <code>{v.visitorId}</code> · Phone: {v.phone} · From: {v.place}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className={`badge ${statusBadge(v.status)}`}>{v.status}</span>
                      {(v.status === 'Approved' || v.status === 'Checked-In') && (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => setSelectedVisitorForModal(v)}
                        >
                          📱 View QR Pass
                        </button>
                      )}
                      <button
                        className="btn btn-sm"
                        style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.35)', color: '#f87171', padding: '6px 12px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                        onClick={() => handleDeleteVisitor(v._id, v.fullName)}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>

                  <div className="detail-grid" style={{ fontSize: '0.84rem' }}>
                    <div className="detail-item">
                      <span className="detail-label">Purpose</span>
                      <span className="detail-value">{v.purpose}</span>
                    </div>
                    {v.expectedMeetingDate && (
                      <div className="detail-item">
                        <span className="detail-label">Expected Date</span>
                        <span className="detail-value">{formatDT(v.expectedMeetingDate)}</span>
                      </div>
                    )}
                    {v.entryTime && (
                      <div className="detail-item">
                        <span className="detail-label">Gate In Time</span>
                        <span className="detail-value" style={{ color: 'var(--green-400)' }}>{formatDT(v.entryTime)}</span>
                      </div>
                    )}
                    {v.exitTime && (
                      <div className="detail-item">
                        <span className="detail-label">Gate Out Time</span>
                        <span className="detail-value" style={{ color: 'var(--blue-400)' }}>{formatDT(v.exitTime)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-PAGE: NOTIFICATIONS */}
      {currentPage === 'notifications' && (() => {
        const unreadCount = notifications.filter((n) => !n.isRead).length;
        const filtered = notifications.filter((n) => {
          if (notifFilter === 'unread') return !n.isRead;
          if (notifFilter === 'visitor') {
            const t = (n.title || '').toLowerCase() + (n.type || '').toLowerCase();
            return t.includes('visitor');
          }
          return true;
        });

        const getNotifIcon = (n) => {
          const t = (n.title || '').toLowerCase() + (n.type || '').toLowerCase();
          if (t.includes('approved')) return '✅';
          if (t.includes('rejected')) return '❌';
          if (t.includes('checked-out') || t.includes('exit')) return '🏃';
          if (t.includes('visitor')) return '👥';
          return '🔔';
        };

        return (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h2 style={{ fontSize: '1.4rem', margin: 0 }}>Campus Notifications</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '4px 0 0' }}>
                  Real-time updates regarding your visitors and campus security
                </p>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                {unreadCount > 0 && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={handleMarkAllNotificationsRead}
                    style={{ fontSize: '0.82rem' }}
                  >
                    ✓ Mark All as Read
                  </button>
                )}
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={fetchNotifications}
                  title="Refresh Notifications"
                >
                  🔄 Refresh
                </button>
              </div>
            </div>

            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              {[
                { id: 'all', label: `All (${notifications.length})` },
                { id: 'unread', label: `Unread (${unreadCount})` },
                { id: 'visitor', label: 'Visitor Alerts' },
              ].map((f) => (
                <button
                  key={f.id}
                  className={`btn btn-sm ${notifFilter === f.id ? 'btn-primary' : 'btn-ghost'}`}
                  style={{
                    borderRadius: 999,
                    padding: '6px 14px',
                    fontSize: '0.82rem',
                    background: notifFilter === f.id ? 'var(--blue-600)' : 'var(--surface-2)',
                    borderColor: notifFilter === f.id ? 'var(--blue-500)' : 'var(--surface-border)',
                  }}
                  onClick={() => setNotifFilter(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Notifications List */}
            {notifsLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 50 }}>
                <div className="spinner spinner-lg" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="empty-state" style={{ padding: 48, textAlign: 'center' }}>
                <span style={{ fontSize: '3rem' }}>🔔</span>
                <h3 style={{ marginTop: 12 }}>No Notifications Found</h3>
                <p style={{ color: 'var(--text-secondary)', maxWidth: 360, margin: '8px auto 0' }}>
                  {notifFilter === 'unread'
                    ? "You're all caught up! There are no unread notifications right now."
                    : 'When you receive visitor alerts or campus notifications, they will appear here.'}
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {filtered.map((n) => (
                  <div
                    key={n.id}
                    className="card"
                    style={{
                      padding: '16px 20px',
                      background: n.isRead ? 'var(--surface-1)' : 'rgba(37, 99, 235, 0.07)',
                      borderColor: n.isRead ? 'var(--surface-border)' : 'rgba(37, 99, 235, 0.35)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: 16,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                      <div
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 10,
                          background: n.isRead ? 'var(--surface-2)' : 'rgba(37, 99, 235, 0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.3rem',
                          flexShrink: 0,
                          border: '1px solid',
                          borderColor: n.isRead ? 'var(--surface-border)' : 'rgba(37, 99, 235, 0.3)',
                        }}
                      >
                        {getNotifIcon(n)}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                          <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {n.title}
                          </h4>
                          {!n.isRead && (
                            <span style={{
                              background: '#ef4444',
                              color: '#fff',
                              borderRadius: 999,
                              padding: '1px 7px',
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              letterSpacing: '0.04em',
                            }}>
                              NEW
                            </span>
                          )}
                        </div>
                        <NotificationMessageView notification={n} />
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          🕒 {formatDT(n.createdAt)}
                        </div>
                      </div>
                    </div>

                    {!n.isRead && (
                      <button
                        className="btn btn-ghost btn-xs"
                        style={{
                          color: 'var(--blue-400)',
                          borderColor: 'var(--surface-border)',
                          background: 'var(--surface-2)',
                          padding: '6px 10px',
                          fontSize: '0.75rem',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}
                        onClick={() => handleMarkNotificationRead(n.id)}
                        title="Mark as read"
                      >
                        ✓ Mark Read
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* SUB-PAGE: PROFILE (Matching "My Profile & Settings") */}
      {currentPage === 'profile' && (
        <ProfileView />
      )}
    </DashboardLayout>
  );
}
