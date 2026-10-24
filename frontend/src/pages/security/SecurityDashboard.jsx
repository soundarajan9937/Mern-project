import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { gatePassAPI, visitorAPI } from '../../services/api';
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

// ─── Camera QR Scanner Component ─────────────────────────────────────────────
function CameraScanner({ onScan, onCancel }) {
  const [scanStatus, setScanStatus] = useState('initializing');
  const html5QrcodeRef = useRef(null);

  useEffect(() => {
    let scanner = null;
    let isMounted = true;

    const startScanner = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (!isMounted) return;
        scanner = new Html5Qrcode('security-qr-reader');
        html5QrcodeRef.current = scanner;
        setScanStatus('ready');
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 12, qrbox: { width: 260, height: 260 } },
          (decodedText) => {
            if (isMounted) {
              setScanStatus('scanned');
              onScan(decodedText);
            }
          },
          () => {} // silent on failed frames
        );
      } catch (err) {
        console.error('QR Scanner init error:', err);
        if (isMounted) setScanStatus('error');
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      if (html5QrcodeRef.current) {
        html5QrcodeRef.current.stop().catch(() => {});
        html5QrcodeRef.current = null;
      }
    };
  }, [onScan]);

  return (
    <div style={{ textAlign: 'center' }}>
      <div
        id="security-qr-reader"
        style={{
          width: '100%',
          maxWidth: 420,
          margin: '0 auto',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          background: '#000',
        }}
      />
      {scanStatus === 'error' && (
        <div className="alert alert-error" style={{ marginTop: 14 }}>
          Camera unavailable or permission denied. Please enter the QR token or Pass ID manually below.
        </div>
      )}
      <button className="btn btn-secondary" style={{ marginTop: 14 }} onClick={onCancel}>
        ✕ Close Camera
      </button>
    </div>
  );
}

