import React, { useState, useEffect, useRef } from 'react';
import { gatePassAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { navigate } from '../../App';
import { getSafeImageUrl, compressAndResizeImage } from '../../utils/imageUrl';

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

/* ─── Inline styles ─────────────────────────────────────────── */
const S = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0a0e1a 0%, #0d1b2a 40%, #0a1628 100%)',
    color: '#e2e8f0',
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    padding: '0 0 40px',
  },
  heroBar: {
    background: 'linear-gradient(135deg, #1e3a5f 0%, #0f2847 100%)',
    borderBottom: '1px solid rgba(59,130,246,0.25)',
    padding: '16px 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'sticky',
    top: 0,
    zIndex: 50,
    backdropFilter: 'blur(12px)',
  },
  heroLeft: { display: 'flex', alignItems: 'center', gap: 12 },
  heroIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.3rem',
    boxShadow: '0 4px 16px rgba(37,99,235,0.45)',
  },
  heroTitle: { fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#f1f5f9', letterSpacing: '-0.01em' },
  heroSub: { fontSize: '0.72rem', color: '#94a3b8', margin: 0, marginTop: 2 },
  backBtn: {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 8,
    color: '#94a3b8',
    padding: '6px 14px',
    fontSize: '0.8rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  wrap: { maxWidth: 560, margin: '0 auto', padding: '20px 16px 0' },

  /* Progress Steps */
  stepBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
    marginBottom: 24,
    padding: '14px 16px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    border: '1px solid rgba(255,255,255,0.06)',
  },
  stepDot: (active, done) => ({
    width: 30,
    height: 30,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.72rem',
    fontWeight: 700,
    flexShrink: 0,
    background: done ? '#22c55e' : active ? '#2563eb' : 'rgba(255,255,255,0.07)',
    border: done ? '2px solid #16a34a' : active ? '2px solid #3b82f6' : '2px solid rgba(255,255,255,0.1)',
    color: done || active ? '#fff' : '#64748b',
    transition: 'all 0.3s',
  }),
  stepLine: (done) => ({
    flex: 1,
    height: 2,
    background: done ? '#22c55e' : 'rgba(255,255,255,0.07)',
    transition: 'background 0.3s',
    margin: '0 4px',
  }),
  stepLabel: (active) => ({
    fontSize: '0.62rem',
    color: active ? '#93c5fd' : '#475569',
    marginTop: 4,
    textAlign: 'center',
    fontWeight: active ? 600 : 400,
  }),

  /* Cards */
  card: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 18,
    padding: '22px 20px',
    marginBottom: 16,
    backdropFilter: 'blur(10px)',
  },
  sectionTitle: {
    fontSize: '0.72rem',
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: '#3b82f6',
    marginBottom: 14,
    display: 'flex',
    alignItems: 'center',
    gap: 7,
  },

  /* Photo box */
  photoBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 14,
    padding: '20px',
    background: 'rgba(37,99,235,0.05)',
    border: '2px dashed rgba(59,130,246,0.3)',
    borderRadius: 16,
    cursor: 'pointer',
    transition: 'all 0.25s',
    textAlign: 'center',
  },
  photoCircle: {
    width: 96,
    height: 96,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.06)',
    border: '2px solid rgba(59,130,246,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    fontSize: '2.4rem',
    boxShadow: '0 0 24px rgba(37,99,235,0.25)',
  },

  /* Input */
  formGroup: { marginBottom: 14 },
  label: {
    display: 'block',
    fontSize: '0.72rem',
    fontWeight: 700,
    letterSpacing: '0.07em',
    textTransform: 'uppercase',
    color: '#64748b',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: '11px 14px',
    color: '#e2e8f0',
    fontSize: '0.92rem',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    background: 'rgba(18,30,50,0.9)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: '11px 14px',
    color: '#e2e8f0',
    fontSize: '0.92rem',
    outline: 'none',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: '11px 14px',
    color: '#e2e8f0',
    fontSize: '0.92rem',
    outline: 'none',
    resize: 'vertical',
    boxSizing: 'border-box',
    minHeight: 72,
    fontFamily: 'inherit',
  },

  /* Reason chips */
  chipRow: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  chip: (active) => ({
    padding: '7px 14px',
    borderRadius: 20,
    fontSize: '0.78rem',
    fontWeight: 600,
    cursor: 'pointer',
    border: active ? '1px solid #3b82f6' : '1px solid rgba(255,255,255,0.1)',
    background: active ? 'rgba(37,99,235,0.25)' : 'rgba(255,255,255,0.04)',
    color: active ? '#93c5fd' : '#94a3b8',
    transition: 'all 0.18s',
  }),

  /* Grid */
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },

  /* Submit button */
  submitBtn: {
    width: '100%',
    padding: '15px',
    background: 'linear-gradient(135deg, #2563eb, #1e40af)',
    border: 'none',
    borderRadius: 14,
    color: '#fff',
    fontSize: '1.05rem',
    fontWeight: 800,
    cursor: 'pointer',
    letterSpacing: '0.02em',
    boxShadow: '0 6px 24px rgba(37,99,235,0.5)',
    transition: 'transform 0.15s, box-shadow 0.15s',
    marginTop: 8,
  },

  /* Error */
  error: {
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.35)',
    borderRadius: 10,
    padding: '10px 14px',
    fontSize: '0.84rem',
    color: '#fca5a5',
    marginBottom: 16,
  },

  /* Status banners */
  bannerPending: {
    background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(217,119,6,0.08))',
    border: '1px solid rgba(245,158,11,0.4)',
    borderRadius: 16,
    padding: '20px',
    textAlign: 'center',
    marginBottom: 20,
  },
  bannerApproved: {
    background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.1))',
    border: '2px solid rgba(16,185,129,0.5)',
    borderRadius: 16,
    padding: '20px',
    textAlign: 'center',
    marginBottom: 20,
    boxShadow: '0 0 30px rgba(16,185,129,0.15)',
    animation: 'pulseGreen 2s ease-in-out infinite',
  },
  bannerCheckedOut: {
    background: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(37,99,235,0.08))',
    border: '1px solid rgba(59,130,246,0.4)',
    borderRadius: 16,
    padding: '20px',
    textAlign: 'center',
    marginBottom: 20,
  },
  bannerCompleted: {
    background: 'linear-gradient(135deg, rgba(16,185,129,0.18), rgba(5,150,105,0.12))',
    border: '2px solid #22c55e',
    borderRadius: 16,
    padding: '20px',
    textAlign: 'center',
    marginBottom: 20,
    boxShadow: '0 0 40px rgba(34,197,94,0.2)',
  },
  bannerRejected: {
    background: 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(185,28,28,0.08))',
    border: '1px solid rgba(239,68,68,0.4)',
    borderRadius: 16,
    padding: '20px',
    textAlign: 'center',
    marginBottom: 20,
  },
  bannerEmoji: { fontSize: '2.8rem', display: 'block', marginBottom: 8 },
  bannerTitle: (color) => ({
    fontSize: '1.3rem',
    fontWeight: 900,
    color,
    margin: '0 0 6px',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
  }),
  bannerSub: { fontSize: '0.85rem', color: '#94a3b8', margin: 0 },

  /* QR box */
  qrBox: {
    background: '#fff',
    borderRadius: 16,
    padding: 18,
    display: 'inline-block',
    boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
    marginBottom: 16,
  },
  passId: { color: '#1e3a5f', fontWeight: 800, fontSize: '0.9rem', marginTop: 8, textAlign: 'center' },

  /* Detail grid in pass */
  detailGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px 16px',
    fontSize: '0.8rem',
    textAlign: 'left',
  },
  detailLabel: { color: '#64748b', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em' },
  detailValue: { color: '#e2e8f0', fontWeight: 600, marginTop: 2 },

  /* Camera preview */
  cameraBox: {
    background: '#000',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
    position: 'relative',
  },
};

