import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Bar, Line } from 'react-chartjs-2';
import { api, fmtDate, imageToDataURL, inputDate, monthName } from '../api';
import { useAuth, useToast } from '../context';
import { PALETTE, useChartOptions } from '../charts';
import { Avatar, Button, Counter, Empty, Field, Icon, Modal, Ring, Spinner, Tilt } from '../ui';

const Info = ({ k, v }) => <div><dt>{k}</dt><dd>{v || '—'}</dd></div>;

// One component serves both the admin's student profile page and the student's own dashboard.
export default function StudentView({ studentId, admin, self }) {
  const params = useParams();
  const id = studentId || params.id;
  const toast = useToast();
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [pwd, setPwd] = useState(false);
  const att = useChartOptions({ max: 100, percent: true });
  const marks = useChartOptions({ max: 100, percent: true });
  const sem = useChartOptions({ max: 100, percent: true });

  const load = useCallback(() => api(`/students/${id}/overview`).then((r) => setD(r.data)).catch((e) => setError(e.message)), [id]);
  useEffect(() => { setD(null); load(); }, [load]);

  if (error) return <div className="alert">{error}</div>;
  if (!d) return <Spinner />;
  const { student: s, attendance, academic, activities } = d;
  const a = attendance.summary;
  const low = a.total > 0 && a.percentage < 75;

  return (
    <>
      {admin && <Link to="/admin/students" className="muted small" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: '.8rem' }}><Icon name="chevron" size={14} /> All students</Link>}
      <div className="card" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1.2rem' }}>
        <Avatar student={s} size={84} />
        <div style={{ flex: 1, minWidth: 220 }}>
          <h1>{s.fullName}</h1>
          <div className="muted">{s.studentId} · {s.department?.name} · {s.course?.name}</div>
          <div style={{ marginTop: '.5rem', display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
            <span className={`badge ${s.status === 'active' ? 'ok' : 'bad'}`}>{s.status}</span>
            <span className="badge accent">Year {s.year}</span><span className="badge accent">Semester {s.semester}</span>
          </div>
        </div>
        <div className="no-print" style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
          {self && <><Button icon="edit" onClick={() => setEditing(true)}>Edit profile</Button><Button variant="ghost" icon="key" onClick={() => setPwd(true)}>Change password</Button></>}
          {admin && <Link className="btn ghost" to={`/admin/reports?student=${s._id}`}><Icon name="file" size={16} /> Performance report</Link>}
        </div>
      </div>

      <div className="grid g-4" style={{ marginTop: '1.1rem' }}>
        <Tilt className="stat"><div className="stat-top"><span>Attendance</span><span className="stat-ico"><Icon name="check" /></span></div><div className="stat-val"><Counter value={a.percentage} decimals={1} suffix="%" /></div><div className="muted small">{a.present} present · {a.absent} absent{low ? ' · below 75%' : ''}</div></Tilt>
        <Tilt className="stat"><div className="stat-top"><span>Overall score</span><span className="stat-ico"><Icon name="award" /></span></div><div className="stat-val"><Counter value={academic.summary.percentage} decimals={1} suffix="%" /></div><div className="muted small">{academic.summary.obtained} / {academic.summary.max} marks</div></Tilt>
        <Tilt className="stat"><div className="stat-top"><span>Grade</span><span className="stat-ico"><Icon name="trend" /></span></div><div className="stat-val">{academic.summary.grade}</div><div className="muted small">{academic.summary.best ? `Best: ${academic.summary.best.subject}` : 'No marks yet'}</div></Tilt>
        <Tilt className="stat"><div className="stat-top"><span>Subjects</span><span className="stat-ico"><Icon name="book" /></span></div><div className="stat-val"><Counter value={academic.summary.subjects} /></div><div className="muted small">recorded</div></Tilt>
      </div>

      <div className="grid g-2" style={{ marginTop: '1.1rem' }}>
        <div className="card">
          <h2>Personal information</h2>
          <dl className="kv" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
            <Info k="Email" v={s.email} /><Info k="Phone" v={s.phone} /><Info k="Date of birth" v={fmtDate(s.dateOfBirth)} /><Info k="Gender" v={s.gender} />
            <Info k="Enrolled on" v={fmtDate(s.enrollmentDate)} /><Info k="Address" v={s.address} />
          </dl>
        </div>
        <div className="card">
          <h2>Department information</h2>
          <dl className="kv" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
            <Info k="Department" v={s.department?.name} /><Info k="Code" v={s.department?.code} /><Info k="Head of department" v={s.department?.head} /><Info k="Course" v={`${s.course?.name || ''} (${s.course?.code || ''})`} />
          </dl>
        </div>
      </div>

      <div className="grid g-2" style={{ marginTop: '1.1rem' }}>
        <div className="card">
          <h2>Monthly attendance</h2>
          {attendance.monthly.length ? <div className="chart-box sm"><Bar key={att.key} options={att.options} data={{ labels: attendance.monthly.map((m) => monthName(m.month)), datasets: [{ label: 'Attendance %', data: attendance.monthly.map((m) => m.percentage), backgroundColor: '#7c5cff', borderRadius: 10, maxBarThickness: 48 }] }} /></div> : <Empty title="No attendance recorded" text="Attendance will appear here once it is marked." />}
        </div>
        <div className="card">
          <h2>Subject performance</h2>
          {academic.records.length ? <div className="chart-box sm"><Bar key={marks.key} options={marks.options} data={{ labels: academic.records.map((r) => r.subject), datasets: [{ label: 'Score %', data: academic.records.map((r) => r.percentage), backgroundColor: PALETTE, borderRadius: 10, maxBarThickness: 48 }] }} /></div> : <Empty title="No marks recorded" text="Subject marks will appear here once added." />}
        </div>
      </div>

      {academic.summary.semesters.length > 1 && (
        <div className="card" style={{ marginTop: '1.1rem' }}>
          <h2>Semester progress</h2>
          <div className="chart-box sm"><Line key={sem.key} options={sem.options} data={{ labels: academic.summary.semesters.map((x) => `Sem ${x.semester}`), datasets: [{ label: 'Score %', data: academic.summary.semesters.map((x) => x.percentage), borderColor: '#22a6ff', backgroundColor: 'rgba(34,166,255,.15)', fill: true, tension: 0.4, borderWidth: 3, pointRadius: 5 }] }} /></div>
        </div>
      )}

      <div className="grid g-main" style={{ marginTop: '1.1rem' }}>
        <div className="card">
          <h2>Subject marks</h2>
          {academic.records.length ? academic.records.map((r) => (
            <div className="row" key={r._id}>
              <Ring value={r.percentage} size={54} />
              <div className="grow"><b>{r.subject}</b><span className="muted small">Semester {r.semester} · Internal {r.internalMarks}/{r.maxInternal} · Exam {r.examMarks}/{r.maxExam}</span></div>
              <div className="right"><b>{r.total}/{r.maxInternal + r.maxExam}</b><div><span className={`badge ${r.grade === 'F' ? 'bad' : 'accent'}`}>{r.grade}</span></div></div>
            </div>
          )) : <Empty title="No subject records" text="Nothing has been recorded yet." />}
        </div>
        <div className="card">
          <h2>Recent activity</h2>
          {activities.length ? <div className="timeline">{activities.map((x, i) => <div className="tl" key={i}><i /><div><div>{x.text}</div><span className="muted small">{new Date(x.at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span></div></div>)}</div> : <p className="muted">No activity yet.</p>}
        </div>
      </div>

      <div className="card" style={{ marginTop: '1.1rem' }}>
        <h2>Attendance history <span className="muted small">(latest {attendance.data.length})</span></h2>
        {attendance.data.length ? (
          <div className="chips">{attendance.data.map((r) => <span key={r._id} className={`chip ${r.status}`} title={`${fmtDate(r.date)}: ${r.status}`}>{r.status === 'present' ? 'P' : 'A'}</span>)}</div>
        ) : <p className="muted">No attendance has been marked yet.</p>}
        {attendance.data.length > 0 && <div className="muted small" style={{ marginTop: '.8rem' }}>Hover a box to see the date. P = present, A = absent.</div>}
      </div>

      {editing && <SelfEdit student={s} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); load(); toast.success('Profile updated'); }} />}
      {pwd && <PasswordModal onClose={() => setPwd(false)} />}
    </>
  );
}