// ─── Verification Card Component ─────────────────────────────────────────────
function VerificationDisplay({ result, onReset, onAction, actionLoading }) {
  const data = result.gatePass || result.visitor;
  const isGatePass = Boolean(result.gatePass);
  const isGreen = result.displayColor === 'green' || result.isApproved;

  // Map verificationStatus / displayColor → CSS class
  const cls = isGreen ? 'verify-approved' : 'verify-invalid';

  const icon = (() => {
    const s = result.verificationStatus || '';
    if (s === 'Register Successful') return '🎉';
    if (s === 'Exit Approved') return '✅';
    if (s === 'Pending Approval') return '⏳';
    if (s === 'Rejected') return '❌';
    if (s === 'Already Completed') return '✔️';
    return isGreen ? '✅' : '🚫';
  })();

  // Big headline text
  const headline = (() => {
    const s = result.verificationStatus || '';
    if (s === 'Register Successful') return 'REGISTER SUCCESSFUL';
    if (s === 'Exit Approved') return 'GET OUT PASS APPROVED';
    if (s === 'Not Registered / Invalid') return 'NOT A VALID GET OUT PASS';
    if (s === 'Expired or Invalid QR Code') return 'NOT A VALID GET OUT PASS';
    return result.verificationStatus || 'NOT A VALID GET OUT PASS';
  })();

  return (
    <div className="card" style={{ maxWidth: 640, margin: '0 auto', animation: 'fadeIn 0.25s ease' }}>

      {/* ── Big Colour Banner ── */}
      <div
        style={{
          borderRadius: 'var(--radius-md)',
          padding: '20px 24px',
          marginBottom: 20,
          textAlign: 'center',
          background: isGreen ? 'rgba(16,185,129,0.14)' : 'rgba(239,68,68,0.12)',
          border: `2px solid ${isGreen ? 'rgba(16,185,129,0.55)' : 'rgba(239,68,68,0.45)'}`,
          boxShadow: isGreen ? '0 0 24px rgba(16,185,129,0.18)' : '0 0 24px rgba(239,68,68,0.14)',
        }}
      >
        <div style={{ fontSize: '2.4rem', marginBottom: 6 }}>{icon}</div>
        <h2 style={{ fontSize: '1.45rem', fontWeight: 900, letterSpacing: '0.02em', marginBottom: 6, color: isGreen ? 'var(--green-400)' : 'var(--red-400)' }}>
          {headline}
        </h2>
        <p style={{ fontSize: '0.9rem', margin: 0, color: 'var(--text-secondary)' }}>{result.message}</p>
      </div>

      {data && (
        <>
          <div className="profile-card" style={{ marginBottom: 20 }}>
            <div className="profile-photo" style={{ width: 90, height: 90, borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              {(data.studentDetails?.photoUrl || data.photoUrl) ? (
                <img
                  src={getSafeImageUrl(data.studentDetails?.photoUrl || data.photoUrl)}
                  alt="Identity"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span style={{ fontSize: '2.5rem' }}>{isGatePass ? '🎓' : '👤'}</span>
              )}
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: 4 }}>
                {data.studentDetails?.fullName || data.fullName}
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
                {isGatePass
                  ? `${data.studentDetails?.rollNumber} · ${data.studentDetails?.department} · Year ${data.studentDetails?.year}`
                  : `${data.phone} · ${data.relationship}`}
              </p>
              <div style={{ marginTop: 8 }}>
                <span className={`badge ${isGreen ? 'badge-approved' : 'badge-rejected'}`}>
                  {data.status}
                </span>
              </div>
            </div>
          </div>

          <div className="detail-grid" style={{ marginBottom: 20 }}>
            {isGatePass ? (
              <>
                <div className="detail-item"><span className="detail-label">Pass ID</span><code style={{ fontSize: '0.85rem', color: 'var(--blue-400)' }}>{data.passId}</code></div>
                <div className="detail-item"><span className="detail-label">Destination</span><span className="detail-value">{data.destination}</span></div>
                <div className="detail-item"><span className="detail-label">Reason</span><span className="detail-value">{data.reason}</span></div>
                <div className="detail-item"><span className="detail-label">Hostel</span><span className="detail-value">{data.studentDetails?.hostelBlock} - {data.studentDetails?.hostelRoom}</span></div>
                <div className="detail-item"><span className="detail-label">Expected Exit</span><span className="detail-value">{formatDT(data.expectedLeavingDateTime)}</span></div>
                <div className="detail-item"><span className="detail-label">Expected Return</span><span className="detail-value">{formatDT(data.expectedReturnDateTime)}</span></div>
                {data.actualExitTime && <div className="detail-item"><span className="detail-label">Actual Exit</span><span className="detail-value" style={{ color: 'var(--amber-400)' }}>{formatDT(data.actualExitTime)}</span></div>}
                {data.actualEntryTime && <div className="detail-item"><span className="detail-label">Actual Return</span><span className="detail-value" style={{ color: 'var(--green-400)', fontWeight: 700 }}>{formatDT(data.actualEntryTime)}</span></div>}
              </>
            ) : (
              <>
                <div className="detail-item"><span className="detail-label">Visitor ID</span><code style={{ fontSize: '0.85rem', color: 'var(--blue-400)' }}>{data.visitorId}</code></div>
                <div className="detail-item"><span className="detail-label">Purpose</span><span className="detail-value">{data.purpose}</span></div>
                <div className="detail-item"><span className="detail-label">Visiting Person</span><span className="detail-value">{data.meetingPersonName}</span></div>
                <div className="detail-item"><span className="detail-label">Meeting Dept/Place</span><span className="detail-value">{data.place}</span></div>
                <div className="detail-item"><span className="detail-label">Contact Person Phone</span><span className="detail-value">{data.meetingPersonContact}</span></div>
                {data.studentRollNumber && <div className="detail-item"><span className="detail-label">Student Roll No</span><span className="detail-value">{data.studentRollNumber}</span></div>}
                {data.checkedInAt && <div className="detail-item"><span className="detail-label">Checked-In</span><span className="detail-value" style={{ color: 'var(--green-400)' }}>{formatDT(data.checkedInAt)}</span></div>}
                {data.checkedOutAt && <div className="detail-item"><span className="detail-label">Checked-Out</span><span className="detail-value" style={{ color: 'var(--blue-400)' }}>{formatDT(data.checkedOutAt)}</span></div>}
              </>
            )}
          </div>
        </>
      )}

      <button className="btn btn-ghost" style={{ width: '100%' }} onClick={onReset}>
        ← Back to Scanner
      </button>
    </div>
  );
}


