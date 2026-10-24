# Task Backlog — Space Mission Status Reporting Tool

---

## 1. Project Scaffold with Passing Tests
Goal: Create an empty but runnable project skeleton with one passing test on each side.
Description: Initialise the Vite + React frontend and the FastAPI backend in their respective directories. Add a trivial smoke test for each (e.g. `assert True` on the backend, a component render test on the frontend) and confirm both test suites pass in CI-like fashion locally. No business logic is written yet.

---

## 2. Database Models & Migrations Setup
Goal: Define the core SQLAlchemy models and wire up Alembic migrations.
Description: Create SQLAlchemy models for `User`, `Mission`, and `Report` with the fields implied by the requirements. Configure Alembic and generate the first migration. Running `alembic upgrade head` against a fresh SQLite file should produce a valid schema with no errors.

---

## 3. User Registration & Password Hashing Endpoint
Goal: Implement the `POST /auth/register` endpoint that stores a new user securely.
Description: Accept email, password, and role fields; hash the password with Passlib/bcrypt; persist the user via SQLAlchemy. Return a 201 with the created user's id and email. Write at least two tests: one happy path and one duplicate-email rejection.

---

## 4. Login & JWT Token Endpoint
Goal: Implement `POST /auth/token` (OAuth2 Password Flow) and return a signed JWT.
Description: Validate credentials against the database, generate a short-lived access token with PyJWT/python-jose, and return it in the OAuth2 JSON envelope. Write tests for valid credentials, wrong password, and unknown email. No frontend work yet.

---

## 5. Auth Middleware & Role-Based Guards
Goal: Add a reusable FastAPI dependency that validates JWTs and enforces roles.
Description: Create a `get_current_user` dependency that decodes the JWT, fetches the user, and raises HTTP 401 when invalid. Add a `require_admin` variant that raises HTTP 403 for non-admins. Cover both dependencies with unit tests using a mocked token.

---

## 6. Mission CRUD Endpoints (Admin)
Goal: Build the admin-only REST endpoints for creating, reading, updating, and deleting missions.
Description: Expose `POST /missions`, `GET /missions`, `GET /missions/{id}`, `PATCH /missions/{id}`, and `DELETE /missions/{id}`. Protect every route with the admin guard from Task 5. Validate payloads with Pydantic schemas. Write tests for each endpoint including authorization rejection for non-admins.

---

## 7. Mission Assignment Endpoint
Goal: Allow an admin to assign one or more team members to a mission.
Description: Add a `POST /missions/{id}/assign` endpoint that accepts a list of user IDs and creates the association. Return 404 when the mission or any user does not exist and 403 when the caller is not an admin. Cover assignment and error cases with tests.

---

## 8. Weekly Report Submission Endpoint (Team Member)
Goal: Let a team member submit a weekly report for an assigned mission.
Description: Expose `POST /missions/{id}/reports` accepting current status, progress update, work completed, and blockers. Reject the request with 403 if the calling user is not assigned to that mission. Persist the report and return 201. Write tests for authorised submission and for the unassigned-user rejection.

---

## 9. Report Review Endpoints (Admin)
Goal: Allow an admin to list, mark as reviewed, and comment on reports.
Description: Expose `GET /reports` (all reports), `PATCH /reports/{id}/review` (mark reviewed + optional comment). Protect with the admin guard. Return 404 when the report does not exist. Cover the happy path and auth/not-found error cases with tests.

---

## 10. Dashboard Stats Endpoint
Goal: Expose a single endpoint that returns all numbers needed by the dashboard.
Description: Implement `GET /dashboard` that returns total mission count, active mission count, pending report count, and the five most recent reports. All counts are derived from the database; no caching is needed at this stage. Write tests that assert correct counts against a known fixture dataset.

---

## 11. Frontend Auth — Login Page & Token Storage
Goal: Build the login UI and wire it to the backend token endpoint.
Description: Create a Login page component with email/password inputs that calls `POST /auth/token`. Store the returned JWT in `localStorage` and redirect to the dashboard on success. Show an error message on failure. No protected routing is needed yet.

---

## 12. Frontend Auth — Protected Routes & Auth Context
Goal: Prevent unauthenticated users from accessing any page other than Login.
Description: Create a React context that exposes the current user and logout function. Add a `ProtectedRoute` wrapper that redirects to `/login` when no token is present. Parse the JWT payload to surface the user's role for downstream use. Write a test that confirms the redirect fires when no token is set.

---

## 13. Mission List & Detail Pages (Admin)
Goal: Build the admin UI for browsing and inspecting missions.
Description: Create a Mission List page showing all missions in a table with status badges, and a Mission Detail page showing full info plus assigned team members. Fetch data from the API on mount. Clicking a row navigates to the detail page. No create/edit UI yet.

---

## 14. Create & Edit Mission Forms (Admin)
Goal: Add forms that let an admin create a new mission and edit an existing one.
Description: Build a controlled form with fields for title, description, status, and team-member assignment (multi-select). `POST /missions` on create, `PATCH /missions/{id}` on edit. Show validation errors inline. On success, redirect back to the Mission List page.

---

## 15. Weekly Report Submission Form (Team Member)
Goal: Build the UI that lets a team member submit a weekly report.
Description: Show only missions assigned to the logged-in user. Provide a form with status selector, and text areas for progress update, work completed, and blockers. Submit to `POST /missions/{id}/reports` and show a success confirmation. Restrict page access to team-member role only.

---

## 16. Report Review UI (Admin)
Goal: Build the admin UI for viewing and reviewing submitted reports.
Description: Display all reports in a list with mission name, submitter, and submission date. Allow the admin to open a report, read its content, add a comment, and mark it reviewed via `PATCH /reports/{id}/review`. Reviewed reports should be visually distinguished from pending ones.

---

## 17. Dashboard Page with Charts
Goal: Build the dashboard page that visualises mission and report statistics.
Description: Fetch data from `GET /dashboard` and display total missions, active missions, and pending reports as stat cards. Render a Chart.js doughnut or bar chart showing mission status breakdown. Show a "Recent Reports" list beneath the charts. Apply the app's design system for consistency.

---

## 18. End-to-End Smoke Test
Goal: Run one complete user journey through the full stack to confirm all pieces integrate.
Description: Using a test client (e.g. Playwright or manual curl), exercise the full flow: register an admin, create a mission, assign a team member, submit a report, review it, and check the dashboard counts. Document any discrepancies found and fix them. This is the acceptance gate before any deployment work.
