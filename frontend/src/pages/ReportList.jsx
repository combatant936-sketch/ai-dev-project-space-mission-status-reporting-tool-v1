import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

export default function ReportList() {
  const { token } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null);

  // Selected report for modal detail view
  const [selectedReport, setSelectedReport] = useState(null);
  const [adminComment, setAdminComment] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState(null);

  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";

  useEffect(() => {
    let isMounted = true;

    const fetchReports = async () => {
      setLoading(true);
      setApiError(null);

      try {
        const res = await fetch(`${apiUrl}/reports`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || `Failed to fetch reports (${res.status})`);
        }

        const data = await res.json();
        if (isMounted) {
          setReports(data);
        }
      } catch (err) {
        if (isMounted) {
          setApiError(err.message || "An error occurred while loading reports");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchReports();

    return () => {
      isMounted = false;
    };
  }, [token, apiUrl]);

  const handleRowClick = async (report) => {
    setReviewError(null);
    setAdminComment("");
    setSelectedReport(report);

    // If detailed fields are missing (e.g. from an older list format), fetch individual report
    if (report.progress_update === undefined || report.work_completed === undefined) {
      try {
        const res = await fetch(`${apiUrl}/reports/${report.id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const detailed = await res.json();
          setSelectedReport((prev) => (prev && prev.id === report.id ? { ...prev, ...detailed } : prev));
        }
      } catch (err) {
        // Keep initial report data
      }
    }
  };

  const closeModal = () => {
    setSelectedReport(null);
    setAdminComment("");
    setReviewError(null);
  };

  const handleMarkAsReviewed = async () => {
    if (!selectedReport) return;
    setReviewLoading(true);
    setReviewError(null);

    try {
      const res = await fetch(`${apiUrl}/reports/${selectedReport.id}/review`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reviewed: true,
          admin_comment: adminComment.trim() || null,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Review action failed (${res.status})`);
      }

      const updated = await res.json();

      // Update in reports list immediately without page reload
      setReports((prev) =>
        prev.map((r) =>
          r.id === selectedReport.id
            ? { ...r, reviewed: true, admin_comment: updated.admin_comment ?? adminComment.trim() ?? null }
            : r
        )
      );

      // Update in active modal view
      setSelectedReport((prev) =>
        prev
          ? {
              ...prev,
              reviewed: true,
              admin_comment: updated.admin_comment ?? adminComment.trim() ?? null,
            }
          : null
      );
    } catch (err) {
      setReviewError(err.message || "Failed to mark report as reviewed");
    } finally {
      setReviewLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div style={styles.centerBox}>
        <div className="spinner" style={styles.spinner}></div>
        <p style={{ marginTop: "1rem", color: "#94a3b8" }}>Loading mission reports...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <div>
          <h1 style={styles.title}>Weekly Mission Reports</h1>
          <p style={styles.subtitle}>Review weekly updates and progress submitted by flight crews</p>
        </div>
      </div>

      {apiError && (
        <div id="reports-api-error" role="alert" style={styles.errorBox}>
          {apiError}
        </div>
      )}

      {reports.length === 0 && !apiError ? (
        <div id="no-reports-msg" style={styles.emptyState}>
          <p style={{ fontSize: "1.125rem", color: "#94a3b8", margin: 0 }}>
            No mission reports submitted yet.
          </p>
        </div>
      ) : (
        <div style={styles.tableCard}>
          <table style={styles.table} data-testid="reports-table">
            <thead>
              <tr style={styles.thRow}>
                <th style={styles.th}>Mission</th>
                <th style={styles.th}>Submitted By</th>
                <th style={styles.th}>Submitted At</th>
                <th style={styles.th}>Reviewed</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr
                  key={report.id}
                  id={`report-row-${report.id}`}
                  data-testid={`report-row-${report.id}`}
                  onClick={() => handleRowClick(report)}
                  style={styles.tr}
                >
                  <td style={{ ...styles.td, fontWeight: 600, color: "#f8fafc" }}>
                    {report.mission_title || `Mission #${report.mission_id}`}
                  </td>
                  <td style={styles.td}>{report.submitter_email}</td>
                  <td style={styles.td}>{formatDate(report.submitted_at)}</td>
                  <td style={styles.td}>
                    {report.reviewed ? (
                      <span
                        data-testid={`badge-reviewed-${report.id}`}
                        style={{ ...styles.badge, ...styles.badgeReviewed }}
                      >
                        Reviewed
                      </span>
                    ) : (
                      <span
                        data-testid={`badge-pending-${report.id}`}
                        style={{ ...styles.badge, ...styles.badgePending }}
                      >
                        Pending
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Report Detail Modal */}
      {selectedReport && (
        <div
          id="report-detail-modal"
          data-testid="report-modal"
          style={styles.modalOverlay}
          onClick={closeModal}
        >
          <div
            style={styles.modalCard}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={styles.modalHeader}>
              <div>
                <h2 style={styles.modalHeading}>
                  Report: {selectedReport.mission_title || `Mission #${selectedReport.mission_id}`}
                </h2>
                <span style={{ fontSize: "0.875rem", color: "#94a3b8" }}>
                  Submitted by {selectedReport.submitter_email} on {formatDate(selectedReport.submitted_at)}
                </span>
              </div>
              <button
                id="btn-close-modal"
                onClick={closeModal}
                style={styles.closeBtn}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {reviewError && (
              <div id="modal-review-error" role="alert" style={styles.errorBox}>
                {reviewError}
              </div>
            )}

            <div style={styles.modalBody}>
              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Current Status</span>
                <span style={styles.detailValue}>
                  {selectedReport.current_status
                    ? selectedReport.current_status.replace(/_/g, " ").toUpperCase()
                    : "N/A"}
                </span>
              </div>

              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Progress Update</span>
                <p style={styles.detailBlock}>
                  {selectedReport.progress_update || "No progress update provided."}
                </p>
              </div>

              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Work Completed</span>
                <p style={styles.detailBlock}>
                  {selectedReport.work_completed || "No work completed notes provided."}
                </p>
              </div>

              <div style={styles.detailItem}>
                <span style={styles.detailLabel}>Blockers</span>
                <p style={styles.detailBlock}>
                  {selectedReport.blockers || "None reported"}
                </p>
              </div>

              {/* Reviewed Status & Admin Commentary */}
              <div style={{ ...styles.detailItem, marginTop: "1rem" }}>
                <span style={styles.detailLabel}>Review Status</span>
                <div>
                  {selectedReport.reviewed ? (
                    <span style={{ ...styles.badge, ...styles.badgeReviewed }}>Reviewed</span>
                  ) : (
                    <span style={{ ...styles.badge, ...styles.badgePending }}>Pending Review</span>
                  )}
                </div>
              </div>

              {selectedReport.reviewed ? (
                selectedReport.admin_comment ? (
                  <div style={styles.detailItem}>
                    <span style={styles.detailLabel}>Admin Comment</span>
                    <p style={{ ...styles.detailBlock, borderLeft: "3px solid #38bdf8" }}>
                      {selectedReport.admin_comment}
                    </p>
                  </div>
                ) : null
              ) : (
                <div style={styles.reviewActionBox}>
                  <label htmlFor="admin-comment" style={styles.detailLabel}>
                    Admin Comment (Optional)
                  </label>
                  <textarea
                    id="admin-comment"
                    rows={3}
                    value={adminComment}
                    onChange={(e) => setAdminComment(e.target.value)}
                    placeholder="Provide administrative feedback or notes on this report..."
                    style={styles.modalTextarea}
                    disabled={reviewLoading}
                  />

                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
                    <button
                      id="btn-mark-reviewed"
                      onClick={handleMarkAsReviewed}
                      disabled={reviewLoading}
                      style={
                        reviewLoading
                          ? { ...styles.markReviewedBtn, opacity: 0.6 }
                          : styles.markReviewedBtn
                      }
                    >
                      {reviewLoading ? "Reviewing..." : "Mark as Reviewed"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
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
    margin: "0 0 0.5rem 0",
  },
  subtitle: {
    color: "#94a3b8",
    margin: 0,
    fontSize: "0.9375rem",
  },
  tableCard: {
    background: "rgba(15, 23, 42, 0.75)",
    backdropFilter: "blur(12px)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "16px",
    overflow: "hidden",
    boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
  },
  thRow: {
    borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
    background: "rgba(30, 41, 59, 0.5)",
  },
  th: {
    padding: "1rem 1.5rem",
    fontSize: "0.8125rem",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "#94a3b8",
  },
  tr: {
    borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
    cursor: "pointer",
    transition: "background 0.2s ease",
  },
  td: {
    padding: "1.25rem 1.5rem",
    fontSize: "0.9375rem",
    color: "#cbd5e1",
  },
  badge: {
    display: "inline-block",
    padding: "0.25rem 0.75rem",
    borderRadius: "9999px",
    fontSize: "0.75rem",
    fontWeight: 600,
    letterSpacing: "0.025em",
    textTransform: "capitalize",
  },
  badgeReviewed: {
    background: "rgba(16, 185, 129, 0.15)",
    color: "#34d399",
    border: "1px solid rgba(16, 185, 129, 0.3)",
  },
  badgePending: {
    background: "rgba(245, 158, 11, 0.15)",
    color: "#fbbf24",
    border: "1px solid rgba(245, 158, 11, 0.3)",
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
  emptyState: {
    textAlign: "center",
    padding: "4rem 2rem",
    background: "rgba(15, 23, 42, 0.4)",
    borderRadius: "16px",
    border: "1px dashed rgba(255, 255, 255, 0.1)",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    backdropFilter: "blur(6px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    padding: "1.5rem",
  },
  modalCard: {
    background: "#0f172a",
    border: "1px solid rgba(255, 255, 255, 0.15)",
    borderRadius: "16px",
    width: "100%",
    maxWidth: "650px",
    maxHeight: "90vh",
    overflowY: "auto",
    padding: "2rem",
    boxShadow: "0 25px 50px rgba(0, 0, 0, 0.5)",
  },
  modalHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "1.5rem",
    borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
    paddingBottom: "1rem",
  },
  modalHeading: {
    fontSize: "1.375rem",
    fontWeight: 700,
    color: "#f8fafc",
    margin: "0 0 0.25rem 0",
  },
  closeBtn: {
    background: "transparent",
    border: "none",
    color: "#94a3b8",
    fontSize: "1.25rem",
    cursor: "pointer",
    padding: "0.25rem 0.5rem",
    borderRadius: "6px",
  },
  modalBody: {
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
  },
  detailItem: {
    display: "flex",
    flexDirection: "column",
    gap: "0.35rem",
  },
  detailLabel: {
    fontSize: "0.8125rem",
    fontWeight: 600,
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  detailValue: {
    fontSize: "0.9375rem",
    color: "#f8fafc",
    fontWeight: 600,
  },
  detailBlock: {
    margin: 0,
    padding: "0.75rem 1rem",
    background: "rgba(30, 41, 59, 0.6)",
    borderRadius: "8px",
    fontSize: "0.9375rem",
    color: "#cbd5e1",
    lineHeight: 1.5,
    whiteSpace: "pre-wrap",
  },
  reviewActionBox: {
    marginTop: "0.5rem",
    padding: "1.25rem",
    background: "rgba(30, 41, 59, 0.4)",
    borderRadius: "12px",
    border: "1px solid rgba(255, 255, 255, 0.08)",
  },
  modalTextarea: {
    width: "100%",
    marginTop: "0.5rem",
    background: "rgba(15, 23, 42, 0.7)",
    border: "1px solid rgba(255, 255, 255, 0.12)",
    borderRadius: "8px",
    padding: "0.75rem 1rem",
    color: "#f8fafc",
    fontSize: "0.9375rem",
    outline: "none",
    resize: "vertical",
    fontFamily: "inherit",
    boxSizing: "border-box",
  },
  markReviewedBtn: {
    background: "linear-gradient(135deg, #059669 0%, #10b981 100%)",
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
