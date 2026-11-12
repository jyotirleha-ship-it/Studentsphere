import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, download, fmtDate, monthName, today } from '../api';
import { useToast } from '../context';
import { Avatar, Button, Icon, Ring, Spinner } from '../ui';

export default function Reports() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [students, setStudents] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [ex, setEx] = useState({ department: '', year: '', semester: '', month: today().slice(0, 7) });
  const sid = params.get('student') || '';

  useEffect(() => {
    api('/students/options').then((r) => setStudents(r.data)).catch((e) => toast.error(e.message));
    api('/departments').then((r) => setDepartments(r.data)).catch(() => {});
  }, []); // eslint-disable-line
  useEffect(() => {
    if (!sid) { setReport(null); return; }
    setLoading(true);
    api(`/reports/student/${sid}`).then((r) => setReport(r.data)).catch((e) => toast.error(e.message)).finally(() => setLoading(false));
  }, [sid]); // eslint-disable-line

  const exp = (path, query, name) => download(path, query, name).then(() => toast.success('Report exported')).catch((e) => toast.error(e.message));

  return (
    <>
      <div className="page-head no-print"><div><h1>Reports</h1><p>Individual performance reports and CSV exports.</p></div></div>

      <div className="card no-print" style={{ marginBottom: '1.1rem' }}>
        <h2>Export data</h2>
        <div className="toolbar" style={{ marginBottom: '.2rem' }}>
          <select value={ex.department} onChange={(e) => setEx({ ...ex, department: e.target.value })} aria-label="Department"><option value="">All departments</option>{departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}</select>
          <select value={ex.year} onChange={(e) => setEx({ ...ex, year: e.target.value })} aria-label="Year"><option value="">All years</option>{[1, 2, 3, 4, 5, 6].map((y) => <option key={y} value={y}>Year {y}</option>)}</select>
          <select value={ex.semester} onChange={(e) => setEx({ ...ex, semester: e.target.value })} aria-label="Semester"><option value="">All semesters</option>{Array.from({ length: 12 }, (_, i) => i + 1).map((s) => <option key={s} value={s}>Semester {s}</option>)}</select>
          <input type="month" value={ex.month} onChange={(e) => setEx({ ...ex, month: e.target.value })} aria-label="Month for attendance" />
        </div>
        <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap', marginTop: '.8rem' }}>
          <Button variant="ghost" icon="download" onClick={() => exp('/students/export/csv', { department: ex.department, year: ex.year }, 'students.csv')}>Students CSV</Button>
          <Button variant="ghost" icon="download" onClick={() => exp('/reports/attendance/monthly', { month: ex.month, department: ex.department, year: ex.year, format: 'csv' }, `attendance-${ex.month}.csv`)}>Monthly attendance CSV</Button>
          <Button variant="ghost" icon="download" onClick={() => exp('/reports/academic', { department: ex.department, year: ex.year, semester: ex.semester, format: 'csv' }, 'academic-report.csv')}>Academic performance CSV</Button>
        </div>
      </div>

      <div className="card no-print" style={{ marginBottom: '1.1rem' }}>
        <h2>Student performance report</h2>
        <select value={sid} onChange={(e) => setParams(e.target.value ? { student: e.target.value } : {})} aria-label="Student" style={{ maxWidth: 420 }}>
          <option value="">Select a student…</option>{students.map((s) => <option key={s._id} value={s._id}>{s.fullName} ({s.studentId})</option>)}
        </select>
      </div>

      {loading && <Spinner />}
      {report && !loading && (
        <div className="card">
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <Avatar student={report.student} size={64} />
            <div style={{ flex: 1 }}>
              <h1>{report.student.fullName}</h1>
              <div className="muted">{report.student.studentId} · {report.student.department?.name} · {report.student.course?.name} · Year {report.student.year}, Semester {report.student.semester}</div>
              <div className="muted small">Report generated {new Date(report.generatedAt).toLocaleString('en-IN')}</div>
            </div>
            <Button className="no-print" icon="print" onClick={() => window.print()}>Print / save as PDF</Button>
          </div>

          <div className="grid g-3" style={{ margin: '1.4rem 0' }}>
            <div className="score"><Ring value={report.academic.summary.percentage} size={76} /><div><b>Overall score</b><div className="muted small">Grade {report.academic.summary.grade} · {report.academic.summary.obtained}/{report.academic.summary.max}</div></div></div>
            <div className="score"><Ring value={report.attendance.percentage} size={76} /><div><b>Attendance</b><div className="muted small">{report.attendance.present} present · {report.attendance.absent} absent</div></div></div>
            <div className="score"><Ring value={report.academic.summary.subjects} size={76} label={report.academic.summary.subjects} /><div><b>Subjects</b><div className="muted small">{report.academic.summary.best ? `Best: ${report.academic.summary.best.subject} (${report.academic.summary.best.percentage}%)` : 'No marks'}{report.academic.summary.weakest ? ` · Weakest: ${report.academic.summary.weakest.subject}` : ''}</div></div></div>
          </div>

          <h2>Subject-wise marks</h2>
          {report.academic.records.length ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.9rem' }}>
                <thead><tr style={{ textAlign: 'left', color: 'var(--muted)' }}>{['Subject', 'Sem', 'Internal', 'Exam', 'Total', '%', 'Grade'].map((h) => <th key={h} style={{ padding: '.5rem', borderBottom: '1px solid var(--border)' }}>{h}</th>)}</tr></thead>
                <tbody>{report.academic.records.map((r) => (
                  <tr key={r._id}>{[r.subject, r.semester, `${r.internalMarks}/${r.maxInternal}`, `${r.examMarks}/${r.maxExam}`, `${r.total}/${r.maxInternal + r.maxExam}`, `${r.percentage}%`, r.grade].map((c, i) => <td key={i} style={{ padding: '.55rem .5rem', borderBottom: '1px solid var(--border)' }}>{c}</td>)}</tr>
                ))}</tbody>
              </table>
            </div>
          ) : <p className="muted">No marks recorded.</p>}

          <h2 style={{ marginTop: '1.4rem' }}>Monthly attendance</h2>
          {report.attendance.monthly.length ? report.attendance.monthly.map((m) => (
            <div className="row" key={m.month}><b style={{ minWidth: 90 }}>{monthName(m.month)}</b><div style={{ flex: 1 }}><div className={`bar ${m.percentage < 75 ? 'low' : ''}`}><i style={{ width: `${m.percentage}%` }} /></div></div><span className="muted small" style={{ minWidth: 150, textAlign: 'right' }}>{m.present}P · {m.absent}A · {m.percentage}%</span></div>
          )) : <p className="muted">No attendance recorded.</p>}
          <p className="muted small" style={{ marginTop: '1rem' }}>Enrolled {fmtDate(report.student.enrollmentDate)} · {report.student.email}</p>
        </div>
      )}
      {!sid && !loading && <p className="muted no-print"><Icon name="file" size={14} /> Pick a student to generate their report.</p>}
    </>
  );
}
