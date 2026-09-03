# FreelanceFlow — Project Report

## 1. Project Overview
FreelanceFlow is a B2B SaaS-style workspace for freelancers. It brings client management, project planning, task tracking, time tracking and invoicing into a single dashboard.

## 2. Objectives
1. Model the Client → Project → Task relationship.
2. Secure data per authenticated user.
3. Track billable time with a persistent stopwatch and manual entries.
4. Calculate billable value from hours and hourly rate.
5. Generate invoices and professional PDF documents.
6. Present financial and work-management information on a dashboard.
7. Enforce Free/Pro client limits.

## 3. Architecture
Browser frontend → REST API (Express) → MongoDB Atlas.

JWT is issued during login and sent as `Authorization: Bearer <token>` on protected API requests.

## 4. Data Model
### User
- name
- email
- hashed password
- role
- plan (`free` / `pro`)

### Client
- name
- email
- company
- phone
- notes
- hourlyRate
- owner

### Project
- name
- description
- client reference
- budget
- progress
- status
- startDate
- deadline
- owner

### Task
- title
- description
- project reference
- status
- priority
- dueDate
- owner

### TimeLog
- client reference
- project reference
- startTime
- endTime
- durationMinutes
- description
- billed
- source (`timer` / `manual`)
- owner

### Invoice
- invoiceNumber
- client reference
- project reference
- amount
- status
- issueDate
- dueDate
- notes
- owner

## 5. Time Tracking Logic
When a timer starts, the backend stores `startTime`. The frontend saves the returned log id and start time in `localStorage`. The elapsed display is calculated from the current time minus `startTime`.

When stopped, the backend records `endTime` and calculates:

`durationMinutes = endTime - startTime`

Manual entries directly create a completed time log from a selected date and number of hours.

## 6. Billing Logic
For invoice generation from time logs:

`Invoice Amount = Total Logged Hours × Client Hourly Rate`

Only completed, unbilled logs are selected. After invoice creation, those logs are marked `billed: true`, preventing duplicate billing.

## 7. Burn Rate
Project burn percentage is calculated from:

`Tracked Value / Project Budget × 100`

where tracked value is the sum of logged hours multiplied by the client's hourly rate.

## 8. Security
Protected endpoints require JWT authentication. Database queries are scoped to `req.user.id`, preventing one user from reading another user's records. Relationship checks also ensure a project belongs to the requested client and a task/invoice belongs to the correct project/client.

## 9. Tiered Access
Free users may create up to two clients. The demo Pro action changes the workspace plan to Pro, allowing unlimited client creation. PDF invoicing is available in the project demo after Pro upgrade.

## 10. Deliverables
- Organized backend API
- Invoice PDF generation
- Frontend dashboard
- Sample data loader
- Authentication
- CRM and work management
- Time tracking
- Billing calculations
- Settings and support interaction
- README and project report

## 11. Testing Checklist
- Register a new user.
- Login and confirm JWT token is stored.
- Create up to two clients on Free.
- Create a project linked to a client.
- Create a task linked to a project.
- Start and stop a timer.
- Refresh the Time Tracking page while timer is running.
- Add manual time.
- Generate an invoice from unbilled time.
- Confirm logs become billed.
- Download invoice PDF.
- Confirm dashboard totals update.
- Attempt to access data with another user's token and confirm it is isolated.
- Load sample data in an empty workspace.

## 12. Future Scope
- Real payment gateway for Pro subscriptions.
- Cloud image storage for profile photos.
- Email delivery of invoices.
- React/Tailwind migration of the existing static UI.
- Production deployment with managed frontend/backend domains.


## Free / Pro enforcement
- Free workspaces allow up to 2 clients.
- Pro workspaces allow unlimited clients.
- PDF invoice generation is restricted to Pro on both frontend and backend.
- The upgrade endpoint is a demo upgrade for internship purposes; no payment gateway is included.
