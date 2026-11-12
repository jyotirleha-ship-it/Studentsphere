import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context';
import { Spinner } from './ui';
import Layout from './pages/Layout';
import { Login, Register } from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import StudentView from './pages/StudentView';
import { Courses, Departments } from './pages/Catalog';
import Attendance from './pages/Attendance';
import Marks from './pages/Marks';
import Users from './pages/Users';
import Reports from './pages/Reports';

const home = (u) => (u.role === 'admin' ? '/admin' : '/me');

// Redirects anonymous visitors to /login and users of the wrong role to their own area.
function Guard({ role, children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={home(user)} replace />;
  return children;
}

function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  return user ? <Navigate to={home(user)} replace /> : children;
}

function MyProfile() {
  const { user } = useAuth();
  return user.student ? <StudentView studentId={user.student} self /> : <div className="page"><div className="alert">No student profile is linked to this account.</div></div>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
      <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />
      <Route path="/admin" element={<Guard role="admin"><Layout /></Guard>}>
        <Route index element={<Dashboard />} />
        <Route path="students" element={<Students />} />
        <Route path="students/:id" element={<StudentView admin />} />
        <Route path="attendance" element={<Attendance />} />
        <Route path="marks" element={<Marks />} />
        <Route path="departments" element={<Departments />} />
        <Route path="courses" element={<Courses />} />
        <Route path="users" element={<Users />} />
        <Route path="reports" element={<Reports />} />
      </Route>
      <Route path="/me" element={<Guard role="student"><Layout /></Guard>}>
        <Route index element={<MyProfile />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
