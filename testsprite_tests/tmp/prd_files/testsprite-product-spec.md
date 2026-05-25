# Product Specification: Casa del Sol Access Control

## Product Overview

Casa del Sol Access Control is a web application for registering users, approving access, and recording physical entry/exit events through rotating QR codes. The product has a React frontend and a NestJS backend.

## Test Environment

- Frontend URL: `http://localhost:5175`
- Backend URL: `http://localhost:8000`
- Backend health check: `GET http://localhost:8000/health`
- API documentation: `http://localhost:8000/docs`
- Authentication model: httpOnly cookies with CSRF protection.
- Frontend must not store JWTs in `localStorage` or `sessionStorage`.
- CORS must allow `http://localhost:5175` with credentials.

## Seeded Admin User

Use the backend seed admin for admin workflow tests:

- Email: `admin@test.local`
- Password: `AdminTestPassword123!`

Expected result after successful login:

- User is redirected to `/admin`.
- Admin panel is visible.
- Auth cookies are set by the backend.
- No token is stored in browser local storage.

## User Roles

Supported roles:

- `admin`
- `voluntarios`
- `personal`
- `servicio_social`
- `visitas`
- `familiares`
- `donantes`
- `proveedores`

Public registration must not allow creating an `admin` role.

## Authorization States

Supported user states:

- `pending`: registered but not yet approved.
- `authorized`: can access QR scanning.
- `unauthorized`: access removed; cannot scan QR until reauthorized.

## Core User Journeys

### 1. Visitor Opens App

Precondition:

- Frontend is running on `http://localhost:5175`.
- Backend is running on `http://localhost:8000`.

Steps:

1. Open `http://localhost:5175`.
2. App attempts to load `/profile`.
3. If unauthenticated, user is redirected to `/login`.

Expected:

- Login screen is displayed.
- No uncaught JavaScript error appears.
- A `401` for `/profile` is acceptable only if handled silently.
- The app must not show a broken blank page.

### 2. Admin Login

Steps:

1. Open `/login`.
2. Enter `admin@test.local`.
3. Enter `AdminTestPassword123!`.
4. Submit the form.

Expected:

- `POST /auth/login` returns `201`.
- User is redirected to `/admin`.
- Admin dashboard loads stats or empty state.
- Browser console has no unhandled promise rejection.
- App does not call `/auth/refresh` after a failed `/auth/login`.

### 3. Invalid Login

Steps:

1. Open `/login`.
2. Enter `admin@test.local`.
3. Enter an incorrect password.
4. Submit the form.

Expected:

- `POST /auth/login` returns `401`.
- A safe Spanish error message is shown.
- The app stays on `/login`.
- No `/auth/refresh` retry is made for this failed login.
- No uncaught promise error appears.

### 4. Public Registration

Steps:

1. Open `/registro`.
2. Fill all required fields:
   - valid email
   - password of at least 12 characters
   - first name
   - last name
   - address
   - age between 18 and 120
   - phone matching `+?[0-9]{10,15}`
   - public role
   - PNG or JPG identification image
3. Submit registration.

Expected:

- `POST /auth/register` succeeds.
- User is redirected to `/pendiente`.
- The pending page explains that admin review is required.
- No JWT is stored in local storage.

Validation expectations:

- Password shorter than 12 characters is rejected client-side.
- Age outside 18-120 is rejected client-side.
- Invalid phone format is rejected client-side.
- Missing identification image is rejected client-side.
- Admin role is not available in the public role selector.

### 5. Pending User Review

Precondition:

- Admin is logged in.
- At least one pending user exists.

Steps:

1. Open `/admin`.
2. Select the pending users tab.
3. Filter by role.
4. View a pending user's identification.
5. Authorize the user.

Expected:

- `GET /admin/users/pending` loads pending users.
- Identification image request uses authenticated cookies.
- `POST /admin/users/:id/authorize` succeeds.
- User disappears from pending list or updates state.
- Stats are refreshed.

### 6. Reject Pending User

Precondition:

- Admin is logged in.
- A pending user exists.

Steps:

1. Open pending users tab.
2. Select reject for a pending user.

Expected:

- `POST /admin/users/:id/reject` succeeds.
- User is removed from pending list.
- UI shows no stale row after refresh.

### 7. Search Users

Precondition:

- Admin is logged in.

Steps:

1. Open admin users/search tab.
2. Search by name or email.
3. Filter by role.

Expected:

- `GET /admin/users/search` returns matching users.
- Results show name, email, role, state, registration date.
- Empty result state is clear and in Spanish.

### 8. Unauthorize and Reauthorize User

Precondition:

- Admin is logged in.
- At least one authorized non-admin user exists.

Steps:

1. Search for an authorized user.
2. Click desautorizar.
3. Enter a reason of at least 10 characters.
4. Submit.
5. Search for the same user.
6. Click reautorizar.

