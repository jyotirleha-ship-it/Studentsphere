import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth, useTheme, useToast } from '../context';
import { Button, Field, Icon } from '../ui';
import StudentFields, { emptyStudent } from './StudentFields';

const Hero = () => (
  <div className="auth-hero">
    <div className="brand"><span className="logo" style={{ background: 'rgba(255,255,255,.2)' }}>🎓</span>StudentSphere</div>
    <div>
      <h1>One place for every student record.</h1>
      <p>Enrolment, attendance, marks and reports, kept in sync between administrators and students.</p>
    </div>
    <ul><li>Live attendance and performance analytics</li><li>Students see only their own records</li><li>Export reports to CSV in one click</li></ul>
  </div>
);

function ThemeBtn() {
  const { theme, toggle } = useTheme();
  return <button className="icon-btn" style={{ position: 'fixed', top: 14, right: 14, zIndex: 5 }} onClick={toggle} aria-label="Toggle theme"><Icon name={theme === 'dark' ? 'sun' : 'moon'} /></button>;
}

export function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [role, setRole] = useState('admin');
  const [f, setF] = useState({ email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const u = await login(f.email, f.password, role);
      toast.success(`Welcome back, ${u.name}`);
      nav(u.role === 'admin' ? '/admin' : '/me', { replace: true });
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <div className="auth">
      <ThemeBtn />
      <Hero />
      <div className="auth-side">
        <form className="card auth-card" onSubmit={submit}>
          <h2>Sign in</h2>
          <p className="muted">Choose how you use StudentSphere.</p>
          <div className="tabs" style={{ marginTop: '1.1rem', marginBottom: 0 }} role="tablist">
            <button type="button" role="tab" aria-selected={role === 'admin'} className={role === 'admin' ? 'on' : ''} onClick={() => setRole('admin')}>Administrator</button>
            <button type="button" role="tab" aria-selected={role === 'student'} className={role === 'student' ? 'on' : ''} onClick={() => setRole('student')}>Student</button>
          </div>
          <div className="stack">
            {error && <div className="alert" role="alert">{error}</div>}
            <Field label="Email"><input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required autoComplete="username" /></Field>
            <Field label="Password"><input type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required autoComplete="current-password" /></Field>
            <Button type="submit" disabled={busy}>{busy ? 'Signing in…' : `Sign in as ${role === 'admin' ? 'administrator' : 'student'}`}</Button>
          </div>
          {role === 'student' && <p className="muted small" style={{ marginTop: '1rem', textAlign: 'center' }}>New here? <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 600 }}>Create a student account</Link></p>}
        </form>
      </div>
    </div>
  );
}

export function Register() {
  const { register } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [form, setForm] = useState(emptyStudent);
  const [opts, setOpts] = useState({ departments: [], courses: [] });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { api('/auth/options').then(setOpts).catch((e) => setError(e.message)); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(''); setErrors({});
    try {
      const { status, ...body } = form; // status can never be chosen at sign-up
      await register(body);
      toast.success('Account created. Welcome to StudentSphere!');
      nav('/me', { replace: true });
    } catch (err) { setError(err.message); setErrors(err.details || {}); } finally { setBusy(false); }
  };

  return (
    <div className="auth">
      <ThemeBtn />
      <Hero />
      <div className="auth-side">
        <form className="card auth-card wide" onSubmit={submit}>
          <h2>Create your student account</h2>
          <p className="muted">Your details are used to build your personal dashboard.</p>
          {error && <div className="alert" role="alert" style={{ marginTop: '1rem' }}>{error}</div>}
          {!opts.departments.length && !error && <p className="muted small" style={{ marginTop: '1rem' }}>No departments exist yet. Ask the administrator to add departments and courses first.</p>}
          <div style={{ marginTop: '1.2rem' }}>
            <StudentFields form={form} setForm={setForm} errors={errors} departments={opts.departments} courses={opts.courses} showPassword passwordRequired />
          </div>
          <div className="actions" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Link to="/login" className="muted small">Already registered? Sign in</Link>
            <Button type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
