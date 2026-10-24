import React, { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { visitorAPI, notificationAPI } from '../../services/api';
import { navigate } from '../../App';

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

export default function StaffDashboard() {
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [visitors, setVisitors] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchStaffData = useCallback(async () => {
    setLoading(true);
    try {
      const [vRes, nRes] = await Promise.all([
        visitorAPI.getAll({ search: user?.name }),
        notificationAPI.getAll(),
      ]);
      setVisitors(vRes.data.visitors || []);
      setNotifications(nRes.data.notifications || []);
    } catch (err) {
      console.error('Failed to load staff portal data:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchStaffData();
  }, [fetchStaffData]);

  useEffect(() => {
    const p = window.location.pathname;
    if (p === '/staff' || p === '/staff/') setCurrentPage('dashboard');
    else if (p.includes('/staff/notifications')) setCurrentPage('notifications');
  }, []);

  useEffect(() => {
    const onPop = () => {
      const p = window.location.pathname;
      if (p === '/staff' || p === '/staff/') setCurrentPage('dashboard');
      else if (p.includes('/staff/notifications')) setCurrentPage('notifications');
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const pendingVisitors = visitors.filter(v => v.status === 'Pending').length;
  const approvedVisitors = visitors.filter(v => v.status === 'Approved').length;
  const checkedInVisitors = visitors.filter(v => v.status === 'Checked-In').length;

  const statusBadge = (s) => {
    const map = {
      Approved: 'badge-approved',
      Pending: 'badge-pending',
      Rejected: 'badge-rejected',
      'Checked-In': 'badge-approved',
      'Checked-Out': 'badge-checkedout',
    };
    return map[s] || 'badge-pending';
  };

  return (
    <DashboardLayout title="Faculty & Staff Portal" currentPage={currentPage}>
      {currentPage === 'dashboard' ? (
        <div>
          {/* Welcome Card */}
          <div
            className="card"
            style={{
              marginBottom: 24,
              background: 'linear-gradient(135deg, rgba(43,127,255,0.12), rgba(15,23,42,0.95))',
              border: '1px solid var(--blue-500)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ fontSize: '2.5rem' }}>👨‍🏫</div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.3rem' }}>Welcome, {user?.name}</h2>
                <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  {user?.department ? `${user.department} Department · ` : ''}Faculty & Staff Visitor Desk
                </p>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid-3" style={{ marginBottom: 28 }}>
            <div className="stat-card">
              <div className="stat-icon blue">👥</div>
              <div>
                <div className="stat-value">{visitors.length}</div>
                <div className="stat-label">Total Assigned Visitors</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon green">🟢</div>
              <div>
                <div className="stat-value">{checkedInVisitors}</div>
                <div className="stat-label">Currently On Campus</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon amber">⏳</div>
              <div>
                <div className="stat-value">{pendingVisitors}</div>
                <div className="stat-label">Pending Approval</div>
              </div>
            </div>
          </div>

          {/* Visitors Scheduled to Meet This Faculty */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--surface-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.05rem' }}>Scheduled & Recent Visitors</h3>
              <button className="btn btn-secondary btn-sm" onClick={fetchStaffData}>🔄 Refresh</button>
            </div>

            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner spinner-lg" /></div>
            ) : visitors.length === 0 ? (
              <div className="empty-state" style={{ padding: 40 }}>
                <span style={{ fontSize: '2.5rem' }}>👥</span>
                <h3>No visitors currently scheduled</h3>
                <p style={{ fontSize: '0.85rem' }}>When a visitor or parent registers to meet you, their details will appear here.</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Visitor ID</th>
                      <th>Visitor Name</th>
                      <th>Phone</th>
                      <th>Relationship / Place</th>
                      <th>Purpose</th>
                      <th>Status</th>
                      <th>Submitted Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visitors.map((v) => (
                      <tr key={v._id}>
                        <td><code style={{ fontSize: '0.8rem', color: 'var(--blue-400)' }}>{v.visitorId}</code></td>
                        <td style={{ fontWeight: 500 }}>{v.fullName}</td>
                        <td style={{ fontSize: '0.82rem' }}>{v.phone}</td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{v.relationship} ({v.place})</td>
                        <td style={{ fontSize: '0.82rem' }}>{v.purpose}</td>
                        <td><span className={`badge ${statusBadge(v.status)}`}>{v.status}</span></td>
                        <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{formatDT(v.submittedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Notifications page */
        <div style={{ maxWidth: 700 }}>
          <h2 style={{ fontSize: '1.3rem', marginBottom: 16 }}>Notifications & Gate Alerts</h2>
          {notifications.length === 0 ? (
            <div className="empty-state"><span style={{ fontSize: '2.5rem' }}>🔔</span><h3>No alerts</h3></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {notifications.map((n) => (
                <div key={n.id} className="card" style={{ padding: '14px 18px', borderLeft: !n.isRead ? '3px solid var(--blue-500)' : undefined }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <h4 style={{ margin: 0, fontSize: '0.92rem' }}>{n.title}</h4>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{n.formattedCreatedAt}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-secondary)' }}>{n.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
