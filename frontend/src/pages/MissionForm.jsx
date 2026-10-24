import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function MissionForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { token } = useAuth();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("planned");
  const [assignedMembers, setAssignedMembers] = useState([]);
  const [initialMembers, setInitialMembers] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);

  const [titleError, setTitleError] = useState(null);
  const [apiError, setApiError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);

  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";

  useEffect(() => {
    let isMounted = true;
    const loadInitialData = async () => {
      setFetchingData(true);
      setApiError(null);

      try {
        // Fetch team members
        const membersRes = await fetch(`${apiUrl}/users?role=team_member`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (membersRes.ok) {
          const membersData = await membersRes.json();
          if (isMounted) setTeamMembers(membersData);
        }

        // If editing, fetch current mission
        if (isEdit) {
          const missionRes = await fetch(`${apiUrl}/missions/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (!missionRes.ok) {
            const errData = await missionRes.json().catch(() => ({}));
            throw new Error(errData.detail || `Failed to load mission ${id}`);
          }

          const mData = await missionRes.json();
          if (isMounted) {
            setTitle(mData.title || "");
            setDescription(mData.description || "");
            setStatus(mData.status || "planned");
            const memberIds = (mData.assigned_users || []).map((u) => u.id);
            setAssignedMembers(memberIds);
            setInitialMembers(memberIds);
          }
        }
      } catch (err) {
        if (isMounted) setApiError(err.message || "Failed to load form data");
      } finally {
        if (isMounted) setFetchingData(false);
      }
    };

    loadInitialData();
    return () => {
      isMounted = false;
    };
  }, [id, isEdit, token, apiUrl]);

  const handleMemberToggle = (memberId) => {
    setAssignedMembers((prev) =>
      prev.includes(memberId) ? prev.filter((mid) => mid !== memberId) : [...prev, memberId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTitleError(null);
    setApiError(null);

    // Client-side validation
    if (!title.trim()) {
      setTitleError("Title is required");
      return;
    }

    setLoading(true);

    try {
      if (!isEdit) {
        // Create mission
        const createRes = await fetch(`${apiUrl}/missions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim() || null,
            status,
          }),
        });

        if (!createRes.ok) {
          const errData = await createRes.json().catch(() => ({}));
          throw new Error(errData.detail || `Mission creation failed (${createRes.status})`);
        }

        const createdMission = await createRes.json();

        // Assign members if any selected
        if (assignedMembers.length > 0) {
          const assignRes = await fetch(`${apiUrl}/missions/${createdMission.id}/assign`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ user_ids: assignedMembers }),
          });

          if (!assignRes.ok) {
            const errData = await assignRes.json().catch(() => ({}));
            throw new Error(errData.detail || `Assignment failed (${assignRes.status})`);
          }
        }

        navigate("/missions");
      } else {
        // Update mission
        const updateRes = await fetch(`${apiUrl}/missions/${id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim() || null,
            status,
          }),
        });

        if (!updateRes.ok) {
          const errData = await updateRes.json().catch(() => ({}));
          throw new Error(errData.detail || `Mission update failed (${updateRes.status})`);
        }

        // Reassign members if changed
        const membersChanged =
          assignedMembers.length !== initialMembers.length ||
          assignedMembers.some((m) => !initialMembers.includes(m));

        if (membersChanged) {
          const assignRes = await fetch(`${apiUrl}/missions/${id}/assign`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ user_ids: assignedMembers }),
          });

          if (!assignRes.ok) {
            const errData = await assignRes.json().catch(() => ({}));
            throw new Error(errData.detail || `Assignment update failed (${assignRes.status})`);
          }
        }

        navigate(`/missions/${id}`);
      }
    } catch (err) {
      setApiError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (fetchingData) {
    return (
      <div style={styles.centerBox}>
        <div className="spinner" style={styles.spinner}></div>
        <p style={{ marginTop: "1rem", color: "#94a3b8" }}>Loading mission form...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.heading}>{isEdit ? "Edit Space Mission" : "Create New Space Mission"}</h1>
        <p style={styles.subtitle}>
          {isEdit
            ? "Update flight telemetry, status, and crew assignments"
            : "Register a new mission into the fleet manifest"}
        </p>

        {apiError && (
          <div id="form-api-error" role="alert" style={styles.errorBox}>
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.fieldGroup}>
            <label htmlFor="mission-title" style={styles.label}>
              Mission Title *
            </label>
            <input
              id="mission-title"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (titleError) setTitleError(null);
              }}
              placeholder="e.g. Artemis IV"
              style={titleError ? { ...styles.input, borderColor: "#ef4444" } : styles.input}
              disabled={loading}
            />
            {titleError && (
              <span id="title-error" style={styles.fieldError}>
                {titleError}
              </span>
            )}
          </div>

          <div style={styles.fieldGroup}>
            <label htmlFor="mission-description" style={styles.label}>
              Description
            </label>
            <textarea
              id="mission-description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Primary objectives, payload details, and flight parameters..."
              style={styles.textarea}
              disabled={loading}
            />
          </div>

          <div style={styles.fieldGroup}>
            <label htmlFor="mission-status" style={styles.label}>
              Status *
            </label>
            <select
              id="mission-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={styles.select}
              disabled={loading}
            >
              <option value="planned">Planned</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Assigned Flight Crew (Team Members)</label>
            {teamMembers.length === 0 ? (
              <p style={{ color: "#64748b", fontSize: "0.875rem" }}>
                No team member accounts registered yet.
              </p>
            ) : (
              <div style={styles.memberBox} data-testid="member-select-box">
                {teamMembers.map((member) => (
                  <label key={member.id} style={styles.memberOption}>
                    <input
                      type="checkbox"
                      checked={assignedMembers.includes(member.id)}
                      onChange={() => handleMemberToggle(member.id)}
                      disabled={loading}
                      data-testid={`member-check-${member.id}`}
                    />
                    <span>{member.email}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div style={styles.btnRow}>
            <button
              id="btn-cancel"
              type="button"
              onClick={() => (isEdit ? navigate(`/missions/${id}`) : navigate("/missions"))}
              style={styles.cancelBtn}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              id="btn-submit-mission"
              type="submit"
              disabled={loading}
              style={loading ? { ...styles.submitBtn, opacity: 0.6 } : styles.submitBtn}
            >
              {loading ? "Saving..." : isEdit ? "Save Changes" : "Create Mission"}
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
    maxWidth: "700px",
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
  input: {
    background: "rgba(15, 23, 42, 0.6)",
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
  select: {
    background: "#0f172a",
    border: "1px solid rgba(255, 255, 255, 0.12)",
    borderRadius: "8px",
    padding: "0.75rem 1rem",
    color: "#f8fafc",
    fontSize: "0.9375rem",
    outline: "none",
  },
  memberBox: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    maxHeight: "160px",
    overflowY: "auto",
    padding: "0.75rem",
    background: "rgba(15, 23, 42, 0.6)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    borderRadius: "8px",
  },
  memberOption: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    fontSize: "0.875rem",
    color: "#cbd5e1",
    cursor: "pointer",
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