// ─── Main Security Dashboard Component ───────────────────────────────────────
export default function SecurityDashboard() {
  const [activeTab, setActiveTab] = useState('scan');
  const [scanType, setScanType] = useState('gatepass'); // 'gatepass' | 'visitor'
  const [cameraActive, setCameraActive] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Search states
  const [searchStudentQuery, setSearchStudentQuery] = useState('');
  const [searchedStudents, setSearchedStudents] = useState([]);
  const [searchingStudent, setSearchingStudent] = useState(false);

  const [searchVisitorQuery, setSearchVisitorQuery] = useState('');
  const [searchedVisitors, setSearchedVisitors] = useState([]);
  const [searchingVisitor, setSearchingVisitor] = useState(false);

  // Sync tab with URL
  useEffect(() => {
    const p = window.location.pathname;
    if (p === '/security' || p === '/security/') setActiveTab('scan');
    else if (p.includes('/security/scan')) setActiveTab('scan');
    else if (p.includes('/security/search-student')) setActiveTab('search-student');
    else if (p.includes('/security/search-visitor')) setActiveTab('search-visitor');
  }, []);

  useEffect(() => {
    const onPop = () => {
      const p = window.location.pathname;
      if (p === '/security' || p === '/security/') setActiveTab('scan');
      else if (p.includes('/security/scan')) setActiveTab('scan');
      else if (p.includes('/security/search-student')) setActiveTab('search-student');
      else if (p.includes('/security/search-visitor')) setActiveTab('search-visitor');
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const handleVerify = async (val, action = 'STATUS_CHECK') => {
    const raw = (val || tokenInput).trim();
    if (!raw) {
      setErrorMsg('Please enter a valid QR token or reference ID');
      return;
    }
    setErrorMsg('');
    setVerifying(true);
    try {
      let res;
      if (scanType === 'gatepass') {
        // Pass the raw scanned text directly — backend handles JSON payloads, URLs, passIds, and plain tokens
        res = await gatePassAPI.verifyQR({
          token: raw,
          actionType: action,
        });
      } else {
        const isVisId = raw.startsWith('VIS-');
        res = await visitorAPI.verifyQR({
          token: isVisId ? undefined : raw,
          visitorId: isVisId ? raw : undefined,
          actionType: action,
        });
      }
      setVerifyResult(res.data);
      setCameraActive(false);
    } catch (err) {
      const errData = err?.response?.data;
      if (errData && !errData.success) {
        // Show the backend error message as a "failed" result card so user sees the red banner
        setVerifyResult({
          success: false,
          isApproved: false,
          displayColor: 'red',
          verificationStatus: errData.verificationStatus || 'Not Registered / Invalid',
          message: errData.message || 'Verification failed',
          gatePass: null,
          visitor: null,
        });
        setCameraActive(false);
      } else {
        setErrorMsg(err?.message || 'Verification failed');
      }
    } finally {
      setVerifying(false);
    }
  };


  const handleAction = async (actionType) => {
    setActionLoading(true);
    try {
      const currentToken = tokenInput || verifyResult?.gatePass?.qrToken || verifyResult?.visitor?.qrToken || verifyResult?.gatePass?.passId || verifyResult?.visitor?.visitorId;
      await handleVerify(currentToken, actionType);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSearchStudent = async (e) => {
    e?.preventDefault();
    if (!searchStudentQuery.trim()) return;
    setSearchingStudent(true);
    try {
      const res = await gatePassAPI.searchStudent(searchStudentQuery.trim());
      setSearchedStudents(res.data.students || []);
    } catch (err) {
      console.error('Search student failed:', err);
    } finally {
      setSearchingStudent(false);
    }
  };

  const handleSearchVisitor = async (e) => {
    e?.preventDefault();
    if (!searchVisitorQuery.trim()) return;
    setSearchingVisitor(true);
    try {
      const res = await visitorAPI.search(searchVisitorQuery.trim());
      setSearchedVisitors(res.data.visitors || []);
    } catch (err) {
      console.error('Search visitor failed:', err);
    } finally {
      setSearchingVisitor(false);
    }
  };

  return (
    <DashboardLayout title="Security Gate Terminal" currentPage={activeTab}>
      {/* Tab Switcher */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        <button
          className={`btn ${activeTab === 'scan' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => { setActiveTab('scan'); navigate('/security/scan'); }}
        >
          📱 Fast QR Verification
        </button>
        <button
          className={`btn ${activeTab === 'search-student' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => { setActiveTab('search-student'); navigate('/security/search-student'); }}
        >
          🎓 Search Student
        </button>
        <button
          className={`btn ${activeTab === 'search-visitor' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => { setActiveTab('search-visitor'); navigate('/security/search-visitor'); }}
        >
          👥 Search Visitor
        </button>
      </div>

      {/* QR SCANNER TAB */}
      {activeTab === 'scan' && (
        <div>
          {verifyResult ? (
            <VerificationDisplay
              result={verifyResult}
              onReset={() => { setVerifyResult(null); setTokenInput(''); }}
              onAction={handleAction}
              actionLoading={actionLoading}
            />
          ) : (
            <div style={{ maxWidth: 580, margin: '0 auto' }}>
              <div className="card">
                <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                  <button
                    className={`btn ${scanType === 'gatepass' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1 }}
                    onClick={() => setScanType('gatepass')}
                  >
                    🎫 Gate Pass (Student)
                  </button>
                  <button
                    className={`btn ${scanType === 'visitor' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1 }}
                    onClick={() => setScanType('visitor')}
                  >
                    👥 Visitor Pass
                  </button>
                </div>

                {errorMsg && (
                  <div className="alert alert-error" style={{ marginBottom: 16 }}>
                    {errorMsg}
                  </div>
                )}

                {cameraActive ? (
                  <CameraScanner
                    onScan={(text) => {
                      setTokenInput(text);
                      handleVerify(text);
                    }}
                    onCancel={() => setCameraActive(false)}
                  />
                ) : (
                  <div>
                    <div style={{ textAlign: 'center', padding: '24px 0 20px' }}>
                      <button
                        className="btn btn-primary btn-lg"
                        style={{ padding: '16px 28px', fontSize: '1.05rem', boxShadow: '0 0 20px rgba(43, 127, 255, 0.35)' }}
                        onClick={() => setCameraActive(true)}
                      >
                        📷 Launch Camera Scanner
                      </button>
                      <p style={{ marginTop: 10, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Point device camera directly at the student or visitor QR code
                      </p>
                    </div>

                    <div className="divider">OR MANUAL LOOKUP</div>

                    <div className="form-group" style={{ marginBottom: 16 }}>
                      <label className="form-label">
                        Enter QR Token or {scanType === 'gatepass' ? 'Pass ID (e.g. GP-2026-0001)' : 'Visitor ID (e.g. VIS-2026-0001)'}
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder={scanType === 'gatepass' ? 'e.g. GP-2026-0001 or scan token' : 'e.g. VIS-2026-0001 or scan token'}
                        value={tokenInput}
                        onChange={(e) => setTokenInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                      />
                    </div>

                    <button
                      className="btn btn-success"
                      style={{ width: '100%', padding: '12px' }}
                      onClick={() => handleVerify()}
                      disabled={verifying}
                    >
                      {verifying ? (
                        <><div className="spinner" style={{ width: 18, height: 18 }} /> Verifying...</>
                      ) : (
                        '🔍 Verify Identity & Status'
                      )}
                    </button>
                  </div>
                )}
              </div>

              <div className="card" style={{ marginTop: 20, background: 'var(--navy-900)' }}>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--blue-400)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                  🛡️ Security Protocol Reminder
                </h4>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  <li>Always cross-check the student or visitor photo displayed on screen with physical appearance.</li>
                  <li>Exit and return actions write immediate tamper-proof audit timestamps to the central database.</li>
                  <li>Overdue student returns automatically highlight red and alert administration.</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SEARCH STUDENT TAB */}
      {activeTab === 'search-student' && (
        <div style={{ maxWidth: 840 }}>
          <div className="card" style={{ marginBottom: 20 }}>
            <h3>Search Student Records</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 16 }}>
              Quickly look up enrolled students by Name, Roll Number, or Department
            </p>
            <form onSubmit={handleSearchStudent} style={{ display: 'flex', gap: 10 }}>
              <input
                type="text"
                className="form-control"
                placeholder="Enter Roll Number or Student Name..."
                value={searchStudentQuery}
                onChange={(e) => setSearchStudentQuery(e.target.value)}
                style={{ flex: 1 }}
              />
              <button className="btn btn-primary" type="submit" disabled={searchingStudent}>
                {searchingStudent ? 'Searching...' : '🔍 Search'}
              </button>
            </form>
          </div>

          {searchedStudents.length > 0 && (
            <div className="grid-2">
              {searchedStudents.map((std) => (
                <div key={std._id} className="card">
                  <div className="profile-card" style={{ marginBottom: 14 }}>
                    <div className="profile-photo" style={{ width: 70, height: 70, overflow: 'hidden' }}>
                      {std.photoUrl ? (
                        <img src={getSafeImageUrl(std.photoUrl)} alt={std.fullName} onError={(e) => { e.currentTarget.style.display = 'none'; }} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : '🎓'}
                    </div>
                    <div>
                      <h4 style={{ margin: 0 }}>{std.fullName}</h4>
                      <code style={{ fontSize: '0.8rem', color: 'var(--blue-400)' }}>{std.rollNumber}</code>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
                        {std.department} · Year {std.year}
                      </p>
                    </div>
                  </div>

                  <div className="detail-grid" style={{ fontSize: '0.8rem' }}>
                    <div className="detail-item"><span className="detail-label">Phone</span><span className="detail-value">{std.phone}</span></div>
                    <div className="detail-item"><span className="detail-label">Parent Phone</span><span className="detail-value">{std.parentPhone}</span></div>
                    <div className="detail-item"><span className="detail-label">Hostel</span><span className="detail-value">{std.hostelBlock} - {std.hostelRoom}</span></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SEARCH VISITOR TAB */}
      {activeTab === 'search-visitor' && (
        <div style={{ maxWidth: 840 }}>
          <div className="card" style={{ marginBottom: 20 }}>
            <h3>Search Visitor Records</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 16 }}>
              Quickly look up visitor records by Phone, Name, or Place
            </p>
            <form onSubmit={handleSearchVisitor} style={{ display: 'flex', gap: 10 }}>
              <input
                type="text"
                className="form-control"
                placeholder="Enter Visitor Phone Number or Name..."
                value={searchVisitorQuery}
                onChange={(e) => setSearchVisitorQuery(e.target.value)}
                style={{ flex: 1 }}
              />
              <button className="btn btn-primary" type="submit" disabled={searchingVisitor}>
                {searchingVisitor ? 'Searching...' : '🔍 Search'}
              </button>
            </form>
          </div>

          {searchedVisitors.length > 0 && (
            <div className="grid-2">
              {searchedVisitors.map((vis) => (
                <div key={vis._id} className="card">
                  <div className="profile-card" style={{ marginBottom: 14 }}>
                    <div className="profile-photo" style={{ width: 70, height: 70, overflow: 'hidden' }}>
                      {vis.photoUrl ? (
                        <img src={getSafeImageUrl(vis.photoUrl)} alt={vis.fullName} onError={(e) => { e.currentTarget.style.display = 'none'; }} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : '👤'}
                    </div>
                    <div>
                      <h4 style={{ margin: 0 }}>{vis.fullName}</h4>
                      <code style={{ fontSize: '0.8rem', color: 'var(--blue-400)' }}>{vis.visitorId}</code>
                      <div style={{ marginTop: 4 }}>
                        <span className={`badge ${vis.status === 'Approved' ? 'badge-approved' : vis.status === 'Pending' ? 'badge-pending' : 'badge-rejected'}`}>
                          {vis.status}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="detail-grid" style={{ fontSize: '0.8rem' }}>
                    <div className="detail-item"><span className="detail-label">Phone</span><span className="detail-value">{vis.phone}</span></div>
                    <div className="detail-item"><span className="detail-label">Meeting</span><span className="detail-value">{vis.meetingPersonName}</span></div>
                    <div className="detail-item"><span className="detail-label">Purpose</span><span className="detail-value">{vis.purpose}</span></div>
                    <div className="detail-item"><span className="detail-label">Submitted</span><span className="detail-value">{formatDT(vis.submittedAt)}</span></div>
                  </div>

                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ width: '100%', marginTop: 12 }}
                    onClick={() => {
                      setScanType('visitor');
                      setActiveTab('scan');
                      setTokenInput(vis.visitorId);
                      handleVerify(vis.visitorId);
                    }}
                  >
                    🔍 Inspect & Verify Pass
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
