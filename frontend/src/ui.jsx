import { useEffect, useRef, useState } from 'react';

/* ---------- Icons (24px stroke set) ---------- */
const PATHS = {
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
  users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  check: 'M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
  award: 'M12 15a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM8.21 13.89L7 23l5-3 5 3-1.21-9.12',
  building: 'M3 21h18M5 21V7l8-4v18M19 21V11l-6-4M9 9v.01M9 12v.01M9 15v.01M9 18v.01',
  book: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5z',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8',
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42',
  moon: 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  plus: 'M12 5v14M5 12h14',
  edit: 'M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z',
  trash: 'M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
  menu: 'M3 12h18M3 6h18M3 18h18',
  x: 'M18 6L6 18M6 6l12 12',
  chevron: 'M15 18l-6-6 6-6',
  print: 'M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z',
  key: 'M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.78 7.78 5.5 5.5 0 0 1 7.78-7.78zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4',
  calendar: 'M19 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM16 2v4M8 2v4M3 10h18',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  trend: 'M23 6l-9.5 9.5-5-5L1 18M17 6h6v6',
};
export const Icon = ({ name, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={PATHS[name]} /></svg>
);

/* ---------- Rolling number (odometer) ---------- */
export function Counter({ value = 0, decimals = 0, suffix = '' }) {
  const target = Number(value || 0).toFixed(decimals);
  const [go, setGo] = useState(false);
  useEffect(() => {
    setGo(false);
    const t = setTimeout(() => setGo(true), 80);
    return () => clearTimeout(t);
  }, [target]);
  const str = go ? target : target.replace(/\d/g, '0');
  return (
    <span className="odo" aria-label={`${target}${suffix}`}>
      {str.split('').map((ch, i) =>
        /\d/.test(ch) ? (
          <span className="odo-col" key={i} aria-hidden="true">
            <span className="odo-strip" style={{ transform: `translateY(-${Number(ch) * 10}%)` }}>
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => <span key={n}>{n}</span>)}
            </span>
          </span>
        ) : <span key={i} aria-hidden="true">{ch}</span>
      )}
      {suffix}
    </span>
  );
}

/* ---------- Magnetic button ---------- */
export function Button({ variant = 'primary', size, icon, children, className = '', magnetic = true, ...props }) {
  const ref = useRef(null);
  const move = (e) => {
    if (!magnetic || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const r = ref.current.getBoundingClientRect();
    ref.current.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.22}px, ${(e.clientY - r.top - r.height / 2) * 0.3}px)`;
  };
  const leave = () => { if (ref.current) ref.current.style.transform = ''; };
  return (
    <button ref={ref} onMouseMove={move} onMouseLeave={leave} className={`btn ${variant} ${size || ''} ${className}`} {...props}>
      {icon && <Icon name={icon} size={size === 'sm' ? 15 : 17} />}
      {children}
    </button>
  );
}

/* ---------- 3D tilt card ---------- */
export function Tilt({ children, className = '', max = 7, ...props }) {
  const ref = useRef(null);
  const move = (e) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const r = ref.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    ref.current.style.transform = `perspective(900px) rotateX(${-y * max}deg) rotateY(${x * max}deg) translateZ(0)`;
    ref.current.style.setProperty('--gx', `${(x + 0.5) * 100}%`);
    ref.current.style.setProperty('--gy', `${(y + 0.5) * 100}%`);
  };
  const leave = () => { if (ref.current) ref.current.style.transform = ''; };
  return <div ref={ref} onMouseMove={move} onMouseLeave={leave} className={`card tilt ${className}`} {...props}>{children}</div>;
}

/* ---------- Modal / Confirm ---------- */
export function Modal({ title, onClose, children, wide }) {
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head"><h3>{title}</h3><button className="icon-btn" onClick={onClose} aria-label="Close"><Icon name="x" /></button></div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function Confirm({ title = 'Are you sure?', message, confirmText = 'Delete', onConfirm, onCancel }) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="muted">{message}</p>
      <div className="actions">
        <Button variant="ghost" onClick={onCancel} magnetic={false}>Cancel</Button>
        <Button variant="danger" disabled={busy} magnetic={false} onClick={async () => { setBusy(true); try { await onConfirm(); } finally { setBusy(false); } }}>{busy ? 'Working…' : confirmText}</Button>
      </div>
    </Modal>
  );
}

/* ---------- Small pieces ---------- */
export const Avatar = ({ student, size = 44 }) => {
  const name = student?.fullName || '?';
  const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return student?.profileImage
    ? <img className="avatar" style={{ width: size, height: size }} src={student.profileImage} alt={name} />
    : <span className="avatar ph" style={{ width: size, height: size, fontSize: size * 0.38 }}>{initials}</span>;
};

export const Field = ({ label, error, children, hint, className = '' }) => (
  <label className={`field ${className} ${error ? 'has-error' : ''}`}>
    <span>{label}</span>
    {children}
    {error ? <small className="err">{error}</small> : hint ? <small className="muted">{hint}</small> : null}
  </label>
);

export const Empty = ({ title, text, action }) => (
  <div className="empty"><div className="empty-art" /><h4>{title}</h4><p className="muted">{text}</p>{action}</div>
);

export const Spinner = () => <div className="spinner" role="status" aria-label="Loading" />;

export function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null;
  return (
    <div className="pager">
      <Button variant="ghost" size="sm" magnetic={false} disabled={page <= 1} onClick={() => onChange(page - 1)}>Previous</Button>
      <span className="muted">Page {page} of {pages}</span>
      <Button variant="ghost" size="sm" magnetic={false} disabled={page >= pages} onClick={() => onChange(page + 1)}>Next</Button>
    </div>
  );
}

export const Ring = ({ value = 0, size = 64, label }) => {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="ring" role="img" aria-label={`${value}%`}>
      <circle cx={size / 2} cy={size / 2} r={r} className="ring-bg" />
      <circle cx={size / 2} cy={size / 2} r={r} className="ring-fg" strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(value, 100) / 100)} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="50%" dy=".35em" textAnchor="middle" className="ring-t">{label ?? `${Math.round(value)}%`}</text>
    </svg>
  );
};

export const useDebounce = (value, ms = 350) => {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
};
