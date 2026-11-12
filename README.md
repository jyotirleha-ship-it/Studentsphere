# StudentSphere – Student Management System

A full-stack student management system with separate **administrator** and **student** portals.
React + Vite frontend, Node.js + Express REST API, MongoDB (Atlas) database, JWT authentication.

This project is fully independent: it has its own database, its own backend and its own `.env`.

## Features

| Area | What you get |
|---|---|
| Authentication | Administrator login, student login, student self-registration, JWT, bcrypt-hashed passwords, role-based access, protected routes, logout |
| Admin dashboard | Total / active / inactive students, departments, attendance overview + daily trend, grade distribution, performance by department, recent registrations. Every figure is aggregated from MongoDB. |
| Students | Add, edit, delete, view profile, search (name or ID), filter (department, year, status), sort, pagination, CSV export, duplicate Student ID / email prevention, profile photo |
| Attendance | Mark present/absent by date (bulk), attendance percentage, per-student history, monthly report (+CSV) |
| Academic records | Subject records with internal + exam marks, auto total / percentage / grade, validation against maximum marks, charts, individual performance report (printable), CSV export |
| Student portal | Personal info, department info, attendance history, marks and charts, recent activity, profile editing, password change |
| Admin tools | Departments, courses, user accounts (create admin, create student login, activate/deactivate, reset password, delete), reports |
| UI | Dark and light themes, glass cards, animated sidebar, page transitions, rolling number counters, magnetic buttons, 3D tilt cards, animated toasts, Chart.js charts, responsive down to phones |

## Project structure

```
studentsphere/
├── backend/
│   ├── src/
│   │   ├── config/        db.js
│   │   ├── models/        User, Student, Department, Course, Attendance, AcademicRecord
│   │   ├── middleware/    auth.js (JWT + roles + ownership), error.js
│   │   ├── services/      business logic (auth, student, attendance, academic, stats)
│   │   ├── controllers/   thin request handlers
│   │   ├── routes/        index.js (all routes)
│   │   ├── scripts/       seed.js (admin + optional demo data)
│   │   ├── utils/         helpers, csv, ApiError
│   │   ├── app.js         Express app
│   │   └── server.js      entry point
│   ├── tests/api.test.js  integration tests (node:test)
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── pages/         Auth, Dashboard, Students, StudentView, Catalog, Attendance, Marks, Users, Reports
    │   ├── ui.jsx         Counter, Button (magnetic), Tilt, Modal, Avatar, Ring, …
    │   ├── charts.jsx     Chart.js setup (theme aware)
    │   ├── context.jsx    Auth, Theme, Toast providers
    │   ├── api.js         fetch wrapper with JWT
    │   └── styles.css     design system
    └── .env.example
```

## Prerequisites

* Node.js 18 or newer (`node -v`)
* A MongoDB database. Either a free **MongoDB Atlas** cluster (recommended) or a local MongoDB.

## 1. Database setup (MongoDB Atlas)

1. Create a free account at <https://www.mongodb.com/atlas> and create a **free (M0) cluster**.
2. **Database Access** → *Add New Database User* → choose a username and password (note them down).
3. **Network Access** → *Add IP Address* → add your current IP (for testing you may use `0.0.0.0/0`; restrict it for production).
4. **Database** → *Connect* → *Drivers* → copy the connection string, for example
   `mongodb+srv://myuser:mypassword@cluster0.abcde.mongodb.net/studentsphere?retryWrites=true&w=majority`
   Put the database name (`studentsphere`) before the `?`. Collections are created automatically.
   If the password contains special characters (`@ : / ?`), URL-encode them.

Local MongoDB alternative: `MONGODB_URI=mongodb://127.0.0.1:27017/studentsphere`

## 2. Run the backend

```bash
cd backend
npm install
cp .env.example .env        # Windows: copy .env.example .env
```