Expected:

- `POST /admin/users/:id/unauthorize` succeeds.
- User state becomes `unauthorized`.
- `POST /admin/users/:id/reauthorize` succeeds.
- User state becomes `authorized`.

### 9. Admin QR Display

Precondition:

- Admin is logged in.

Steps:

1. Open admin QR tab.

Expected:

- `GET /qr/current` succeeds.
- QR code is visible.
- Expiration date is shown.
- QR refreshes periodically without page reload.

### 10. Public Kiosk QR

Steps:

1. Open `/kiosko`.

Expected:

- `GET /public/qr/current` succeeds without authentication.
- QR code is visible.
- Expiration date is shown.
- No login redirect occurs.

### 11. Authorized User QR Scan

Precondition:

- A non-admin user is authorized and logged in.
- A current QR code exists from `/public/qr/current`.

Steps:

1. Open `/qr`.
2. Select `Entrada`.
3. Paste a valid QR code manually.
4. Submit.
5. Select `Salida`.
6. Paste a valid QR code manually.
7. Submit.

Expected:

- `POST /qr/scan` succeeds for entry.
- `POST /qr/scan` succeeds for exit.
- Success messages are shown in Spanish.
- Last action state is visible.

### 12. Unauthorized User Cannot Scan

Precondition:

- A non-admin user has state `unauthorized`.

Steps:

1. Log in as unauthorized user.
2. Attempt to open `/qr`.

Expected:

- User is redirected to `/dashboard`.
- Dashboard shows limited access status.
- QR scan controls are not available.

### 13. Access Logs

Precondition:

- Admin is logged in.
- At least one entry/exit log exists.

Steps:

1. Open admin access logs tab.
2. Select today's date.

Expected:

- `GET /admin/access-logs` succeeds.
- Totals for entries, exits, and currently inside are visible.
- Logs show user, type, time, manual flag, and notes.

### 14. Users Inside and Manual Exit

Precondition:

- Admin is logged in.
- At least one user has an entry without exit.

Steps:

1. Open users inside tab.
2. Enter notes for manual exit.
3. Click manual exit for a user.

Expected:

- `GET /admin/users-inside` succeeds.
- `POST /admin/users/:id/manual-exit` succeeds.
- User is removed from users-inside list.
- Access logs reflect manual exit.

## Backend API Contract Tests

### Health

- `GET /health` returns `200`.
- Response includes `status: "ok"`.

### CSRF

- `GET /auth/csrf` returns `200`.
- Response includes `csrf_token`.
- Response sets `cds_csrf` cookie.

### Login

- Valid admin credentials return `201`.
- Response includes user role `admin`.
- Response sets `cds_access`, `cds_refresh`, and `cds_csrf` cookies.
- Invalid password returns `401`.

### Authenticated Profile

- Unauthenticated `GET /profile` returns `401`.
- Authenticated `GET /profile` returns current user.

### Logout

- Authenticated `POST /auth/logout` returns success.
- Auth cookies are cleared.
- Subsequent `GET /profile` returns `401`.

### Admin Endpoints

With admin cookies:

- `GET /admin/stats` returns counts.
- `GET /admin/users/pending` returns paginated users.
- `GET /admin/users/search` returns paginated users.
- `GET /admin/access-logs` returns totals and logs.
- `GET /admin/users-inside` returns current users inside.
- `GET /qr/current` returns current QR.

Without admin cookies:

- Admin endpoints return `401` or `403`.

### Public QR

- `GET /public/qr/current` returns `200` without authentication.
- Response includes current QR code and expiration.

## Non-Functional Requirements

- All user-facing text must be Spanish.
- Layout must work on desktop and mobile widths.
- Buttons must remain usable and readable at mobile widths.
- Console must not show uncaught errors during normal flows.
- API errors must be displayed safely without internal stack traces.
- Auth must rely on secure cookies and CSRF headers, not frontend token storage.

## Known Regression Checks

TestSprite should explicitly check these previously observed issues:

- CORS must allow `http://localhost:5175`.
- `/profile` unauthenticated failure must not break initial render.
- Failed `/auth/login` must not trigger `/auth/refresh`.
- Failed login must not throw an uncaught promise in the browser console.
- Admin login must work with the seeded credentials above.

## Acceptance Criteria

The product is test-passing when:

- Admin can log in and access `/admin`.
- Invalid login is handled visibly and safely.
- Registration creates a pending user.
- Admin can authorize, reject, unauthorize, and reauthorize users.
- Authorized users can record QR entry and exit.
- Unauthorized users cannot access QR scanning.
- Kiosk QR works without login.
- Admin logs and users-inside views load.
- Backend API contract tests pass.
- `npm run build`, `npm run lint`, and backend `npm test` pass.
