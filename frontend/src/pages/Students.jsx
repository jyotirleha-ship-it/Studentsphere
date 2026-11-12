import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, download, fmtDate } from '../api';
import { useToast } from '../context';
import { Avatar, Button, Confirm, Empty, Icon, Modal, Pagination, Spinner, Tilt, useDebounce } from '../ui';
import StudentFields, { emptyStudent, toForm } from './StudentFields';

export default function Students() {
  const toast = useToast();
  const [q, setQ] = useState({ search: '', department: '', year: '', status: '', sort: 'createdAt', order: 'desc', page: 1 });
  const search = useDebounce(q.search);
  const [res, setRes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({ departments: [], courses: [] });
  const [editing, setEditing] = useState(null); // null | 'new' | student
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    api('/students', { params: { ...q, search, limit: 9 } }).then(setRes).catch((e) => toast.error(e.message)).finally(() => setLoading(false));
  }, [q.department, q.year, q.status, q.sort, q.order, q.page, search]); // eslint-disable-line
  useEffect(load, [load]);
  useEffect(() => { Promise.all([api('/departments'), api('/courses')]).then(([d, c]) => setMeta({ departments: d.data, courses: c.data })).catch((e) => toast.error(e.message)); }, []); // eslint-disable-line

  const set = (k) => (e) => setQ((s) => ({ ...s, [k]: e.target.value, page: k === 'page' ? e.target.value : 1 }));
  const remove = async () => {
    try { await api(`/students/${deleting._id}`, { method: 'DELETE' }); toast.success(`${deleting.fullName} deleted`); setDeleting(null); load(); } catch (e) { toast.error(e.message); }
  };
  const exportCsv = () => download('/students/export/csv', { search, department: q.department, year: q.year, status: q.status }, 'students.csv').then(() => toast.success('CSV exported')).catch((e) => toast.error(e.message));

  return (
    <>
      <div className="page-head">
        <div><h1>Students</h1><p>{res ? `${res.total} student${res.total === 1 ? '' : 's'} found` : 'Loading…'}</p></div>
        <div style={{ display: 'flex', gap: '.6rem' }}>
          <Button variant="ghost" icon="download" onClick={exportCsv}>Export CSV</Button>
          <Button icon="plus" onClick={() => setEditing('new')}>Add student</Button>
        </div>
      </div>

      <div className="toolbar">
        <div className="search"><Icon name="search" size={16} /><input placeholder="Search by name or student ID" value={q.search} onChange={set('search')} aria-label="Search students" /></div>
        <select value={q.department} onChange={set('department')} aria-label="Department"><option value="">All departments</option>{meta.departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}</select>
        <select value={q.year} onChange={set('year')} aria-label="Year"><option value="">All years</option>{[1, 2, 3, 4, 5, 6].map((y) => <option key={y} value={y}>Year {y}</option>)}</select>
        <select value={q.status} onChange={set('status')} aria-label="Status"><option value="">Any status</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
        <select value={`${q.sort}:${q.order}`} onChange={(e) => { const [sort, order] = e.target.value.split(':'); setQ((s) => ({ ...s, sort, order, page: 1 })); }} aria-label="Sort">
          <option value="createdAt:desc">Newest first</option><option value="createdAt:asc">Oldest first</option><option value="fullName:asc">Name A–Z</option><option value="fullName:desc">Name Z–A</option>
          <option value="studentId:asc">Student ID ↑</option><option value="year:asc">Year ↑</option><option value="year:desc">Year ↓</option>
        </select>
      </div>

      {loading && !res ? <Spinner /> : res?.data.length ? (
        <div className="grid g-3" style={{ opacity: loading ? 0.6 : 1, transition: 'opacity .2s' }}>
          {res.data.map((s) => (
            <Tilt key={s._id} className="student-card">
              <div className="top">
                <Avatar student={s} size={52} />
                <div style={{ minWidth: 0 }}><h4>{s.fullName}</h4><span className="muted small">{s.studentId}</span></div>
                <span className={`badge ${s.status === 'active' ? 'ok' : 'bad'}`} style={{ marginLeft: 'auto' }}>{s.status}</span>
              </div>
              <dl className="kv">
                <div><dt>Department</dt><dd>{s.department?.code || '—'}</dd></div>
                <div><dt>Course</dt><dd>{s.course?.code || '—'}</dd></div>
                <div><dt>Year / Sem</dt><dd>{s.year} / {s.semester}</dd></div>
                <div><dt>Enrolled</dt><dd>{fmtDate(s.enrollmentDate)}</dd></div>
                <div style={{ gridColumn: '1 / -1' }}><dt>Email</dt><dd>{s.email}</dd></div>
              </dl>
              <div className="card-actions">
                <Link className="btn ghost sm" to={`/admin/students/${s._id}`}>View profile</Link>
                <button className="icon-btn" aria-label={`Edit ${s.fullName}`} onClick={() => setEditing(s)}><Icon name="edit" /></button>
                <button className="icon-btn danger" aria-label={`Delete ${s.fullName}`} onClick={() => setDeleting(s)}><Icon name="trash" /></button>
              </div>
            </Tilt>
          ))}
        </div>
      ) : (
        <div className="card"><Empty title="No students match" text="Try different filters, or add a new student." action={<Button onClick={() => setEditing('new')} icon="plus">Add student</Button>} /></div>
      )}
      {res && <Pagination page={res.page} pages={res.pages} onChange={(p) => setQ((s) => ({ ...s, page: p }))} />}

      {editing && <StudentModal student={editing === 'new' ? null : editing} meta={meta} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      {deleting && <Confirm message={`Delete ${deleting.fullName} (${deleting.studentId})? Their login, attendance and marks are deleted too. This cannot be undone.`} onConfirm={remove} onCancel={() => setDeleting(null)} />}
    </>
  );
}

function StudentModal({ student, meta, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(student ? toForm(student) : emptyStudent);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErrors({});
    try {
      const body = { ...form };
      if (student) delete body.password;
      await api(student ? `/students/${student._id}` : '/students', { method: student ? 'PUT' : 'POST', body });
      toast.success(student ? 'Student updated' : 'Student added');
      onSaved();
    } catch (err) { setErrors(err.details || {}); toast.error(err.message); } finally { setBusy(false); }
  };

  return (
    <Modal title={student ? 'Edit student' : 'Add student'} onClose={onClose} wide>
      <form onSubmit={submit}>
        <StudentFields form={form} setForm={setForm} errors={errors} departments={meta.departments} courses={meta.courses} showStatus showPassword={!student} passwordLabel="Login password" />
        <div className="actions">
          <Button type="button" variant="ghost" magnetic={false} onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={busy}>{busy ? 'Saving…' : student ? 'Save changes' : 'Add student'}</Button>
        </div>
      </form>
    </Modal>
  );
}
