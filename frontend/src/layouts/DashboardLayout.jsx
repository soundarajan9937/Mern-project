import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { notificationAPI } from '../services/api';
import { navigate } from '../App';


export function DashboardLayout({ children, title, currentPage }) {
  const { user, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const notifRef = useRef();

  const fetchUnread = useCallback(async () => {
    try {
      const res = await notificationAPI.getUnreadCount();
      setUnreadCount(res.data.unreadCount || 0);
    } catch {}
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await notificationAPI.getAll();
      setNotifications(res.data.notifications?.slice(0, 8) || []);
    } catch {}
  }, []);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotifClick = async () => {
    if (!showNotifDropdown) await fetchNotifications();
    setShowNotifDropdown(p => !p);
  };

  const handleMarkRead = async (id) => {
    try {
      await notificationAPI.markRead(id);
      fetchUnread();
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch {}
  };

  const getNavLinks = () => {
    const role = user?.role;
    if (role === 'admin') return [
      { section: 'Admin System', items: [
        { id: 'dashboard', label: 'Dashboard', icon: '📊', path: '/admin' },
        { id: 'my-passes', label: 'Gate Passes History', icon: '🎫', path: '/admin/passes' },
        { id: 'new-pass', label: 'New Request', icon: '➕', path: '/admin/new-pass' },
        { id: 'visitors', label: 'Visitor System', icon: '👥', path: '/admin/visitors' },
        { id: 'profile', label: 'Profile', icon: '👤', path: '/admin/profile' },
      ]},
    ];
    if (role === 'student') return [
      { section: 'Student System', items: [
        { id: 'profile', label: 'Profile', icon: '👤', path: '/student/profile' },
        { id: 'notifications', label: 'Notification', icon: '🔔', path: '/student/notifications', showBadge: true },
      ]},
    ];
    if (role === 'security') return [
      { section: 'Security', items: [
        { id: 'dashboard', label: 'Dashboard', icon: '📊', path: '/security' },
        { id: 'qr-scan', label: 'QR Scanner', icon: '📱', path: '/security/scan' },
        { id: 'search-student', label: 'Search Student', icon: '🔍', path: '/security/search-student' },
        { id: 'search-visitor', label: 'Search Visitor', icon: '🔍', path: '/security/search-visitor' },
      ]},
    ];
    if (role === 'staff') return [
      { section: 'Staff', items: [
        { id: 'dashboard', label: 'Dashboard', icon: '📊', path: '/staff' },
      ]},
    ];
    return [];
  };

  const getRoleColor = (role) => {
    const colors = { admin: 'var(--blue-400)', student: 'var(--green-400)', security: 'var(--amber-400)', staff: 'var(--violet-400)' };
    return colors[role] || 'var(--text-muted)';
  };

  const getRoleLabel = (role) => {
    const labels = { admin: 'Admin', student: 'Student', security: 'Security Officer', staff: 'Faculty / Staff' };
    return labels[role] || role;
  };

  return (
    <div className="app-layout">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 99 }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <path d="m9 12 2 2 4-4"/>
            </svg>
          </div>
          <div className="sidebar-logo-text">SmartCampus<br /><span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 400 }}>Gate Management</span></div>
        </div>

        <nav className="sidebar-nav">
          {getNavLinks().map((section) => (
            <div key={section.section}>
              <div className="nav-section-label">{section.section}</div>
              {section.items.map((item) => {
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    className={`nav-link ${isActive ? 'active' : ''}`}
                    onClick={() => { navigate(item.path); setSidebarOpen(false); }}
                  >
                    <span style={{ fontSize: '1rem' }}>{item.icon}</span>
                    <span>{item.label}</span>
                    {item.showBadge && unreadCount > 0 && (
                      <span className="nav-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div
            className="sidebar-user"
            style={{
              cursor: (user?.role === 'student' || user?.role === 'admin') ? 'pointer' : 'default',
              padding: user?.role === 'admin' ? '12px 14px' : '10px',
            }}
            onClick={() => {
              if (user?.role === 'student') navigate('/student/profile');
              if (user?.role === 'admin') navigate('/admin/profile');
            }}
            title={user?.role === 'admin' ? 'View Admin Profile' : undefined}
          >
            {user?.role === 'admin' ? (
              <div className="sidebar-user-info" style={{ width: '100%' }}>
                <div
                  className="sidebar-user-name"
                  style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}
                >
                  {user?.name || 'soundar'}
                </div>
                <div
                  className="sidebar-user-role"
                  style={{ color: getRoleColor(user?.role), fontSize: '0.78rem', marginTop: 2, fontWeight: 600 }}
                >
                  {getRoleLabel(user?.role)}
                </div>
              </div>
            ) : (
              <>
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}
                >
                  <div className="sidebar-user-avatar">
                    {user?.avatar ? (
                      <img src={user.avatar.startsWith('http') ? user.avatar : `/${user.avatar}`} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      user?.name?.charAt(0)?.toUpperCase() || '?'
                    )}
                  </div>
                  <div className="sidebar-user-info">
                    <div className="sidebar-user-name">{user?.name || 'User'}</div>
                    <div className="sidebar-user-role" style={{ color: getRoleColor(user?.role) }}>{getRoleLabel(user?.role)}</div>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); logout(); }}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, borderRadius: 'var(--radius-sm)', flexShrink: 0 }}
                  title="Logout"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="main-content">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
            <span className="topbar-title">{title}</span>
          </div>
          <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Student Notification Bell */}
            {user?.role === 'student' && (
              <div ref={notifRef} style={{ position: 'relative' }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={handleNotifClick}
                  style={{ position: 'relative', padding: '6px 10px', fontSize: '1.05rem', borderRadius: 'var(--radius-md)' }}
                  title="Notifications"
                >
                  🔔
                  {unreadCount > 0 && (
                    <span style={{
                      position: 'absolute',
                      top: 2,
                      right: 2,
                      background: '#ef4444',
                      color: '#fff',
                      borderRadius: '50%',
                      width: 17,
                      height: 17,
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {showNotifDropdown && (
                  <div style={{
                    position: 'absolute',
                    right: 0,
                    top: 'calc(100% + 8px)',
                    width: 320,
                    background: 'var(--surface-1)',
                    border: '1px solid var(--surface-border-bright)',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: '0 12px 36px rgba(0,0,0,0.5)',
                    zIndex: 1000,
                    padding: 12,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid var(--surface-border)' }}>
                      <strong style={{ fontSize: '0.85rem' }}>Notifications ({unreadCount} new)</strong>
                      <button
                        className="btn btn-ghost btn-xs"
                        onClick={() => {
                          setShowNotifDropdown(false);
                          navigate('/student/notifications');
                        }}
                        style={{ fontSize: '0.75rem', color: 'var(--blue-400)' }}
                      >
                        View All →
                      </button>
                    </div>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '16px 8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        No notifications yet
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 260, overflowY: 'auto' }}>
                        {notifications.map((n) => (
                          <div
                            key={n.id}
                            onClick={() => {
                              handleMarkRead(n.id);
                              navigate('/student/notifications');
                              setShowNotifDropdown(false);
                            }}
                            style={{
                              padding: '8px 10px',
                              borderRadius: 'var(--radius-md)',
                              background: n.isRead ? 'transparent' : 'rgba(37,99,235,0.08)',
                              border: '1px solid',
                              borderColor: n.isRead ? 'transparent' : 'rgba(37,99,235,0.2)',
                              cursor: 'pointer',
                              fontSize: '0.8rem',
                            }}
                          >
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{n.title}</div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.74rem', lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {n.type === 'VISITOR_ALERT' || (n.title || '').toLowerCase().includes('visitor')
                                ? (n.metadata?.visitorName ? `Visitor ${n.metadata.visitorName} registered to meet you.` : 'A visitor has registered to meet you on campus.')
                                : n.message}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <button className="btn btn-ghost btn-sm" onClick={logout}>Logout</button>
          </div>
        </header>

        <div className="page-content">
          {children}
        </div>
      </div>
    </div>
  );
}
