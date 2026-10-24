import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);


  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";

    try {
      const params = new URLSearchParams();
      params.append("username", email);
      params.append("password", password);

      const response = await fetch(`${apiUrl}/auth/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem("access_token", data.access_token);
        if (typeof login === "function") {
          login(data.access_token);
        }
        navigate("/dashboard");
      } else if (response.status === 401) {


        const errData = await response.json().catch(() => ({}));
        setError(errData.detail || "Invalid email or password");
      } else {
        const errData = await response.json().catch(() => ({}));
        setError(errData.detail || `Authentication failed (status ${response.status})`);
      }
    } catch (err) {
      setError("Network error: Could not reach the server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container" style={styles.container}>
      <div className="login-card" style={styles.card}>
        <div style={styles.header}>
          <div style={styles.badge}>🚀 Space Command</div>
          <h1 style={styles.title}>Mission Portal Login</h1>
          <p style={styles.subtitle}>Enter your flight credentials to access the console</p>
        </div>

        {error && (
          <div id="login-error" role="alert" style={styles.error}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.fieldGroup}>
            <label htmlFor="email" style={styles.label}>
              Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="astronaut@nasa.gov"
              style={styles.input}
              disabled={loading}
            />
          </div>

          <div style={styles.fieldGroup}>
            <label htmlFor="password" style={styles.label}>
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={styles.input}
              disabled={loading}
            />
          </div>

          <button
            id="login-submit"
            type="submit"
            disabled={loading}
            style={loading ? { ...styles.button, ...styles.buttonDisabled } : styles.button}
          >
            {loading ? (
              <span style={styles.loadingWrapper}>
                <span className="spinner" style={styles.spinner}></span> Authenticating...
              </span>
            ) : (
              "Sign In to Console"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #0b0f19 0%, #171e2e 50%, #0d1322 100%)",
    padding: "1.5rem",
    color: "#e2e8f0",
    fontFamily: "Inter, system-ui, -apple-system, sans-serif",
  },
  card: {
    width: "100%",
    maxWidth: "420px",
    background: "rgba(23, 30, 46, 0.85)",
    backdropFilter: "blur(12px)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: "16px",
    padding: "2.5rem 2rem",
    boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5), 0 0 40px rgba(56, 189, 248, 0.1)",
  },
  header: {
    textAlign: "center",
    marginBottom: "2rem",
  },
  badge: {
    display: "inline-block",
    padding: "0.25rem 0.75rem",
    borderRadius: "9999px",
    background: "rgba(56, 189, 248, 0.15)",
    color: "#38bdf8",
    fontSize: "0.75rem",
    fontWeight: 600,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    marginBottom: "0.75rem",
  },
  title: {
    fontSize: "1.75rem",
    fontWeight: 700,
    color: "#f8fafc",
    margin: "0 0 0.5rem 0",
    letterSpacing: "-0.025em",
  },
  subtitle: {
    fontSize: "0.875rem",
    color: "#94a3b8",
    margin: 0,
  },
  error: {
    background: "rgba(239, 68, 68, 0.15)",
    border: "1px solid rgba(239, 68, 68, 0.4)",
    color: "#fca5a5",
    padding: "0.75rem 1rem",
    borderRadius: "8px",
    fontSize: "0.875rem",
    marginBottom: "1.5rem",
    textAlign: "center",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  label: {
    fontSize: "0.8125rem",
    fontWeight: 500,
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
    transition: "border-color 0.2s, box-shadow 0.2s",
  },
  button: {
    background: "linear-gradient(135deg, #0284c7 0%, #2563eb 100%)",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    padding: "0.875rem 1rem",
    fontSize: "0.9375rem",
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: "0 4px 14px rgba(37, 99, 235, 0.35)",
    transition: "opacity 0.2s, transform 0.1s",
    marginTop: "0.5rem",
  },
  buttonDisabled: {
    opacity: 0.65,
    cursor: "not-allowed",
  },
  loadingWrapper: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.5rem",
  },
  spinner: {
    width: "1rem",
    height: "1rem",
    border: "2px solid rgba(255, 255, 255, 0.3)",
    borderTopColor: "#ffffff",
    borderRadius: "50%",
    display: "inline-block",
    animation: "spin 0.8s linear infinite",
  },
};
