import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, ProtectedRoute, AdminRoute } from "../context/AuthContext";
import MissionList from "./MissionList";
import MissionForm from "./MissionForm";

function makeFakeJwt(payload) {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.fakesignature`;
}

describe("Create and Edit Mission Forms (Issue #14)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("New Mission button on MissionList navigates to /missions/new", async () => {
    const adminToken = makeFakeJwt({ sub: "admin@nasa.gov", role: "admin" });
    localStorage.setItem("access_token", adminToken);

    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes("/missions")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => [],
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => [] });
    });

    render(
      <MemoryRouter initialEntries={["/missions"]}>
        <AuthProvider>
          <Routes>
            <Route path="/missions" element={<MissionList />} />
            <Route path="/missions/new" element={<div data-testid="new-mission-page">New Mission Form</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("+ New Mission")).toBeDefined();
    });

    fireEvent.click(screen.getByText("+ New Mission"));

    await waitFor(() => {
      expect(screen.getByTestId("new-mission-page")).toBeDefined();
    });
  });

  it("create form renders Title, Description, Status default to planned, and loads team members", async () => {
    const adminToken = makeFakeJwt({ sub: "admin@nasa.gov", role: "admin" });
    localStorage.setItem("access_token", adminToken);

    const mockMembers = [
      { id: 101, email: "pilot@nasa.gov", role: "team_member" },
      { id: 102, email: "engineer@nasa.gov", role: "team_member" },
    ];

    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes("/users?role=team_member")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockMembers,
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
    });

    render(
      <MemoryRouter initialEntries={["/missions/new"]}>
        <AuthProvider>
          <Routes>
            <Route path="/missions/new" element={<MissionForm />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /create new space mission/i })).toBeDefined();
      expect(screen.getByLabelText(/mission title/i)).toBeDefined();
      expect(screen.getByLabelText(/description/i)).toBeDefined();
      expect(screen.getByLabelText(/status/i)).toBeDefined();
      expect(screen.getByText("pilot@nasa.gov")).toBeDefined();
      expect(screen.getByText("engineer@nasa.gov")).toBeDefined();
    });

    const statusSelect = screen.getByLabelText(/status/i);
    expect(statusSelect.value).toBe("planned");
  });

  it("client-side validation: empty title shows inline error without calling API", async () => {
    const adminToken = makeFakeJwt({ sub: "admin@nasa.gov", role: "admin" });
    localStorage.setItem("access_token", adminToken);

    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes("/users")) {
        return Promise.resolve({ ok: true, status: 200, json: async () => [] });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
    });

    render(
      <MemoryRouter initialEntries={["/missions/new"]}>
        <AuthProvider>
          <Routes>
            <Route path="/missions/new" element={<MissionForm />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /create mission/i })).toBeDefined();
    });

    const fetchCallsBefore = global.fetch.mock.calls.length;

    fireEvent.click(screen.getByRole("button", { name: /create mission/i }));

    await waitFor(() => {
      expect(screen.getByText("Title is required")).toBeDefined();
    });

    // Verify no POST was initiated
    expect(global.fetch.mock.calls.length).toBe(fetchCallsBefore);
  });

  it("submitting create form calls POST /missions and POST /assign and navigates to /missions", async () => {
    const adminToken = makeFakeJwt({ sub: "admin@nasa.gov", role: "admin" });
    localStorage.setItem("access_token", adminToken);

    const mockMembers = [{ id: 101, email: "pilot@nasa.gov", role: "team_member" }];

    global.fetch = vi.fn().mockImplementation((url, opts = {}) => {
      if (url.includes("/users?role=team_member")) {
        return Promise.resolve({ ok: true, status: 200, json: async () => mockMembers });
      }
      if (url.endsWith("/missions") && opts.method === "POST") {
        return Promise.resolve({
          ok: true,
          status: 201,
          json: async () => ({ id: 55, title: "Europa Clipper", status: "in_progress" }),
        });
      }
      if (url.includes("/missions/55/assign") && opts.method === "POST") {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ status: "ok" }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
    });

    render(
      <MemoryRouter initialEntries={["/missions/new"]}>
        <AuthProvider>
          <Routes>
            <Route path="/missions/new" element={<MissionForm />} />
            <Route path="/missions" element={<div data-testid="missions-list-page">Missions List</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/mission title/i)).toBeDefined();
    });

    fireEvent.change(screen.getByLabelText(/mission title/i), {
      target: { value: "Europa Clipper" },
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: "Exploration of Jupiter's moon" },
    });
    fireEvent.change(screen.getByLabelText(/status/i), {
      target: { value: "in_progress" },
    });

    // Check member
    fireEvent.click(screen.getByTestId("member-check-101"));

    // Submit
    fireEvent.click(screen.getByRole("button", { name: /create mission/i }));

    await waitFor(() => {
      expect(screen.getByTestId("missions-list-page")).toBeDefined();
    });

    // Verify payload of POST /missions
    const postCall = global.fetch.mock.calls.find(
      ([url, opts]) => url.endsWith("/missions") && opts?.method === "POST"
    );
    expect(postCall).toBeDefined();
    expect(JSON.parse(postCall[1].body)).toEqual({
      title: "Europa Clipper",
      description: "Exploration of Jupiter's moon",
      status: "in_progress",
    });

    // Verify payload of POST /missions/55/assign
    const assignCall = global.fetch.mock.calls.find(
      ([url, opts]) => url.includes("/missions/55/assign") && opts?.method === "POST"
    );
    expect(assignCall).toBeDefined();
    expect(JSON.parse(assignCall[1].body)).toEqual({
      user_ids: [101],
    });
  });

  it("edit page pre-populates fields, submits PATCH and updates crew assignments", async () => {
    const adminToken = makeFakeJwt({ sub: "admin@nasa.gov", role: "admin" });
    localStorage.setItem("access_token", adminToken);

    const mockMembers = [
      { id: 101, email: "pilot@nasa.gov", role: "team_member" },
      { id: 102, email: "engineer@nasa.gov", role: "team_member" },
    ];

    const mockMission = {
      id: 77,
      title: "James Webb Orbit",
      description: "Deep space observation",
      status: "planned",
      assigned_users: [{ id: 101, email: "pilot@nasa.gov" }],
    };

    global.fetch = vi.fn().mockImplementation((url, opts = {}) => {
      if (url.includes("/users?role=team_member")) {
        return Promise.resolve({ ok: true, status: 200, json: async () => mockMembers });
      }
      if (url.endsWith("/missions/77") && (!opts.method || opts.method === "GET")) {
        return Promise.resolve({ ok: true, status: 200, json: async () => mockMission });
      }
      if (url.endsWith("/missions/77") && opts.method === "PATCH") {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ ...mockMission, title: "James Webb Extended", status: "in_progress" }),
        });
      }
      if (url.includes("/missions/77/assign") && opts.method === "POST") {
        return Promise.resolve({ ok: true, status: 200, json: async () => ({ status: "ok" }) });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
    });

    render(
      <MemoryRouter initialEntries={["/missions/77/edit"]}>
        <AuthProvider>
          <Routes>
            <Route path="/missions/:id/edit" element={<MissionForm />} />
            <Route path="/missions/:id" element={<div data-testid="mission-detail-77">Mission Detail 77</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /edit space mission/i })).toBeDefined();
      expect(screen.getByDisplayValue("James Webb Orbit")).toBeDefined();
      expect(screen.getByDisplayValue("Deep space observation")).toBeDefined();
      expect(screen.getByDisplayValue("Planned")).toBeDefined();
    });

    // Member 101 is initially checked
    const check101 = screen.getByTestId("member-check-101");
    expect(check101.checked).toBe(true);

    // Edit fields
    fireEvent.change(screen.getByLabelText(/mission title/i), {
      target: { value: "James Webb Extended" },
    });
    fireEvent.change(screen.getByLabelText(/status/i), {
      target: { value: "in_progress" },
    });
    // Add member 102
    fireEvent.click(screen.getByTestId("member-check-102"));

    // Submit
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(screen.getByTestId("mission-detail-77")).toBeDefined();
    });

    // Verify PATCH call
    const patchCall = global.fetch.mock.calls.find(
      ([url, opts]) => url.endsWith("/missions/77") && opts?.method === "PATCH"
    );
    expect(patchCall).toBeDefined();
    expect(JSON.parse(patchCall[1].body)).toEqual({
      title: "James Webb Extended",
      description: "Deep space observation",
      status: "in_progress",
    });

    // Verify assign call has both 101 and 102
    const assignCall = global.fetch.mock.calls.find(
      ([url, opts]) => url.includes("/missions/77/assign") && opts?.method === "POST"
    );
    expect(assignCall).toBeDefined();
    expect(JSON.parse(assignCall[1].body).user_ids.sort()).toEqual([101, 102]);
  });

  it("displays 4xx API error inline", async () => {
    const adminToken = makeFakeJwt({ sub: "admin@nasa.gov", role: "admin" });
    localStorage.setItem("access_token", adminToken);

    global.fetch = vi.fn().mockImplementation((url, opts = {}) => {
      if (url.includes("/users")) {
        return Promise.resolve({ ok: true, status: 200, json: async () => [] });
      }
      if (url.endsWith("/missions") && opts.method === "POST") {
        return Promise.resolve({
          ok: false,
          status: 400,
          json: async () => ({ detail: "Mission with this title already exists" }),
        });
      }
      return Promise.resolve({ ok: true, status: 200, json: async () => ({}) });
    });

    render(
      <MemoryRouter initialEntries={["/missions/new"]}>
        <AuthProvider>
          <Routes>
            <Route path="/missions/new" element={<MissionForm />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/mission title/i)).toBeDefined();
    });

    fireEvent.change(screen.getByLabelText(/mission title/i), {
      target: { value: "Duplicate Mission" },
    });

    fireEvent.click(screen.getByRole("button", { name: /create mission/i }));

    await waitFor(() => {
      expect(screen.getByText("Mission with this title already exists")).toBeDefined();
    });
  });

  it("Cancel button navigates away without saving", async () => {
    const adminToken = makeFakeJwt({ sub: "admin@nasa.gov", role: "admin" });
    localStorage.setItem("access_token", adminToken);

    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({ ok: true, status: 200, json: async () => [] })
    );

    render(
      <MemoryRouter initialEntries={["/missions/new"]}>
        <AuthProvider>
          <Routes>
            <Route path="/missions/new" element={<MissionForm />} />
            <Route path="/missions" element={<div data-testid="missions-list">Missions List</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /cancel/i })).toBeDefined();
    });

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    await waitFor(() => {
      expect(screen.getByTestId("missions-list")).toBeDefined();
    });
  });

  it("non-admin user is redirected to /dashboard", async () => {
    const teamMemberToken = makeFakeJwt({ sub: "member@nasa.gov", role: "team_member" });
    localStorage.setItem("access_token", teamMemberToken);

    render(
      <MemoryRouter initialEntries={["/missions/new"]}>
        <AuthProvider>
          <Routes>
            <Route
              path="/missions/new"
              element={
                <ProtectedRoute>
                  <AdminRoute>
                    <MissionForm />
                  </AdminRoute>
                </ProtectedRoute>
              }
            />
            <Route path="/dashboard" element={<div data-testid="dashboard">Dashboard</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("dashboard")).toBeDefined();
    });
  });
});
