import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setToken, getToken } from './api';

/* ---------- Theme ---------- */
const ThemeCtx = createContext();
export const useTheme = () => useContext(ThemeCtx);
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('ss_theme') || 'dark');
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('ss_theme', theme);
  }, [theme]);
  const value = useMemo(() => ({ theme, toggle: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')) }), [theme]);
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

/* ---------- Toasts ---------- */
const ToastCtx = createContext();
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((type, text) => {
    const id = Math.random().toString(36).slice(2);
    setItems((l) => [...l, { id, type, text }]);
    setTimeout(() => setItems((l) => l.filter((t) => t.id !== id)), 4000);
  }, []);
  const api_ = useMemo(() => ({ success: (m) => push('success', m), error: (m) => push('error', m), info: (m) => push('info', m) }), [push]);
  return (
    <ToastCtx.Provider value={api_}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            <span className="toast-dot" />
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------- Auth ---------- */
const AuthCtx = createContext();
export const useAuth = () => useContext(AuthCtx);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(getToken()));

  useEffect(() => {
    if (!getToken()) return undefined;
    api('/auth/me').then((r) => setUser(r.user)).catch(() => setToken(null)).finally(() => setLoading(false));
    return undefined;
  }, []);
  useEffect(() => {
    const out = () => setUser(null);
    window.addEventListener('ss:logout', out);
    return () => window.removeEventListener('ss:logout', out);
  }, []);

  const finish = (r) => { setToken(r.token); setUser(r.user); return r.user; };
  const value = useMemo(() => ({
    user, loading,
    login: async (email, password, role) => finish(await api('/auth/login', { method: 'POST', body: { email, password, role } })),
    register: async (body) => finish(await api('/auth/register', { method: 'POST', body })),
    logout: () => { setToken(null); setUser(null); },
  }), [user, loading]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
