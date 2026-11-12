import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { useToast } from '../context';
import { Button, Confirm, Empty, Field, Icon, Modal, Spinner, Tilt } from '../ui';

// Departments and courses share the same manage-a-list layout.
function Manager({ title, subtitle, endpoint, noun, render, fields, blank, extraLoad, validate }) {
  const toast = useToast();
  const [items, setItems] = useState(null);
  const [extra, setExtra] = useState({});
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const load = useCallback(() => api(endpoint).then((r) => setItems(r.data)).catch((e) => toast.error(e.message)), [endpoint]); // eslint-disable-line
  useEffect(() => { load(); if (extraLoad) extraLoad().then(setExtra).catch((e) => toast.error(e.message)); }, [load]); // eslint-disable-line

  const remove = async () => {
    try { await api(`${endpoint}/${deleting._id}`, { method: 'DELETE' }); toast.success(`${noun} deleted`); setDeleting(null); load(); } catch (e) { toast.error(e.message); setDeleting(null); }
  };
  return (
    <>
      <div className="page-head"><div><h1>{title}</h1><p>{subtitle}</p></div><Button icon="plus" onClick={() => setEditing({})}>Add {noun.toLowerCase()}</Button></div>
      {!items ? <Spinner /> : items.length ? (
        <div className="grid g-3">
          {items.map((it) => (
            <Tilt key={it._id} className="student-card">
              {render(it)}
              <div className="card-actions">
                <Button variant="ghost" size="sm" icon="edit" magnetic={false} onClick={() => setEditing(it)}>Edit</Button>
                <button className="icon-btn danger" aria-label={`Delete ${it.name}`} onClick={() => setDeleting(it)}><Icon name="trash" /></button>
              </div>
            </Tilt>
          ))}
        </div>
      ) : <div className="card"><Empty title={`No ${noun.toLowerCase()}s yet`} text={`Add a ${noun.toLowerCase()} to get started.`} /></div>}
      {editing && <FormModal noun={noun} item={editing} endpoint={endpoint} fields={fields} blank={blank} extra={extra} validate={validate} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      {deleting && <Confirm message={`Delete ${deleting.name}? This cannot be undone.`} onConfirm={remove} onCancel={() => setDeleting(null)} />}
    </>
  );
}

function FormModal({ noun, item, endpoint, fields, blank, extra, onClose, onSaved }) {
  const toast = useToast();
  const isNew = !item._id;
  const [f, setF] = useState(isNew ? blank : Object.fromEntries(Object.keys(blank).map((k) => [k, item[k]?._id || item[k] || ''])));
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErrors({});
    try { await api(isNew ? endpoint : `${endpoint}/${item._id}`, { method: isNew ? 'POST' : 'PUT', body: f }); toast.success(`${noun} ${isNew ? 'added' : 'updated'}`); onSaved(); }
    catch (err) { setErrors(err.details || {}); toast.error(err.message); } finally { setBusy(false); }
  };
  return (
    <Modal title={`${isNew ? 'Add' : 'Edit'} ${noun.toLowerCase()}`} onClose={onClose}>
      <form onSubmit={submit} className="form-grid">
        {fields(f, (k) => (e) => setF({ ...f, [k]: e.target.value }), errors, extra)}
        <div className="actions full"><Button type="button" variant="ghost" magnetic={false} onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save'}</Button></div>
      </form>
    </Modal>
  );
}

export function Departments() {
  return (
    <Manager
      title="Departments" subtitle="Academic departments and how many students and courses each has." endpoint="/departments" noun="Department"
      blank={{ name: '', code: '', head: '', description: '' }}
      render={(d) => (<>
        <div className="top"><span className="stat-ico"><Icon name="building" /></span><div><h4>{d.name}</h4><span className="muted small">{d.code}{d.head ? ` · ${d.head}` : ''}</span></div></div>
        <div className="grid g-2" style={{ gap: '.6rem' }}><div><div className="muted small">Students</div><b style={{ fontFamily: 'Sora, sans-serif', fontSize: '1.3rem' }}>{d.studentCount}</b></div><div><div className="muted small">Courses</div><b style={{ fontFamily: 'Sora, sans-serif', fontSize: '1.3rem' }}>{d.courseCount}</b></div></div>
        {d.description && <p className="muted small">{d.description}</p>}
      </>)}
      fields={(f, set, e) => (<>
        <Field label="Name *" error={e.name}><input value={f.name} onChange={set('name')} required /></Field>
        <Field label="Code *" error={e.code}><input value={f.code} onChange={set('code')} maxLength={10} placeholder="CSE" required /></Field>
        <Field label="Head of department" error={e.head} className="full"><input value={f.head} onChange={set('head')} /></Field>
        <Field label="Description" error={e.description} className="full"><textarea rows={2} value={f.description} onChange={set('description')} /></Field>
      </>)}
    />
  );
}

export function Courses() {
  return (
    <Manager
      title="Courses" subtitle="Programmes offered by each department." endpoint="/courses" noun="Course"
      blank={{ name: '', code: '', department: '', durationYears: 4, description: '' }}
      extraLoad={async () => ({ departments: (await api('/departments')).data })}
      render={(c) => (<>
        <div className="top"><span className="stat-ico"><Icon name="book" /></span><div style={{ minWidth: 0 }}><h4>{c.name}</h4><span className="muted small">{c.code} · {c.department?.name}</span></div></div>
        <div className="grid g-2" style={{ gap: '.6rem' }}><div><div className="muted small">Duration</div><b>{c.durationYears} years</b></div><div><div className="muted small">Enrolled</div><b>{c.studentCount} students</b></div></div>
      </>)}
      fields={(f, set, e, x) => (<>
        <Field label="Name *" error={e.name} className="full"><input value={f.name} onChange={set('name')} required /></Field>
        <Field label="Code *" error={e.code}><input value={f.code} onChange={set('code')} maxLength={15} required /></Field>
        <Field label="Duration (years)" error={e.durationYears}><input type="number" min="1" max="6" value={f.durationYears} onChange={set('durationYears')} /></Field>
        <Field label="Department *" error={e.department} className="full"><select value={f.department} onChange={set('department')} required><option value="">Select department</option>{(x.departments || []).map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}</select></Field>
        <Field label="Description" error={e.description} className="full"><textarea rows={2} value={f.description} onChange={set('description')} /></Field>
      </>)}
    />
  );
}
