import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import LoginPage from './pages/LoginPage';
import VaultPage from './pages/VaultPage';

function Guard() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
        <div style={{
          width: 48, height: 48,
          background: 'var(--accent-dim)',
          border: '1.5px solid rgba(0,212,170,0.4)',
          borderRadius: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--accent)',
          boxShadow: 'var(--accent-glow)',
          animation: 'pulse 1.6s ease-in-out infinite',
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <style>{`@keyframes pulse { 0%,100%{opacity:0.6;transform:scale(0.97)} 50%{opacity:1;transform:scale(1)} }`}</style>
      </div>
    );
  }
  return user ? <VaultPage /> : <LoginPage />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/*" element={<Guard />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
