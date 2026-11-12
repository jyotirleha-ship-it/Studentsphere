import { useCallback, useEffect, useState } from 'react';
import { api, fmtDate } from '../api';
import { useAuth, useToast } from '../context';
import { Avatar, Button, Confirm, Empty, Field, Icon, Modal, Pagination, Spinner, useDebounce } from '../ui';

export default function Users() {
  const toast = useToast();
  const { user: me } = useAuth();
  const [q, setQ] = useState({ search: '', role: '', page: 1 });
  const search = useDebounce(q.search);
  const [res, setRes] = useState(null);
  const [modal, setModal] = useState(null); // {type:'new'} | {type:'reset', user}
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(() => api('/users', { params: { ...q, search, limit: 10 } }).then(setRes).catch((e) => toast.error(e.message)), [q.role, q.page, search]); // eslint-disable-line
  useEffect(() => { load(); }, [load]);

  const toggle = async (u) => {
    try { await api(`/users/${u._id}`, { method: 'PUT', body: { isActive: !u.isActive } }); toast.success(u.isActive ? 'Account deactivated' : 'Account activated'); load(); } catch (e) { toast.error(e.message); }
  };
  const remove = async () => {
    try { await api(`/users/${deleting._id}`, { method: 'DELETE' }); toast.success('Account deleted'); setDeleting(null); load(); } catch (e) { toast.error(e.message); setDeleting(null); }
  };

  return (
    <>
      <div className="page-head"><div><h1>User accounts</h1><p>Control who can sign in to StudentSphere.</p></div><Button icon="plus" onClick={() => setModal({ type: 'new' })}>New account</Button></div>
      <div className="toolbar">
        <div className="search"><Icon name="search" size={16} /><input placeholder="Search by name or email" value={q.search} onChange={(e) => setQ({ ...q, search: e.target.value, page: 1 })} aria-label="Search users" /></div>
        <select value={q.role} onChange={(e) => setQ({ ...q, role: e.target.value, page: 1 })} aria-label="Role"><option value="">All roles</option><option value="admin">Administrators</option><option value="student">Students</option></select>
      </div>
      {!res ? <Spinner /> : res.data.length ? (
        <div className="card">
          {res.data.map((u) => (
            <div className="row" key={u._id}>
              <Avatar student={{ fullName: u.name }} size={40} />
              <div className="grow"><b>{u.name}{u._id === me.id && <span className="muted small"> (you)</span>}</b><span className="muted small">{u.email}{u.student?.studentId ? ` · ${u.student.studentId}` : ''} · last login {u.lastLogin ? fmtDate(u.lastLogin) : 'never'}</span></div>
              <span className={`badge ${u.role === 'admin' ? 'accent' : ''}`}>{u.role}</span>
              <span className={`badge ${u.isActive ? 'ok' : 'bad'}`}>{u.isActive ? 'active' : 'deactivated'}</span>
              <Button variant="ghost" size="sm" magnetic={false} disabled={u._id === me.id} onClick={() => toggle(u)}>{u.isActive ? 'Deactivate' : 'Activate'}</Button>
              <button className="icon-btn" aria-label={`Reset password for ${u.name}`} title="Reset password" onClick={() => setModal({ type: 'reset', user: u })}><Icon name="key" /></button>
              <button className="icon-btn danger" aria-label={`Delete ${u.name}`} disabled={u._id === me.id} onClick={() => setDeleting(u)}><Icon name="trash" /></button>
            </div>
          ))}
          <Pagination page={res.page} pages={res.pages} onChange={(p) => setQ({ ...q, page: p })} />
        </div>
      ) : <div className="card"><Empty title="No accounts found" text="Try a different search." /></div>}
      {modal?.type === 'new' && <NewAccount onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
      {modal?.type === 'reset' && <ResetPassword user={modal.user} onClose={() => setModal(null)} />}
      {deleting && <Confirm message={`Delete the login for ${deleting.name}? ${deleting.role === 'student' ? 'The student record is kept.' : ''}`} onConfirm={remove} onCancel={() => setDeleting(null)} />}
    </>
  );
}

function NewAccount({ onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({ role: 'admin', name: '', email: '', password: '', student: '' });
  const [students, setStudents] = useState([]);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  useEffect(() => { api('/students/options').then((r) => setStudents(r.data)).catch(() => {}); }, []);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErrors({});
    try { await api('/users', { method: 'POST', body: f }); toast.success('Account created'); onSaved(); } catch (err) { setErrors(err.details || {}); toast.error(err.message); } finally { setBusy(false); }
  };
  return (
    <Modal title="New account" onClose={onClose}>
      <form onSubmit={submit} className="form-grid">
        <Field label="Account type" className="full"><select value={f.role} onChange={set('role')}><option value="admin">Administrator</option><option value="student">Login for an existing student</option></select></Field>
        {f.role === 'admin' ? (<>
          <Field label="Full name *" error={errors.name}><input value={f.name} onChange={set('name')} required /></Field>
          <Field label="Email *" error={errors.email}><input type="email" value={f.email} onChange={set('email')} required /></Field>
        </>) : (
          <Field label="Student *" className="full" hint="The login uses the student's email address."><select value={f.student} onChange={set('student')} required><option value="">Select student</option>{students.map((s) => <option key={s._id} value={s._id}>{s.fullName} ({s.studentId})</option>)}</select></Field>
        )}
        <Field label="Password *" error={errors.password} className="full" hint="At least 8 characters"><input type="password" minLength={8} value={f.password} onChange={set('password')} required autoComplete="new-password" /></Field>
        <div className="actions full"><Button type="button" variant="ghost" magnetic={false} onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create account'}</Button></div>
      </form>
    </Modal>
  );
}

function ResetPassword({ user, onClose }) {
  const toast = useToast();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try { await api(`/users/${user._id}/reset-password`, { method: 'POST', body: { password } }); toast.success('Password reset'); onClose(); } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  };
  return (
    <Modal title={`Reset password for ${user.name}`} onClose={onClose}>
      <form onSubmit={submit} className="stack" style={{ marginTop: 0 }}>
        <Field label="New password" hint="At least 8 characters. Share it with the user securely."><input type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" /></Field>
        <div className="actions"><Button type="button" variant="ghost" magnetic={false} onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Reset password'}</Button></div>
      </form>
    </Modal>
  );
}
