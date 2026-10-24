import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, ProtectedRoute, AdminRoute } from "../context/AuthContext";
import ReportList from "./ReportList";

function makeFakeJwt(payload) {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.fakesignature`;
}

describe("Report Review UI (Issue #16)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders list of reports with columns: Mission, Submitted By, Submitted At, and Reviewed badge", async () => {
    const adminToken = makeFakeJwt({ sub: "admin@nasa.gov", role: "admin" });
    localStorage.setItem("access_token", adminToken);

    const mockReports = [
      {
        id: 1,
        mission_id: 10,
        mission_title: "Perseverance Rover",
        submitter_email: "pilot@nasa.gov",
        submitted_at: "2026-05-01T10:00:00Z",
        reviewed: false,
        admin_comment: null,
      },
      {
        id: 2,
        mission_id: 20,
        mission_title: "Curiosity Rover",
        submitter_email: "engineer@nasa.gov",
        submitted_at: "2026-05-02T12:00:00Z",
        reviewed: true,
        admin_comment: "All green",
      },
    ];

    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.endsWith("/reports")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockReports,
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
    });

    render(
      <MemoryRouter initialEntries={["/reports"]}>
        <AuthProvider>
          <Routes>
            <Route path="/reports" element={<ReportList />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Weekly Mission Reports")).toBeDefined();
    });

    // Check table headers
    expect(screen.getByRole("columnheader", { name: "Mission" })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "Submitted By" })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "Submitted At" })).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "Reviewed" })).toBeDefined();

    // Check row data
    expect(screen.getByText("Perseverance Rover")).toBeDefined();
    expect(screen.getByText("pilot@nasa.gov")).toBeDefined();
    expect(screen.getByText("Curiosity Rover")).toBeDefined();
    expect(screen.getByText("engineer@nasa.gov")).toBeDefined();

    // Check pending vs reviewed badges
    expect(screen.getByTestId("badge-pending-1").textContent).toBe("Pending");
    expect(screen.getByTestId("badge-reviewed-2").textContent).toBe("Reviewed");
  });

  it("clicking a report row opens detail modal showing all four report fields", async () => {
    const adminToken = makeFakeJwt({ sub: "admin@nasa.gov", role: "admin" });
    localStorage.setItem("access_token", adminToken);

    const mockReports = [
      {
        id: 5,
        mission_id: 10,
        mission_title: "Europa Clipper",
        submitter_email: "astro@nasa.gov",
        submitted_at: "2026-05-03T14:00:00Z",
        reviewed: false,
        admin_comment: null,
        current_status: "in_progress",
        progress_update: "Ice drill calibrations nominal",
        work_completed: "Tested spectrometer sensor arrays",
        blockers: "Thermal control telemetry latency",
      },
    ];

    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.endsWith("/reports")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockReports,
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
    });

    render(
      <MemoryRouter initialEntries={["/reports"]}>
        <AuthProvider>
          <Routes>
            <Route path="/reports" element={<ReportList />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("report-row-5")).toBeDefined();
    });

    fireEvent.click(screen.getByTestId("report-row-5"));

    await waitFor(() => {
      expect(screen.getByTestId("report-modal")).toBeDefined();
    });

    // Verify all four fields in detail modal
    expect(screen.getByText("IN PROGRESS")).toBeDefined();
    expect(screen.getByText("Ice drill calibrations nominal")).toBeDefined();
    expect(screen.getByText("Tested spectrometer sensor arrays")).toBeDefined();
    expect(screen.getByText("Thermal control telemetry latency")).toBeDefined();
    expect(screen.getByRole("button", { name: /mark as reviewed/i })).toBeDefined();
  });

  it("clicking Mark as Reviewed calls PATCH /reports/{id}/review and updates badge immediately", async () => {
    const adminToken = makeFakeJwt({ sub: "admin@nasa.gov", role: "admin" });
    localStorage.setItem("access_token", adminToken);

    const mockReports = [
      {
        id: 7,
        mission_id: 12,
        mission_title: "Lunar Gateway",
        submitter_email: "commander@nasa.gov",
        submitted_at: "2026-05-04T08:00:00Z",
        reviewed: false,
        admin_comment: null,
        current_status: "planned",
        progress_update: "Habitation module docking sims",
        work_completed: "Software rendezvous test",
        blockers: null,
      },
    ];

    global.fetch = vi.fn().mockImplementation((url, opts = {}) => {
      if (url.endsWith("/reports")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockReports,
        });
      }
      if (url.includes("/reports/7/review") && opts.method === "PATCH") {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            id: 7,
            reviewed: true,
            admin_comment: "Approved by Flight Director",
          }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
    });

    render(
      <MemoryRouter initialEntries={["/reports"]}>
        <AuthProvider>
          <Routes>
            <Route path="/reports" element={<ReportList />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("badge-pending-7")).toBeDefined();
    });

    // Open detail modal
    fireEvent.click(screen.getByTestId("report-row-7"));

    await waitFor(() => {
      expect(screen.getByLabelText(/admin comment/i)).toBeDefined();
    });

    // Type optional comment
    fireEvent.change(screen.getByLabelText(/admin comment/i), {
      target: { value: "Approved by Flight Director" },
    });

    // Click Mark as Reviewed
    fireEvent.click(screen.getByRole("button", { name: /mark as reviewed/i }));

    await waitFor(() => {
      // In modal it updates
      expect(screen.getByText("Approved by Flight Director")).toBeDefined();
    });

    // Verify PATCH call
    const patchCall = global.fetch.mock.calls.find(
      ([url, opts]) => url.includes("/reports/7/review") && opts?.method === "PATCH"
    );
    expect(patchCall).toBeDefined();
    expect(JSON.parse(patchCall[1].body)).toEqual({
      reviewed: true,
      admin_comment: "Approved by Flight Director",
    });

    // Close modal
    fireEvent.click(screen.getByRole("button", { name: /close modal/i }));

    // In the list, badge is now Reviewed!
    await waitFor(() => {
      expect(screen.getByTestId("badge-reviewed-7")).toBeDefined();
      expect(screen.getByTestId("badge-reviewed-7").textContent).toBe("Reviewed");
    });
  });

  it("if PATCH API fails, shows error message and badge remains pending", async () => {
    const adminToken = makeFakeJwt({ sub: "admin@nasa.gov", role: "admin" });
    localStorage.setItem("access_token", adminToken);

    const mockReports = [
      {
        id: 9,
        mission_id: 15,
        mission_title: "James Webb Deep Field",
        submitter_email: "scientist@nasa.gov",
        submitted_at: "2026-05-05T09:00:00Z",
        reviewed: false,
        admin_comment: null,
        current_status: "in_progress",
        progress_update: "Target acquisition",
        work_completed: "Filter wheel tests",
        blockers: null,
      },
    ];

    global.fetch = vi.fn().mockImplementation((url, opts = {}) => {
      if (url.endsWith("/reports")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockReports,
        });
      }
      if (url.includes("/reports/9/review") && opts.method === "PATCH") {
        return Promise.resolve({
          ok: false,
          status: 500,
          json: async () => ({ detail: "Database connection timeout" }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
    });

    render(
      <MemoryRouter initialEntries={["/reports"]}>
        <AuthProvider>
          <Routes>
            <Route path="/reports" element={<ReportList />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("report-row-9")).toBeDefined();
    });

    fireEvent.click(screen.getByTestId("report-row-9"));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /mark as reviewed/i })).toBeDefined();
    });

    fireEvent.click(screen.getByRole("button", { name: /mark as reviewed/i }));

    await waitFor(() => {
      expect(screen.getByText("Database connection timeout")).toBeDefined();
    });

    // Close modal
    fireEvent.click(screen.getByRole("button", { name: /close modal/i }));

    // Badge remains pending
    expect(screen.getByTestId("badge-pending-9")).toBeDefined();
  });

  it("already-reviewed reports show admin comment in detail view", async () => {
    const adminToken = makeFakeJwt({ sub: "admin@nasa.gov", role: "admin" });
    localStorage.setItem("access_token", adminToken);

    const mockReports = [
      {
        id: 11,
        mission_id: 22,
        mission_title: "Dragon Resupply",
        submitter_email: "cargo@nasa.gov",
        submitted_at: "2026-05-06T11:00:00Z",
        reviewed: true,
        admin_comment: "Payload verified and accepted",
        current_status: "completed",
        progress_update: "Docking completed",
        work_completed: "Cargo transfer 100%",
        blockers: null,
      },
    ];

    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.endsWith("/reports")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockReports,
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
    });

    render(
      <MemoryRouter initialEntries={["/reports"]}>
        <AuthProvider>
          <Routes>
            <Route path="/reports" element={<ReportList />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("report-row-11")).toBeDefined();
    });

    fireEvent.click(screen.getByTestId("report-row-11"));

    await waitFor(() => {
      expect(screen.getByText("Payload verified and accepted")).toBeDefined();
      expect(screen.queryByRole("button", { name: /mark as reviewed/i })).toBeNull();
    });
  });

  it("team_member role visiting /reports is redirected to /dashboard", async () => {
    const memberToken = makeFakeJwt({ sub: "member@nasa.gov", role: "team_member" });
    localStorage.setItem("access_token", memberToken);

    render(
      <MemoryRouter initialEntries={["/reports"]}>
        <AuthProvider>
          <Routes>
            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <AdminRoute>
                    <ReportList />
                  </AdminRoute>
                </ProtectedRoute>
              }
            />
            <Route path="/dashboard" element={<div data-testid="dashboard-page">Dashboard</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("dashboard-page")).toBeDefined();
    });
  });
});
