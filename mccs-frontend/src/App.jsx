import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { canAccess } from "./utils/permissions";
import Footer from "./components/Footer";

import Login           from "./pages/Login";
import ForgotPassword  from "./pages/ForgotPassword";
import ResetPassword   from "./pages/ResetPassword";
import Dashboard       from "./pages/Dashboard";
import Inventory       from "./pages/Inventory";
import Departments     from "./pages/Departments";
import Staff           from "./pages/Staff";
import Allocations     from "./pages/Allocations";
import Deliveries      from "./pages/Deliveries";
import Usage           from "./pages/Usage";
import AuditLogs       from "./pages/AuditLogs";
import Reports         from "./pages/Reports";
import Eligibility     from "./pages/Eligibility";
import ConfirmReceipt  from "./pages/ConfirmReceipt";
import Users           from "./pages/Users";
import AdminSettings   from "./pages/AdminSettings";
import SystemSettings  from "./pages/SystemSettings";
import Notifications   from "./pages/Notifications";
import StaffDashboard  from "./pages/StaffDashboard";
import Approvals       from "./pages/Approvals";
import Workflow        from "./pages/Workflow";
import QAChecklist     from "./pages/QAChecklist";
import Deployment      from "./pages/Deployment";
import AccessDenied    from "./pages/AccessDenied";

// ── Requires login ──────────────────────────────────────────
function ProtectedRoute({ children }) {
  const token = localStorage.getItem("mccs_token");
  const location = useLocation();
  if (!token) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

// ── Requires login + specific role ──────────────────────────
function RoleRoute({ children }) {
  const token = localStorage.getItem("mccs_token");
  const location = useLocation();

  if (!token) return <Navigate to="/login" state={{ from: location }} replace />;

  const user = (() => {
    try { return JSON.parse(localStorage.getItem("mccs_user") || "{}"); }
    catch { return {}; }
  })();

  if (!canAccess(user.role, location.pathname)) {
    return <AccessDenied />;
  }

  return (
    <>
      {children}
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login"           element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password"  element={<ResetPassword />} />
      <Route path="/confirm"         element={<ConfirmReceipt />} />
      <Route path="/"                element={<Navigate to="/login" replace />} />

      {/* All logged-in users */}
      <Route path="/dashboard" element={<RoleRoute><Dashboard /></RoleRoute>} />
      <Route path="/settings"  element={<RoleRoute><AdminSettings /></RoleRoute>} />
      <Route path="/usage"     element={<RoleRoute><Usage /></RoleRoute>} />

      {/* Card Management */}
      <Route path="/inventory"   element={<RoleRoute><Inventory /></RoleRoute>} />
      <Route path="/departments" element={<RoleRoute><Departments /></RoleRoute>} />
      <Route path="/staff"       element={<RoleRoute><Staff /></RoleRoute>} />
      <Route path="/eligibility" element={<RoleRoute><Eligibility /></RoleRoute>} />

      {/* Distribution */}
      <Route path="/allocations" element={<RoleRoute><Allocations /></RoleRoute>} />
      <Route path="/deliveries"  element={<RoleRoute><Deliveries /></RoleRoute>} />

      {/* Reporting */}
      <Route path="/audit-logs" element={<RoleRoute><AuditLogs /></RoleRoute>} />
      <Route path="/reports"    element={<RoleRoute><Reports /></RoleRoute>} />

      {/* Administration — Admins only */}
      <Route path="/users"           element={<RoleRoute><Users /></RoleRoute>} />
      <Route path="/system-settings" element={<RoleRoute><SystemSettings /></RoleRoute>} />
      <Route path="/notifications"    element={<RoleRoute><Notifications /></RoleRoute>} />
      <Route path="/staff-dashboard"  element={<RoleRoute><StaffDashboard /></RoleRoute>} />
      <Route path="/approvals"        element={<RoleRoute><Approvals /></RoleRoute>} />
      <Route path="/workflow"         element={<RoleRoute><Workflow /></RoleRoute>} />
      <Route path="/qa-checklist"     element={<RoleRoute><QAChecklist /></RoleRoute>} />
      <Route path="/deployment"       element={<RoleRoute><Deployment /></RoleRoute>} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
