import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, ProtectedRoute } from "../context/AuthContext";
import Dashboard from "./Dashboard";

// Mock react-chartjs-2 to avoid canvas issues in jsdom while testing dataset props
vi.mock("react-chartjs-2", () => ({
  Doughnut: ({ data, options }) => (
    <div data-testid="status-chart-canvas" data-chart-data={JSON.stringify(data)}>
      Doughnut Chart Canvas
    </div>
  ),
}));

function makeFakeJwt(payload) {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.fakesignature`;
}

describe("Dashboard Page with Charts (Issue #17)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("shows loading spinner while API call is in flight, then renders stat cards and chart", async () => {
    const memberToken = makeFakeJwt({ sub: "member@nasa.gov", role: "team_member" });
    localStorage.setItem("access_token", memberToken);

    let resolvePromise;
    const fetchPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    global.fetch = vi.fn().mockReturnValue(fetchPromise);

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <AuthProvider>
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    // Verify loading spinner is present
    expect(screen.getByTestId("dashboard-spinner")).toBeDefined();
    expect(screen.getByText(/loading mission control dashboard/i)).toBeDefined();

    // Now resolve the API response
    const mockDashboardData = {
      total_missions: 12,
      active_missions: 5,
      pending_reports: 3,
      missions_by_status: {
        planned: 4,
        in_progress: 5,
        completed: 2,
        failed: 1,
      },
      recent_reports: [
        {
          id: 1,
          mission_title: "Artemis III",
          submitter_email: "astronaut@nasa.gov",
          submitted_at: "2026-06-01T10:00:00Z",
          reviewed: false,
        },
      ],
    };

    resolvePromise({
      ok: true,
      status: 200,
      json: async () => mockDashboardData,
    });

    await waitFor(() => {
      expect(screen.getByText("Mission Control v2")).toBeDefined();
    });

    // Check 3 stat cards
    expect(screen.getByTestId("stat-total-missions").textContent).toContain("12");
    expect(screen.getByTestId("stat-active-missions").textContent).toContain("5");
    expect(screen.getByTestId("stat-pending-reports").textContent).toContain("3");

    // Check chart container and data passed
    const chart = screen.getByTestId("status-chart-canvas");
    expect(chart).toBeDefined();
    const parsedData = JSON.parse(chart.getAttribute("data-chart-data"));
    expect(parsedData.datasets[0].data).toEqual([4, 5, 2, 1]);

    // Check Recent Reports
    expect(screen.getByText("Artemis III")).toBeDefined();
    expect(screen.getByText("astronaut@nasa.gov")).toBeDefined();
    expect(screen.getByText("Pending")).toBeDefined();
  });

  it("renders correctly when all four status counts are 0", async () => {
    const adminToken = makeFakeJwt({ sub: "admin@nasa.gov", role: "admin" });
    localStorage.setItem("access_token", adminToken);

    const emptyData = {
      total_missions: 0,
      active_missions: 0,
      pending_reports: 0,
      missions_by_status: {
        planned: 0,
        in_progress: 0,
        completed: 0,
        failed: 0,
      },
      recent_reports: [],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => emptyData,
    });

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <AuthProvider>
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("stat-total-missions").textContent).toContain("0");
      expect(screen.getByTestId("stat-active-missions").textContent).toContain("0");
      expect(screen.getByTestId("stat-pending-reports").textContent).toContain("0");
    });

    // Chart dataset should be [0, 0, 0, 0]
    const chart = screen.getByTestId("status-chart-canvas");
    expect(chart).toBeDefined();
    const parsedData = JSON.parse(chart.getAttribute("data-chart-data"));
    expect(parsedData.datasets[0].data).toEqual([0, 0, 0, 0]);

    // Empty state message for recent reports
    expect(screen.getByText("No reports yet")).toBeDefined();
  });

  it("displays up to 5 recent reports with mission title, submitter email, date, and reviewed badge", async () => {
    const memberToken = makeFakeJwt({ sub: "pilot@nasa.gov", role: "team_member" });
    localStorage.setItem("access_token", memberToken);

    const reportsData = {
      total_missions: 5,
      active_missions: 2,
      pending_reports: 1,
      recent_reports: [
        {
          id: 1,
          mission_title: "Voyager 1",
          submitter_email: "pilot1@nasa.gov",
          submitted_at: "2026-06-05T08:00:00Z",
          reviewed: true,
        },
        {
          id: 2,
          mission_title: "Voyager 2",
          submitter_email: "pilot2@nasa.gov",
          submitted_at: "2026-06-04T08:00:00Z",
          reviewed: false,
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => reportsData,
    });

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <AuthProvider>
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Voyager 1")).toBeDefined();
      expect(screen.getByText("pilot1@nasa.gov")).toBeDefined();
      expect(screen.getByText("Reviewed")).toBeDefined();

      expect(screen.getByText("Voyager 2")).toBeDefined();
      expect(screen.getByText("pilot2@nasa.gov")).toBeDefined();
      expect(screen.getByText("Pending")).toBeDefined();
    });
  });

  it("shows an error message if the API call fails", async () => {
    const adminToken = makeFakeJwt({ sub: "admin@nasa.gov", role: "admin" });
    localStorage.setItem("access_token", adminToken);

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ detail: "Database cluster unreachable" }),
    });

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <AuthProvider>
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toContain("Database cluster unreachable");
    });
  });

  it("both admin and team_member roles can view the dashboard", async () => {
    // Admin access
    const adminToken = makeFakeJwt({ sub: "admin@nasa.gov", role: "admin" });
    localStorage.setItem("access_token", adminToken);

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        total_missions: 1,
        active_missions: 1,
        pending_reports: 0,
        recent_reports: [],
      }),
    });

    const { unmount } = render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <AuthProvider>
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Mission Control v2")).toBeDefined();
    });
    unmount();

    // Team member access
    const memberToken = makeFakeJwt({ sub: "member@nasa.gov", role: "team_member" });
    localStorage.setItem("access_token", memberToken);

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <AuthProvider>
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Mission Control v2")).toBeDefined();
    });
  });

  it("unauthenticated user is redirected to /login", async () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <AuthProvider>
          <Routes>
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
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
});
