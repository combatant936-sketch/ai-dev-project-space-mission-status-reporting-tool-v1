# 🚀 Space Mission Status Reporting Tool

Welcome to the **Space Mission Status Reporting Tool** — a centralized flight operations and telemetry management platform. This application allows space agency flight directors (**Admins**) and flight crews (**Team Members**) to coordinate missions, submit weekly operational progress reports, review flight status, and track live statistics through visual charts.

---

## 📋 Table of Contents
1. [System Overview & Roles](#-system-overview--roles)
2. [Quick Start (Get Up and Running in 3 Steps)](#-quick-start-get-up-and-running-in-3-steps)
3. [Ready-to-Use Demo Accounts](#-ready-to-use-demo-accounts)
4. [Feature-by-Feature User Guide](#-feature-by-feature-user-guide)
   - [1. Logging In and Out](#1-logging-in-and-out)
   - [2. Mission Control Dashboard & Charts](#2-mission-control-dashboard--charts)
   - [3. Viewing Missions (Fleet Manifest)](#3-viewing-missions-fleet-manifest)
   - [4. Creating a New Mission](#4-creating-a-new-mission)
   - [5. Editing Missions & Assigning Crew](#5-editing-missions--assigning-crew)
   - [6. Submitting a Weekly Report (Team Member)](#6-submitting-a-weekly-report-team-member)
   - [7. Reviewing Reports & Adding Feedback (Admin)](#7-reviewing-reports--adding-feedback-admin)
5. [5-Minute Guided Testing Tour (End-to-End Checklist)](#-5-minute-guided-testing-tour-end-to-end-checklist)
6. [Troubleshooting & Frequently Asked Questions](#-troubleshooting--frequently-asked-questions)
7. [Running the Automated Test Suites](#-running-the-automated-test-suites)

---

## 🛰️ System Overview & Roles

The system is designed with two distinct roles:

| Role | Badge | Permissions & Capabilities |
|---|:---:|---|
| **Administrator (Flight Director)** | 🔴 `ADMIN` | • View overall Mission Control Dashboard and charts.<br>• View all missions in the Fleet Manifest.<br>• Create new space missions.<br>• Edit mission status, details, and assign flight crew.<br>• Inspect submitted weekly reports and add review comments. |
| **Team Member (Astronaut / Engineer)** | 🔵 `TEAM MEMBER` | • View overall Mission Control Dashboard and charts.<br>• Submit weekly status reports for missions they are assigned to.<br>• Report progress, work completed, and blockers. |

---

## ⚡ Quick Start (Get Up and Running in 3 Steps)

### Prerequisites
Make sure you have installed on your computer:
- **Python 3.11+** with `uv` (or standard `pip` / `python`)
- **Node.js (v18+)** and `npm`

---

### Step 1: Start the Backend API Server
Open a terminal in the project directory and run:

```bash
cd backend
uv run uvicorn app.main:app --reload --port 8000
```
> ✅ **Success indicator**: You will see `Uvicorn running on http://127.0.0.1:8000`.

---

### Step 2: Seed the Demo Data (One-Time Setup)
In a new terminal window, populate your database with sample missions and pre-configured accounts:

```bash
cd backend
uv run python seed.py
```
> ✅ **Success indicator**: Output displays `Database successfully seeded with demo data!`.

---

### Step 3: Start the Frontend Application
In another terminal window, launch the interactive web interface:

```bash
cd frontend
npm run dev
```
> ✅ **Success indicator**: You will see `Local: http://localhost:5173/`. Open this URL in your web browser (Chrome, Edge, Firefox, or Safari).

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

### 1. Logging In and Out
1. Open your web browser to **`http://localhost:5173/login`**.
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

## ⏱️ 5-Minute Guided Testing Tour (End-to-End Checklist)

Follow these 7 steps to test every feature in 5 minutes:

- [ ] **Step 1: Sign in as Flight Director**
  - Go to `http://localhost:5173/login`.
  - Enter `admin@nasa.gov` / `Password123!`.
  - Verify you land on the **Mission Control Dashboard** with stat cards and the Doughnut chart.

- [ ] **Step 2: Inspect Missions Manifest**
  - Click **"Missions"** in the top navigation.
  - Verify you see existing missions (e.g., *Artemis III*).
  - Click on a mission row to view its details and assigned flight crew.

- [ ] **Step 3: Create a New Mission**
  - Click **"+ New Mission"**.
  - Enter Title: `Mars Sample Return`.
  - Set Status to `Planned`.
  - Check the checkbox for `astronaut@nasa.gov`.
  - Click **"Create Mission"** and verify it appears in the manifest.

- [ ] **Step 4: Switch to Team Member (Astronaut)**
  - Click **"Logout"** in the top navigation bar.
  - Sign in as `astronaut@nasa.gov` / `Password123!`.
  - Notice the navigation bar adapts: admins see management tabs; team members see **"Submit Report"**.

- [ ] **Step 5: Submit a Weekly Flight Report**
  - Click **"Submit Report"**.
  - In the **Mission** dropdown, select your newly assigned `Mars Sample Return` mission.
  - Set Status: `In Progress`.
  - Fill in Progress Update: `Lander heat shield vibration testing passed 100%.`
  - Fill in Work Completed: `Completed 5 wind-tunnel simulation runs.`
  - Fill in Blockers: `None.`
  - Click **"Submit Weekly Report"**.
  - Verify you return to the Dashboard.

- [ ] **Step 6: Review Report as Flight Director**
  - Click **"Logout"** and sign back in as `admin@nasa.gov`.
  - Click **"Review Reports"**.
  - Locate the report just submitted for `Mars Sample Return` with status `Pending`.
  - Click the row to open the modal.
  - Add Admin Comment: `Approved for flight phase.`
  - Click **"Mark as Reviewed"**.
  - Verify the badge switches to `Reviewed` immediately!

- [ ] **Step 7: Check Live Dashboard Metrics**
  - Click **"Dashboard"**.
  - Notice that Total Missions and Active Missions reflect the new mission, the chart reflects the updated status, and your reviewed report appears in Recent Reports.

---

## ❓ Troubleshooting & Frequently Asked Questions

### 1. "Network error: Could not reach the server" on login
- **Cause**: The backend FastAPI server is not currently running.
- **Solution**: Open a terminal, run `cd backend` followed by `uv run uvicorn app.main:app --reload --port 8000`.

### 2. "Invalid email or password" on login
- **Cause**: The database has not been seeded with test accounts yet.
- **Solution**: In your terminal, run `cd backend` and `uv run python seed.py`.

### 3. "No missions assigned" when trying to submit a report
- **Cause**: You are logged in as a Team Member who has not been assigned to any missions.
- **Solution**: Log in as Admin (`admin@nasa.gov`), go to `Missions`, click **Edit** on a mission, check your astronaut's email address under *Assigned Flight Crew*, and click **Save Changes**.

### 4. How do I inspect the backend API directly?
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
