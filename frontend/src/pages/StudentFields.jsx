import { useRef } from 'react';
import { Avatar, Button, Field } from '../ui';
import { imageToDataURL, inputDate } from '../api';
import { useToast } from '../context';

export const emptyStudent = { studentId: '', fullName: '', email: '', phone: '', dateOfBirth: '', gender: '', department: '', course: '', year: 1, semester: 1, address: '', profileImage: '', enrollmentDate: new Date().toISOString().slice(0, 10), status: 'active', password: '' };

export const toForm = (s) => ({
  ...emptyStudent, ...s, department: s.department?._id || s.department || '', course: s.course?._id || s.course || '',
  dateOfBirth: inputDate(s.dateOfBirth), enrollmentDate: inputDate(s.enrollmentDate), phone: s.phone || '', gender: s.gender || '', address: s.address || '', profileImage: s.profileImage || '', password: '',
});

// Shared by the admin "Add / edit student" dialog and the public registration page.
export default function StudentFields({ form, setForm, errors = {}, departments, courses, showStatus, showPassword, passwordRequired, passwordLabel = 'Password' }) {
  const toast = useToast();
  const file = useRef(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value, ...(k === 'department' ? { course: '' } : {}) }));
  const pick = async (e) => {
    try { setForm((f) => ({ ...f, profileImage: '' })); const url = await imageToDataURL(e.target.files[0]); setForm((f) => ({ ...f, profileImage: url })); }
    catch (err) { toast.error(err.message); }
  };
  const deptCourses = courses.filter((c) => (c.department?._id || c.department) === form.department);

  return (
    <div className="form-grid">
      <div className="full" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Avatar student={{ fullName: form.fullName || '?', profileImage: form.profileImage }} size={64} />
        <div>
          <input ref={file} type="file" accept="image/*" hidden onChange={pick} />
          <Button type="button" variant="ghost" size="sm" magnetic={false} onClick={() => file.current.click()}>Upload photo</Button>
          {form.profileImage && <Button type="button" variant="ghost" size="sm" magnetic={false} onClick={() => setForm((f) => ({ ...f, profileImage: '' }))} style={{ marginLeft: 8 }}>Remove</Button>}
          <div className="muted small" style={{ marginTop: 4 }}>{errors.profileImage || 'Optional. Resized automatically.'}</div>
        </div>
      </div>
      <Field label="Student ID *" error={errors.studentId}><input value={form.studentId} onChange={set('studentId')} placeholder="e.g. SS2026001" required /></Field>
      <Field label="Full name *" error={errors.fullName}><input value={form.fullName} onChange={set('fullName')} required /></Field>
      <Field label="Email *" error={errors.email}><input type="email" value={form.email} onChange={set('email')} required /></Field>
      <Field label="Phone number" error={errors.phone}><input value={form.phone} onChange={set('phone')} placeholder="9876543210" /></Field>
      <Field label="Date of birth" error={errors.dateOfBirth}><input type="date" value={form.dateOfBirth} onChange={set('dateOfBirth')} max={new Date().toISOString().slice(0, 10)} /></Field>
      <Field label="Gender" error={errors.gender}>
        <select value={form.gender} onChange={set('gender')}><option value="">Select</option><option>Male</option><option>Female</option><option>Other</option></select>
      </Field>
      <Field label="Department *" error={errors.department}>
        <select value={form.department} onChange={set('department')} required><option value="">Select department</option>{departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}</select>
      </Field>
      <Field label="Course *" error={errors.course}>
        <select value={form.course} onChange={set('course')} required disabled={!form.department}><option value="">{form.department ? 'Select course' : 'Choose a department first'}</option>{deptCourses.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}</select>
      </Field>
      <Field label="Year *" error={errors.year}><select value={form.year} onChange={set('year')}>{[1, 2, 3, 4, 5, 6].map((y) => <option key={y} value={y}>Year {y}</option>)}</select></Field>
      <Field label="Semester *" error={errors.semester}><select value={form.semester} onChange={set('semester')}>{Array.from({ length: 12 }, (_, i) => i + 1).map((s) => <option key={s} value={s}>Semester {s}</option>)}</select></Field>
      <Field label="Enrollment date" error={errors.enrollmentDate}><input type="date" value={form.enrollmentDate} onChange={set('enrollmentDate')} /></Field>
      {showStatus && <Field label="Status" error={errors.status}><select value={form.status} onChange={set('status')}><option value="active">Active</option><option value="inactive">Inactive</option></select></Field>}
      <Field label="Address" className="full" error={errors.address}><textarea value={form.address} onChange={set('address')} rows={2} /></Field>
      {showPassword && (
        <Field label={passwordLabel + (passwordRequired ? ' *' : '')} error={errors.password} hint={passwordRequired ? 'At least 8 characters' : 'Leave empty to add a student without a login'}>
          <input type="password" value={form.password} onChange={set('password')} minLength={8} required={passwordRequired} autoComplete="new-password" />
        </Field>
      )}
    </div>
  );
}
