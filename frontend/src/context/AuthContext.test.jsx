import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import {
  AuthContext,
  AuthProvider,
  ProtectedRoute,
  AdminRoute,
  parseJwt,
  useAuth,
} from "./AuthContext";

function makeFakeJwt(payload) {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.fakesignature`;
}

function TestConsumer() {
  const { token, user, logout } = useAuth();
  return (
    <div>
      <div data-testid="token">{token || "NO_TOKEN"}</div>
      <div data-testid="email">{user?.sub || "NO_EMAIL"}</div>
      <div data-testid="role">{user?.role || "NO_ROLE"}</div>
      <button data-testid="logout-btn" onClick={logout}>
        Logout
      </button>
    </div>
  );
}

describe("AuthContext and Route Guards (Issue #12)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("decodes JWT client-side without API calls", () => {
    const token = makeFakeJwt({ sub: "astro@nasa.gov", role: "admin", user_id: 1 });
    const decoded = parseJwt(token);
    expect(decoded.sub).toBe("astro@nasa.gov");
    expect(decoded.role).toBe("admin");
    expect(decoded.user_id).toBe(1);
  });

  it("exposes token, user, and logout function via AuthContext", () => {
    const fakeToken = makeFakeJwt({ sub: "astro@nasa.gov", role: "team_member" });
    localStorage.setItem("access_token", fakeToken);

    render(
      <MemoryRouter>
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByTestId("token").textContent).toBe(fakeToken);
    expect(screen.getByTestId("email").textContent).toBe("astro@nasa.gov");
    expect(screen.getByTestId("role").textContent).toBe("team_member");
  });

  it("logout() removes access_token from localStorage and redirects to /login", () => {
    const fakeToken = makeFakeJwt({ sub: "astro@nasa.gov", role: "team_member" });
    localStorage.setItem("access_token", fakeToken);

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <AuthProvider>
          <Routes>
            <Route path="/dashboard" element={<TestConsumer />} />
            <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    expect(localStorage.getItem("access_token")).toBe(fakeToken);
    fireEvent.click(screen.getByTestId("logout-btn"));

    expect(localStorage.getItem("access_token")).toBeNull();
    expect(screen.getByTestId("login-page")).toBeDefined();
  });

  it("ProtectedRoute redirects to /login when token is null", () => {
    render(
      <MemoryRouter initialEntries={["/protected"]}>
        <AuthProvider>
          <Routes>
            <Route
              path="/protected"
              element={
                <ProtectedRoute>
                  <div data-testid="secret-content">Secret Content</div>
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.queryByTestId("secret-content")).toBeNull();
    expect(screen.getByTestId("login-page")).toBeDefined();
  });

  it("AdminRoute redirects to /dashboard when user role is not admin", () => {
    const memberToken = makeFakeJwt({ sub: "member@nasa.gov", role: "team_member" });
    localStorage.setItem("access_token", memberToken);

    render(
      <MemoryRouter initialEntries={["/admin-only"]}>
        <AuthProvider>
          <Routes>
            <Route
              path="/admin-only"
              element={
                <AdminRoute>
                  <div data-testid="admin-content">Admin Content</div>
                </AdminRoute>
              }
            />
            <Route path="/dashboard" element={<div data-testid="dashboard-page">Dashboard</div>} />
            <Route path="/login" element={<div data-testid="login-page">Login</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.queryByTestId("admin-content")).toBeNull();
    expect(screen.getByTestId("dashboard-page")).toBeDefined();
  });

  it("AdminRoute renders child content when user role is admin", () => {
    const adminToken = makeFakeJwt({ sub: "commander@nasa.gov", role: "admin" });
    localStorage.setItem("access_token", adminToken);

    render(
      <MemoryRouter initialEntries={["/admin-only"]}>
        <AuthProvider>
          <Routes>
            <Route
              path="/admin-only"
              element={
                <AdminRoute>
                  <div data-testid="admin-content">Admin Content</div>
                </AdminRoute>
              }
            />
            <Route path="/dashboard" element={<div data-testid="dashboard-page">Dashboard</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByTestId("admin-content")).toBeDefined();
  });

  it("token survives reload (refreshing page retains logged in user)", () => {
    const token = makeFakeJwt({ sub: "reload@nasa.gov", role: "team_member" });
    localStorage.setItem("access_token", token);

    // First mount
    const { unmount } = render(
      <MemoryRouter>
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      </MemoryRouter>
    );
    expect(screen.getByTestId("email").textContent).toBe("reload@nasa.gov");
    unmount();

    // Re-mount (simulating reload)
    render(
      <MemoryRouter>
        <AuthProvider>
          <TestConsumer />
        </AuthProvider>
      </MemoryRouter>
    );
    expect(screen.getByTestId("email").textContent).toBe("reload@nasa.gov");
  });
});