const REASONS = [
  'Home Visit / Weekend',
  'Medical Emergency',
  'Academic / Internship',
  'Family Event',
  'Personal Errands',
];

const STEPS = ['Photo', 'Details', 'Travel Info'];

export default function StudentOutPassPage() {
  const { user } = useAuth();
  const queryParams = new URLSearchParams(window.location.search);

  const [step, setStep] = useState(0); // 0=photo, 1=details, 2=travel
  const [formData, setFormData] = useState({
    fullName: queryParams.get('name') || user?.name || '',
    rollNumber: queryParams.get('roll') || user?.studentProfile?.rollNumber || '',
    department: queryParams.get('dept') || user?.studentProfile?.department || 'Computer Science & Engineering',
    year: queryParams.get('year') || user?.studentProfile?.year || '3',
    phone: queryParams.get('phone') || user?.phone || '',
    hostelBlock: queryParams.get('block') || user?.studentProfile?.hostelBlock || '',
    hostelRoom: queryParams.get('room') || user?.studentProfile?.hostelRoom || '',
    reason: '',
    destination: '',
    expectedLeavingDateTime: '',
    expectedReturnDateTime: '',
  });

  const [photoDataUrl, setPhotoDataUrl] = useState('');
  const [photoLoading, setPhotoLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [passData, setPassData] = useState(null);
  const [pollingStatus, setPollingStatus] = useState('Pending');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    if (user && !formData.fullName) {
      setFormData((prev) => ({
        ...prev,
        fullName: user.name || '',
        rollNumber: user.studentProfile?.rollNumber || prev.rollNumber,
        department: user.studentProfile?.department || prev.department,
        year: user.studentProfile?.year || prev.year,
        phone: user.phone || prev.phone,
        hostelBlock: user.studentProfile?.hostelBlock || prev.hostelBlock,
        hostelRoom: user.studentProfile?.hostelRoom || prev.hostelRoom,
      }));
    }
  }, [user]);

  const handlePhotoCapture = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoLoading(true);
      setError('');
      try {
        const compressedDataUrl = await compressAndResizeImage(file, 800, 0.85);
        setPhotoDataUrl(compressedDataUrl);
      } catch (err) {
        console.error('Photo compression error:', err);
        const reader = new FileReader();
        reader.onload = (ev) => setPhotoDataUrl(ev.target.result);
        reader.readAsDataURL(file);
      } finally {
        setPhotoLoading(false);
        if (e.target) e.target.value = '';
      }
    }
  };

  const startLiveCamera = async () => {
    setCameraError('');
    setCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch {
      setCameraError('Cannot access live camera. Use phone camera button instead.');
      setCameraActive(false);
    }
  };

  const stopLiveCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const takeSnapshot = () => {
    if (videoRef.current && canvasRef.current) {
      const v = videoRef.current;
      const c = canvasRef.current;
      c.width = v.videoWidth || 480;
      c.height = v.videoHeight || 480;
      c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
      setPhotoDataUrl(c.toDataURL('image/jpeg', 0.85));
      stopLiveCamera();
    }
  };

  useEffect(() => () => stopLiveCamera(), []);

  // Real-time polling
  useEffect(() => {
    if (!passData?.passId) return;
    const iv = setInterval(async () => {
      try {
        const res = await gatePassAPI.getPublicStatus(passData.passId);
        if (res.data?.success && res.data?.gatePass) {
          setPollingStatus(res.data.gatePass.status);
          setPassData(res.data.gatePass);
          if (['Completed', 'Rejected'].includes(res.data.gatePass.status)) clearInterval(iv);
        }
      } catch {}
    }, 2500);
    return () => clearInterval(iv);
  }, [passData?.passId]);

  const validateStep = () => {
    if (step === 0) return true; // photo optional
    if (step === 1) {
      if (!formData.fullName.trim()) return 'Enter your Full Name';
      if (!formData.rollNumber.trim()) return 'Enter Roll Number';
      if (!formData.phone.trim()) return 'Enter Phone Number';
      if (!formData.hostelBlock.trim()) return 'Enter Hostel Block';
      if (!formData.hostelRoom.trim()) return 'Enter Room Number';
      return true;
    }
    if (step === 2) {
      if (!formData.destination.trim()) return 'Enter Destination';
      if (!formData.reason.trim()) return 'Select or enter Reason';
      if (!formData.expectedLeavingDateTime) return 'Select Leaving Date & Time';
      if (!formData.expectedReturnDateTime) return 'Select Return Date & Time';
      const l = new Date(formData.expectedLeavingDateTime);
      const r = new Date(formData.expectedReturnDateTime);
      if (r <= l) return 'Return time must be after leaving time';
      return true;
    }
    return true;
  };

  const handleNext = () => {
    const v = validateStep();
    if (v !== true) { setError(v); return; }
    setError('');
    setStep((s) => Math.min(s + 1, 2));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const v = validateStep();
    if (v !== true) { setError(v); return; }
    setError('');
    setLoading(true);
    try {
      const res = await gatePassAPI.applyMobile({ ...formData, photoUrl: photoDataUrl || '' });
      if (res.data?.success && res.data?.gatePass) {
        setPassData(res.data.gatePass);
        setPollingStatus(res.data.gatePass.status || 'Pending');
      } else {
        setError(res.data?.message || 'Failed to submit Out Pass request.');
      }
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Server error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const f = (k) => (e) => setFormData({ ...formData, [k]: e.target.value });

  /* ── SUBMITTED VIEW ── */
  if (passData) return (
    <div style={S.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @keyframes pulseGreen { 0%,100%{box-shadow:0 0 30px rgba(16,185,129,0.15)} 50%{box-shadow:0 0 50px rgba(16,185,129,0.35)} }
        @keyframes spinAnim { to{transform:rotate(360deg)} }
        @keyframes fadeSlide { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      <div style={S.heroBar}>
        <div style={S.heroLeft}>
          <div style={S.heroIcon}>🛡️</div>
          <div>
            <p style={S.heroTitle}>SmartCampus Out Pass</p>
            <p style={S.heroSub}>Official Student Leaving Portal</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            style={{
              padding: '7px 12px',
              borderRadius: 8,
              border: '1px solid rgba(59, 130, 246, 0.4)',
              background: 'rgba(59, 130, 246, 0.15)',
              color: '#93c5fd',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
            onClick={() => navigate('/verify-outpass')}
          >
            📷 Scan QR to Return
          </button>
          {user && <button style={S.backBtn} onClick={() => navigate(user?.role === 'admin' ? '/admin' : '/student')}>← Dashboard</button>}
        </div>
      </div>

      <div style={{ ...S.wrap, animation: 'fadeSlide 0.4s ease' }}>

        {/* STATUS BANNERS */}
        {pollingStatus === 'Pending' && (
          <div style={S.bannerPending}>
            <span style={S.bannerEmoji}>⏳</span>
            <h2 style={S.bannerTitle('#f59e0b')}>Pending Approval</h2>
            <p style={S.bannerSub}>Submitted to administration. Waiting for approval...</p>
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: '0.78rem', color: '#78716c' }}>
              <div style={{ width: 14, height: 14, border: '2px solid #f59e0b', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spinAnim 0.8s linear infinite' }} />
              Checking live status automatically...
            </div>
          </div>
        )}

        {pollingStatus === 'Approved' && (
          <div style={S.bannerApproved}>
            <span style={S.bannerEmoji}>✅</span>
            <h2 style={S.bannerTitle('#10b981')}>Approved Out Pass Successfully</h2>
            <p style={{ ...S.bannerSub, color: '#6ee7b7', fontWeight: 600 }}>Unique QR Code Generated — Show QR to scan when leaving and returning</p>
          </div>
        )}

        {pollingStatus === 'Checked-Out' && (
          <div style={S.bannerCheckedOut}>
            <span style={S.bannerEmoji}>🚪</span>
            <h2 style={S.bannerTitle('#60a5fa')}>Campus Exit Verified</h2>
            <p style={S.bannerSub}>Gate exit recorded. Scan this QR again when you return.</p>
          </div>
        )}

        {pollingStatus === 'Completed' && (
          <div style={S.bannerCompleted}>
            <span style={S.bannerEmoji}>🎉</span>
            <h2 style={S.bannerTitle('#22c55e')}>REGISTER SUCCESSFUL</h2>
            <p style={{ ...S.bannerSub, color: '#86efac', fontWeight: 600 }}>Welcome back! Re-entry confirmed.</p>
          </div>
        )}

        {pollingStatus === 'Rejected' && (
          <div style={S.bannerRejected}>
            <span style={S.bannerEmoji}>❌</span>
            <h2 style={S.bannerTitle('#f87171')}>Request Rejected</h2>
            <p style={S.bannerSub}>{passData.rejectionReason || 'Your request was rejected by administration.'}</p>
          </div>
        )}

        {/* QR Code / Pending Card */}
        <div style={{ ...S.card, textAlign: 'center' }}>
          {pollingStatus === 'Pending' || !passData.qrCodeDataUrl ? (
            <div style={{
              padding: '32px 20px',
              background: 'rgba(245, 158, 11, 0.05)',
              border: '2px dashed rgba(245, 158, 11, 0.3)',
              borderRadius: 16,
              marginBottom: 20,
            }}>
              <div style={{ fontSize: '2.8rem', marginBottom: 12 }}>⏳</div>
              <h3 style={{ margin: '0 0 8px', fontSize: '1.15rem', color: '#f59e0b', fontWeight: 700 }}>
                Pending Admin Approval
              </h3>
              <p style={{ margin: '0 auto', fontSize: '0.84rem', color: '#94a3b8', lineHeight: 1.5, maxWidth: 380 }}>
                Your request has been submitted to administration. Once the admin reviews and approves, your unique official QR code will be generated here automatically.
              </p>
            </div>
          ) : (
            <div style={S.qrBox}>
              <img src={passData.qrCodeDataUrl} alt="Gate Pass QR" style={{ width: 220, height: 220, display: 'block' }} />
              <p style={S.passId}>{passData.passId}</p>
              <div style={{ marginTop: 12 }}>
                <a
                  href={`/verify-outpass?passId=${encodeURIComponent(passData.passId)}${passData.qrToken ? `&token=${encodeURIComponent(passData.qrToken)}` : ''}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: '0.8rem',
                    color: '#34d399',
                    textDecoration: 'none',
                    fontWeight: 700,
                    padding: '8px 16px',
                    borderRadius: 10,
                    background: 'rgba(16, 185, 129, 0.12)',
                    border: '1px solid rgba(16, 185, 129, 0.35)',
                  }}
                >
                  ✅ Test Scan & Verify Out Pass (Green Tick)
                </a>
              </div>
            </div>
          )}

          {/* Student info row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16, textAlign: 'left' }}>
            <div style={{ width: 62, height: 62, borderRadius: 12, background: 'rgba(255,255,255,0.05)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', border: '1px solid rgba(255,255,255,0.15)', flexShrink: 0 }}>
              {(passData.studentDetails?.photoUrl || photoDataUrl)
                ? <img src={getSafeImageUrl(passData.studentDetails?.photoUrl || photoDataUrl)} alt="student" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                : '🎓'}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{passData.studentDetails?.fullName}</h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                {passData.studentDetails?.rollNumber} · {passData.studentDetails?.department}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: '0.74rem', color: '#64748b' }}>
                Hostel: {passData.studentDetails?.hostelBlock} – Room {passData.studentDetails?.hostelRoom}
              </p>
            </div>
          </div>

          <div style={S.detailGrid}>
            {[
              ['Destination', passData.destination],
              ['Reason', passData.reason],
              ['Leaving', formatDT(passData.expectedLeavingDateTime)],
              ['Return', formatDT(passData.expectedReturnDateTime)],
              ...(passData.actualExitTime ? [['Exit Scan', formatDT(passData.actualExitTime)]] : []),
              ...(passData.actualEntryTime ? [['Return Scan', formatDT(passData.actualEntryTime)]] : []),
            ].map(([lbl, val]) => (
              <div key={lbl}>
                <div style={S.detailLabel}>{lbl}</div>
                <div style={S.detailValue}>{val}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#94a3b8', fontSize: '0.88rem', cursor: 'pointer' }} onClick={() => window.print()}>
            🖨️ Print Pass
          </button>
          <button style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg,#2563eb,#1e40af)', border: 'none', borderRadius: 12, color: '#fff', fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer' }} onClick={() => { setPassData(null); setStep(0); setPhotoDataUrl(''); }}>
            ➕ New Application
          </button>
        </div>
      </div>
    </div>
  );

  /* ── FORM VIEW ── */
  return (
    <div style={S.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @keyframes spinAnim { to{transform:rotate(360deg)} }
        @keyframes fadeSlide { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        input:focus, select:focus, textarea:focus {
          border-color: #3b82f6 !important;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.18) !important;
          outline: none;
        }
        input[type="datetime-local"]::-webkit-calendar-picker-indicator { filter: invert(1); opacity: 0.5; }
        .photo-box:hover { border-color: rgba(59,130,246,0.6) !important; background: rgba(37,99,235,0.08) !important; }
        .cta-btn:hover { transform: translateY(-1px); box-shadow: 0 10px 30px rgba(37,99,235,0.6) !important; }
        .cta-btn:active { transform: translateY(0); }
      `}</style>

      {/* Sticky Header */}
      <div style={S.heroBar}>
        <div style={S.heroLeft}>
          <div style={S.heroIcon}>🎓</div>
          <div>
            <p style={S.heroTitle}>SmartCampus Out Pass</p>
            <p style={S.heroSub}>Official Student Leaving Portal</p>
          </div>
        </div>
        {user && <button style={S.backBtn} onClick={() => navigate(user?.role === 'admin' ? '/admin' : '/student')}>← Back</button>}
      </div>

      <div style={{ ...S.wrap, animation: 'fadeSlide 0.35s ease' }}>

        {/* Progress Bar */}
        <div style={S.stepBar}>
          {STEPS.map((label, i) => (
            <React.Fragment key={i}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={S.stepDot(step === i, step > i)}>
                  {step > i ? '✓' : i + 1}
                </div>
                <span style={S.stepLabel(step === i)}>{label}</span>
              </div>
              {i < STEPS.length - 1 && <div style={S.stepLine(step > i)} />}
            </React.Fragment>
          ))}
        </div>

        {/* Error Banner */}
        {error && <div style={S.error}>⚠️ {error}</div>}

        <form onSubmit={handleSubmit}>

          {/* ══ STEP 0: PHOTO ══ */}
          {step === 0 && (
            <div style={{ animation: 'fadeSlide 0.3s ease' }}>
              <div style={S.card}>
                <div style={S.sectionTitle}>📸 Student Photograph</div>
                <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: '#94a3b8' }}>
                  A clear face photo is required for security verification at the campus gates.
                </p>

                {/* Direct Front Camera Input */}
                <input ref={fileInputRef} type="file" accept="image/*" capture="user" style={{ display: 'none' }} onChange={handlePhotoCapture} />
                {/* Gallery / File Picker Input */}
                <input ref={galleryInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoCapture} />
                <canvas ref={canvasRef} style={{ display: 'none' }} />

                {/* Live camera preview */}
                {cameraActive && (
                  <div style={S.cameraBox}>
                    <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', maxHeight: 300, objectFit: 'cover', display: 'block' }} />
                    <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 10 }}>
                      <button type="button" onClick={takeSnapshot} style={{ padding: '10px 20px', background: '#2563eb', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(37,99,235,0.4)' }}>
                        📸 Capture
                      </button>
                      <button type="button" onClick={stopLiveCamera} style={{ padding: '10px 16px', background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10, color: '#94a3b8', cursor: 'pointer', fontSize: '0.85rem' }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {cameraError && <div style={{ ...S.error, marginBottom: 12 }}>{cameraError}</div>}

                {/* Photo display area */}
                <div
                  className="photo-box"
                  style={{
                    ...S.photoBox,
                    borderColor: photoDataUrl ? 'rgba(34,197,94,0.6)' : 'rgba(59,130,246,0.3)',
                    background: photoDataUrl ? 'rgba(34,197,94,0.06)' : 'rgba(37,99,235,0.05)',
                  }}
                  onClick={() => !cameraActive && fileInputRef.current?.click()}
                >
                  <div style={{
                    ...S.photoCircle,
                    borderColor: photoDataUrl ? '#22c55e' : 'rgba(59,130,246,0.4)',
                    boxShadow: photoDataUrl ? '0 0 24px rgba(34,197,94,0.35)' : '0 0 24px rgba(37,99,235,0.25)',
                  }}>
                    {photoLoading ? (
                      <div style={{ width: 36, height: 36, border: '3px solid #2563eb', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spinAnim 0.8s linear infinite' }} />
                    ) : photoDataUrl ? (
                      <img src={getSafeImageUrl(photoDataUrl)} alt="Student" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      '📷'
                    )}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.98rem', color: photoDataUrl ? '#22c55e' : '#93c5fd', marginBottom: 4 }}>
                      {photoLoading ? 'Processing Photo...' : photoDataUrl ? '✓ Photo Ready & Verified' : 'Tap to Take Your Photo'}
                    </div>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>
                      {photoDataUrl ? 'This photo will display on your Out Pass & security verification' : 'Tap here or use the buttons below to open your camera'}
                    </p>
                  </div>
                </div>

                {/* Camera buttons */}
                <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }} onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{ flex: 1, minWidth: 120, padding: '11px', background: 'linear-gradient(135deg,#2563eb,#1e40af)', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  >
                    📱 Phone Camera
                  </button>
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    style={{ flex: 1, minWidth: 120, padding: '11px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, color: '#e2e8f0', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  >
                    📁 Upload File
                  </button>
                  <button
                    type="button"
                    onClick={startLiveCamera}
                    style={{ flex: 1, minWidth: 100, padding: '11px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#94a3b8', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                  >
                    🎥 Live Webcam
                  </button>
                </div>

                {photoDataUrl && (
                  <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      style={{ flex: 1, padding: '8px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 8, color: '#93c5fd', fontSize: '0.78rem', cursor: 'pointer' }}
                    >
                      🔄 Retake Selfie
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhotoDataUrl('')}
                      style={{ flex: 1, padding: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#f87171', fontSize: '0.78rem', cursor: 'pointer' }}
                    >
                      🗑️ Remove Photo
                    </button>
                  </div>
                )}
              </div>

              <button type="button" className="cta-btn" style={S.submitBtn} onClick={handleNext}>
                Continue — Enter Details →
              </button>
            </div>
          )}

          {/* ══ STEP 1: STUDENT DETAILS ══ */}
          {step === 1 && (
            <div style={{ animation: 'fadeSlide 0.3s ease' }}>
              {/* Photo attached indicator */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: photoDataUrl ? 'rgba(34,197,94,0.1)' : 'rgba(234,179,8,0.1)', border: `1px solid ${photoDataUrl ? 'rgba(34,197,94,0.3)' : 'rgba(234,179,8,0.3)'}`, borderRadius: 14, padding: '10px 14px', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, overflow: 'hidden', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${photoDataUrl ? '#22c55e' : '#eab308'}` }}>
                    {photoDataUrl ? (
                      <img src={getSafeImageUrl(photoDataUrl)} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      '📷'
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 700, color: photoDataUrl ? '#4ade80' : '#fde047' }}>
                      {photoDataUrl ? '✓ Student Photo Attached' : '⚠️ No Photo Attached'}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                      {photoDataUrl ? 'Verified & ready for Out Pass' : 'Campus gate verification requires face photo'}
                    </div>
                  </div>
                </div>
                <button type="button" onClick={() => setStep(0)} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', color: '#93c5fd', borderRadius: 8, padding: '6px 12px', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600 }}>
                  {photoDataUrl ? 'Change' : '+ Add'}
                </button>
              </div>

              <div style={S.card}>
                <div style={S.sectionTitle}>👤 Personal Information</div>

                <div style={S.grid2}>
                  <div style={S.formGroup}>
                    <label style={S.label}>Full Name *</label>
                    <input style={S.input} type="text" placeholder="e.g. Rahul Sharma" value={formData.fullName} onChange={f('fullName')} required />
                  </div>
                  <div style={S.formGroup}>
                    <label style={S.label}>Roll Number *</label>
                    <input style={S.input} type="text" placeholder="e.g. 21CS101" value={formData.rollNumber} onChange={f('rollNumber')} required />
                  </div>
                </div>

                <div style={S.grid2}>
                  <div style={S.formGroup}>
                    <label style={S.label}>Department *</label>
                    <input style={S.input} type="text" placeholder="e.g. CSE" value={formData.department} onChange={f('department')} required />
                  </div>
                  <div style={S.formGroup}>
                    <label style={S.label}>Year *</label>
                    <select style={S.select} value={formData.year} onChange={f('year')} required>
                      <option value="1">1st Year</option>
                      <option value="2">2nd Year</option>
                      <option value="3">3rd Year</option>
                      <option value="4">4th Year</option>
                    </select>
                  </div>
                </div>

                <div style={S.formGroup}>
                  <label style={S.label}>Phone Number *</label>
                  <input style={S.input} type="tel" placeholder="e.g. 9876543210" value={formData.phone} onChange={f('phone')} required />
                </div>
              </div>

              <div style={S.card}>
                <div style={S.sectionTitle}>🏠 Hostel Information</div>

                <div style={S.grid2}>
                  <div style={S.formGroup}>
                    <label style={S.label}>Hostel Block *</label>
                    <input style={S.input} type="text" placeholder="e.g. Block A" value={formData.hostelBlock} onChange={f('hostelBlock')} required />
                  </div>
                  <div style={S.formGroup}>
                    <label style={S.label}>Room Number *</label>
                    <input style={S.input} type="text" placeholder="e.g. 304" value={formData.hostelRoom} onChange={f('hostelRoom')} required />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => setStep(0)} style={{ flex: 0.4, padding: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, color: '#94a3b8', fontSize: '0.9rem', cursor: 'pointer' }}>
                  ← Back
                </button>
                <button type="button" className="cta-btn" style={{ ...S.submitBtn, flex: 1, marginTop: 0 }} onClick={handleNext}>
                  Continue — Travel Info →
                </button>
              </div>
            </div>
          )}

          {/* ══ STEP 2: TRAVEL INFO ══ */}
          {step === 2 && (
            <div style={{ animation: 'fadeSlide 0.3s ease' }}>
              {/* Photo attached indicator */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: photoDataUrl ? 'rgba(34,197,94,0.1)' : 'rgba(234,179,8,0.1)', border: `1px solid ${photoDataUrl ? 'rgba(34,197,94,0.3)' : 'rgba(234,179,8,0.3)'}`, borderRadius: 14, padding: '10px 14px', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 10, overflow: 'hidden', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${photoDataUrl ? '#22c55e' : '#eab308'}` }}>
                    {photoDataUrl ? (
                      <img src={getSafeImageUrl(photoDataUrl)} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      '📷'
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 700, color: photoDataUrl ? '#4ade80' : '#fde047' }}>
                      {photoDataUrl ? '✓ Student Photo Attached' : '⚠️ No Photo Attached'}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                      {photoDataUrl ? 'Ready to submit with your Out Pass' : 'Campus gate verification requires face photo'}
                    </div>
                  </div>
                </div>
                <button type="button" onClick={() => setStep(0)} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', color: '#93c5fd', borderRadius: 8, padding: '6px 12px', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600 }}>
                  {photoDataUrl ? 'Change' : '+ Add'}
                </button>
              </div>

              <div style={S.card}>
                <div style={S.sectionTitle}>✈️ Travel Information</div>

                <div style={S.formGroup}>
                  <label style={S.label}>Destination *</label>
                  <input style={S.input} type="text" placeholder="e.g. Home (Coimbatore), City Hospital..." value={formData.destination} onChange={f('destination')} required />
                </div>

                <div style={S.formGroup}>
                  <label style={S.label}>Reason for Leaving *</label>
                  <div style={S.chipRow}>
                    {REASONS.map((r) => (
                      <span key={r} style={S.chip(formData.reason === r)} onClick={() => setFormData({ ...formData, reason: r })}>
                        {r}
                      </span>
                    ))}
                  </div>
                  <textarea style={S.textarea} rows={2} placeholder="Add specific details..." value={formData.reason} onChange={f('reason')} required />
                </div>
              </div>

              <div style={S.card}>
                <div style={S.sectionTitle}>🕐 Schedule</div>

                <div style={S.formGroup}>
                  <label style={S.label}>Expected Leaving Date & Time *</label>
                  <input style={S.input} type="datetime-local" value={formData.expectedLeavingDateTime} onChange={f('expectedLeavingDateTime')} required />
                </div>
                <div style={S.formGroup}>
                  <label style={S.label}>Expected Return Date & Time *</label>
                  <input style={S.input} type="datetime-local" value={formData.expectedReturnDateTime} onChange={f('expectedReturnDateTime')} required />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => setStep(1)} style={{ flex: 0.4, padding: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, color: '#94a3b8', fontSize: '0.9rem', cursor: 'pointer' }}>
                  ← Back
                </button>
                <button type="submit" className="cta-btn" disabled={loading} style={{ ...S.submitBtn, flex: 1, marginTop: 0, opacity: loading ? 0.7 : 1 }}>
                  {loading
                    ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                        <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.5)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spinAnim 0.8s linear infinite' }} />
                        Submitting...
                      </span>
                    : '🚀 Get Out Pass'}
                </button>
              </div>
            </div>
          )}

        </form>

        {/* Footer */}
        <p style={{ textAlign: 'center', fontSize: '0.72rem', color: '#334155', marginTop: 24 }}>
          🔒 SmartCampus · Secured Student Exit Management System
        </p>
      </div>
    </div>
  );
}
