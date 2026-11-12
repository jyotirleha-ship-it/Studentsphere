import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, download, monthName, today } from '../api';
import { useToast } from '../context';
import { Avatar, Button, Counter, Empty, Spinner } from '../ui';

export default function Attendance() {
  const [tab, setTab] = useState('mark');
  return (
    <>
      <div className="page-head"><div><h1>Attendance</h1><p>Mark daily attendance and review monthly reports.</p></div></div>
      <div className="tabs" role="tablist"><button className={tab === 'mark' ? 'on' : ''} onClick={() => setTab('mark')}>Mark attendance</button><button className={tab === 'report' ? 'on' : ''} onClick={() => setTab('report')}>Monthly report</button></div>
      {tab === 'mark' ? <Mark /> : <Report />}
    </>
  );
}

function useDepartments() {
  const [d, setD] = useState([]);
  useEffect(() => { api('/departments').then((r) => setD(r.data)).catch(() => {}); }, []);
  return d;
}

function Mark() {
  const toast = useToast();
  const departments = useDepartments();
  const [f, setF] = useState({ date: today(), department: '', year: '' });
  const [rows, setRows] = useState(null);
  const [marks, setMarks] = useState({});
  const [saved, setSaved] = useState({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setRows(null);
    api('/attendance/roster', { params: f }).then((r) => {
      setRows(r.data);
      const m = Object.fromEntries(r.data.filter((x) => x.status).map((x) => [x.student._id, x.status]));
      setMarks(m); setSaved(m);
    }).catch((e) => { toast.error(e.message); setRows([]); });
  }, [f.date, f.department, f.year]); // eslint-disable-line
  useEffect(load, [load]);

  const counts = useMemo(() => {
    const v = Object.values(marks);
    return { present: v.filter((x) => x === 'present').length, absent: v.filter((x) => x === 'absent').length };
  }, [marks]);
  const dirty = Object.keys(marks).filter((id) => marks[id] !== saved[id]);

  const save = async () => {
    setBusy(true);
    try {
      const records = dirty.map((id) => ({ student: id, status: marks[id] }));
      await api('/attendance/bulk', { method: 'POST', body: { date: f.date, records } });
      toast.success(`Attendance saved for ${records.length} student${records.length === 1 ? '' : 's'}`);
      setSaved({ ...marks });
    } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };
  const all = (status) => setMarks(Object.fromEntries((rows || []).map((r) => [r.student._id, status])));

  return (
    <>
      <div className="toolbar">
        <input type="date" value={f.date} max={today()} onChange={(e) => setF({ ...f, date: e.target.value })} aria-label="Date" />
        <select value={f.department} onChange={(e) => setF({ ...f, department: e.target.value })} aria-label="Department"><option value="">All departments</option>{departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}</select>
        <select value={f.year} onChange={(e) => setF({ ...f, year: e.target.value })} aria-label="Year"><option value="">All years</option>{[1, 2, 3, 4, 5, 6].map((y) => <option key={y} value={y}>Year {y}</option>)}</select>
        <span style={{ flex: 1 }} />
        <Button variant="ghost" size="sm" magnetic={false} onClick={() => all('present')}>Mark all present</Button>
        <Button variant="ghost" size="sm" magnetic={false} onClick={() => all('absent')}>Mark all absent</Button>
      </div>
      {rows === null ? <Spinner /> : rows.length ? (
        <div className="card">
          <div style={{ display: 'flex', gap: '1.6rem', marginBottom: '.8rem', flexWrap: 'wrap' }}>
            <span><b style={{ color: 'var(--ok)', fontSize: '1.3rem' }}><Counter value={counts.present} /></b> <span className="muted small">present</span></span>
            <span><b style={{ color: 'var(--bad)', fontSize: '1.3rem' }}><Counter value={counts.absent} /></b> <span className="muted small">absent</span></span>
            <span className="muted small" style={{ alignSelf: 'center' }}>{rows.length - counts.present - counts.absent} not marked</span>
          </div>
          {rows.map(({ student: s }) => (
            <div className="row" key={s._id}>
              <Avatar student={s} size={38} />
              <div className="grow"><b>{s.fullName}</b><span className="muted small">{s.studentId} · Year {s.year}</span></div>
              <div className="seg" role="group" aria-label={`Attendance for ${s.fullName}`}>
                <button className={`p ${marks[s._id] === 'present' ? 'on' : ''}`} aria-pressed={marks[s._id] === 'present'} onClick={() => setMarks({ ...marks, [s._id]: 'present' })}>Present</button>
                <button className={`a ${marks[s._id] === 'absent' ? 'on' : ''}`} aria-pressed={marks[s._id] === 'absent'} onClick={() => setMarks({ ...marks, [s._id]: 'absent' })}>Absent</button>
              </div>
            </div>
          ))}
          <div className="actions"><Button onClick={save} disabled={busy || !dirty.length}>{busy ? 'Saving…' : dirty.length ? `Save attendance (${dirty.length})` : 'Nothing to save'}</Button></div>
        </div>
      ) : <div className="card"><Empty title="No active students" text="No active students match these filters." /></div>}
    </>
  );
}

function Report() {
  const toast = useToast();
  const departments = useDepartments();
  const [f, setF] = useState({ month: today().slice(0, 7), department: '', year: '' });
  const [data, setData] = useState(null);
  useEffect(() => {
    if (!f.month) return;
    setData(null);
    api('/reports/attendance/monthly', { params: f }).then((r) => setData(r.data)).catch((e) => { toast.error(e.message); setData({ rows: [], summary: {} }); });
  }, [f.month, f.department, f.year]); // eslint-disable-line

  return (
    <>
      <div className="toolbar">
        <input type="month" value={f.month} onChange={(e) => setF({ ...f, month: e.target.value })} aria-label="Month" />
        <select value={f.department} onChange={(e) => setF({ ...f, department: e.target.value })} aria-label="Department"><option value="">All departments</option>{departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}</select>
        <select value={f.year} onChange={(e) => setF({ ...f, year: e.target.value })} aria-label="Year"><option value="">All years</option>{[1, 2, 3, 4, 5, 6].map((y) => <option key={y} value={y}>Year {y}</option>)}</select>
        <span style={{ flex: 1 }} />
        <Button variant="ghost" icon="download" onClick={() => download('/reports/attendance/monthly', { ...f, format: 'csv' }, `attendance-${f.month}.csv`).then(() => toast.success('CSV exported')).catch((e) => toast.error(e.message))}>Export CSV</Button>
      </div>
      {!data ? <Spinner /> : (
        <div className="card">
          <h2>{f.month && monthName(f.month)} · {data.summary.students ?? 0} students · {data.summary.percentage ?? 0}% overall</h2>
          {data.rows.length ? data.rows.map((r) => (
            <div className="row" key={r.student._id}>
              <Avatar student={r.student} size={36} />
              <div className="grow"><b>{r.student.fullName}</b><span className="muted small">{r.student.studentId} · {r.student.department?.code}</span></div>
              <div style={{ width: 'min(240px, 35%)' }}><div className={`bar ${r.total && r.percentage < 75 ? 'low' : ''}`}><i style={{ width: `${r.percentage}%` }} /></div></div>
              <div className="right" style={{ minWidth: 110 }}><b>{r.total ? `${r.percentage}%` : '—'}</b><div className="muted small">{r.present}P · {r.absent}A</div></div>
            </div>
          )) : <Empty title="No students" text="No students match these filters." />}
        </div>
      )}
    </>
  );
}
