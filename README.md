# HRMS Attendance Backend

Initial Express and TypeScript API for HRMS company, employee, and attendance workflows. PostgreSQL access uses the existing Prisma schema and migration history.

## Prerequisites

- Node.js 24 and npm
- PostgreSQL with the existing `hrms_db` database and migrations applied

## Local setup

1. Copy `.env.example` to `.env` (PowerShell: `Copy-Item .env.example .env`). If you already have a `.env`, keep it and edit it locally.
2. Set `DATABASE_URL` to your local PostgreSQL connection string. Keep credentials only in `.env`; it is ignored by Git. Never paste credentials into source files or commit them.
3. Set `PORT` (default `5000`), comma-separated browser origins in `CORS_ORIGIN`, and optionally `ATTENDANCE_TIMEZONE` (default `Asia/Kolkata`).
4. Run `npm run dev`.

The Prisma CLI reads `DATABASE_URL` through `prisma.config.ts`. The app also validates the same environment variable before startup.

## Run and build

```powershell
npm run dev
npm run build
npm start
```

The server listens on `0.0.0.0`, which makes it reachable from local development devices. The default local health URL is `http://localhost:5000/api/health`.

## Endpoints

All responses use `{ "success": boolean, "message": string, "data": ... }`; failures include `errors`.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | API and database connectivity |
| GET | `/api/companies?page=1&limit=20` | Paginated companies |
| GET | `/api/companies/:id` | Company detail |
| POST | `/api/companies` | Create company (`name`, `code`) |
| GET | `/api/branches?page=1&limit=20&companyId=<uuid>&isActive=true` | Paginated branches, optionally filtered by company and active state |
| GET | `/api/branches/:id` | Branch detail with company summary |
| POST | `/api/branches` | Create branch for an existing company |
| GET | `/api/employees?page=1&limit=20` | Paginated employees |
| GET | `/api/employees/:id` | Employee detail |
| POST | `/api/employees` | Create employee |
| GET | `/api/attendance?page=1&limit=20` | Paginated attendance |
| GET | `/api/attendance/:id` | Attendance detail |
| POST | `/api/attendance/check-in` | Record check-in |
| POST | `/api/attendance/check-out` | Record check-out |

List endpoints accept `page` (default 1) and `limit` (default 20, maximum 100). Employee filters: `search`, `companyId`, `branchId`, `departmentId`, `status`. Attendance filters: `employeeId`, `attendanceDate`, `fromDate`, `toDate`, `status`, `companyId`, `branchId`.

## Example PowerShell requests

```powershell
Invoke-RestMethod http://localhost:5000/api/health

$company = Invoke-RestMethod -Method Post -Uri http://localhost:5000/api/companies `
  -ContentType 'application/json' -Body '{"name":"Example Co","code":"EXAMPLE"}'

# Use real IDs returned by this API/database for companyId and branchId.
$employeeBody = @{
  employeeCode = 'EMP-001'; firstName = 'Asha'; lastName = 'Sharma'
  joiningDate = '2026-01-15'; companyId = '<company-uuid>'; branchId = '<branch-uuid>'
} | ConvertTo-Json
$employee = Invoke-RestMethod -Method Post -Uri http://localhost:5000/api/employees `
  -ContentType 'application/json' -Body $employeeBody

$checkInBody = @{ employeeId = '<employee-uuid>'; source = 'WEB' } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://localhost:5000/api/attendance/check-in `
  -ContentType 'application/json' -Body $checkInBody
Invoke-RestMethod -Method Post -Uri http://localhost:5000/api/attendance/check-out `
  -ContentType 'application/json' -Body (@{ employeeId = '<employee-uuid>' } | ConvertTo-Json)
```

Branch creation requires a company UUID. Employee creation requires an existing branch UUID belonging to the chosen company. The example company POST writes a record, so use an appropriate local development name and unique code.

Create a branch and then use its returned ID when creating employees:

```powershell
$branchBody = @{
  companyId = '<company-uuid>'; name = 'Head Office'; code = 'HQ'
  address = 'Example address'; latitude = 28.6139; longitude = 77.2090
  radiusM = 200; isActive = $true
} | ConvertTo-Json
$branch = Invoke-RestMethod -Method Post -Uri http://localhost:5000/api/branches `
  -ContentType 'application/json' -Body $branchBody

Invoke-RestMethod 'http://localhost:5000/api/branches?page=1&limit=20&companyId=<company-uuid>&isActive=true'
```

## Attendance date and time

Check-in and check-out timestamps are server-generated instants. Attendance day is the calendar date of that instant in `ATTENDANCE_TIMEZONE`, which defaults to `Asia/Kolkata`; it is stored as a UTC-midnight date-only value matching PostgreSQL `DATE`. Configure the same business timezone on every API instance. Checkout finds the employee's record for the current local business day. `totalMinutes` is the non-negative whole-minute difference between check-in and check-out, rounded down.

Coordinates supplied by the client are optional and untrusted. No geofence enforcement, selfie upload, late-minute, overtime, or status override logic is implemented.

## Limitations and security

Authentication and authorization are not implemented. These endpoints are for local development and must not be exposed publicly until access control and operational protections are in place. The API restricts CORS to configured origins, but CORS is not authentication. Check-in status is initialized to `PRESENT`; scheduling, holidays, and shift-based attendance calculations are not yet part of this API.

## Automated tests

Run `npm test`. Tests use Node's built-in test runner through the existing `tsx` dependency and mock Prisma calls, so they do not connect to or modify PostgreSQL.
