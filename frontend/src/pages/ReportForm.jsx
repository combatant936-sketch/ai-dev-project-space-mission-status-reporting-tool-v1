import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ReportForm() {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [missions, setMissions] = useState([]);
  const [missionId, setMissionId] = useState("");
  const [status, setStatus] = useState("planned");
  const [progressUpdate, setProgressUpdate] = useState("");
  const [workCompleted, setWorkCompleted] = useState("");
  const [blockers, setBlockers] = useState("");

  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchingMissions, setFetchingMissions] = useState(true);
  const [successMessage, setSuccessMessage] = useState(null);

  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";

  // Role check: redirect admin to /dashboard
  useEffect(() => {
    if (user?.role === "admin") {
      navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  // Fetch missions and filter client-side
  useEffect(() => {
    let isMounted = true;

    const loadMissions = async () => {
      if (!token || user?.role === "admin") {
        setFetchingMissions(false);
        return;
      }

      setFetchingMissions(true);
      setApiError(null);

      try {
        const res = await fetch(`${apiUrl}/missions`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || `Failed to fetch missions (${res.status})`);
        }

        const data = await res.json();
        if (isMounted) {
          const currentUserId = user?.user_id ?? user?.id;
          const currentUserEmail = user?.email ?? user?.sub;

          const assigned = Array.isArray(data)
            ? data.filter((m) => {
                if (!m.assigned_users || !Array.isArray(m.assigned_users)) return false;
                return m.assigned_users.some((assignedUser) => {
                  if (typeof assignedUser === "object" && assignedUser !== null) {
                    if (
                      currentUserId !== undefined &&
                      assignedUser.id !== undefined &&
                      assignedUser.id === currentUserId
                    ) {
                      return true;
                    }
                    if (
                      currentUserEmail &&
                      assignedUser.email &&
                      assignedUser.email.toLowerCase() === currentUserEmail.toLowerCase()
                    ) {
                      return true;
                    }
                  }
                  if (currentUserId !== undefined && assignedUser === currentUserId) return true;
                  if (
                    currentUserEmail &&
                    String(assignedUser).toLowerCase() === currentUserEmail.toLowerCase()
                  ) {
                    return true;
                  }
                  return false;
                });
              })
            : [];

          setMissions(assigned);
          if (assigned.length > 0) {
            setMissionId(String(assigned[0].id));
          }
        }
      } catch (err) {
        if (isMounted) {
          setApiError(err.message || "Failed to load missions");
        }
      } finally {
        if (isMounted) {
          setFetchingMissions(false);
        }
      }
    };

    loadMissions();

    return () => {
      isMounted = false;
    };
  }, [token, user, apiUrl]);

  if (user?.role === "admin") {
    return null;
  }

  const validate = () => {
    const errs = {};
    if (!missionId) {
      errs.missionId = "Mission is required";
    }
    if (!status) {
      errs.status = "Current status is required";
    }
    if (!progressUpdate.trim()) {
      errs.progressUpdate = "Progress update is required";
    }
    if (!workCompleted.trim()) {
      errs.workCompleted = "Work completed is required";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError(null);
    setSuccessMessage(null);

    if (!validate()) {
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${apiUrl}/missions/${missionId}/reports`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          current_status: status,
          progress_update: progressUpdate.trim(),
          work_completed: workCompleted.trim(),
          blockers: blockers.trim() || null,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Report submission failed (${res.status})`);
      }

      setSuccessMessage("Weekly status report successfully submitted!");
      navigate("/dashboard");
    } catch (err) {
      setApiError(err.message || "Failed to submit weekly report");
    } finally {
      setLoading(false);
    }
  };

  if (fetchingMissions) {
    return (
      <div style={styles.centerBox}>
        <div className="spinner" style={styles.spinner}></div>
        <p style={{ marginTop: "1rem", color: "#94a3b8" }}>Loading assigned missions...</p>
      </div>
    );
  }

  const noMissionsAssigned = missions.length === 0;

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.heading}>Weekly Mission Status Report</h1>
        <p style={styles.subtitle}>
          Submit weekly progress updates, accomplishments, and roadblocks for your assigned flight
        </p>

        {apiError && (
          <div id="report-api-error" role="alert" style={styles.errorBox}>
            {apiError}
          </div>
        )}

        {successMessage && (
          <div id="report-success-msg" role="status" style={styles.successBox}>
            {successMessage}
          </div>
        )}

        {noMissionsAssigned && !apiError && (
          <div id="no-missions-warning" style={styles.warningBox}>
            No missions assigned
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.fieldGroup}>
            <label htmlFor="report-mission" style={styles.label}>
              Mission *
            </label>
            {noMissionsAssigned ? (
              <select
                id="report-mission"
                disabled
                style={{ ...styles.select, opacity: 0.6 }}
                value=""
              >
                <option value="">No assigned missions available</option>
              </select>
            ) : (
              <select
                id="report-mission"
                value={missionId}
                onChange={(e) => {
                  setMissionId(e.target.value);
                  if (errors.missionId) {
                    setErrors((prev) => ({ ...prev, missionId: null }));
                  }
                }}
                disabled={loading}
                style={errors.missionId ? { ...styles.select, borderColor: "#ef4444" } : styles.select}
              >
                <option value="">-- Select Mission --</option>
                {missions.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
              </select>
            )}
            {errors.missionId && (
              <span id="err-mission" style={styles.fieldError}>
                {errors.missionId}
              </span>
            )}
          </div>

          <div style={styles.fieldGroup}>
            <label htmlFor="report-status" style={styles.label}>
              Current Status *
            </label>
            <select
              id="report-status"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                if (errors.status) {
                  setErrors((prev) => ({ ...prev, status: null }));
                }
              }}
              disabled={loading || noMissionsAssigned}
              style={errors.status ? { ...styles.select, borderColor: "#ef4444" } : styles.select}
            >
              <option value="planned">Planned</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
            {errors.status && (
              <span id="err-status" style={styles.fieldError}>
                {errors.status}
              </span>
            )}
          </div>

          <div style={styles.fieldGroup}>
            <label htmlFor="report-progress" style={styles.label}>
              Progress Update *
            </label>
            <textarea
              id="report-progress"
              rows={4}
              value={progressUpdate}
              onChange={(e) => {
                setProgressUpdate(e.target.value);
                if (errors.progressUpdate) {
                  setErrors((prev) => ({ ...prev, progressUpdate: null }));
                }
              }}
              placeholder="Summary of developments, milestone changes, or telemetry status..."
              disabled={loading || noMissionsAssigned}
              style={
                errors.progressUpdate
                  ? { ...styles.textarea, borderColor: "#ef4444" }
                  : styles.textarea
              }
            />
            {errors.progressUpdate && (
              <span id="err-progress" style={styles.fieldError}>
                {errors.progressUpdate}
              </span>
            )}
          </div>

          <div style={styles.fieldGroup}>
            <label htmlFor="report-work-completed" style={styles.label}>
              Work Completed *
            </label>
            <textarea
              id="report-work-completed"
              rows={4}
              value={workCompleted}
              onChange={(e) => {
                setWorkCompleted(e.target.value);
                if (errors.workCompleted) {
                  setErrors((prev) => ({ ...prev, workCompleted: null }));
                }
              }}
              placeholder="Specific tasks, flight simulations, or subsystem validations completed this week..."
              disabled={loading || noMissionsAssigned}
              style={
                errors.workCompleted
                  ? { ...styles.textarea, borderColor: "#ef4444" }
                  : styles.textarea
              }
            />
            {errors.workCompleted && (
              <span id="err-work-completed" style={styles.fieldError}>
                {errors.workCompleted}
              </span>
            )}
          </div>

          <div style={styles.fieldGroup}>
            <label htmlFor="report-blockers" style={styles.label}>
              Blockers (Optional)
            </label>
            <textarea
              id="report-blockers"
              rows={3}
              value={blockers}
              onChange={(e) => setBlockers(e.target.value)}
              placeholder="Technical dependencies, payload delays, or environmental issues encountered..."
              disabled={loading || noMissionsAssigned}
              style={styles.textarea}
            />
          </div>

          <div style={styles.btnRow}>
            <button
              id="btn-cancel-report"
              type="button"
              onClick={() => navigate("/dashboard")}
              style={styles.cancelBtn}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              id="btn-submit-report"
              type="submit"
              disabled={loading || noMissionsAssigned}
              style={
                loading || noMissionsAssigned
                  ? { ...styles.submitBtn, opacity: 0.5, cursor: "not-allowed" }
                  : styles.submitBtn
              }
            >
              {loading ? "Submitting..." : "Submit Weekly Report"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: "2rem",
    maxWidth: "750px",
    margin: "0 auto",
    color: "#e2e8f0",
    fontFamily: "Inter, system-ui, -apple-system, sans-serif",
  },
  card: {
    background: "rgba(15, 23, 42, 0.75)",
    backdropFilter: "blur(12px)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "16px",
    padding: "2.5rem",
    boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)",
  },
  heading: {
    fontSize: "1.75rem",
    fontWeight: 700,
    color: "#f8fafc",
    margin: "0 0 0.5rem 0",
  },
  subtitle: {
    color: "#94a3b8",
    fontSize: "0.875rem",
    margin: "0 0 2rem 0",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  label: {
    fontSize: "0.875rem",
    fontWeight: 600,
    color: "#cbd5e1",
  },
  select: {
    background: "#0f172a",
    border: "1px solid rgba(255, 255, 255, 0.12)",
    borderRadius: "8px",
    padding: "0.75rem 1rem",
    color: "#f8fafc",
    fontSize: "0.9375rem",
    outline: "none",
  },
  textarea: {
    background: "rgba(15, 23, 42, 0.6)",
    border: "1px solid rgba(255, 255, 255, 0.12)",
    borderRadius: "8px",
    padding: "0.75rem 1rem",
    color: "#f8fafc",
    fontSize: "0.9375rem",
    outline: "none",
    resize: "vertical",
    fontFamily: "inherit",
  },
  fieldError: {
    color: "#f87171",
    fontSize: "0.8125rem",
    marginTop: "0.25rem",
  },
  errorBox: {
    background: "rgba(239, 68, 68, 0.15)",
    border: "1px solid rgba(239, 68, 68, 0.3)",
    color: "#fca5a5",
    padding: "0.75rem 1rem",
    borderRadius: "8px",
    marginBottom: "1.5rem",
    fontSize: "0.875rem",
  },
  successBox: {
    background: "rgba(16, 185, 129, 0.15)",
    border: "1px solid rgba(16, 185, 129, 0.3)",
    color: "#6ee7b7",
    padding: "0.75rem 1rem",
    borderRadius: "8px",
    marginBottom: "1.5rem",
    fontSize: "0.875rem",
  },
  warningBox: {
    background: "rgba(245, 158, 11, 0.15)",
    border: "1px solid rgba(245, 158, 11, 0.3)",
    color: "#fcd34d",
    padding: "0.75rem 1rem",
    borderRadius: "8px",
    marginBottom: "1.5rem",
    fontSize: "0.875rem",
    fontWeight: 500,
  },
  btnRow: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "1rem",
    marginTop: "1rem",
  },
  cancelBtn: {
    background: "transparent",
    border: "1px solid rgba(255, 255, 255, 0.15)",
    color: "#94a3b8",
    padding: "0.65rem 1.25rem",
    borderRadius: "8px",
    fontSize: "0.875rem",
    fontWeight: 600,
    cursor: "pointer",
  },
  submitBtn: {
    background: "linear-gradient(135deg, #0284c7 0%, #2563eb 100%)",
    color: "#ffffff",
    border: "none",
    padding: "0.65rem 1.5rem",
    borderRadius: "8px",
    fontSize: "0.875rem",
    fontWeight: 600,
    cursor: "pointer",
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
};
