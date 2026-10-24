import React, { useState, useEffect, Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';

// ── Lazy-loaded pages ─────────────────────────────────────────────────────────
const LandingPage      = lazy(() => import('./pages/LandingPage'));
const LoginPage        = lazy(() => import('./pages/LoginPage'));
const StudentLoginPage = lazy(() => import('./pages/StudentLoginPage'));
const RegisterPage     = lazy(() => import('./pages/RegisterPage'));
const VisitorRegPage   = lazy(() => import('./pages/VisitorRegistrationPage'));
const VisitorStatus    = lazy(() => import('./pages/VisitorStatusPage'));
const StudentOutPassPage = lazy(() => import('./pages/student/StudentOutPassPage'));
const VerifyOutPassPage = lazy(() => import('./pages/student/VerifyOutPassPage'));

// Dashboards
const StudentDashboard = lazy(() => import('./pages/student/StudentDashboard'));
const SecurityDashboard = lazy(() => import('./pages/security/SecurityDashboard'));
const StaffDashboard   = lazy(() => import('./pages/staff/StaffDashboard'));

// ── Loading Spinner ────────────────────────────────────────────────────────────
const LoadingScreen = () => (
  <div className="loading-screen">
    <div className="spinner spinner-xl" />
    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading Smart Campus System...</p>
  </div>
);

// ── Simple hash-based router ───────────────────────────────────────────────────
function useRoute() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  return path;
}

export function navigate(path) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

// ── Private Route Guard ────────────────────────────────────────────────────────
function PrivateRoute({ children, roles }) {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) return <LoadingScreen />;

  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }

  if (roles && !roles.includes(user.role)) {
    // Redirect to correct dashboard
    if (user.role === 'admin') navigate('/admin');
    else if (user.role === 'student') navigate('/student');
    else if (user.role === 'security') navigate('/security');
    else if (user.role === 'staff') navigate('/staff');
    return null;
  }

  return children;
}

// ── App Router ─────────────────────────────────────────────────────────────────
function AppRouter() {
  const path = useRoute();
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  // Redirect logged-in users away from auth pages
  if (isAuthenticated && (path === '/login' || path === '/register' || path === '/' || path === '/student-login' || path === '/student/login')) {
    if (user?.role === 'admin') { navigate('/admin'); return null; }
    if (user?.role === 'student') { navigate('/student'); return null; }
    if (user?.role === 'security') { navigate('/security'); return null; }
    if (user?.role === 'staff') { navigate('/staff'); return null; }
  }

  // Route matching
  if (path === '/' || path === '') return <LandingPage />;
  if (path === '/login' || path === '/student-login' || path === '/student/login') return <LoginPage />;
  if (path === '/register') return <RegisterPage />;
  if (path === '/visitor-registration') return <VisitorRegPage />;
  if (path.startsWith('/visitor-status')) return <VisitorStatus />;
  if (path.startsWith('/apply-outpass')) return <StudentOutPassPage />;
  if (path.startsWith('/verify-outpass') || path.startsWith('/verify-pass')) return <VerifyOutPassPage />;

  if (path.startsWith('/admin') || path.startsWith('/student'))
    return (
      <PrivateRoute roles={['admin', 'student']}>
        <StudentDashboard />
      </PrivateRoute>
    );

  if (path.startsWith('/security'))
    return (
      <PrivateRoute roles={['security']}>
        <SecurityDashboard />
      </PrivateRoute>
    );

  if (path.startsWith('/staff'))
    return (
      <PrivateRoute roles={['staff']}>
        <StaffDashboard />
      </PrivateRoute>
    );

  // 404
  return (
    <div className="loading-screen" style={{ gap: 20 }}>
      <h1 style={{ color: 'var(--text-muted)', fontSize: '5rem', fontWeight: 900 }}>404</h1>
      <p style={{ color: 'var(--text-secondary)' }}>Page not found</p>
      <button className="btn btn-primary" onClick={() => navigate('/')}>Go Home</button>
    </div>
  );
}

// ── Root App ───────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<LoadingScreen />}>
        <AppRouter />
      </Suspense>
    </AuthProvider>
  );
}
