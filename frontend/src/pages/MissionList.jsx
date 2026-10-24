import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function getStatusBadge(status) {
  const norm = (status || "").toLowerCase();
  let bg = "#475569"; // grey default
  let text = "#f1f5f9";
  let label = "Planned";

  if (norm === "in_progress") {
    bg = "#2563eb"; // blue
    text = "#eff6ff";
    label = "In Progress";
  } else if (norm === "completed") {
    bg = "#16a34a"; // green
    text = "#f0fdf4";
    label = "Completed";
  } else if (norm === "failed") {
    bg = "#dc2626"; // red
    text = "#fef2f2";
    label = "Failed";
  }

  return (
    <span
      className="status-badge"
      style={{
        display: "inline-block",
        padding: "0.25rem 0.65rem",
        borderRadius: "9999px",
        fontSize: "0.75rem",
        fontWeight: 600,
        backgroundColor: bg,
        color: text,
        textTransform: "capitalize",
      }}
    >
      {label}
    </span>
  );
}

export default function MissionList() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [missions, setMissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchMissions = async () => {
      setLoading(true);
      setError(null);
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";

      try {
        const res = await fetch(`${apiUrl}/missions`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error(`Failed to fetch missions (status ${res.status})`);
        }

        const data = await res.json();
        if (isMounted) {
          setMissions(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Failed to load missions");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchMissions();
    return () => {
      isMounted = false;
    };
  }, [token]);

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <div>
          <h1 style={styles.title}>Space Missions</h1>
          <p style={styles.subtitle}>Fleet operations and status overview</p>
        </div>
        <Link to="/missions/new" id="btn-new-mission" style={styles.newBtn}>
          + New Mission
        </Link>
      </div>

      {loading && (
        <div id="missions-loading" style={styles.centerBox}>
          <div className="spinner" style={styles.spinner}></div>
          <p style={{ marginTop: "1rem", color: "#94a3b8" }}>Loading missions telemetry...</p>
        </div>
      )}

      {error && (
        <div id="missions-error" role="alert" style={styles.errorBox}>
          {error}
        </div>
      )}

      {!loading && !error && (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.theadRow}>
                <th style={styles.th}>Title</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Created At</th>
              </tr>
            </thead>
            <tbody>
              {missions.length === 0 ? (
                <tr>
                  <td colSpan={3} style={styles.emptyTd}>
                    No missions found. Launch one above!
                  </td>
                </tr>
              ) : (
                missions.map((m) => (
                  <tr
                    key={m.id}
                    className="mission-row"
                    data-testid={`mission-row-${m.id}`}
                    onClick={() => navigate(`/missions/${m.id}`)}
                    style={styles.tr}
                  >
                    <td style={{ ...styles.td, fontWeight: 600, color: "#f8fafc" }}>{m.title}</td>
                    <td style={styles.td}>{getStatusBadge(m.status)}</td>
                    <td style={{ ...styles.td, color: "#94a3b8" }}>
                      {new Date(m.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: "2rem",
    maxWidth: "1100px",
    margin: "0 auto",
    color: "#e2e8f0",
    fontFamily: "Inter, system-ui, -apple-system, sans-serif",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "2rem",
  },
  title: {
    fontSize: "2rem",
    fontWeight: 700,
    color: "#f8fafc",
    margin: 0,
  },
  subtitle: {
    color: "#94a3b8",
    fontSize: "0.9375rem",
    margin: "0.35rem 0 0 0",
  },
  newBtn: {
    background: "linear-gradient(135deg, #0284c7 0%, #2563eb 100%)",
    color: "#ffffff",
    padding: "0.65rem 1.25rem",
    borderRadius: "8px",
    textDecoration: "none",
    fontWeight: 600,
    fontSize: "0.875rem",
    boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)",
  },
  centerBox: {
    textAlign: "center",
    padding: "4rem 0",
  },
  spinner: {
    width: "2.5rem",
    height: "2.5rem",
    border: "3px solid rgba(255, 255, 255, 0.2)",
    borderTopColor: "#38bdf8",
    borderRadius: "50%",
    margin: "0 auto",
    animation: "spin 0.8s linear infinite",
  },
  errorBox: {
    background: "rgba(239, 68, 68, 0.15)",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    color: "#fca5a5",
    padding: "1rem",
    borderRadius: "8px",
    textAlign: "center",
  },
  tableWrapper: {
    background: "rgba(15, 23, 42, 0.7)",
    backdropFilter: "blur(8px)",
    borderRadius: "12px",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    overflow: "hidden",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
  },
  theadRow: {
    background: "rgba(30, 41, 59, 0.5)",
    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
  },
  th: {
    padding: "1rem 1.25rem",
    fontSize: "0.8125rem",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "#94a3b8",
  },
  tr: {
    borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
    cursor: "pointer",
    transition: "background-color 0.15s ease",
  },
  td: {
    padding: "1rem 1.25rem",
    fontSize: "0.9375rem",
  },
  emptyTd: {
    padding: "3rem",
    textAlign: "center",
    color: "#64748b",
  },
};
