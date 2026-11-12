import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth, useTheme } from '../context';
import { Avatar, Button, Icon } from '../ui';

const ADMIN_NAV = [
  ['/admin', 'Dashboard', 'grid', true], ['/admin/students', 'Students', 'users'], ['/admin/attendance', 'Attendance', 'check'],
  ['/admin/marks', 'Marks', 'award'], ['/admin/departments', 'Departments', 'building'], ['/admin/courses', 'Courses', 'book'],
  ['/admin/users', 'User accounts', 'shield'], ['/admin/reports', 'Reports', 'file'],
];
const STUDENT_NAV = [['/me', 'My dashboard', 'grid', true]];

export default function Layout() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const nav = user.role === 'admin' ? ADMIN_NAV : STUDENT_NAV;

  return (
    <div className={`app ${collapsed ? 'collapsed' : ''} ${open ? 'open' : ''}`}>
      <aside className="sidebar">
        <div className="brand"><span className="logo">🎓</span><span className="brand-name">StudentSphere</span></div>
        <nav className="nav" onClick={() => setOpen(false)}>
          {nav.map(([to, label, icon, end]) => (
            <NavLink key={to} to={to} end={end} title={label}><Icon name={icon} /><span className="nav-label">{label}</span></NavLink>
          ))}
        </nav>
        <div className="side-user">
          <Avatar student={{ fullName: user.name }} size={36} />
          <div className="meta"><b>{user.name}</b><span className="muted">{user.role === 'admin' ? 'Administrator' : 'Student'}</span></div>
        </div>
      </aside>
      <div className="scrim" onClick={() => setOpen(false)} />
      <div className="main">
        <header className="topbar">
          <button className="icon-btn hamburger" aria-label="Open menu" onClick={() => setOpen(true)}><Icon name="menu" /></button>
          <button className="icon-btn collapse-btn" aria-label="Collapse sidebar" onClick={() => setCollapsed((c) => !c)}><Icon name="menu" /></button>
          <div className="spacer" />
          <button className="icon-btn" onClick={toggle} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} title="Toggle theme"><Icon name={theme === 'dark' ? 'sun' : 'moon'} /></button>
          <Button variant="ghost" size="sm" icon="logout" onClick={logout}>Log out</Button>
        </header>
        <main className="page" key={pathname}><Outlet /></main>
      </div>
    </div>
  );
}
