import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../utils/api';

const AuthCtx = createContext(null);

const STORAGE_KEY = 'vaultify_token';
const LOCK_AFTER_MS = (parseInt(import.meta.env.VITE_LOCK_MINUTES || '15')) * 60 * 1000;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);      // { username }
  const [loading, setLoading] = useState(true);
  const lockTimer = useRef(null);

  const logout = useCallback((reason = '') => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
    if (lockTimer.current) clearTimeout(lockTimer.current);
    if (reason) console.info('Logged out:', reason);
  }, []);

  const resetLockTimer = useCallback(() => {
    if (lockTimer.current) clearTimeout(lockTimer.current);
    lockTimer.current = setTimeout(() => logout('inactivity'), LOCK_AFTER_MS);
  }, [logout]);

  // Boot: verify stored token
  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEY);
    if (!token) { setLoading(false); return; }
    api.verify()
      .then(({ valid, username }) => {
        if (valid) { setUser({ username }); resetLockTimer(); }
        else logout('invalid token');
      })
      .catch(() => logout('verify failed'))
      .finally(() => setLoading(false));
  }, []);

  // Reset auto-lock timer on any user interaction
  useEffect(() => {
    if (!user) return;
    const events = ['mousemove', 'keydown', 'click', 'touchstart'];
    const handler = () => resetLockTimer();
    events.forEach(e => window.addEventListener(e, handler, { passive: true }));
    return () => events.forEach(e => window.removeEventListener(e, handler));
  }, [user, resetLockTimer]);

  async function login(username, password) {
    const data = await api.login(username, password);
    localStorage.setItem(STORAGE_KEY, data.token);
    setUser({ username: data.username });
    resetLockTimer();
    return data;
  }

  async function register(username, password) {
    const data = await api.register(username, password);
    localStorage.setItem(STORAGE_KEY, data.token);
    setUser({ username: data.username });
    resetLockTimer();
    return data;
  }

  return (
    <AuthCtx.Provider value={{ user, loading, login, register, logout, lockMinutes: LOCK_AFTER_MS / 60000 }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