function SelfEdit({ student, onClose, onSaved }) {
  const toast = useToast();
  const file = useRef(null);
  const [f, setF] = useState({ fullName: student.fullName, phone: student.phone || '', dateOfBirth: inputDate(student.dateOfBirth), gender: student.gender || '', address: student.address || '', profileImage: student.profileImage || '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErrors({});
    try { await api('/students/me', { method: 'PUT', body: f }); onSaved(); } catch (err) { setErrors(err.details || {}); toast.error(err.message); } finally { setBusy(false); }
  };
  return (
    <Modal title="Edit profile" onClose={onClose}>
      <form onSubmit={submit} className="form-grid">
        <div className="full" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Avatar student={{ fullName: f.fullName, profileImage: f.profileImage }} size={64} />
          <input ref={file} hidden type="file" accept="image/*" onChange={async (e) => { try { setF((x) => ({ ...x, profileImage: '' })); const u = await imageToDataURL(e.target.files[0]); setF((x) => ({ ...x, profileImage: u })); } catch (er) { toast.error(er.message); } }} />
          <Button type="button" variant="ghost" size="sm" magnetic={false} onClick={() => file.current.click()}>Change photo</Button>
        </div>
        <Field label="Full name" error={errors.fullName} className="full"><input value={f.fullName} onChange={set('fullName')} required /></Field>
        <Field label="Phone" error={errors.phone}><input value={f.phone} onChange={set('phone')} /></Field>
        <Field label="Date of birth" error={errors.dateOfBirth}><input type="date" value={f.dateOfBirth} onChange={set('dateOfBirth')} /></Field>
        <Field label="Gender" error={errors.gender}><select value={f.gender} onChange={set('gender')}><option value="">Select</option><option>Male</option><option>Female</option><option>Other</option></select></Field>
        <Field label="Address" error={errors.address} className="full"><textarea rows={2} value={f.address} onChange={set('address')} /></Field>
        <p className="muted small full">Student ID, email, department and year are managed by the administrator.</p>
        <div className="actions full"><Button type="button" variant="ghost" magnetic={false} onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</Button></div>
      </form>
    </Modal>
  );
}

function PasswordModal({ onClose }) {
  const toast = useToast();
  const [f, setF] = useState({ currentPassword: '', newPassword: '' });
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try { await api('/auth/change-password', { method: 'POST', body: f }); toast.success('Password updated'); onClose(); } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  };
  return (
    <Modal title="Change password" onClose={onClose}>
      <form onSubmit={submit} className="stack" style={{ marginTop: 0 }}>
        <Field label="Current password"><input type="password" value={f.currentPassword} onChange={(e) => setF({ ...f, currentPassword: e.target.value })} required autoComplete="current-password" /></Field>
        <Field label="New password" hint="At least 8 characters"><input type="password" minLength={8} value={f.newPassword} onChange={(e) => setF({ ...f, newPassword: e.target.value })} required autoComplete="new-password" /></Field>
        <div className="actions"><Button type="button" variant="ghost" magnetic={false} onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? 'Updating…' : 'Update password'}</Button></div>
      </form>
    </Modal>
  );
}
