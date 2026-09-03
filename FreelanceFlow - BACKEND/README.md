# FreelanceFlow — Full Stack Internship Project

FreelanceFlow consolidates client CRM, projects, tasks, time tracking and invoicing into one workspace.

## Stack
- Frontend: HTML5, CSS3, modern JavaScript (ES6+)
- Backend: Node.js + Express.js
- Database: MongoDB / MongoDB Atlas with Mongoose
- Authentication: JWT + bcryptjs
- PDF: PDFKit

> The provided UI was originally built as a static HTML/CSS/JS frontend, so this submission keeps that frontend while implementing the required full-stack behavior through the Express API.

## Features
- JWT registration and login
- User-scoped data isolation (`owner: req.user.id`)
- Client CRUD with default hourly rate
- Free plan limit of 2 clients and demo Pro upgrade
- Project CRUD linked to a client
- Task CRUD linked to a project
- Persistent stopwatch using `localStorage` for the active timer id/start time
- Backend start/end time logging and duration calculation
- Manual time entry
- Project burn-rate calculation from logged hours × hourly rate
- Invoice CRUD
- Invoice generation from unbilled time logs and date range
- Time logs marked billed after invoicing to prevent double billing
- Professional PDF invoice endpoint
- Dashboard totals, deadlines and revenue chart
- Sample data loader for an empty workspace
- Functional profile settings and logout
- Help & Support interaction

## Run locally

### Backend
```bash
cd "FreelanceFlow - BACKEND"
npm install
```
Create `.env` from `.env.example`:
```env
PORT=5000
MONGO_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_strong_jwt_secret
```
Then:
```bash
npm run dev
```

Backend health check:
`http://localhost:5000/`

### Frontend
Open `FreelanceFlow-Frontend/login.html` in a browser. The frontend calls `http://localhost:5000/api`.

Recommended: use a simple static server such as VS Code Live Server so browser behavior is consistent.

## Main API routes
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET/POST/PUT/DELETE /api/clients`
- `GET/POST/PUT/DELETE /api/projects`
- `GET/POST/PUT/DELETE /api/tasks`
- `GET /api/time-logs`
- `POST /api/time-logs/start`
- `POST /api/time-logs/stop/:id`
- `POST /api/time-logs/manual`
- `GET/POST/PUT/DELETE /api/invoices`
- `POST /api/invoices/from-time`
- `GET /api/invoices/:id/pdf`
- `GET/PUT /api/users/profile`
- `POST /api/users/upgrade`
- `POST /api/sample-data/load`

## Timer logic
The active timer's id and start time are stored in `localStorage`. On refresh/navigation, the frontend restores the running timer by looking up the server-side time log. The backend remains the source of truth for `startTime`, `endTime`, and `durationMinutes`.

## Security / multi-tenancy
Every protected query uses the authenticated user's id as the `owner` filter. Projects additionally validate that the selected client belongs to the same owner; tasks validate the same relationship with projects; invoices validate both client and project ownership.

## Sample data
Use **Load Sample Data** from the dashboard on an empty workspace. It creates two clients, two projects, four tasks, three time logs and two invoices while respecting the Free plan's two-client limit.

## PDF invoices
Invoices can be downloaded from the Invoices page. The backend generates a PDF using PDFKit. Invoices created from unbilled time calculate:

`hours × client hourly rate = invoice amount`

and then mark those time logs as billed.
