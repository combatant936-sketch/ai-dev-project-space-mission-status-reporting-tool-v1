import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getStatusBadge } from "./MissionList";

export default function MissionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [mission, setMission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchMission = async () => {
      setLoading(true);
      setError(null);
      setNotFound(false);
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";

      try {
        const res = await fetch(`${apiUrl}/missions/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.status === 404) {
          if (isMounted) setNotFound(true);
          return;
        }

        if (!res.ok) {
          throw new Error(`Failed to load mission (status ${res.status})`);
        }

        const data = await res.json();
        if (isMounted) setMission(data);
      } catch (err) {
        if (isMounted) setError(err.message || "Network error loading mission");
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchMission();
    return () => {
      isMounted = false;
    };
  }, [id, token]);

  if (loading) {
    return (
      <div style={styles.centerBox}>
        <div className="spinner" style={styles.spinner}></div>
        <p style={{ marginTop: "1rem", color: "#94a3b8" }}>Loading mission telemetry...</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div style={styles.container}>
        <div id="mission-not-found" style={styles.notFoundBox}>
          <h2 style={{ color: "#f8fafc", marginBottom: "0.5rem" }}>Mission not found</h2>
          <p style={{ color: "#94a3b8", marginBottom: "1.5rem" }}>
            The requested mission record #{id} does not exist in the flight registry.
          </p>
          <Link to="/missions" style={styles.backBtn}>
            ← Back to Missions
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div id="mission-error" role="alert" style={styles.errorBox}>
          <p>{error}</p>
          <button onClick={() => navigate(0)} style={styles.retryBtn}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!mission) return null;

  return (
    <div style={styles.container}>
      <div style={styles.topNav}>
        <Link to="/missions" style={styles.backLink}>
          ← Back to Missions
        </Link>
        <Link to={`/missions/${mission.id}/edit`} id="btn-edit-mission" style={styles.editBtn}>
          ✎ Edit Mission
        </Link>
      </div>

      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <div>
            <h1 style={styles.missionTitle}>{mission.title}</h1>
            <div style={styles.metaRow}>
              <span style={{ color: "#94a3b8", fontSize: "0.875rem" }}>
                Created on {new Date(mission.created_at).toLocaleDateString()}
              </span>
              <span style={{ margin: "0 0.5rem", color: "#64748b" }}>•</span>
              {getStatusBadge(mission.status)}
            </div>
          </div>
        </div>

        <div style={styles.section}>
          <h3 style={styles.sectionHeading}>Mission Overview</h3>
          <p style={styles.description}>
            {mission.description || "No mission description provided."}
          </p>
        </div>

        <div style={styles.section}>
          <h3 style={styles.sectionHeading}>Assigned Flight Crew</h3>
          {!mission.assigned_users || mission.assigned_users.length === 0 ? (
            <p style={{ color: "#64748b", fontStyle: "italic" }}>
              No team members assigned to this mission yet.
            </p>
          ) : (
            <ul style={styles.memberList}>
              {mission.assigned_users.map((user) => (
                <li key={user.id} style={styles.memberItem}>
                  <span style={styles.crewIcon}>🧑‍🚀</span>
                  <span style={{ fontWeight: 500, color: "#f1f5f9" }}>{user.email}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: "2rem",
    maxWidth: "850px",
    margin: "0 auto",
    color: "#e2e8f0",
    fontFamily: "Inter, system-ui, -apple-system, sans-serif",
  },
  topNav: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "1.5rem",
  },
  backLink: {
    color: "#38bdf8",
    textDecoration: "none",
    fontSize: "0.9375rem",
    fontWeight: 500,
  },
  editBtn: {
    background: "rgba(56, 189, 248, 0.15)",
    color: "#38bdf8",
    border: "1px solid rgba(56, 189, 248, 0.3)",
    padding: "0.5rem 1rem",
    borderRadius: "8px",
    textDecoration: "none",
    fontSize: "0.875rem",
    fontWeight: 600,
  },
  card: {
    background: "rgba(15, 23, 42, 0.75)",
    backdropFilter: "blur(12px)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "16px",
    padding: "2.5rem",
    boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)",
  },
  cardHeader: {
    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
    paddingBottom: "1.5rem",
    marginBottom: "1.5rem",
  },
  missionTitle: {
    fontSize: "2rem",
    fontWeight: 700,
    color: "#f8fafc",
    margin: "0 0 0.5rem 0",
  },
  metaRow: {
    display: "flex",
    alignItems: "center",
  },
  section: {
    marginBottom: "2rem",
  },
  sectionHeading: {
    fontSize: "0.875rem",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "#94a3b8",
    marginBottom: "0.75rem",
  },
  description: {
    fontSize: "1rem",
    lineHeight: "1.65",
    color: "#cbd5e1",
    whiteSpace: "pre-line",
  },
  memberList: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  memberItem: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    padding: "0.6rem 0.85rem",
    background: "rgba(30, 41, 59, 0.5)",
    borderRadius: "8px",
    border: "1px solid rgba(255, 255, 255, 0.05)",
  },
  crewIcon: {
    fontSize: "1.1rem",
  },
  centerBox: {
    textAlign: "center",
    padding: "6rem 0",
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
  notFoundBox: {
    textAlign: "center",
    padding: "4rem 2rem",
    background: "rgba(15, 23, 42, 0.6)",
    borderRadius: "16px",
    border: "1px solid rgba(255, 255, 255, 0.1)",
  },
  backBtn: {
    display: "inline-block",
    background: "linear-gradient(135deg, #0284c7 0%, #2563eb 100%)",
    color: "#ffffff",
    padding: "0.65rem 1.25rem",
    borderRadius: "8px",
    textDecoration: "none",
    fontWeight: 600,
  },
  errorBox: {
    background: "rgba(239, 68, 68, 0.15)",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    color: "#fca5a5",
    padding: "1.5rem",
    borderRadius: "12px",
    textAlign: "center",
  },
  retryBtn: {
    marginTop: "1rem",
    background: "#ef4444",
    color: "#fff",
    border: "none",
    padding: "0.5rem 1rem",
    borderRadius: "6px",
    cursor: "pointer",
  },
};
