import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, ProtectedRoute, AdminRoute } from "../context/AuthContext";
import MissionList from "./MissionList";
import MissionDetail from "./MissionDetail";

function makeFakeJwt(payload) {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.fakesignature`;
}

describe("Mission List and Detail Pages (Issue #13)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders table with Title, Status, and Created At columns and coloured badges", async () => {
    const adminToken = makeFakeJwt({ sub: "admin@nasa.gov", role: "admin" });
    localStorage.setItem("access_token", adminToken);

    const mockMissions = [
      { id: 1, title: "Artemis I", status: "completed", created_at: "2026-01-01T00:00:00Z" },
      { id: 2, title: "Artemis II", status: "in_progress", created_at: "2026-02-01T00:00:00Z" },
      { id: 3, title: "Artemis III", status: "planned", created_at: "2026-03-01T00:00:00Z" },
      { id: 4, title: "Test Fail", status: "failed", created_at: "2026-04-01T00:00:00Z" },
    ];

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockMissions,
    });

    render(
      <MemoryRouter initialEntries={["/missions"]}>
        <AuthProvider>
          <Routes>
            <Route path="/missions" element={<MissionList />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    // Initial loading indicator
    expect(screen.getByText(/loading missions telemetry/i)).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText("Artemis I")).toBeDefined();
      expect(screen.getByText("Artemis II")).toBeDefined();
      expect(screen.getByText("Artemis III")).toBeDefined();
      expect(screen.getByText("Test Fail")).toBeDefined();
    });

    // Check badges
    const badges = screen.getAllByText(/(Completed|In Progress|Planned|Failed)/i);
    expect(badges.length).toBe(4);
  });

  it("clicking a table row navigates to /missions/:id", async () => {
    const adminToken = makeFakeJwt({ sub: "admin@nasa.gov", role: "admin" });
    localStorage.setItem("access_token", adminToken);

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [
        { id: 42, title: "Europa Mission", status: "planned", created_at: "2026-01-01T00:00:00Z" },
      ],
    });

    render(
      <MemoryRouter initialEntries={["/missions"]}>
        <AuthProvider>
          <Routes>
            <Route path="/missions" element={<MissionList />} />
            <Route
              path="/missions/:id"
              element={<div data-testid="detail-page">Mission Detail 42</div>}
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Europa Mission")).toBeDefined();
    });

    fireEvent.click(screen.getByTestId("mission-row-42"));

    await waitFor(() => {
      expect(screen.getByTestId("detail-page")).toBeDefined();
    });
  });

  it("detail page displays mission title, description, status badge, created_at, and assigned team members", async () => {
    const adminToken = makeFakeJwt({ sub: "admin@nasa.gov", role: "admin" });
    localStorage.setItem("access_token", adminToken);

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        id: 7,
        title: "Perseverance Rover",
        description: "Collecting samples on Mars",
        status: "in_progress",
        created_at: "2026-05-15T10:00:00Z",
        assigned_users: [
          { id: 10, email: "astronomer1@nasa.gov" },
          { id: 11, email: "geologist2@nasa.gov" },
        ],
      }),
    });

    render(
      <MemoryRouter initialEntries={["/missions/7"]}>
        <AuthProvider>
          <Routes>
            <Route path="/missions/:id" element={<MissionDetail />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Perseverance Rover")).toBeDefined();
      expect(screen.getByText("Collecting samples on Mars")).toBeDefined();
      expect(screen.getByText("In Progress")).toBeDefined();
      expect(screen.getByText("astronomer1@nasa.gov")).toBeDefined();
      expect(screen.getByText("geologist2@nasa.gov")).toBeDefined();
    });
  });

  it("detail page displays 'Mission not found' when API returns 404", async () => {
    const adminToken = makeFakeJwt({ sub: "admin@nasa.gov", role: "admin" });
    localStorage.setItem("access_token", adminToken);

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ detail: "Not found" }),
    });

    render(
      <MemoryRouter initialEntries={["/missions/999"]}>
        <AuthProvider>
          <Routes>
            <Route path="/missions/:id" element={<MissionDetail />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/mission not found/i)).toBeDefined();
    });
  });

  it("shows error state when API fails with 500 error", async () => {
    const adminToken = makeFakeJwt({ sub: "admin@nasa.gov", role: "admin" });
    localStorage.setItem("access_token", adminToken);

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ detail: "Server error" }),
    });

    render(
      <MemoryRouter initialEntries={["/missions"]}>
        <AuthProvider>
          <Routes>
            <Route path="/missions" element={<MissionList />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeDefined();
    });
  });

  it("missions page is not accessible to team_member role (redirected by AdminRoute)", () => {
    const memberToken = makeFakeJwt({ sub: "member@nasa.gov", role: "team_member" });
    localStorage.setItem("access_token", memberToken);

    render(
      <MemoryRouter initialEntries={["/missions"]}>
        <AuthProvider>
          <Routes>
            <Route
              path="/missions"
              element={
                <ProtectedRoute>
                  <AdminRoute>
                    <MissionList />
                  </AdminRoute>
                </ProtectedRoute>
              }
            />
            <Route path="/dashboard" element={<div data-testid="dashboard-page">Dashboard</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByTestId("dashboard-page")).toBeDefined();
    expect(screen.queryByText(/space missions/i)).toBeNull();
  });
});
