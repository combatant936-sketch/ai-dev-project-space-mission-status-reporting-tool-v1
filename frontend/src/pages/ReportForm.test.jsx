import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, ProtectedRoute } from "../context/AuthContext";
import ReportForm from "./ReportForm";

function makeFakeJwt(payload) {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.fakesignature`;
}

describe("Weekly Report Submission Form (Issue #15)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders mission dropdown listing only missions assigned to current team member", async () => {
    const memberToken = makeFakeJwt({
      sub: "pilot@nasa.gov",
      user_id: 101,
      role: "team_member",
    });
    localStorage.setItem("access_token", memberToken);

    const mockMissions = [
      {
        id: 1,
        title: "Artemis III",
        status: "in_progress",
        assigned_users: [{ id: 101, email: "pilot@nasa.gov" }],
      },
      {
        id: 2,
        title: "James Webb Orbit",
        status: "planned",
        assigned_users: [{ id: 999, email: "other@nasa.gov" }],
      },
      {
        id: 3,
        title: "Europa Lander",
        status: "planned",
        assigned_users: [
          { id: 101, email: "pilot@nasa.gov" },
          { id: 102, email: "engineer@nasa.gov" },
        ],
      },
    ];

    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes("/missions")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockMissions,
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
    });

    render(
      <MemoryRouter initialEntries={["/reports/new"]}>
        <AuthProvider>
          <Routes>
            <Route path="/reports/new" element={<ReportForm />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /weekly mission status report/i })).toBeDefined();
    });

    // Check that assigned missions are in the select dropdown
    const select = screen.getByLabelText(/mission \*/i);
    const options = Array.from(select.querySelectorAll("option")).map((o) => o.textContent);

    expect(options).toContain("Artemis III");
    expect(options).toContain("Europa Lander");
    expect(options).not.toContain("James Webb Orbit");
  });

  it("renders all required form fields with proper labels and options", async () => {
    const memberToken = makeFakeJwt({
      sub: "pilot@nasa.gov",
      user_id: 101,
      role: "team_member",
    });
    localStorage.setItem("access_token", memberToken);

    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes("/missions")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => [
            { id: 1, title: "Mission One", assigned_users: [{ id: 101, email: "pilot@nasa.gov" }] },
          ],
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
    });

    render(
      <MemoryRouter initialEntries={["/reports/new"]}>
        <AuthProvider>
          <Routes>
            <Route path="/reports/new" element={<ReportForm />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/mission \*/i)).toBeDefined();
      expect(screen.getByLabelText(/current status \*/i)).toBeDefined();
      expect(screen.getByLabelText(/progress update \*/i)).toBeDefined();
      expect(screen.getByLabelText(/work completed \*/i)).toBeDefined();
      expect(screen.getByLabelText(/blockers \(optional\)/i)).toBeDefined();
      expect(screen.getByRole("button", { name: /submit weekly report/i })).toBeDefined();
    });

    const statusOptions = Array.from(
      screen.getByLabelText(/current status \*/i).querySelectorAll("option")
    ).map((o) => o.value);
    expect(statusOptions).toEqual(["planned", "in_progress", "completed", "failed"]);
  });

  it("shows 'No missions assigned' message and disables submit button if user has no assigned missions", async () => {
    const memberToken = makeFakeJwt({
      sub: "pilot@nasa.gov",
      user_id: 101,
      role: "team_member",
    });
    localStorage.setItem("access_token", memberToken);

    // Missions exist but none assigned to user 101
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes("/missions")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => [
            { id: 2, title: "Unassigned Mission", assigned_users: [{ id: 999 }] },
          ],
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
    });

    render(
      <MemoryRouter initialEntries={["/reports/new"]}>
        <AuthProvider>
          <Routes>
            <Route path="/reports/new" element={<ReportForm />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("No missions assigned")).toBeDefined();
    });

    const submitBtn = screen.getByRole("button", { name: /submit weekly report/i });
    expect(submitBtn.disabled).toBe(true);
  });

  it("client-side validation: leaving required fields blank shows inline errors without API call", async () => {
    const memberToken = makeFakeJwt({
      sub: "pilot@nasa.gov",
      user_id: 101,
      role: "team_member",
    });
    localStorage.setItem("access_token", memberToken);

    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes("/missions")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => [
            { id: 10, title: "Active Mission", assigned_users: [{ id: 101 }] },
          ],
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
    });

    render(
      <MemoryRouter initialEntries={["/reports/new"]}>
        <AuthProvider>
          <Routes>
            <Route path="/reports/new" element={<ReportForm />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /submit weekly report/i })).toBeDefined();
    });

    const fetchCallCountBefore = global.fetch.mock.calls.length;

    fireEvent.click(screen.getByRole("button", { name: /submit weekly report/i }));

    await waitFor(() => {
      expect(screen.getByText("Progress update is required")).toBeDefined();
      expect(screen.getByText("Work completed is required")).toBeDefined();
    });

    // Verify no POST was sent
    expect(global.fetch.mock.calls.length).toBe(fetchCallCountBefore);
  });

  it("submitting valid form calls POST /missions/{id}/reports and redirects to /dashboard", async () => {
    const memberToken = makeFakeJwt({
      sub: "pilot@nasa.gov",
      user_id: 101,
      role: "team_member",
    });
    localStorage.setItem("access_token", memberToken);

    global.fetch = vi.fn().mockImplementation((url, opts = {}) => {
      if (url.endsWith("/missions")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => [
            { id: 15, title: "Mars Express", assigned_users: [{ id: 101 }] },
          ],
        });
      }
      if (url.includes("/missions/15/reports") && opts.method === "POST") {
        return Promise.resolve({
          ok: true,
          status: 201,
          json: async () => ({
            id: 88,
            mission_id: 15,
            user_id: 101,
            current_status: "in_progress",
            progress_update: "Thruster calibration complete",
            work_completed: "Tested telemetry links",
            blockers: null,
            reviewed: false,
          }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
    });

    render(
      <MemoryRouter initialEntries={["/reports/new"]}>
        <AuthProvider>
          <Routes>
            <Route path="/reports/new" element={<ReportForm />} />
            <Route path="/dashboard" element={<div data-testid="dashboard-view">Dashboard View</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/progress update \*/i)).toBeDefined();
    });

    fireEvent.change(screen.getByLabelText(/current status \*/i), {
      target: { value: "in_progress" },
    });
    fireEvent.change(screen.getByLabelText(/progress update \*/i), {
      target: { value: "Thruster calibration complete" },
    });
    fireEvent.change(screen.getByLabelText(/work completed \*/i), {
      target: { value: "Tested telemetry links" },
    });
    fireEvent.change(screen.getByLabelText(/blockers \(optional\)/i), {
      target: { value: "Waiting on antenna dish clearance" },
    });

    fireEvent.click(screen.getByRole("button", { name: /submit weekly report/i }));

    await waitFor(() => {
      expect(screen.getByTestId("dashboard-view")).toBeDefined();
    });

    const postCall = global.fetch.mock.calls.find(
      ([url, opts]) => url.includes("/missions/15/reports") && opts?.method === "POST"
    );
    expect(postCall).toBeDefined();
    expect(JSON.parse(postCall[1].body)).toEqual({
      current_status: "in_progress",
      progress_update: "Thruster calibration complete",
      work_completed: "Tested telemetry links",
      blockers: "Waiting on antenna dish clearance",
    });
  });

  it("displays 403 API response as an error message", async () => {
    const memberToken = makeFakeJwt({
      sub: "pilot@nasa.gov",
      user_id: 101,
      role: "team_member",
    });
    localStorage.setItem("access_token", memberToken);

    global.fetch = vi.fn().mockImplementation((url, opts = {}) => {
      if (url.endsWith("/missions")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => [
            { id: 25, title: "Restricted Mission", assigned_users: [{ id: 101 }] },
          ],
        });
      }
      if (url.includes("/missions/25/reports") && opts.method === "POST") {
        return Promise.resolve({
          ok: false,
          status: 403,
          json: async () => ({ detail: "User is not assigned to this mission" }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
    });

    render(
      <MemoryRouter initialEntries={["/reports/new"]}>
        <AuthProvider>
          <Routes>
            <Route path="/reports/new" element={<ReportForm />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/progress update \*/i)).toBeDefined();
    });

    fireEvent.change(screen.getByLabelText(/progress update \*/i), {
      target: { value: "Update" },
    });
    fireEvent.change(screen.getByLabelText(/work completed \*/i), {
      target: { value: "Completed work" },
    });

    fireEvent.click(screen.getByRole("button", { name: /submit weekly report/i }));

    await waitFor(() => {
      expect(screen.getByText("User is not assigned to this mission")).toBeDefined();
    });
  });

  it("redirects unauthenticated users to /login", async () => {
    render(
      <MemoryRouter initialEntries={["/reports/new"]}>
        <AuthProvider>
          <Routes>
            <Route
              path="/reports/new"
              element={
                <ProtectedRoute>
                  <ReportForm />
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("login-page")).toBeDefined();
    });
  });

  it("admin visiting /reports/new is redirected to /dashboard", async () => {
    const adminToken = makeFakeJwt({
      sub: "admin@nasa.gov",
      user_id: 1,
      role: "admin",
    });
    localStorage.setItem("access_token", adminToken);

    render(
      <MemoryRouter initialEntries={["/reports/new"]}>
        <AuthProvider>
          <Routes>
            <Route
              path="/reports/new"
              element={
                <ProtectedRoute>
                  <ReportForm />
                </ProtectedRoute>
              }
            />
            <Route path="/dashboard" element={<div data-testid="dashboard-page">Dashboard Page</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("dashboard-page")).toBeDefined();
    });
  });
});
