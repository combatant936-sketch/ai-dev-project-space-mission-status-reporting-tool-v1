import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import Login from "./Login";

describe("Login Component (Issue #11)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("renders a form with email input, password input, and submit button with proper types", () => {
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<Login />} />
        </Routes>
      </MemoryRouter>
    );

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitBtn = screen.getByRole("button", { name: /sign in/i });

    expect(emailInput).toBeDefined();
    expect(emailInput.getAttribute("type")).toBe("email");
    expect(passwordInput).toBeDefined();
    expect(passwordInput.getAttribute("type")).toBe("password");
    expect(submitBtn).toBeDefined();
  });

  it("submitting valid credentials stores JWT in localStorage under access_token and redirects to /dashboard", async () => {
    const fakeToken = "fake-jwt-token-xyz";
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ access_token: fakeToken, token_type: "bearer" }),
    });

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<div data-testid="dashboard-page">Dashboard</div>} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "astro@nasa.gov" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "Password123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(localStorage.getItem("access_token")).toBe(fakeToken);
      expect(screen.getByTestId("dashboard-page")).toBeDefined();
    });
  });

  it("submitting invalid credentials shows inline error message without refreshing page", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ detail: "Incorrect email or password" }),
    });

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<Login />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "wrong@nasa.gov" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "WrongPass!" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      const errorMsg = screen.getByRole("alert");
      expect(errorMsg.textContent).toContain("Incorrect email or password");
    });
  });

  it("submit button is disabled and shows loading indicator while request is in flight", async () => {
    let resolveFetch;
    global.fetch = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        })
    );

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<Login />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "astro@nasa.gov" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "Password123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    const submitBtn = screen.getByRole("button");
    expect(submitBtn.hasAttribute("disabled")).toBe(true);
    expect(submitBtn.textContent).toContain("Authenticating");

    resolveFetch({
      ok: true,
      status: 200,
      json: async () => ({ access_token: "token-123" }),
    });

    await waitFor(() => {
      expect(submitBtn.hasAttribute("disabled")).toBe(false);
    });
  });

  it("navigating to /login while already logged in redirects immediately to /dashboard", () => {
    localStorage.setItem("access_token", "existing-valid-token");

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<div data-testid="dashboard-page">Dashboard</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId("dashboard-page")).toBeDefined();
  });
});
