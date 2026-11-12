import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar } from 'react-chartjs-2';
import { api } from '../api';
import { useToast } from '../context';
import { PALETTE, useChartOptions } from '../charts';
import { Button, Confirm, Empty, Field, Icon, Modal, Pagination, Ring, Spinner, useDebounce } from '../ui';

const blank = { student: '', subject: '', semester: 1, maxInternal: 40, maxExam: 60, internalMarks: '', examMarks: '' };

export default function Marks() {
  const toast = useToast();
  const [students, setStudents] = useState([]);
  const [q, setQ] = useState({ student: '', semester: '', subject: '', page: 1 });
  const subject = useDebounce(q.subject);
  const [res, setRes] = useState(null);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const chart = useChartOptions({ max: 100, percent: true });
  const [perf, setPerf] = useState(null);

  useEffect(() => { api('/students/options').then((r) => setStudents(r.data)).catch((e) => toast.error(e.message)); }, []); // eslint-disable-line
  const load = useCallback(() => {
    api('/academic', { params: { ...q, subject, limit: 8 } }).then(setRes).catch((e) => toast.error(e.message));
    if (q.student) api(`/academic/student/${q.student}`).then((r) => setPerf(r.data)).catch(() => setPerf(null)); else setPerf(null);
  }, [q.student, q.semester, q.page, subject]); // eslint-disable-line
  useEffect(load, [load]);

  const remove = async () => {
    try { await api(`/academic/${deleting._id}`, { method: 'DELETE' }); toast.success('Record deleted'); setDeleting(null); load(); } catch (e) { toast.error(e.message); }
  };
  const filter = (k) => (e) => setQ({ ...q, [k]: e.target.value, page: 1 });

  return (
    <>
      <div className="page-head"><div><h1>Marks</h1><p>Internal and examination marks per subject.</p></div><Button icon="plus" onClick={() => setEditing({})}>Add subject record</Button></div>
      <div className="toolbar">
        <select value={q.student} onChange={filter('student')} aria-label="Student" style={{ minWidth: 220 }}><option value="">All students</option>{students.map((s) => <option key={s._id} value={s._id}>{s.fullName} ({s.studentId})</option>)}</select>
        <select value={q.semester} onChange={filter('semester')} aria-label="Semester"><option value="">All semesters</option>{Array.from({ length: 12 }, (_, i) => i + 1).map((s) => <option key={s} value={s}>Semester {s}</option>)}</select>
        <div className="search"><Icon name="search" size={16} /><input placeholder="Filter by subject" value={q.subject} onChange={filter('subject')} aria-label="Subject" /></div>
        {q.student && <Link className="btn ghost" to={`/admin/reports?student=${q.student}`}><Icon name="file" size={16} /> Performance report</Link>}
      </div>

      {perf && perf.records.length > 0 && (
        <div className="card" style={{ marginBottom: '1.1rem' }}>
          <h2>Performance · overall {perf.summary.percentage}% (grade {perf.summary.grade})</h2>
          <div className="chart-box sm"><Bar key={chart.key} options={chart.options} data={{ labels: perf.records.map((r) => `${r.subject} (S${r.semester})`), datasets: [{ label: 'Score %', data: perf.records.map((r) => r.percentage), backgroundColor: PALETTE, borderRadius: 10, maxBarThickness: 50 }] }} /></div>
        </div>
      )}

      {!res ? <Spinner /> : res.data.length ? (
        <div className="card">
          {res.data.map((r) => (
            <div className="row" key={r._id}>
              <Ring value={r.percentage} size={58} />
              <div className="grow"><b>{r.subject} <span className="badge accent">{r.grade}</span></b><span className="muted small">{r.student?.fullName} ({r.student?.studentId}) · Semester {r.semester}</span></div>
              <div className="muted small right" style={{ minWidth: 150 }}>Internal {r.internalMarks}/{r.maxInternal}<br />Exam {r.examMarks}/{r.maxExam}</div>
              <div className="right" style={{ minWidth: 70 }}><b>{r.total}/{r.maxInternal + r.maxExam}</b></div>
              <button className="icon-btn" aria-label={`Edit ${r.subject}`} onClick={() => setEditing(r)}><Icon name="edit" /></button>
              <button className="icon-btn danger" aria-label={`Delete ${r.subject}`} onClick={() => setDeleting(r)}><Icon name="trash" /></button>
            </div>
          ))}
          <Pagination page={res.page} pages={res.pages} onChange={(p) => setQ({ ...q, page: p })} />
        </div>
      ) : <div className="card"><Empty title="No records found" text="Add a subject record to see marks here." action={<Button icon="plus" onClick={() => setEditing({})}>Add subject record</Button>} /></div>}

      {editing && <RecordModal item={editing} students={students} defaultStudent={q.student} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      {deleting && <Confirm message={`Delete ${deleting.subject} marks for ${deleting.student?.fullName}?`} onConfirm={remove} onCancel={() => setDeleting(null)} />}
    </>
  );
}

function RecordModal({ item, students, defaultStudent, onClose, onSaved }) {
  const toast = useToast();
  const isNew = !item._id;
  const [f, setF] = useState(isNew ? { ...blank, student: defaultStudent } : { student: item.student._id, subject: item.subject, semester: item.semester, maxInternal: item.maxInternal, maxExam: item.maxExam, internalMarks: item.internalMarks, examMarks: item.examMarks });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  // Client-side checks mirror the server rules, so mistakes are caught before the request.
  const check = () => {
    const e = {};
    const n = (v) => v !== '' && Number.isFinite(Number(v));
    if (!f.student) e.student = 'Select a student';
    if (!f.subject.trim()) e.subject = 'Subject is required';
    if (!n(f.internalMarks) || Number(f.internalMarks) < 0) e.internalMarks = 'Enter marks of 0 or more';
    else if (Number(f.internalMarks) > Number(f.maxInternal)) e.internalMarks = `Cannot exceed ${f.maxInternal}`;
    if (!n(f.examMarks) || Number(f.examMarks) < 0) e.examMarks = 'Enter marks of 0 or more';
    else if (Number(f.examMarks) > Number(f.maxExam)) e.examMarks = `Cannot exceed ${f.maxExam}`;
    return e;
  };
  const total = Number(f.internalMarks || 0) + Number(f.examMarks || 0);
  const max = Number(f.maxInternal) + Number(f.maxExam);

  const submit = async (ev) => {
    ev.preventDefault();
    const e = check();
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try { await api(isNew ? '/academic' : `/academic/${item._id}`, { method: isNew ? 'POST' : 'PUT', body: f }); toast.success(isNew ? 'Record added' : 'Record updated'); onSaved(); }
    catch (err) { setErrors(err.details || {}); toast.error(err.message); } finally { setBusy(false); }
  };

  return (
    <Modal title={isNew ? 'Add subject record' : 'Edit subject record'} onClose={onClose}>
      <form onSubmit={submit} className="form-grid" noValidate>
        <Field label="Student *" error={errors.student} className="full"><select value={f.student} onChange={set('student')} disabled={!isNew}><option value="">Select student</option>{students.map((s) => <option key={s._id} value={s._id}>{s.fullName} ({s.studentId})</option>)}</select></Field>
        <Field label="Subject *" error={errors.subject}><input value={f.subject} onChange={set('subject')} /></Field>
        <Field label="Semester *" error={errors.semester}><select value={f.semester} onChange={set('semester')}>{Array.from({ length: 12 }, (_, i) => i + 1).map((s) => <option key={s} value={s}>Semester {s}</option>)}</select></Field>
        <Field label="Internal marks *" error={errors.internalMarks}><input type="number" min="0" step="0.5" value={f.internalMarks} onChange={set('internalMarks')} /></Field>
        <Field label="Max internal" error={errors.maxInternal}><input type="number" min="1" value={f.maxInternal} onChange={set('maxInternal')} /></Field>
        <Field label="Exam marks *" error={errors.examMarks}><input type="number" min="0" step="0.5" value={f.examMarks} onChange={set('examMarks')} /></Field>
        <Field label="Max exam" error={errors.maxExam}><input type="number" min="1" value={f.maxExam} onChange={set('maxExam')} /></Field>
        <div className="full muted">Total: <b style={{ color: 'var(--text)' }}>{total}/{max}</b> · {max ? Math.round((total / max) * 1000) / 10 : 0}%</div>
        <div className="actions full"><Button type="button" variant="ghost" magnetic={false} onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save record'}</Button></div>
      </form>
    </Modal>
  );
}
