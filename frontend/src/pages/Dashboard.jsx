import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { api, fmtDate } from '../api';
import { PALETTE, doughnutOptions, useChartOptions } from '../charts';
import { Avatar, Counter, Empty, Icon, Spinner, Tilt } from '../ui';

const Stat = ({ icon, label, value, decimals, suffix, sub }) => (
  <Tilt className="stat">
    <div className="stat-top"><span>{label}</span><span className="stat-ico"><Icon name={icon} /></span></div>
    <div className="stat-val"><Counter value={value} decimals={decimals} suffix={suffix} /></div>
    {sub && <div className="muted small">{sub}</div>}
  </Tilt>
);

export default function Dashboard() {
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  const line = useChartOptions({ max: 100, percent: true });
  const bars = useChartOptions({ max: 100, percent: true });
  const counts = useChartOptions();

  useEffect(() => { api('/dashboard/stats').then((r) => setD(r.data)).catch((e) => setError(e.message)); }, []);
  if (error) return <div className="alert">{error}</div>;
  if (!d) return <Spinner />;
  const { totals, attendance, performance, recentRegistrations } = d;

  return (
    <>
      <div className="page-head"><div><h1>Dashboard</h1><p>Live figures from your student database.</p></div></div>
      <div className="grid g-4">
        <Stat icon="users" label="Total students" value={totals.students} sub={`${totals.users} user accounts`} />
        <Stat icon="check" label="Active students" value={totals.active} sub={`${totals.students ? Math.round((totals.active / totals.students) * 100) : 0}% of all students`} />
        <Stat icon="user" label="Inactive students" value={totals.inactive} />
        <Stat icon="building" label="Departments" value={totals.departments} sub={`${totals.courses} courses`} />
      </div>

      <div className="grid g-main" style={{ marginTop: '1.1rem' }}>
        <div className="card">
          <h2>Attendance overview</h2>
          <div className="grid g-3" style={{ marginBottom: '1rem' }}>
            <div><div className="muted small">Overall attendance</div><b style={{ fontSize: '1.6rem', fontFamily: 'Sora, sans-serif' }}><Counter value={attendance.percentage} decimals={1} suffix="%" /></b></div>
            <div><div className="muted small">Present marks</div><b style={{ fontSize: '1.6rem', fontFamily: 'Sora, sans-serif' }}><Counter value={attendance.present} /></b></div>
            <div><div className="muted small">Absent marks</div><b style={{ fontSize: '1.6rem', fontFamily: 'Sora, sans-serif' }}><Counter value={attendance.absent} /></b></div>
          </div>
          {attendance.trend.length ? (
            <div className="chart-box sm">
              <Line key={line.key} options={line.options} data={{ labels: attendance.trend.map((t) => fmtDate(t.date).slice(0, 6)), datasets: [{ label: 'Attendance %', data: attendance.trend.map((t) => t.percentage), borderColor: '#7c5cff', backgroundColor: 'rgba(124,92,255,.18)', fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: '#22a6ff', borderWidth: 3 }] }} />
            </div>
          ) : <Empty title="No attendance yet" text="Mark attendance to see the daily trend." action={<Link className="btn primary" to="/admin/attendance">Mark attendance</Link>} />}
        </div>
        <div className="card">
          <h2>Student status</h2>
          <div className="chart-box"><Doughnut key={counts.key} options={doughnutOptions(counts.text)} data={{ labels: ['Active', 'Inactive'], datasets: [{ data: [totals.active, totals.inactive], backgroundColor: ['#7c5cff', '#22a6ff'], borderWidth: 0, hoverOffset: 10 }] }} /></div>
        </div>
      </div>

      <div className="grid g-2" style={{ marginTop: '1.1rem' }}>
        <div className="card">
          <h2>Academic performance</h2>
          <div className="muted small" style={{ marginBottom: '.6rem' }}>Average score <b style={{ color: 'var(--text)' }}>{performance.average}%</b> across {performance.records} subject records</div>
          {performance.byDepartment.length ? (
            <div className="chart-box sm"><Bar key={bars.key} options={bars.options} data={{ labels: performance.byDepartment.map((x) => x.code), datasets: [{ label: 'Average %', data: performance.byDepartment.map((x) => x.percentage), backgroundColor: PALETTE, borderRadius: 10, maxBarThickness: 46 }] }} /></div>
          ) : <Empty title="No marks yet" text="Add subject records to see performance by department." />}
        </div>
        <div className="card">
          <h2>Grade distribution</h2>
          <div className="chart-box sm"><Bar key={counts.key} options={counts.options} data={{ labels: performance.grades.map((g) => g.grade), datasets: [{ label: 'Records', data: performance.grades.map((g) => g.count), backgroundColor: ['#34d399', '#5eead4', '#22a6ff', '#7c5cff', '#fbbf24', '#fb7185'], borderRadius: 10, maxBarThickness: 46 }] }} /></div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '1.1rem' }}>
        <h2>Recent registrations</h2>
        {recentRegistrations.length ? recentRegistrations.map((s) => (
          <Link key={s._id} to={`/admin/students/${s._id}`} className="row">
            <Avatar student={s} size={40} />
            <div className="grow"><b>{s.fullName}</b><span className="muted small">{s.studentId} · {s.department?.name} · Year {s.year}</span></div>
            <span className="muted small">{fmtDate(s.createdAt)}</span>
            <span className={`badge ${s.status === 'active' ? 'ok' : 'bad'}`}>{s.status}</span>
          </Link>
        )) : <Empty title="No students yet" text="Add your first student to get started." action={<Link className="btn primary" to="/admin/students">Add student</Link>} />}
      </div>
    </>
  );
}
