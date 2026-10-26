# 🚀 Space Mission Status Reporting Tool

Welcome to the **Space Mission Status Reporting Tool** — a centralized flight operations and telemetry management platform. This application allows space agency flight directors (**Admins**) and flight crews (**Team Members**) to coordinate missions, submit weekly operational progress reports, review flight status, and track live statistics through visual charts.

---

## 📋 Table of Contents
1. [System Overview & Roles](#-system-overview--roles)
2. [🧼 Fresh Start: Resetting Database & Project State](#-fresh-start-resetting-database--project-state)
3. [🐳 Option 1: One-Click Run with Docker (Recommended for Non-Tech Users)](#-option-1-one-click-run-with-docker-recommended-for-non-tech-users)
4. [☸️ Option 2: Deploying to Kubernetes (k8s / kind)](#-option-2-deploying-to-kubernetes-k8s--kind)
5. [🔄 Option 3: CI/CD Pipeline (Automated Testing & Deployment)](#-option-3-cicd-pipeline-automated-testing--deployment)
6. [💻 Option 4: Manual Local Setup (Python & Node.js)](#-option-4-manual-local-setup-python--nodejs)
7. [🔑 Ready-to-Use Demo Accounts](#-ready-to-use-demo-accounts)
8. [📖 Feature-by-Feature User Guide](#-feature-by-feature-user-guide)
9. [⏱️ End-to-End Guided Testing Checklist (All Features from Fresh DB)](#-end-to-end-guided-testing-checklist-all-features-from-fresh-db)
10. [❓ Troubleshooting & Frequently Asked Questions](#-troubleshooting--frequently-asked-questions)
11. [🧪 Running the Automated Test Suites](#-running-the-automated-test-suites)

---

## 🛰️ System Overview & Roles

The system is designed with two distinct roles:

| Role | Badge | Permissions & Capabilities |
|---|:---:|---|
| **Administrator (Flight Director)** | 🔴 `ADMIN` | • View overall Mission Control Dashboard and charts.<br>• View all missions in the Fleet Manifest.<br>• Create new space missions.<br>• Edit mission status, details, and assign flight crew.<br>• Inspect submitted weekly reports and add review comments. |
| **Team Member (Astronaut / Engineer)** | 🔵 `TEAM MEMBER` | • View overall Mission Control Dashboard and charts.<br>• Submit weekly status reports for missions they are assigned to.<br>• Report progress, work completed, and blockers. |

---

## 🧼 Fresh Start: Resetting Database & Project State

Before starting your testing tour, you can reset the system to an **entirely clean slate** (removing any old test missions or reports so only fresh initial seed data remains):

### For Docker Users (Recommended)
Run this single command in your terminal:
```bash
docker compose down -v
```
> 💡 **What this does**: The `-v` flag removes the persistent PostgreSQL database storage volume (`pgdata`). Next time you start, a pristine database is created and automatically seeded from scratch with clean initial records.

### For Kubernetes Users
Run:
```bash
kubectl delete -f k8s/
```
> 💡 **What this does**: Destroys the `space-mission` namespace, pods, deployments, and persistent storage volume claim, leaving zero leftover state.

### For Local SQLite Users
- **Windows (PowerShell)**: `Remove-Item -Force backend\dev.db -ErrorAction Ignore`
- **macOS / Linux**: `rm -f backend/dev.db`

---

## 🐳 Option 1: One-Click Run with Docker (Recommended for Non-Tech Users)

This is the easiest and most reliable way to run and test the complete system. You **do not need to install** Python, Node.js, Vite, or PostgreSQL on your computer — Docker packages and runs everything automatically.

### Prerequisites
- Install and launch **[Docker Desktop](https://www.docker.com/products/docker-desktop/)** (ensure the Docker whale icon shows running in your taskbar or menu bar).

---

### Step 1: Launch Everything with One Single Command
Open a terminal (PowerShell, Command Prompt, or Terminal) in the project root directory and run:

```bash
docker compose up --build
```

### What Happens Automatically Behind the Scenes:
1. **PostgreSQL Database**: Starts a Postgres 16 database container with automatic health monitoring.
2. **Frontend Build**: Compiles the React + Vite frontend into optimized static files.
3. **Database Migrations**: Automatically applies Alembic schema migrations (`alembic upgrade head`).
4. **Data Seeder**: Automatically creates demo accounts and sample missions (`python seed.py`).
5. **Combined Web Server**: Launches FastAPI + Uvicorn, serving the REST API and the React web app together on port `8000`.

> ✅ **Success indicator**: In your terminal logs, you will see:
> ```text
> Application startup complete.
> Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
> ```

---

### Step 2: Open the Application
Open your web browser (Chrome, Edge, Firefox, or Safari) to:

👉 **`http://localhost:8000`**

Log in using the pre-configured [Demo Accounts](#-ready-to-use-demo-accounts) below!

---

### Step 3: Stopping and Resetting
- **To stop the app**: Press `Ctrl + C` in the terminal, or run `docker compose down`.
- **To reset to a fresh database**: Run `docker compose down -v`, then run `docker compose up --build`.

---

## ☸️ Option 2: Deploying to Kubernetes (k8s / kind)

For testing the production Kubernetes deployment manifests located in the `k8s/` directory.

### Prerequisites
- Docker Desktop with **Kubernetes enabled** (Settings ⚙️ -> Kubernetes -> Check *Enable Kubernetes*), OR a local cluster like **[kind](https://kind.sigs.k8s.io/)** or **[minikube](https://minikube.sigs.k8s.io/)**.
- `kubectl` command-line tool installed.

---

### Step 1: Build the Application Docker Image
From the project root directory:

```bash
docker build -t ai-dev-project-app:latest .
```
*(If using `kind`, load the image into your cluster: `kind load docker-image ai-dev-project-app:latest --name space-mission`)*

---

### Step 2: Apply the Kubernetes Manifests
Deploy the namespace, database, secrets, persistent storage, and application with one command:

```bash
kubectl apply -f k8s/
```

This creates:
- `space-mission` dedicated namespace
- `postgres-secret` (database credentials)
- `postgres-pvc` (persistent volume storage)
- `postgres` deployment & service (PostgreSQL database)
- `app` deployment & service (FastAPI + React application)

---

### Step 3: Verify Pods Are Running
Run:

```bash
kubectl get pods -n space-mission
```

> ✅ **Success indicator**: Both `app-...` and `postgres-...` will transition to:
> `STATUS: Running` and `READY: 1/1`.

---

### Step 4: Access the Application via Port Forwarding
Run:

```bash
kubectl port-forward -n space-mission svc/app-service 8000:8000
```

Open **`http://localhost:8000`** in your browser.

---

### Step 5: Clean Up Kubernetes Deployment
When you are done testing:

```bash
kubectl delete -f k8s/
```

---

## 🔄 Option 3: CI/CD Pipeline (Automated Testing & Deployment)

The project includes an automated GitHub Actions CI/CD pipeline defined in [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

### How the Pipeline Works:
Whenever code is pushed or a pull request is opened, GitHub Actions executes **4 automated verification stages**:

1. **Job 1: Frontend Tests (Vitest)**
   - Spins up Node.js 22.
   - Installs frontend packages.
   - Executes all **47 React & Vitest unit tests** (login, forms, charts, context).
2. **Job 2: Backend Tests (pytest + SQLite)**
   - Spins up Python 3.11 with `uv`.
   - Executes **66 backend pytest tests** (authentication, route guards, mission CRUD, reports).
3. **Job 3: Integration Tests (PostgreSQL)**
   - Spins up a live PostgreSQL 16 container service in GitHub Actions.
   - Runs database migrations and validates cross-service database transactions.
4. **Job 4: Automated Build & Deploy (kind Kubernetes)**
   - Triggers **only if all 3 test jobs pass**.
   - Generates a unique image tag (`SHA-timestamp`).
   - Builds the production Docker image.
   - Creates an ephemeral `kind` Kubernetes cluster on the runner.
   - Deploys the full application and PostgreSQL database using `k8s/*.yaml`.
   - Waits for rollout completion and performs automated HTTP `/health` smoke tests.

### How a Non-Tech User Can Inspect the CI/CD Pipeline:
1. Open this repository on **GitHub**.
2. Click on the **Actions** tab at the top of the repository.
3. Click on the latest workflow run titled **"CI"**.
4. You will see green checkmarks (✅) next to all 4 jobs:
   - `Frontend Tests (Vitest)`
   - `Backend Tests (pytest + SQLite)`
   - `Integration Tests (pytest + PostgreSQL)`
   - `Build & Deploy to kind`

---

## 💻 Option 4: Manual Local Setup (Python & Node.js)

For developers who want to run the frontend and backend directly on their host machine without Docker:

### Prerequisites
- **Python 3.11+** with `uv` (or standard `pip`)
- **Node.js (v18+)** and `npm`

---

### Step 1: Start the Backend API Server
Open a terminal in the project directory and run:

```bash
cd backend
uv run uvicorn app.main:app --reload --port 8000
```
> ✅ **Success indicator**: `Uvicorn running on http://127.0.0.1:8000`.

---

### Step 2: Seed the Demo Data (One-Time Setup)
In a new terminal window:

```bash
cd backend
uv run python seed.py
```
> ✅ **Success indicator**: `Database successfully seeded with demo data!`.

---

### Step 3: Start the Frontend Application
In another terminal window:

```bash
cd frontend
npm run dev
```
> ✅ **Success indicator**: `Local: http://localhost:5173/`. Open this URL in your web browser.

---

## 🔑 Ready-to-Use Demo Accounts

The database seed provides ready-to-test accounts:

| Role | Email Address | Password | Intended Use |
|---|---|---|---|
| **Admin** | `admin@nasa.gov` | `Password123!` | Flight Director testing (Mission CRUD, Crew Assignment, Report Review) |
| **Team Member** | `astronaut@nasa.gov` | `Password123!` | Flight Crew testing (Submitting weekly status reports) |
| **Team Member 2** | `engineer@nasa.gov` | `Password123!` | Secondary crew member testing |

---

## 📖 Feature-by-Feature User Guide

> 💡 **Base URL Notice**:
> - If you started the app with **Docker** or **Kubernetes**, open **`http://localhost:8000`**.
> - If you started the app with **Manual Local Dev (npm run dev)**, open **`http://localhost:5173`**.
> *(Both ports offer identical features; Docker & Kubernetes bundle frontend and backend together on port 8000).*

### 1. Logging In and Out
1. Open your web browser to **`/login`** (e.g. `http://localhost:8000/login` or `http://localhost:5173/login`).
2. Enter your **Email Address** and **Password** (e.g. `admin@nasa.gov` and `Password123!`).
3. Click **"Sign In to Console"**.
4. You will be authenticated with a secure cryptographic JSON Web Token (JWT) and redirected to the **Mission Control Dashboard**.
5. To sign out at any time, click the **"Logout"** button in the top navigation bar.

---

### 2. Mission Control Dashboard & Charts
**URL**: `http://localhost:5173/dashboard` (Accessible by both Admin and Team Members)

The Dashboard serves as the central operational hub:
- **Stat Summary Cards**:
  - **Total Missions**: Total number of registered flights across all statuses.
  - **Active Missions**: Missions currently marked `In Progress`.
  - **Pending Reports**: Weekly status reports submitted by astronauts awaiting administrative sign-off.
- **Interactive Missions by Status Chart**:
  - A responsive Chart.js doughnut chart breaking down the fleet into **Planned** (blue), **In Progress** (cyan), **Completed** (green), and **Failed** (red).
  - Hovering your mouse over any segment shows the exact mission count.
  - If no missions exist yet, the chart renders cleanly without errors.
- **Recent Reports Feed**:
  - Displays the 5 most recent weekly status reports submitted by team members.
  - Shows Mission Title, Submitter Email, Submission Date, and a status badge (`Reviewed` or `Pending`).
  - If no reports have been submitted, displays a friendly empty state message: *"No reports yet"*.

---

### 3. Viewing Missions (Fleet Manifest)
**URL**: `http://localhost:5173/missions` *(Admin only)*

1. In the top navigation bar, click **"Missions"**.
2. A manifest table displays all registered space missions with:
   - **Mission Title**
   - **Status Badge** with distinctive color coding:
     - 🔵 **Planned**
     - 🟡 **In Progress**
     - 🟢 **Completed**
     - 🔴 **Failed**
   - **Created Date**
3. **Inspect a Mission**: Click anywhere on a mission row to open its full detail view (`/missions/:id`) to view its payload description and assigned flight crew members.

---

### 4. Creating a New Mission
**URL**: `http://localhost:5173/missions/new` *(Admin only)*

1. From the Missions Manifest (`/missions`), click the blue **"+ New Mission"** button in the upper right.
2. Fill out the form fields:
   - **Mission Title** *(Required)*: e.g. `Titan Explorer I`
   - **Description** *(Optional)*: e.g. `Atmospheric probe study of methane lakes.`
   - **Status** *(Required)*: Select `Planned`, `In Progress`, `Completed`, or `Failed` (defaults to `Planned`).
   - **Assigned Flight Crew**: Check off any registered team members (e.g. `astronaut@nasa.gov` and `engineer@nasa.gov`) you want to assign to this mission.
3. Click **"Create Mission"**.
4. You will be redirected back to the Missions Manifest, where your newly registered mission immediately appears in the manifest table.

> 💡 **Form Validation**: If you try to submit without a Mission Title, an inline warning *"Title is required"* will appear without sending an API request.

---

### 5. Editing Missions & Assigning Crew
**URL**: `http://localhost:5173/missions/:id/edit` *(Admin only)*

1. From the Mission Detail view (`/missions/:id`), click the **"Edit Mission"** button.
2. All current details (Title, Description, Status, and Crew Checkboxes) are automatically pre-filled.
3. You can modify flight parameters, adjust status, or add/remove team member crew assignments.
4. Click **"Save Changes"** to update telemetry. Click **"Cancel"** to return without saving.

---

### 6. Submitting a Weekly Report (Team Member)
**URL**: `http://localhost:5173/reports/new` *(Team Member only)*

1. Log out from Admin and log in as a Team Member (e.g., `astronaut@nasa.gov` / `Password123!`).
2. Click **"Submit Report"** in the top navigation bar.
3. Fill out your status report:
   - **Mission** *(Required)*: Select one of your assigned flights from the dropdown. *(Missions not assigned to you are filtered out automatically).*
   - **Current Status** *(Required)*: e.g. `In Progress`
   - **Progress Update** *(Required)*: Describe developments, milestones, or tests completed.
   - **Work Completed** *(Required)*: Detail subsystem validations or simulations performed.
   - **Blockers** *(Optional)*: Note any parts delays or issues.
4. Click **"Submit Weekly Report"**.
5. Upon successful submission, you are redirected back to the Dashboard, and the "Pending Reports" metric increments by 1.

> ⚠️ **No Missions Assigned Protection**: If an astronaut has not been assigned to any missions yet, the page displays a helpful *"No missions assigned"* notice and safely disables the submit button.

---

### 7. Reviewing Reports & Adding Feedback (Admin)
**URL**: `http://localhost:5173/reports` *(Admin only)*

1. Log in as Flight Director (`admin@nasa.gov`).
2. In the top navigation bar, click **"Review Reports"**.
3. You will see a chronological list of all submitted reports. Unreviewed reports display an amber **`Pending`** badge.
4. Click on any report row to open the **Report Detail Modal**.
5. The modal displays full telemetry:
   - Submitter email and timestamp
   - Current Status
   - Progress Update
   - Work Completed
   - Blockers
6. **Add Admin Feedback & Approve**:
   - Type optional notes in the **Admin Comment** textarea (e.g., *"Telemetry verified by Flight Dynamics. Clear for next phase."*).
   - Click the green **"Mark as Reviewed"** button.
7. The report status updates **instantly in place** without reloading the page:
   - The modal badge switches to green **`Reviewed`**.
   - Your comment is saved and displayed.
   - In the background report table, the badge immediately switches to **`Reviewed`**.
   - Closing the modal reflects the new status across the dashboard.

---

## ⏱️ End-to-End Guided Testing Checklist (All Features from Fresh DB)

Follow this 8-step guided checklist to test every feature across both user roles from a fresh database start:

> 💡 **Base URL Reminder**:
> - Running with **Docker** or **Kubernetes**: Open **`http://localhost:8000`**
> - Running with **Manual Local Dev (Vite)**: Open **`http://localhost:5173`**

---

### 📋 Complete Feature Testing Walkthrough:

- [ ] **Step 1: Sign in as Flight Director (Admin)**
  - Navigate to `/login`.
  - Enter Email: `admin@nasa.gov` / Password: `Password123!`.
  - Click **"Sign In to Console"**.
  - ✅ **Verify**: You land on the **Mission Control Dashboard** with stat summary cards (Total Missions, Active Missions, Pending Reports) and an interactive Chart.js doughnut chart.

- [ ] **Step 2: Inspect Missions Manifest & Crew Details (Admin)**
  - In the top navigation bar, click **"Missions"**.
  - ✅ **Verify**: You see the fleet table with mission titles, colored status badges, and creation dates.
  - Click anywhere on a mission row (e.g. *Artemis III*).
  - ✅ **Verify**: The Mission Detail page opens, displaying full flight specifications and assigned flight crew members.

- [ ] **Step 3: Create a Brand New Space Mission (Admin)**
  - In the top navigation bar, click **"Missions"**, then click the blue **"+ New Mission"** button.
  - Fill out the form fields:
    - **Mission Title**: `Europa Ice Explorer`
    - **Description**: `Radar sounder survey of subsurface liquid water ocean.`
    - **Status**: `Planned`
    - **Assigned Flight Crew**: Check the boxes for `astronaut@nasa.gov` and `engineer@nasa.gov`.
  - Click **"Create Mission"**.
  - ✅ **Verify**: You are redirected to the Missions Manifest table, and `Europa Ice Explorer` appears in the list with a blue `Planned` badge.

- [ ] **Step 4: Edit Flight Parameters & Status (Admin)**
  - Click on your newly created `Europa Ice Explorer` mission row.
  - Click the **"Edit Mission"** button.
  - Change **Status** from `Planned` to `In Progress`.
  - Click **"Save Changes"**.
  - ✅ **Verify**: You are redirected to the detail page and the status badge is now yellow `In Progress`.

- [ ] **Step 5: Sign Out & Switch to Team Member (Astronaut)**
  - Click **"Logout"** in the top navigation bar.
  - Enter Email: `astronaut@nasa.gov` / Password: `Password123!`.
  - Click **"Sign In to Console"**.
  - ✅ **Verify**: The navigation bar dynamically adapts to the astronaut role — administrative management tabs are hidden, and **"Submit Report"** is prominently displayed.

- [ ] **Step 6: Submit a Weekly Operational Flight Report (Team Member)**
  - Click **"Submit Report"** in the top navigation bar.
  - Fill out the operational status report:
    - **Mission**: Open the dropdown and select `Europa Ice Explorer`. *(Note: Only missions assigned to this astronaut appear in the list).*
    - **Current Status**: `In Progress`
    - **Progress Update**: `Cryogenic antenna deployed and frequency calibration completed.`
    - **Work Completed**: `Ran 10 simulated deep-space telemetry transmission tests with 100% data integrity.`
    - **Blockers**: `Minor solar panel actuator jitter observed, thermal blanket check scheduled.`
  - Click **"Submit Weekly Report"**.
  - ✅ **Verify**: You are redirected to the Dashboard. The **Pending Reports** stat card increments by 1, and your newly submitted report appears at the top of the Recent Reports feed with an amber `Pending` badge.

- [ ] **Step 7: Sign in as Flight Director to Review & Approve Report (Admin)**
  - Click **"Logout"** and sign back in as `admin@nasa.gov` / `Password123!`.
  - In the top navigation bar, click **"Review Reports"**.
  - Locate the report for `Europa Ice Explorer` with the amber **`Pending`** badge.
  - Click on the report row to open the full **Report Detail Modal**.
  - In the **Admin Comment** text area, type: `Flight operations reviewed telemetry. Clear to proceed to orbital insertion phase.`
  - Click the green **"Mark as Reviewed"** button.
  - ✅ **Verify**: The status badge switches **instantly** to green `Reviewed` in the modal and updates in real-time in the background table without any page refresh! Close the modal.

- [ ] **Step 8: Verify Live Real-Time Dashboard Analytics**
  - Click **"Dashboard"** in the top navigation bar.
  - ✅ **Verify**:
    - **Total Missions** reflects all missions including your newly created one.
    - **Active Missions** reflects missions currently marked `In Progress`.
    - **Pending Reports** has updated to `0` because you just approved the report.
    - **Interactive Chart**: The doughnut chart reflects the updated status breakdown. Hovering your mouse over any segment displays the exact count.
    - **Recent Reports**: Shows your newly approved report with a green `Reviewed` badge.

---

## ❓ Troubleshooting & Frequently Asked Questions

### 1. "Network error: Could not reach the server" on login
- **Cause**: The backend server is not running.
- **Solution**:
  - If using **Docker**: Ensure Docker Desktop is running and run `docker compose up --build`.
  - If using **Local Dev**: Run `cd backend` followed by `uv run uvicorn app.main:app --reload --port 8000`.

### 2. "Invalid email or password" on login
- **Cause**: The database has not been seeded with test accounts yet.
- **Solution**:
  - If using **Docker**: Run `docker compose down -v && docker compose up --build`.
  - If using **Local Dev**: In your terminal, run `cd backend` and `uv run python seed.py`.

### 3. "Port 8000 already in use" (Docker)
- **Cause**: Another service or a previous instance of uvicorn is using port 8000.
- **Solution**: Stop any running uvicorn terminals or run `docker compose down`.

### 4. Kubernetes pod status stuck in `ContainerCreating`
- **Cause**: Initial image download or initialization is in progress.
- **Solution**: Wait 30 seconds, or run `kubectl describe pod -n space-mission` to inspect Kubernetes events.

### 5. "No missions assigned" when trying to submit a report
- **Cause**: You are logged in as a Team Member who has not been assigned to any missions.
- **Solution**: Log in as Admin (`admin@nasa.gov`), go to `Missions`, click **Edit** on a mission, check your astronaut's email address under *Assigned Flight Crew*, and click **Save Changes**.

### 6. How do I inspect the backend API directly?
- Open your browser to **`http://localhost:8000/docs`** to explore the interactive FastAPI Swagger UI, test endpoints, and view request/response schemas.

---

## 🧪 Running the Automated Test Suites

Both the backend and frontend include automated test suites:

### Backend Tests (66 Tests)
Run from the root or `backend` folder:
```bash
uv --directory backend run pytest -v
```
*(Runs full unit tests, model validations, route security checks, and end-to-end user journeys in `test_e2e.py`).*

### Frontend Tests (47 Tests)
Run from the `frontend` folder:
```bash
cd frontend
npm test
```
*(Runs Vitest and React Testing Library tests covering Login, AuthContext, ProtectedRoute, MissionList, MissionDetail, MissionForm, ReportForm, ReportList, and Dashboard).*

---

**Mission Control Status**: 🟢 All systems nominal. Ready for launch!