Edit `.env` and set at least `MONGODB_URI` and `JWT_SECRET`
(generate one: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`).

Create the first administrator:

```bash
npm run seed:admin          # uses ADMIN_EMAIL / ADMIN_PASSWORD from .env
```

Optional – load demo data (4 departments, 4 courses, 16 students, attendance and marks; every demo student logs in with `Student@123`):

```bash
npm run seed:demo
```

Start the API:

```bash
npm run dev                 # auto-restarts on change   (or: npm start)
```

Check it: <http://localhost:5000/api/health> should return `{"success":true,"status":"ok",…}`.

## 3. Run the frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173>. During development Vite proxies `/api` to `http://localhost:5000`, so no extra configuration is needed. If your API runs on another port: `VITE_PROXY_TARGET=http://localhost:5055 npm run dev`.

## 4. First login

| Role | How |
|---|---|
| Administrator | Use the **Administrator** tab with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from your `.env` (default `admin@studentsphere.com` / `Admin@12345` – change it). |
| Student | **Student** tab. Either register at `/register`, have the admin add the student with a login password, or (with demo data) use any demo student email such as `aarav.kumar@example.com` / `Student@123`. |

Suggested first steps as admin: **Departments → Courses → Students → Attendance → Marks → Reports**. Students can only be created after a department and a matching course exist.

### Administrator setup notes
* Additional administrators: *User accounts → New account → Administrator*.
* Public registration only ever creates **student** accounts; the role cannot be chosen by the client.
* The last remaining administrator and your own account cannot be deleted.

## API documentation

Base URL: `http://localhost:5000/api`. Send `Authorization: Bearer <token>` on protected routes.
All responses are JSON `{ success, data?, message?, details? }`. Lists also return `total`, `page`, `pages`.
Errors: `400` validation, `401` not signed in, `403` wrong role / not your record, `404`, `409` duplicate or in use.

### Auth
| Method | Path | Access | Notes |
|---|---|---|---|
| POST | `/auth/login` | public | `{email, password, role?}` → `{token, user}`. `role` (`admin`/`student`) rejects logins through the wrong portal |
| POST | `/auth/register` | public | Student self-registration (creates Student + User) → `{token, user}` |
| GET | `/auth/options` | public | Departments and courses for the registration form |
| GET | `/auth/me` | any user | Current user |
| POST | `/auth/change-password` | any user | `{currentPassword, newPassword}` |

### Students
| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/students` | admin | Query: `search, department, year, status, sort, order, page, limit` |
| POST | `/students` | admin | Optional `password` also creates the student's login |
| GET | `/students/options` | admin | Light list for dropdowns |
| GET | `/students/export/csv` | admin | Same filters as the list |
| GET / PUT | `/students/me` | student | Own record. Students may only edit name, phone, DOB, gender, address, photo |
| GET | `/students/:id` | admin / owner | |
| PUT / DELETE | `/students/:id` | admin | Delete also removes the login, attendance and marks |
| GET | `/students/:id/overview` | admin / owner | Profile + attendance + marks + activity in one call |

### Departments and courses
| Method | Path | Access |
|---|---|---|
| GET | `/departments`, `/courses` (`?department=`) | any signed-in user |
| POST | `/departments`, `/courses` | admin |
| GET / PUT / DELETE | `/departments/:id`, `/courses/:id` | read: any user, write: admin (delete is blocked while students/courses reference it) |

### Attendance
| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/attendance/roster?date=YYYY-MM-DD&department=&year=` | admin | Active students with their mark for that date |
| POST | `/attendance/bulk` | admin | `{date, records:[{student, status:"present"|"absent"}]}` – upserts, so re-marking edits |
| GET | `/attendance/student/:id?month=YYYY-MM` | admin / owner | History + summary + per-month percentages |
| DELETE | `/attendance/:id` | admin | |

### Academic records
| Method | Path | Access | Notes |
|---|---|---|---|
| GET | `/academic?student=&semester=&subject=&page=` | admin | |
| POST | `/academic` | admin | `{student, subject, semester, internalMarks, examMarks, maxInternal=40, maxExam=60}` |
| PUT / DELETE | `/academic/:id` | admin | |
| GET | `/academic/student/:id` | admin / owner | Records + summary (percentage, grade, best/weakest, semester trend) |

Rules: marks must be numbers, ≥ 0 and ≤ the maximum; one record per student + subject + semester. Total, percentage and grade (A+ ≥ 90, A ≥ 80, B ≥ 70, C ≥ 60, D ≥ 50, else F) are computed on the server.

### Reports and dashboard
| Method | Path | Access |
|---|---|---|
| GET | `/reports/student/:id` | admin / owner |
| GET | `/reports/attendance/monthly?month=YYYY-MM&department=&year=[&format=csv]` | admin |
| GET | `/reports/academic?department=&year=&semester=[&format=csv]` | admin |
| GET | `/dashboard/stats` | admin |

### Users (admin only)
`GET /users`, `POST /users`, `PUT /users/:id` (`name`, `isActive`), `POST /users/:id/reset-password`, `DELETE /users/:id`.

## Data model

* **User** – name, email (unique), password (bcrypt hash, never returned), role, `student` ref, isActive, lastLogin
* **Student** – studentId (unique), fullName, email (unique), phone, dateOfBirth, gender, `department` ref, `course` ref, year, semester, address, profileImage, enrollmentDate, status
* **Department** – name, code (both unique), head, description
* **Course** – name, code (unique), `department` ref, durationYears, description
* **Attendance** – `student` ref, date, status, markedBy; unique index on (student, date)
* **AcademicRecord** – `student` ref, subject, semester, internal/exam marks and maximums, total, percentage, grade; unique index on (student, subject, semester)

## Testing

Backend integration tests (auth, role isolation, student/department/course CRUD, duplicate prevention, validation, attendance, marks, reports, dashboard, user management, cascade delete):

```bash
cd backend
npm run seed:admin     # the tests sign in as the seeded administrator
npm test
```

The tests use the database in `MONGODB_URI` and clean up everything they create. Use a development database, not production data.

Manual checklist: log in as admin and student; add/edit/delete a student; try a duplicate ID and email; mark attendance and change it; add marks above the maximum (rejected); open a student's report and export each CSV; log in as a student and confirm other students' URLs are refused.

## Deployment

**Backend (Render, Railway, Fly.io, any Node host)**
1. Root directory `backend`, build `npm install`, start `npm start`.
2. Environment variables: `NODE_ENV=production`, `MONGODB_URI`, `JWT_SECRET` (long random), `JWT_EXPIRES_IN`, `CLIENT_URL` (your frontend origin, e.g. `https://studentsphere.vercel.app`; comma-separate several).
3. In Atlas *Network Access*, allow your host's outbound IPs (or `0.0.0.0/0`).
4. Run `npm run seed:admin` once (the host's shell, or locally with the production `MONGODB_URI`). Change the default admin password straight away.

**Frontend (Vercel, Netlify, Cloudflare Pages)**
1. Root directory `frontend`, build `npm run build`, output `dist`.
2. Set `VITE_API_URL=https://<your-api-host>/api` **before** building.
3. `vercel.json` and `public/_redirects` are included so client-side routes work on refresh.

**Production checklist:** strong `JWT_SECRET`; HTTPS only; restrict `CLIENT_URL`; restrict Atlas IP access; rotate the seeded admin password; take Atlas backups.

## Security notes
* Passwords hashed with bcrypt (12 rounds, via the pure-JS `bcryptjs` implementation so it installs without native build tools). Never returned by the API.
* JWT is verified on every request and the user is re-loaded, so deactivating an account takes effect immediately.
* Ownership is enforced on the server: students can only read their own student, attendance, marks and report endpoints.
* Helmet headers, CORS allow-list, login/registration rate limiting, request size limit, regex-escaped search input, CSV formula-injection protection.
* Tokens are stored in `localStorage` (simple for a project like this). For higher-security deployments consider httpOnly cookies.

## Troubleshooting
* **`MongooseServerSelectionError`** – wrong password, IP not allowed in Atlas Network Access, or special characters in the password not URL-encoded.
* **`JWT_SECRET is not set`** – you did not create `backend/.env`.
* **Login works but pages show 401** – the token expired; sign in again.
* **Register form has empty department list** – the admin must create departments and courses first.
* **CORS error in production** – `CLIENT_URL` must exactly match the frontend origin (no trailing slash).
* **`Cannot reach the server`** – backend not running, or the Vite proxy points at the wrong port.
