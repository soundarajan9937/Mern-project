import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';
import { navigate } from '../../App';
import { getSafeImageUrl } from '../../utils/imageUrl';

export default function ProfileView() {
  const { user, student, updateUser, logout } = useAuth();

  // Active Tab: 'details' | 'password' | 'session'
  const [activeTab, setActiveTab] = useState('details');

  // Form State: Profile Details
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('General');
  const [rollNumber, setRollNumber] = useState('');
  const [year, setYear] = useState('1st Year');
  const [hostelBlock, setHostelBlock] = useState('Block A');
  const [hostelRoom, setHostelRoom] = useState('101');

  // Avatar Upload State
  const [avatarPreview, setAvatarPreview] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const fileInputRef = useRef(null);

  // Form State: Change Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Feedback & Status State
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Logout confirmation modal
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  // Big size photo preview modal
  const [showBigPhotoModal, setShowBigPhotoModal] = useState(false);

  // Sync state with current user & student context
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.phone || student?.phone || '');
      setDepartment(user.department || student?.department || 'General');
      setAvatarPreview(user.avatar || student?.photoUrl || '');
    }
    if (student) {
      setRollNumber(student.rollNumber || '');
      if (student.department) setDepartment(student.department);
      if (student.phone && !user?.phone) setPhone(student.phone);
      setYear(student.year || '1st Year');
      setHostelBlock(student.hostelBlock || 'Block A');
      setHostelRoom(student.hostelRoom || '101');
    }
  }, [user, student]);

  // Handle Photo Selection
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(jpeg|jpg|png|webp)$/i)) {
      setProfileError('Please select a valid image file (JPEG, PNG, or WebP)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setProfileError('Image size exceeds 5MB limit');
      return;
    }

    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarPreview(reader.result);
    };
    reader.readAsDataURL(file);
    setProfileError('');
  };

  // Submit Profile Details Update
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    if (!name.trim()) {
      setProfileError('Name is required');
      return;
    }

    if (!email.trim()) {
      setProfileError('Email address is required');
      return;
    }

    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email.trim())) {
      setProfileError('Please provide a valid email address');
      return;
    }

    setProfileLoading(true);
    try {
      let res;
      if (avatarFile) {
        const formData = new FormData();
        formData.append('avatar', avatarFile);
        formData.append('name', name.trim());
        formData.append('email', email.trim());
        formData.append('phone', phone.trim());
        formData.append('department', department.trim());
        if (user?.role === 'student') {
          formData.append('rollNumber', rollNumber.trim());
          formData.append('year', year.trim());
          formData.append('hostelBlock', hostelBlock.trim());
          formData.append('hostelRoom', hostelRoom.trim());
        }
        res = await authAPI.updateProfile(formData);
      } else {
        const payload = {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          department: department.trim(),
        };
        if (user?.role === 'student') {
          payload.rollNumber = rollNumber.trim();
          payload.year = year.trim();
          payload.hostelBlock = hostelBlock.trim();
          payload.hostelRoom = hostelRoom.trim();
        }
        res = await authAPI.updateProfile(payload);
      }

      updateUser(res.data.user, res.data.student);
      setProfileSuccess('Profile updated successfully!');
      setAvatarFile(null);
      setTimeout(() => setProfileSuccess(''), 4000);
    } catch (err) {
      setProfileError(err?.response?.data?.message || err?.message || 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  // Submit Admin Profile & Security
  const handleAdminSubmit = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    if (!name.trim()) {
      setProfileError('Admin name is required');
      return;
    }

    if (!email.trim()) {
      setProfileError('Email address is required');
      return;
    }

    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email.trim())) {
      setProfileError('Please provide a valid email address');
      return;
    }

    const hasPasswordInput = !!(currentPassword || newPassword || confirmPassword);
    if (hasPasswordInput) {
      if (!currentPassword) {
        setProfileError('Please enter your current password to update your password');
        return;
      }
      if (!newPassword) {
        setProfileError('Please enter a new password');
        return;
      }
      if (newPassword.length < 6) {
        setProfileError('New password must be at least 6 characters');
        return;
      }
      if (newPassword !== confirmPassword) {
        setProfileError('New password and confirm password do not match');
        return;
      }
    }

    setProfileLoading(true);
    try {
      let res;
      if (avatarFile) {
        const formData = new FormData();
        formData.append('avatar', avatarFile);
        formData.append('name', name.trim());
        formData.append('email', email.trim());
        res = await authAPI.updateProfile(formData);
      } else {
        res = await authAPI.updateProfile({
          name: name.trim(),
          email: email.trim(),
        });
      }

      updateUser(res.data.user);

      if (hasPasswordInput) {
        await authAPI.changePassword({
          currentPassword,
          newPassword,
        });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }

      setProfileSuccess(
        hasPasswordInput
          ? 'Admin profile and password updated successfully!'
          : 'Admin profile updated successfully!'
      );
      setAvatarFile(null);
      setTimeout(() => setProfileSuccess(''), 5000);
    } catch (err) {
      setProfileError(err?.response?.data?.message || err?.message || 'Failed to update admin profile');
    } finally {
      setProfileLoading(false);
    }
  };

  // Submit Change Password
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPassword) {
      setPasswordError('Please enter your current password');
      return;
    }

    if (!newPassword) {
      setPasswordError('Please enter a new password');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    setPasswordLoading(true);
    try {
      await authAPI.changePassword({
        currentPassword,
        newPassword,
      });

      setPasswordSuccess('Password updated successfully! Next time you login, use your new password.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(''), 5000);
    } catch (err) {
      setPasswordError(err?.response?.data?.message || err?.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Execute Logout
  const handleConfirmLogout = () => {
    setShowLogoutModal(false);
    logout();
    navigate('/login');
  };

  const getResolvedAvatar = () => {
    if (avatarPreview) {
      return getSafeImageUrl(avatarPreview);
    }
    return null;
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ── TOP HERO PROFILE CARD ────────────────────────────────────────── */}
      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg, rgba(17, 28, 53, 0.95), rgba(8, 15, 31, 0.98))',
          borderColor: 'var(--surface-border-bright)',
          position: 'relative',
          overflow: 'hidden',
          padding: '28px',
        }}
      >
        {/* Ambient background glow */}
        <div
          style={{
            position: 'absolute',
            top: -60,
            right: -60,
            width: 220,
            height: 220,
            background: 'radial-gradient(circle, var(--blue-glow) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            {/* Avatar with Touch-to-Enlarge & Upload Trigger */}
            <div style={{ position: 'relative' }}>
              <div
                className="profile-photo"
                style={{
                  width: 88,
                  height: 88,
                  borderRadius: 'var(--radius-xl)',
                  fontSize: '2.4rem',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  cursor: 'pointer',
                  border: '3px solid var(--blue-500)',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                }}
                onClick={() => {
                  if (getResolvedAvatar()) {
                    setShowBigPhotoModal(true);
                  } else {
                    fileInputRef.current?.click();
                  }
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                title={getResolvedAvatar() ? 'Touch / Click to view photo in big size' : 'Click to upload photo'}
              >
                {getResolvedAvatar() ? (
                  <img
                    src={getResolvedAvatar()}
                    alt={user?.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : user?.role === 'student' ? (
                  '🎓'
                ) : (
                  user?.name?.charAt(0)?.toUpperCase() || '👤'
                )}

                {/* Touch hint overlay on hover */}
                {getResolvedAvatar() && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(0, 0, 0, 0.45)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: 0,
                      transition: 'opacity 0.2s ease',
                      color: '#fff',
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      textAlign: 'center',
                      padding: 4,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = '0'; }}
                  >
                    <span style={{ fontSize: '1.2rem', marginBottom: 2 }}>🔍</span>
                    <span>View Big</span>
                  </div>
                )}
              </div>

              {/* Photo edit badge button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                style={{
                  position: 'absolute',
                  bottom: -4,
                  right: -4,
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'var(--blue-600)',
                  color: '#fff',
                  border: '2px solid var(--navy-900)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                  zIndex: 2,
                }}
                title="Upload / Change Photo"
              >
                📷
              </button>

              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoSelect}
              />
            </div>

            {/* Profile Info Summary */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
                <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {name || user?.name || (user?.role === 'admin' ? 'Administrator' : 'Student')}
                </h2>
                <span style={{
                  background: user?.role === 'admin' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                  color: user?.role === 'admin' ? 'var(--blue-400)' : '#34d399',
                  border: user?.role === 'admin' ? '1px solid rgba(59, 130, 246, 0.35)' : '1px solid rgba(16, 185, 129, 0.35)',
                  borderRadius: 9999,
                  padding: '3px 10px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}>
                  {user?.role === 'admin' ? 'SYSTEM ADMINISTRATOR' : 'STUDENT ENROLLED'}
                </span>
              </div>
              <p style={{ margin: '0 0 6px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                {email || user?.email || (user?.role === 'admin' ? 'admin@campus.edu' : 'student@campus.edu')}
              </p>
              <div style={{ display: 'flex', gap: 16, marginTop: 6, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {user?.role === 'admin' ? (
                  <span>🛡️ Full Campus Admin Access & System Privileges</span>
                ) : (
                  <>
                    <span>{phone ? `📞 ${phone}` : '📵 No phone set'}</span>
                    <span>🪪 {rollNumber || student?.rollNumber || 'STU143446'}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Top Quick Actions: Logout Button (Student profile only) */}
          {user?.role !== 'admin' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                type="button"
                style={{
                  background: '#ef4444',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '9px 18px',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  boxShadow: '0 2px 10px rgba(239, 68, 68, 0.3)',
                }}
                onClick={() => setShowLogoutModal(true)}
                id="profile-logout-btn"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
                </svg>
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>

        {/* Tab Selection (Students only) */}
        {user?.role !== 'admin' && (
          <div
            style={{
              display: 'flex',
              gap: 10,
              marginTop: 24,
              paddingTop: 18,
              borderTop: '1px solid var(--surface-border)',
              flexWrap: 'wrap',
            }}
          >
            <button
              type="button"
              className={`btn btn-sm ${activeTab === 'details' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ borderRadius: 'var(--radius-full)', padding: '8px 18px', fontSize: '0.85rem' }}
              onClick={() => setActiveTab('details')}
            >
              👤 Personal Details
            </button>
            <button
              type="button"
              className={`btn btn-sm ${activeTab === 'password' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ borderRadius: 'var(--radius-full)', padding: '8px 18px', fontSize: '0.85rem' }}
              onClick={() => setActiveTab('password')}
            >
              🔒 Password & Security
            </button>
            <button
              type="button"
              className={`btn btn-sm ${activeTab === 'session' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ borderRadius: 'var(--radius-full)', padding: '8px 18px', fontSize: '0.85rem' }}
              onClick={() => setActiveTab('session')}
            >
              📜 Account & Session
            </button>
          </div>
        )}
      </div>

      {/* ── ADMIN SYSTEM PROFILE CARD (Admin Only) ────────────────────────── */}
      {user?.role === 'admin' ? (
        <div className="card" style={{ padding: 32 }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--blue-400)', marginBottom: 4 }}>
              Admin System
            </div>
            <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800 }}>Profile & Credentials</h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Update your admin name, email, and password credentials below
            </p>
          </div>

          {profileSuccess && (
            <div className="alert" style={{ background: 'var(--green-glow)', border: '1px solid rgba(16, 185, 129, 0.4)', color: 'var(--green-400)', marginBottom: 20 }}>
              <span>✅</span>
              <div>{profileSuccess}</div>
            </div>
          )}

          {profileError && (
            <div className="alert alert-error" style={{ marginBottom: 20 }}>
              <span>⚠️</span>
              <div>{profileError}</div>
            </div>
          )}

          <form onSubmit={handleAdminSubmit}>
            <div className="form-grid" style={{ marginBottom: 24 }}>
              {/* Admin Name */}
              <div className="form-group">
                <label className="form-label" htmlFor="admin-name">
                  ADMIN NAME <span style={{ color: 'var(--red-400)' }}>*</span>
                </label>
                <input
                  id="admin-name"
                  type="text"
                  className="form-control"
                  placeholder="Enter admin name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              {/* Email Address */}
              <div className="form-group">
                <label className="form-label" htmlFor="admin-email">
                  EMAIL <span style={{ color: 'var(--red-400)' }}>*</span>
                </label>
                <input
                  id="admin-email"
                  type="email"
                  className="form-control"
                  placeholder="Enter admin email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="divider" style={{ margin: '24px 0 20px' }} />

            <div style={{ marginBottom: 18 }}>
              <h4 style={{ margin: '0 0 4px', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                🔒 Change Password
              </h4>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Leave password fields blank if you do not want to change your password.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginBottom: 28 }}>
              {/* Current Password */}
              <div className="form-group">
                <label className="form-label" htmlFor="admin-current-password">
                  CURRENT PASSWORD
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="admin-current-password"
                    type={showCurrentPassword ? 'text' : 'password'}
                    className="form-control"
                    placeholder="Enter current password (required to change password)"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    style={{ paddingRight: 42 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword((prev) => !prev)}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      fontSize: '1rem',
                    }}
                    title={showCurrentPassword ? 'Hide password' : 'Show password'}
                  >
                    {showCurrentPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div className="form-grid">
                {/* New Password */}
                <div className="form-group">
                  <label className="form-label" htmlFor="admin-new-password">
                    NEW PASSWORD
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="admin-new-password"
                      type={showNewPassword ? 'text' : 'password'}
                      className="form-control"
                      placeholder="Enter new password (min. 6 characters)"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      minLength={6}
                      style={{ paddingRight: 42 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((prev) => !prev)}
                      style={{
                        position: 'absolute',
                        right: 12,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        fontSize: '1rem',
                      }}
                      title={showNewPassword ? 'Hide password' : 'Show password'}
                    >
                      {showNewPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="form-group">
                  <label className="form-label" htmlFor="admin-confirm-password">
                    CONFORM PASSWORD
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="admin-confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      className="form-control"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      style={{ paddingRight: 42 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      style={{
                        position: 'absolute',
                        right: 12,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        fontSize: '1rem',
                      }}
                      title={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Avatar Upload & Big Preview Section */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '14px 18px',
                background: 'var(--surface-2)',
                borderRadius: 'var(--radius-md)',
                marginBottom: 24,
                border: '1px solid var(--surface-border)',
                flexWrap: 'wrap',
              }}
            >
              {getResolvedAvatar() && (
                <div
                  onClick={() => setShowBigPhotoModal(true)}
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 12,
                    overflow: 'hidden',
                    border: '2px solid var(--blue-500)',
                    cursor: 'pointer',
                    flexShrink: 0,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    transition: 'transform 0.2s ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                  title="Touch / Click to view in big size"
                >
                  <img
                    src={getResolvedAvatar()}
                    alt="Admin Photo"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              )}
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  Admin Profile Photo
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Touch photo to view full size · PNG, JPG or WebP up to 5MB
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                {getResolvedAvatar() && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{
                      fontSize: '0.82rem',
                      padding: '8px 14px',
                      borderRadius: 8,
                      background: 'rgba(59, 130, 246, 0.1)',
                      color: 'var(--blue-400)',
                      border: '1px solid rgba(59, 130, 246, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                    onClick={() => setShowBigPhotoModal(true)}
                  >
                    🔍 View Big Size
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => fileInputRef.current?.click()}
                  style={{ borderRadius: 8, padding: '8px 14px' }}
                >
                  📁 {getResolvedAvatar() ? 'Change Photo' : 'Choose Image'}
                </button>
              </div>
            </div>

            {/* Single Action Bar: Logout & Save Changes */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
              <button
                type="button"
                className="btn btn-ghost"
                style={{
                  color: '#ef4444',
                  borderColor: 'rgba(239, 68, 68, 0.4)',
                  background: 'rgba(239, 68, 68, 0.08)',
                  padding: '10px 22px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  borderRadius: 10,
                }}
                onClick={() => setShowLogoutModal(true)}
                id="admin-single-logout-btn"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
                </svg>
                <span>Logout</span>
              </button>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={profileLoading}
                style={{ padding: '12px 32px', fontSize: '0.95rem', fontWeight: 700, minWidth: 160 }}
                id="admin-save-changes-btn"
              >
                {profileLoading ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="spinner spinner-sm" /> Saving Changes...
                  </span>
                ) : (
                  '💾 Save Changes'
                )}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <>

      {/* ── TAB 1: PERSONAL DETAILS FORM ─────────────────────────────────── */}
      {activeTab === 'details' && (
        <div className="card" style={{ padding: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Personal Information</h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Update your account name, email address, phone number, and campus profile
              </p>
            </div>
            {avatarFile && (
              <span className="badge badge-pending" style={{ fontSize: '0.75rem' }}>
                📸 New photo staged (click Save)
              </span>
            )}
          </div>

          {profileSuccess && (
            <div className="alert" style={{ background: 'var(--green-glow)', border: '1px solid rgba(16, 185, 129, 0.4)', color: 'var(--green-400)', marginBottom: 20 }}>
              <span>✅</span>
              <div>{profileSuccess}</div>
            </div>
          )}

          {profileError && (
            <div className="alert alert-error" style={{ marginBottom: 20 }}>
              <span>⚠️</span>
              <div>{profileError}</div>
            </div>
          )}

          <form onSubmit={handleProfileSubmit}>
            <div className="form-grid" style={{ marginBottom: 20 }}>
              {/* Full Name */}
              <div className="form-group">
                <label className="form-label" htmlFor="profile-name">
                  FULL NAME <span style={{ color: 'var(--red-400)' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="profile-name"
                    type="text"
                    className="form-control"
                    placeholder="Enter your full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    style={{ paddingLeft: 40 }}
                  />
                  <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', opacity: 0.6 }}>
                    👤
                  </span>
                </div>
              </div>

              {/* Email Address */}
              <div className="form-group">
                <label className="form-label" htmlFor="profile-email">
                  EMAIL ADDRESS <span style={{ color: 'var(--red-400)' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="profile-email"
                    type="email"
                    className="form-control"
                    placeholder="name@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={{ paddingLeft: 40 }}
                  />
                  <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', opacity: 0.6 }}>
                    ✉️
                  </span>
                </div>
              </div>

                {/* Phone Number */}
                <div className="form-group">
                  <label className="form-label" htmlFor="profile-phone">
                    PHONE NUMBER
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="profile-phone"
                      type="tel"
                      className="form-control"
                      placeholder="e.g. 9876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      style={{ paddingLeft: 40 }}
                    />
                    <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', opacity: 0.6 }}>
                      📞
                    </span>
                  </div>
                </div>

                {/* Department */}
                <div className="form-group">
                  <label className="form-label" htmlFor="profile-dept">
                    DEPARTMENT
                  </label>
                  <input
                    id="profile-dept"
                    type="text"
                    className="form-control"
                    placeholder="General"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  />
                </div>

                {/* Roll Number */}
                <div className="form-group">
                  <label className="form-label" htmlFor="profile-roll">
                    ROLL NUMBER
                  </label>
                  <input
                    id="profile-roll"
                    type="text"
                    className="form-control"
                    placeholder="e.g. STU143446"
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                  />
                </div>

                {/* Academic Year */}
                <div className="form-group">
                  <label className="form-label" htmlFor="profile-year">
                    ACADEMIC YEAR
                  </label>
                  <select
                    id="profile-year"
                    className="form-control"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                    <option value="Postgraduate">Postgraduate</option>
                  </select>
                </div>

                {/* Hostel Block */}
                <div className="form-group">
                  <label className="form-label" htmlFor="profile-hostel-block">
                    HOSTEL BLOCK
                  </label>
                  <input
                    id="profile-hostel-block"
                    type="text"
                    className="form-control"
                    placeholder="Block A"
                    value={hostelBlock}
                    onChange={(e) => setHostelBlock(e.target.value)}
                  />
                </div>

                {/* Hostel Room */}
                <div className="form-group">
                  <label className="form-label" htmlFor="profile-hostel-room">
                    HOSTEL ROOM
                  </label>
                  <input
                    id="profile-hostel-room"
                    type="text"
                    className="form-control"
                    placeholder="101"
                    value={hostelRoom}
                    onChange={(e) => setHostelRoom(e.target.value)}
                  />
                </div>
              </div>

            {/* Profile Avatar Upload Picker Button */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '14px 18px',
                background: 'var(--surface-2)',
                borderRadius: 'var(--radius-md)',
                marginBottom: 24,
                border: '1px solid var(--surface-border)',
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  Profile Photo
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  PNG, JPG or WebP up to 5MB. Used across your student portal.
                </div>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => fileInputRef.current?.click()}
              >
                📁 Choose Image
              </button>
            </div>

            {/* Submit Action */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={profileLoading}
                style={{ padding: '11px 28px', minWidth: 160 }}
              >
                {profileLoading ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="spinner spinner-sm" /> Saving...
                  </span>
                ) : (
                  '💾 Save Changes'
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── TAB 2: CHANGE PASSWORD ───────────────────────────────────────── */}
      {activeTab === 'password' && (
        <div className="card" style={{ padding: 28, maxWidth: 620 }}>
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Change Password</h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Choose a secure password of at least 6 characters to keep your account safe
            </p>
          </div>

          {passwordSuccess && (
            <div className="alert" style={{ background: 'var(--green-glow)', border: '1px solid rgba(16, 185, 129, 0.4)', color: 'var(--green-400)', marginBottom: 20 }}>
              <span>🔐</span>
              <div>{passwordSuccess}</div>
            </div>
          )}

          {passwordError && (
            <div className="alert alert-error" style={{ marginBottom: 20 }}>
              <span>⚠️</span>
              <div>{passwordError}</div>
            </div>
          )}

          <form onSubmit={handlePasswordSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginBottom: 24 }}>
              {/* Current Password */}
              <div className="form-group">
                <label className="form-label" htmlFor="curr-password">
                  Current Password <span style={{ color: 'var(--red-400)' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="curr-password"
                    type={showCurrentPassword ? 'text' : 'password'}
                    className="form-control"
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    style={{ paddingRight: 42 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword((prev) => !prev)}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      padding: 0,
                    }}
                    title={showCurrentPassword ? 'Hide password' : 'Show password'}
                  >
                    {showCurrentPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="form-group">
                <label className="form-label" htmlFor="new-password">
                  New Password <span style={{ color: 'var(--red-400)' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    className="form-control"
                    placeholder="Enter new password (min. 6 chars)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    style={{ paddingRight: 42 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      padding: 0,
                    }}
                    title={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? '🙈' : '👁️'}
                  </button>
                </div>
                {newPassword && (
                  <div style={{ fontSize: '0.75rem', marginTop: 4, color: newPassword.length >= 6 ? 'var(--green-400)' : 'var(--amber-400)' }}>
                    {newPassword.length >= 6 ? '✓ Good length' : 'Password must be at least 6 characters'}
                  </div>
                )}
              </div>

              {/* Confirm New Password */}
              <div className="form-group">
                <label className="form-label" htmlFor="confirm-password">
                  Confirm New Password <span style={{ color: 'var(--red-400)' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="form-control"
                    placeholder="Re-type new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    style={{ paddingRight: 42 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      padding: 0,
                    }}
                    title={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? '🙈' : '👁️'}
                  </button>
                </div>
                {confirmPassword && (
                  <div style={{ fontSize: '0.75rem', marginTop: 4, color: confirmPassword === newPassword ? 'var(--green-400)' : 'var(--red-400)' }}>
                    {confirmPassword === newPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={passwordLoading}
                style={{ padding: '11px 28px', minWidth: 160 }}
              >
                {passwordLoading ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="spinner spinner-sm" /> Updating...
                  </span>
                ) : (
                  '🔒 Update Password'
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── TAB 3: ACCOUNT & SESSION (LOGOUT ZONE) ───────────────────────── */}
      {activeTab === 'session' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Active Session Info */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1.15rem', fontWeight: 700 }}>Current Session</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Logged In User</span>
                <span className="detail-value">{user?.name} ({user?.email})</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Role</span>
                <span className="detail-value" style={{ textTransform: 'capitalize' }}>{user?.role}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Account Status</span>
                <span className="detail-value" style={{ color: 'var(--green-400)' }}>● Active Session</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Authentication Token</span>
                <span className="detail-value" style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>Stored (JWT Encrypted)</span>
              </div>
            </div>
          </div>

          {/* Danger Zone: Logout */}
          <div
            className="card"
            style={{
              padding: 24,
              borderColor: 'rgba(239, 68, 68, 0.35)',
              background: 'rgba(239, 68, 68, 0.05)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
              <div>
                <h4 style={{ margin: '0 0 6px', color: 'var(--red-400)', fontSize: '1.05rem', fontWeight: 700 }}>
                  🚪 Sign Out of Your Account
                </h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', maxWidth: 540 }}>
                  Logging out will end your current session on this device. You will need to log back in with your email and password to access the portal.
                </p>
              </div>

              <button
                type="button"
                className="btn btn-danger"
                onClick={() => setShowLogoutModal(true)}
                style={{ padding: '11px 24px', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
                </svg>
                <span>Log Out Now</span>
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}

      {/* ── BIG SIZE PHOTO PREVIEW MODAL ──────────────────────────────────── */}
      {showBigPhotoModal && (
        <div
          className="modal-backdrop"
          onClick={() => setShowBigPhotoModal(false)}
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
            {/* Header with Title, Admin Name, and Close button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div style={{ textAlign: 'left', minWidth: 0, flex: 1, paddingRight: 10 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--blue-400)', marginBottom: 2 }}>
                  {user?.role === 'admin' ? 'Administrator Photo Preview' : 'Photo Preview'}
                </div>
                <h3 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {name || user?.name || (user?.role === 'admin' ? 'Administrator' : 'Student')}
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                  {email || user?.email || (user?.role === 'admin' ? 'System Administrator' : '')}
                </p>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowBigPhotoModal(false)}
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
                title="Close"
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
                marginBottom: 18,
              }}
            >
              {getResolvedAvatar() ? (
                <img
                  src={getResolvedAvatar()}
                  alt={name || user?.name || 'Administrator'}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    display: 'block',
                  }}
                />
              ) : (
                <div style={{ fontSize: '4.5rem', color: 'var(--text-muted)' }}>
                  👤
                </div>
              )}
            </div>

            {/* Footer with Change Photo & Close */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: 6, borderRadius: 10, padding: '8px 16px' }}
                onClick={() => {
                  fileInputRef.current?.click();
                }}
              >
                📷 Change Photo
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={{ padding: '8px 24px', borderRadius: 10, fontWeight: 700 }}
                onClick={() => setShowBigPhotoModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── LOGOUT CONFIRMATION MODAL ────────────────────────────────────── */}
      {showLogoutModal && (
        <div className="modal-backdrop" onClick={() => setShowLogoutModal(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 420, padding: 26, textAlign: 'center' }}
          >
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: '50%',
                background: 'var(--red-glow)',
                color: 'var(--red-400)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.8rem',
                margin: '0 auto 16px',
              }}
            >
              🚪
            </div>

            <h3 style={{ margin: '0 0 8px', fontSize: '1.2rem', fontWeight: 700 }}>Confirm Logout</h3>
            <p style={{ margin: '0 0 22px', fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Are you sure you want to log out of <strong>SmartCampus</strong>? Your current work and state are safely stored on the server.
            </p>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setShowLogoutModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                style={{ flex: 1 }}
                onClick={handleConfirmLogout}
                id="modal-confirm-logout-btn"
              >
                Yes, Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
