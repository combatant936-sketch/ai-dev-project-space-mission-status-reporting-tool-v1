import React, { useState, useEffect } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { useAuth } from "../context/AuthContext";
import "./Dashboard.css";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function Dashboard() {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState(null);

  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";

  useEffect(() => {
    let isMounted = true;

    const fetchDashboardStats = async () => {
      setLoading(true);
      setApiError(null);

      try {
        const res = await fetch(`${apiUrl}/dashboard`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || `Failed to fetch dashboard data (${res.status})`);
        }

        const data = await res.json();
        if (isMounted) {
          setStats(data);
        }
      } catch (err) {
        if (isMounted) {
          setApiError(err.message || "Failed to load dashboard metrics");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchDashboardStats();

    return () => {
      isMounted = false;
    };
  }, [token, apiUrl]);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="center-box">
        <div className="spinner" data-testid="dashboard-spinner"></div>
        <p className="dashboard-subtitle">Loading mission control dashboard...</p>
      </div>
    );
  }

  if (apiError) {
    return (
      <div className="dashboard-container">
        <div id="dashboard-api-error" role="alert" className="error-alert">
          {apiError}
        </div>
      </div>
    );
  }

  const planned =
    stats?.missions_by_status?.planned ??
    (stats?.total_missions && stats?.active_missions !== undefined
      ? Math.max(0, stats.total_missions - stats.active_missions)
      : 0);

  const inProgress = stats?.missions_by_status?.in_progress ?? stats?.active_missions ?? 0;
  const completed = stats?.missions_by_status?.completed ?? 0;
  const failed = stats?.missions_by_status?.failed ?? 0;

  const chartData = {
    labels: ["Planned", "In Progress", "Completed", "Failed"],
    datasets: [
      {
        label: "Missions",
        data: [planned, inProgress, completed, failed],
        backgroundColor: ["#60a5fa", "#38bdf8", "#34d399", "#f87171"],
        borderColor: "rgba(15, 23, 42, 0.8)",
        borderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: "#94a3b8",
          font: {
            family: "Inter, system-ui, sans-serif",
            size: 12,
          },
        },
      },
      tooltip: {
        backgroundColor: "rgba(15, 23, 42, 0.9)",
        titleColor: "#f8fafc",
        bodyColor: "#e2e8f0",
        borderColor: "rgba(255, 255, 255, 0.1)",
        borderWidth: 1,
      },
    },
  };

  const recentReports = stats?.recent_reports || [];

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Mission Control v2</h1>
        <p className="dashboard-subtitle">
          Real-time fleet telemetry, flight readiness, and mission status reports
        </p>
      </div>

      {/* 3 Stat Summary Cards */}
      <div className="dashboard-stats-grid">
        <div className="stat-card" data-testid="stat-total-missions">
          <span className="stat-label">Total Missions</span>
          <span className="stat-value">{stats?.total_missions ?? 0}</span>
        </div>

        <div className="stat-card" data-testid="stat-active-missions">
          <span className="stat-label">Active Missions</span>
          <span className="stat-value">{stats?.active_missions ?? 0}</span>
        </div>

        <div className="stat-card" data-testid="stat-pending-reports">
          <span className="stat-label">Pending Reports</span>
          <span className="stat-value">{stats?.pending_reports ?? 0}</span>
        </div>
      </div>

      {/* Doughnut Chart */}
      <div className="dashboard-content-grid">
        <div className="chart-card">
          <h2 className="chart-title">Missions by Status</h2>
          <div className="chart-wrapper" data-testid="status-chart">
            <Doughnut data={chartData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Recent Reports List */}
      <div className="recent-reports-card">
        <h2 className="section-title">Recent Reports</h2>

        {recentReports.length === 0 ? (
          <div className="empty-state" data-testid="empty-recent-reports">
            No reports yet
          </div>
        ) : (
          <div className="reports-table-container">
            <table className="reports-table" data-testid="recent-reports-table">
              <thead>
                <tr>
                  <th className="reports-th">Mission</th>
                  <th className="reports-th">Submitted By</th>
                  <th className="reports-th">Submitted At</th>
                  <th className="reports-th">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentReports.map((report) => (
                  <tr key={report.id} className="reports-tr" data-testid={`recent-report-row-${report.id}`}>
                    <td className="reports-td reports-td-title">{report.mission_title}</td>
                    <td className="reports-td">{report.submitter_email}</td>
                    <td className="reports-td">{formatDate(report.submitted_at)}</td>
                    <td className="reports-td">
                      {report.reviewed ? (
                        <span className="badge badge-reviewed">Reviewed</span>
                      ) : (
                        <span className="badge badge-pending">Pending</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
