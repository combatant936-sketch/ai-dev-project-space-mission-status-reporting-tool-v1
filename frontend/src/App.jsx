import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, ProtectedRoute, AdminRoute } from "./context/AuthContext";
import Login from "./pages/Login";
import MissionList from "./pages/MissionList";
import MissionDetail from "./pages/MissionDetail";

import MissionForm from "./pages/MissionForm";
import ReportForm from "./pages/ReportForm";
import ReportList from "./pages/ReportList";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <div style={{ color: "#fff", padding: "2rem", textAlign: "center" }}>
                  <h1>Mission Control Dashboard</h1>
                  <p>Welcome to Space Mission Reporting Portal</p>
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/missions"
            element={
              <ProtectedRoute>
                <AdminRoute>
                  <MissionList />
                </AdminRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/missions/new"
            element={
              <ProtectedRoute>
                <AdminRoute>
                  <MissionForm />
                </AdminRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/missions/:id/edit"
            element={
              <ProtectedRoute>
                <AdminRoute>
                  <MissionForm />
                </AdminRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/missions/:id"
            element={
              <ProtectedRoute>
                <AdminRoute>
                  <MissionDetail />
                </AdminRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports/new"
            element={
              <ProtectedRoute>
                <ReportForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <AdminRoute>
                  <ReportList />
                </AdminRoute>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
