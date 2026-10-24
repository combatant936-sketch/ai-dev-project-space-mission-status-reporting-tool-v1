import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { token, user, logout } = useAuth();
  const location = useLocation();

  if (!token || location.pathname === "/login") {
    return null;
  }

  const isAdmin = user?.role === "admin";

  return (
    <header style={styles.header}>
      <div style={styles.navContainer}>
        <Link to="/dashboard" style={styles.brand}>
          <span style={styles.brandIcon}>🚀</span>
          <span style={styles.brandText}>Mission Control</span>
        </Link>

        <nav style={styles.navLinks}>
          <Link
            to="/dashboard"
            style={{
              ...styles.navLink,
              ...(location.pathname === "/dashboard" ? styles.navLinkActive : {}),
            }}
          >
            Dashboard
          </Link>

          {isAdmin ? (
            <>
              <Link
                to="/missions"
                style={{
                  ...styles.navLink,
                  ...(location.pathname.startsWith("/missions") ? styles.navLinkActive : {}),
                }}
              >
                Missions
              </Link>
              <Link
                to="/reports"
                style={{
                  ...styles.navLink,
                  ...(location.pathname === "/reports" ? styles.navLinkActive : {}),
                }}
              >
                Review Reports
              </Link>
            </>
          ) : (
            <Link
              to="/reports/new"
              style={{
                ...styles.navLink,
                ...(location.pathname === "/reports/new" ? styles.navLinkActive : {}),
              }}
            >
              Submit Report
            </Link>
          )}
        </nav>

        <div style={styles.userSection}>
          <div style={styles.userInfo}>
            <span style={styles.userEmail}>{user?.sub || user?.email || "User"}</span>
            <span
              style={{
                ...styles.roleBadge,
                ...(isAdmin ? styles.adminBadge : styles.memberBadge),
              }}
            >
              {isAdmin ? "Admin" : "Team Member"}
            </span>
          </div>
          <button id="btn-nav-logout" onClick={logout} style={styles.logoutBtn}>
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}

const styles = {
  header: {
    background: "rgba(15, 23, 42, 0.85)",
    backdropFilter: "blur(12px)",
    borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  navContainer: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "0.85rem 1.5rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "1.5rem",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    textDecoration: "none",
    color: "#f8fafc",
    fontWeight: 700,
    fontSize: "1.125rem",
    letterSpacing: "-0.025em",
  },
  brandIcon: {
    fontSize: "1.25rem",
  },
  brandText: {
    background: "linear-gradient(135deg, #38bdf8 0%, #818cf8 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  navLinks: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  navLink: {
    color: "#94a3b8",
    textDecoration: "none",
    fontSize: "0.875rem",
    fontWeight: 500,
    padding: "0.45rem 0.85rem",
    borderRadius: "8px",
    transition: "color 0.2s, background 0.2s",
  },
  navLinkActive: {
    color: "#f8fafc",
    background: "rgba(56, 189, 248, 0.12)",
    fontWeight: 600,
  },
  userSection: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
  },
  userInfo: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "0.2rem",
  },
  userEmail: {
    fontSize: "0.8125rem",
    color: "#cbd5e1",
    fontWeight: 500,
  },
  roleBadge: {
    fontSize: "0.6875rem",
    fontWeight: 600,
    padding: "0.15rem 0.5rem",
    borderRadius: "9999px",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  adminBadge: {
    background: "rgba(239, 68, 68, 0.15)",
    color: "#f87171",
    border: "1px solid rgba(239, 68, 68, 0.3)",
  },
  memberBadge: {
    background: "rgba(56, 189, 248, 0.15)",
    color: "#38bdf8",
    border: "1px solid rgba(56, 189, 248, 0.3)",
  },
  logoutBtn: {
    background: "rgba(255, 255, 255, 0.05)",
    border: "1px solid rgba(255, 255, 255, 0.12)",
    color: "#94a3b8",
    padding: "0.45rem 0.85rem",
    borderRadius: "8px",
    fontSize: "0.8125rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "background 0.2s, color 0.2s",
  },
};
