import React, { useState, useEffect, useRef } from 'react';
import { gatePassAPI } from '../../services/api';
import { navigate } from '../../App';
import { getSafeImageUrl } from '../../utils/imageUrl';

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

const getNowLocalDatetime = () => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const year = now.getFullYear();
  const month = pad(now.getMonth() + 1);
  const day = pad(now.getDate());
  const hours = pad(now.getHours());
  const minutes = pad(now.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

export default function VerifyOutPassPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { isApproved: bool, status: string, message: string, pass: object }
  const [scannerActive, setScannerActive] = useState(false);
  const [scannerError, setScannerError] = useState('');
  const [willReturn, setWillReturn] = useState('YES');
  const [returnDateTime, setReturnDateTime] = useState(getNowLocalDatetime());
  const [updatingReturn, setUpdatingReturn] = useState(false);
  const [returnMessage, setReturnMessage] = useState(null);
  const [returnUpdated, setReturnUpdated] = useState(false);
  const html5QrcodeRef = useRef(null);

  const handleUpdateReturn = async () => {
    if (!result?.pass) return;
    setUpdatingReturn(true);
    setReturnMessage(null);
    try {
      const res = await gatePassAPI.recordReturn({
        passId: result.pass.passId,
        token: result.pass.qrToken,
        returnStatus: willReturn,
        returnDateTime: willReturn === 'YES' ? returnDateTime : undefined,
      });

      if (res.data?.success) {
        if (willReturn === 'YES') {
          setReturnUpdated(true);
          const updatedPass = res.data.gatePass || {
            ...result.pass,
            actualEntryTime: new Date(returnDateTime),
            status: 'Completed',
          };
          setResult((prev) => ({
            ...prev,
            pass: updatedPass,
          }));
          setReturnMessage({
            type: 'success',
            text: '✓ Return recorded successfully! Details added to your student gate passes history.',
          });
        } else {
          setReturnMessage({
            type: 'info',
            text: 'Status updated: Student is not returning at this time.',
          });
        }
      } else {
        setReturnMessage({
          type: 'error',
          text: res.data?.message || 'Failed to update return status.',
        });
      }
    } catch (err) {
      setReturnMessage({
        type: 'error',
        text: err.response?.data?.message || err.message || 'Error updating return status.',
      });
    } finally {
      setUpdatingReturn(false);
    }
  };

  // Trigger confetti when approved
  const triggerConfetti = async () => {
    try {
      const confetti = (await import('canvas-confetti')).default;
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#22c55e', '#10b981', '#3b82f6', '#38bdf8'],
      });
    } catch (e) {}
  };

  const handleVerifyPayload = async ({ passId, token, rawText }) => {
    setLoading(true);
    setScannerError('');
    try {
      const res = await gatePassAPI.verifyQR({
        passId: passId || '',
        token: token || rawText || '',
        actionType: 'STATUS_CHECK',
      });

      const data = res.data;
      const isApproved = !!data.isApproved;

      setResult({
        isApproved,
        title: isApproved ? 'Out Pass Got Successfully' : 'Not Get Outpass',
        message: data.message || (isApproved ? 'Out Pass Got Successfully' : 'Not Get Outpass'),
        verificationStatus: data.verificationStatus || (isApproved ? 'Out Pass Got Successfully' : 'Not Get Outpass'),
        pass: data.gatePass || null,
        displayColor: isApproved ? 'green' : 'red',
      });

      if (isApproved) {
        triggerConfetti();
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Not Get Outpass — Pass validation failed.';
      setResult({
        isApproved: false,
        title: 'Not Get Outpass',
        message: msg,
        verificationStatus: 'Not Get Outpass',
        pass: null,
        displayColor: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  // 1. Check URL parameters on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const passId = params.get('passId');
    const token = params.get('token');

    if (passId || token) {
      handleVerifyPayload({ passId, token });
    }
  }, []);

  // 2. Camera Scanner Controls
  const startScanner = async () => {
    setScannerActive(true);
    setScannerError('');
    setResult(null);

    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode('outpass-qr-reader');
      html5QrcodeRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        async (decodedText) => {
          // Detected QR Code! Stop scanner and verify
          try {
            await scanner.stop();
          } catch (e) {}
          html5QrcodeRef.current = null;
          setScannerActive(false);

          // Extract token & passId from decoded text if URL or JSON
          let extractedToken = decodedText;
          let extractedPassId = '';

          if (decodedText.includes('passId=') || decodedText.includes('token=')) {
            try {
              const url = new URL(decodedText);
              extractedPassId = url.searchParams.get('passId') || '';
              extractedToken = url.searchParams.get('token') || '';
            } catch (e) {
              const pMatch = decodedText.match(/passId=([a-zA-Z0-9_\-]+)/);
              const tMatch = decodedText.match(/token=([a-zA-Z0-9_\-]+)/);
              if (pMatch) extractedPassId = pMatch[1];
              if (tMatch) extractedToken = tMatch[1];
            }
          } else if (decodedText.startsWith('{')) {
            try {
              const parsed = JSON.parse(decodedText);
              if (parsed.passId) extractedPassId = parsed.passId;
              if (parsed.token) extractedToken = parsed.token;
            } catch (e) {}
          }

          handleVerifyPayload({ passId: extractedPassId, token: extractedToken, rawText: decodedText });
        },
        () => {}
      );
    } catch (err) {
      console.error('Camera Scanner Error:', err);
      setScannerError('Could not access camera. Please allow camera permissions or enter pass details manually.');
      setScannerActive(false);
    }
  };

  const stopScanner = async () => {
    if (html5QrcodeRef.current) {
      try {
        await html5QrcodeRef.current.stop();
      } catch (e) {}
      html5QrcodeRef.current = null;
    }
    setScannerActive(false);
  };

  useEffect(() => {
    return () => {
      if (html5QrcodeRef.current) {
        html5QrcodeRef.current.stop().catch(() => {});
      }
    };
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at top, #0d1a33 0%, #060b14 65%, #02050a 100%)',
      color: '#f8fafc',
      padding: '24px 16px 60px',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    }}>
      <style>{`
        @keyframes popIn {
          0% { transform: scale(0.6); opacity: 0; }
          70% { transform: scale(1.08); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes pulseGlowGreen {
          0%, 100% { box-shadow: 0 0 25px rgba(34, 197, 94, 0.45); }
          50% { box-shadow: 0 0 55px rgba(34, 197, 94, 0.75); }
        }
        @keyframes pulseGlowRed {
          0%, 100% { box-shadow: 0 0 25px rgba(239, 68, 68, 0.45); }
          50% { box-shadow: 0 0 55px rgba(239, 68, 68, 0.75); }
        }
        @keyframes floatAnim {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
      `}</style>

      {/* Top Header only shown when not showing verified card */}
      {!result && (
        <header style={{
          maxWidth: 540,
          margin: '0 auto 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 18px',
          background: 'rgba(15, 23, 42, 0.75)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 16,
          backdropFilter: 'blur(10px)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem',
            }}>
              🛡️
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', letterSpacing: '-0.01em' }}>SmartCampus</div>
              <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Gate Pass Verification System</div>
            </div>
          </div>

          <button
            className="btn btn-ghost btn-sm"
            onClick={() => navigate('/')}
            style={{ fontSize: '0.8rem', padding: '6px 12px' }}
          >
            Home
          </button>
        </header>
      )}

      <main style={{ maxWidth: 520, margin: '0 auto' }}>
        {/* Loading State */}
        {loading && (
          <div style={{
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 20,
            padding: '50px 24px',
            textAlign: 'center',
          }}>
            <div style={{
              width: 50,
              height: 50,
              border: '4px solid rgba(59, 130, 246, 0.25)',
              borderTopColor: '#3b82f6',
              borderRadius: '50%',
              margin: '0 auto 18px',
              animation: 'spin 0.8s linear infinite',
            }} />
            <h3 style={{ fontSize: '1.2rem', margin: '0 0 6px' }}>Verifying Gate Pass...</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>
              Checking real-time admin approval and security credentials...
            </p>
          </div>
        )}

        {/* VERIFICATION RESULT: APPROVED (GREEN TICK) - EXACT SCREENSHOT DESIGN */}
        {!loading && result && result.isApproved && (
          <div style={{
            background: 'radial-gradient(ellipse at 50% 12%, #05261d 0%, #031510 55%, #010a08 100%)',
            border: '2px solid #0d4a3c',
            borderRadius: 24,
            padding: '38px 20px 30px',
            textAlign: 'center',
            boxShadow: '0 16px 50px rgba(0, 0, 0, 0.75)',
            animation: 'popIn 0.35s ease',
          }}>
            {/* Green Tick Circle */}
            <div style={{
              width: 78,
              height: 78,
              borderRadius: '50%',
              background: '#22c55e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 0 32px rgba(34, 197, 94, 0.45)',
              animation: 'pulseGlowGreen 2.5s infinite',
            }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>

            <div style={{
              background: 'rgba(34, 197, 94, 0.12)',
              border: '1px solid rgba(34, 197, 94, 0.45)',
              color: '#22c55e',
              borderRadius: 999,
              padding: '5px 16px',
              fontSize: '0.74rem',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              display: 'inline-block',
              margin: '0 auto 14px',
            }}>
              OFFICIAL GATE PASS VERIFIED
            </div>

            {/* Exactly: Out Pass Got Successfully */}
            <h1 style={{
              fontSize: '1.9rem',
              fontWeight: 900,
              margin: '0 0 8px',
              color: '#22c55e',
              letterSpacing: '-0.02em',
            }}>
              Out Pass Got Successfully
            </h1>

            <p style={{ color: '#cbd5e1', fontSize: '0.92rem', margin: '0 0 22px', lineHeight: 1.4 }}>
              Student departure and gate entry are officially authorized.
            </p>

            {/* Student Details Card */}
            {result.pass && (
              <div style={{
                background: '#091728',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 18,
                padding: '20px 22px',
                textAlign: 'left',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 58,
                    height: 58,
                    borderRadius: 14,
                    overflow: 'hidden',
                    background: 'var(--surface-3)',
                    border: '2px solid #22c55e',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.6rem',
                    flexShrink: 0,
                    boxShadow: '0 0 12px rgba(34, 197, 94, 0.35)',
                  }}>
                    {result.pass.studentDetails?.photoUrl ? (
                      <img
                        src={getSafeImageUrl(result.pass.studentDetails.photoUrl)}
                        alt="Student"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      '🎓'
                    )}
                  </div>
                  <div>
                    <h3 style={{ margin: '0 0 4px', fontSize: '1.35rem', fontWeight: 800, color: '#ffffff' }}>
                      {result.pass.studentDetails?.fullName || 'Student'}
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.84rem', color: '#94a3b8' }}>
                      Roll No: <strong style={{ color: '#ffffff', fontWeight: 700 }}>{result.pass.studentDetails?.rollNumber || 'N/A'}</strong> · {result.pass.studentDetails?.department || ''}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px 16px', marginTop: 20 }}>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.74rem', marginBottom: 2 }}>Pass ID</span>
                    <strong style={{ color: '#60a5fa', fontSize: '0.94rem', fontWeight: 700 }}>{result.pass.passId}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.74rem', marginBottom: 2 }}>Status</span>
                    <strong style={{ color: '#22c55e', fontSize: '0.94rem', fontWeight: 800 }}>● APPROVED</strong>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.74rem', marginBottom: 2 }}>Destination</span>
                    <strong style={{ color: '#ffffff', fontSize: '0.94rem', fontWeight: 700 }}>{result.pass.destination}</strong>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.74rem', marginBottom: 2 }}>Reason</span>
                    <span style={{ color: '#cbd5e1', fontSize: '0.88rem' }}>{result.pass.reason}</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.74rem', marginBottom: 2 }}>Expected Leaving</span>
                    <span style={{ color: '#cbd5e1', fontSize: '0.84rem' }}>{formatDT(result.pass.expectedLeavingDateTime)}</span>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', display: 'block', fontSize: '0.74rem', marginBottom: 2 }}>Expected Return</span>
                    <span style={{ color: '#cbd5e1', fontSize: '0.84rem' }}>{formatDT(result.pass.expectedReturnDateTime)}</span>
                  </div>
                  {result.pass.actualEntryTime && (
                    <div style={{ gridColumn: 'span 2' }}>
                      <span style={{ color: '#64748b', display: 'block', fontSize: '0.74rem', marginBottom: 2 }}>Actual Return</span>
                      <strong style={{ color: '#4ade80', fontSize: '0.94rem' }}>{formatDT(result.pass.actualEntryTime)}</strong>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Student Return Section: YES / NO (Green / Red) & Date Time & Update */}
            {result.pass && (
              <div style={{
                background: '#091728',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 18,
                padding: '20px 22px',
                textAlign: 'left',
                marginTop: 18,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.01em' }}>
                    Student Will Return?
                  </span>
                  {returnUpdated && (
                    <span style={{
                      fontSize: '0.74rem',
                      color: '#22c55e',
                      background: 'rgba(34, 197, 94, 0.15)',
                      border: '1px solid rgba(34, 197, 94, 0.4)',
                      padding: '3px 10px',
                      borderRadius: 999,
                      fontWeight: 700,
                    }}>
                      ✓ Return Recorded
                    </span>
                  )}
                </div>

                {/* YES (Green) & NO (Red) Option Buttons */}
                <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                  <button
                    type="button"
                    onClick={() => { setWillReturn('YES'); setReturnMessage(null); }}
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      borderRadius: 12,
                      fontSize: '0.95rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      transition: 'all 0.2s ease',
                      background: willReturn === 'YES' ? '#22c55e' : 'rgba(34, 197, 94, 0.12)',
                      color: willReturn === 'YES' ? '#ffffff' : '#4ade80',
                      border: willReturn === 'YES' ? '2px solid #22c55e' : '1px solid rgba(34, 197, 94, 0.35)',
                      boxShadow: willReturn === 'YES' ? '0 0 20px rgba(34, 197, 94, 0.45)' : 'none',
                    }}
                  >
                    ✓ YES
                  </button>

                  <button
                    type="button"
                    onClick={() => { setWillReturn('NO'); setReturnMessage(null); }}
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      borderRadius: 12,
                      fontSize: '0.95rem',
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      transition: 'all 0.2s ease',
                      background: willReturn === 'NO' ? '#ef4444' : 'rgba(239, 68, 68, 0.12)',
                      color: willReturn === 'NO' ? '#ffffff' : '#f87171',
                      border: willReturn === 'NO' ? '2px solid #ef4444' : '1px solid rgba(239, 68, 68, 0.35)',
                      boxShadow: willReturn === 'NO' ? '0 0 20px rgba(239, 68, 68, 0.45)' : 'none',
                    }}
                  >
                    ✕ NO
                  </button>
                </div>

                {/* Return Date & Time Input (When YES is chosen) */}
                {willReturn === 'YES' && (
                  <div style={{ marginBottom: 16 }}>
                    <label style={{
                      display: 'block',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: '#94a3b8',
                      marginBottom: 6,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}>
                      Return Date & Time *
                    </label>
                    <input
                      type="datetime-local"
                      value={returnDateTime}
                      onChange={(e) => setReturnDateTime(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 14px',
                        background: 'rgba(15, 23, 42, 0.9)',
                        border: '1px solid rgba(255, 255, 255, 0.18)',
                        borderRadius: 10,
                        color: '#ffffff',
                        fontSize: '0.92rem',
                        fontFamily: 'inherit',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                    <p style={{ margin: '6px 0 0', fontSize: '0.74rem', color: '#64748b' }}>
                      Set the date & time the student returned to campus.
                    </p>
                  </div>
                )}

                {/* Update Button */}
                <button
                  type="button"
                  disabled={updatingReturn}
                  onClick={handleUpdateReturn}
                  style={{
                    width: '100%',
                    padding: '13px',
                    borderRadius: 12,
                    fontSize: '0.95rem',
                    fontWeight: 800,
                    cursor: updatingReturn ? 'not-allowed' : 'pointer',
                    border: 'none',
                    background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                    color: '#ffffff',
                    boxShadow: '0 4px 18px rgba(37, 99, 235, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  {updatingReturn ? (
                    <>
                      <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                      Updating...
                    </>
                  ) : (
                    'Update'
                  )}
                </button>

                {returnMessage && (
                  <div style={{
                    marginTop: 12,
                    padding: '10px 12px',
                    borderRadius: 8,
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    textAlign: 'center',
                    background: returnMessage.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                    border: returnMessage.type === 'error' ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid rgba(34, 197, 94, 0.35)',
                    color: returnMessage.type === 'error' ? '#fca5a5' : '#86efac',
                  }}>
                    {returnMessage.text}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* VERIFICATION RESULT: REJECTED / INVALID (RED TICK) */}
        {!loading && result && !result.isApproved && (
          <div style={{
            background: 'radial-gradient(ellipse at 50% 12%, #260505 0%, #150303 55%, #0a0101 100%)',
            border: '2px solid #5a1a1a',
            borderRadius: 24,
            padding: '38px 20px 30px',
            textAlign: 'center',
            boxShadow: '0 16px 50px rgba(0, 0, 0, 0.75)',
            animation: 'popIn 0.35s ease',
          }}>
            {/* Red Circle with Cross/Tick */}
            <div style={{
              width: 78,
              height: 78,
              borderRadius: '50%',
              background: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 0 32px rgba(239, 68, 68, 0.5)',
              animation: 'pulseGlowRed 2.5s infinite',
            }}>
              <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </div>

            <div style={{
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.45)',
              color: '#ef4444',
              borderRadius: 999,
              padding: '5px 16px',
              fontSize: '0.74rem',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              display: 'inline-block',
              margin: '0 auto 14px',
            }}>
              UNAUTHORIZED / NOT APPROVED
            </div>

            {/* Exactly: Not Get Outpass */}
            <h1 style={{
              fontSize: '1.9rem',
              fontWeight: 900,
              margin: '0 0 8px',
              color: '#ef4444',
              letterSpacing: '-0.02em',
            }}>
              Not Get Outpass
            </h1>

            <p style={{
              color: '#fca5a5',
              fontSize: '0.92rem',
              margin: '0 auto 24px',
              maxWidth: 380,
              lineHeight: 1.5,
              background: 'rgba(239, 68, 68, 0.1)',
              padding: '10px 14px',
              borderRadius: 10,
              border: '1px solid rgba(239, 68, 68, 0.25)',
            }}>
              {result.message || 'This gate pass is not authorized or is still pending administration approval.'}
            </p>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                className="btn btn-primary"
                style={{ flex: 1, padding: '12px', fontWeight: 700, borderRadius: 12 }}
                onClick={startScanner}
              >
                📷 Try Scanning Again
              </button>
              <button
                className="btn btn-ghost"
                style={{ flex: 1, padding: '12px', borderRadius: 12 }}
                onClick={() => navigate('/')}
              >
                Return to Home
              </button>
            </div>
          </div>
        )}

        {/* DEFAULT / SCANNER LAUNCHER (When no result yet) */}
        {!loading && !result && (
          <div style={{
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: 22,
            padding: '32px 24px',
            textAlign: 'center',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.4)',
          }}>
            {!scannerActive ? (
              <>
                <div style={{
                  width: 72,
                  height: 72,
                  borderRadius: 20,
                  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2.2rem',
                  margin: '0 auto 18px',
                  boxShadow: '0 8px 24px rgba(37, 99, 235, 0.4)',
                  animation: 'floatAnim 3s ease-in-out infinite',
                }}>
                  📱
                </div>

                <h2 style={{ fontSize: '1.45rem', fontWeight: 800, margin: '0 0 8px' }}>
                  Scan Gate Out Pass QR
                </h2>
                <p style={{ color: '#94a3b8', fontSize: '0.88rem', margin: '0 auto 24px', maxWidth: 380, lineHeight: 1.5 }}>
                  Point your camera at the student’s Out Pass QR code (displayed on screen or phone) to verify their authorization instantly.
                </p>

                {scannerError && (
                  <div style={{
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    color: '#f87171',
                    padding: '10px 14px',
                    borderRadius: 10,
                    fontSize: '0.82rem',
                    marginBottom: 18,
                  }}>
                    {scannerError}
                  </div>
                )}

                <button
                  className="btn btn-primary"
                  style={{
                    width: '100%',
                    padding: '14px',
                    fontSize: '1rem',
                    fontWeight: 700,
                    borderRadius: 14,
                    boxShadow: '0 4px 20px rgba(37, 99, 235, 0.4)',
                  }}
                  onClick={startScanner}
                >
                  📷 Open Camera & Scan QR
                </button>
              </>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>📷 Point camera at Out Pass QR</span>
                  <button className="btn btn-ghost btn-sm" onClick={stopScanner}>✕ Cancel</button>
                </div>

                <div
                  id="outpass-qr-reader"
                  style={{
                    width: '100%',
                    borderRadius: 16,
                    overflow: 'hidden',
                    background: '#000',
                    border: '2px solid rgba(59, 130, 246, 0.5)',
                  }}
                />

                <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 12, margin: '12px 0 0' }}>
                  Hold the QR code steady inside the frame to scan automatically.
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
