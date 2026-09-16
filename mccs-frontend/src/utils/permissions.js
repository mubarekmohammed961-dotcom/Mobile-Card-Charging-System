// ============================================================
// MCCS — Role-Based Access Control
//  RBAC Matrix
// ============================================================

export const ROLES = {
  SUPER_ADMIN:     "SUPER_ADMIN",
  SYSTEM_ADMIN:    "SYSTEM_ADMIN",
  STORE_OFFICER:   "STORE_OFFICER",
  DEPARTMENT_HEAD: "DEPARTMENT_HEAD",
  STAFF:           "STAFF",
  AUDITOR:         "AUDITOR",
};

export const ROUTE_PERMISSIONS = {
  "/dashboard":       ["SUPER_ADMIN","SYSTEM_ADMIN","STORE_OFFICER","DEPARTMENT_HEAD","STAFF","AUDITOR"],
  "/inventory":       ["SUPER_ADMIN","SYSTEM_ADMIN","STORE_OFFICER","AUDITOR"],
  "/departments":     ["SUPER_ADMIN","SYSTEM_ADMIN","DEPARTMENT_HEAD","AUDITOR"],
  "/staff":           ["SUPER_ADMIN","SYSTEM_ADMIN","DEPARTMENT_HEAD"],
  "/eligibility":     ["SUPER_ADMIN","SYSTEM_ADMIN","DEPARTMENT_HEAD"],
  "/allocations":     ["SUPER_ADMIN","SYSTEM_ADMIN","STORE_OFFICER","DEPARTMENT_HEAD"],
  "/approvals":       ["DEPARTMENT_HEAD"], // BR-004: ONLY Dept Head can access
  "/deliveries":      ["SUPER_ADMIN","SYSTEM_ADMIN","STORE_OFFICER","DEPARTMENT_HEAD"],
  "/usage":           ["SUPER_ADMIN","SYSTEM_ADMIN","STORE_OFFICER","DEPARTMENT_HEAD","STAFF"],
  "/audit-logs":      ["SUPER_ADMIN","SYSTEM_ADMIN","AUDITOR"],
  "/reports":         ["SUPER_ADMIN","SYSTEM_ADMIN","STORE_OFFICER","DEPARTMENT_HEAD","AUDITOR"],
  "/users":           ["SUPER_ADMIN","SYSTEM_ADMIN"],
  "/settings":        ["SUPER_ADMIN","SYSTEM_ADMIN","STORE_OFFICER","DEPARTMENT_HEAD","STAFF","AUDITOR"],
  "/system-settings": ["SUPER_ADMIN","SYSTEM_ADMIN"],
  "/staff-dashboard": ["SUPER_ADMIN","SYSTEM_ADMIN","STORE_OFFICER","DEPARTMENT_HEAD","STAFF","AUDITOR"],
  "/notifications":   ["SUPER_ADMIN","SYSTEM_ADMIN","STORE_OFFICER","DEPARTMENT_HEAD","STAFF","AUDITOR"],
  "/workflow":        ["SUPER_ADMIN","SYSTEM_ADMIN","STORE_OFFICER","DEPARTMENT_HEAD","AUDITOR"],
  "/qa-checklist":    ["SUPER_ADMIN","SYSTEM_ADMIN"],
  "/deployment":      ["SUPER_ADMIN","SYSTEM_ADMIN"],
};

// Clean, organised navigation — grouped by function
export const NAV_ITEMS = [
  // ── Overview ──────────────────────────────────────────────
  { label: "Dashboard",        path: "/dashboard",       section: "Overview",        roles: ["SUPER_ADMIN","SYSTEM_ADMIN","STORE_OFFICER","DEPARTMENT_HEAD","STAFF","AUDITOR"] },
  { label: "My Cards",         path: "/staff-dashboard", section: "Overview",        roles: ["STAFF","DEPARTMENT_HEAD"] },
  { label: "Notifications",    path: "/notifications",   section: "Overview",        roles: ["SUPER_ADMIN","SYSTEM_ADMIN","STORE_OFFICER","DEPARTMENT_HEAD","STAFF","AUDITOR"] },
  // ── Card Management ───────────────────────────────────────
  { label: "Inventory",        path: "/inventory",       section: "Card Management", roles: ["SUPER_ADMIN","SYSTEM_ADMIN","STORE_OFFICER","AUDITOR"] },
  { label: "Departments",      path: "/departments",     section: "Card Management", roles: ["SUPER_ADMIN","SYSTEM_ADMIN","DEPARTMENT_HEAD","AUDITOR"] },
  { label: "Staff",            path: "/staff",           section: "Card Management", roles: ["SUPER_ADMIN","SYSTEM_ADMIN","DEPARTMENT_HEAD"] },
  { label: "Eligibility",      path: "/eligibility",     section: "Card Management", roles: ["SUPER_ADMIN","SYSTEM_ADMIN","DEPARTMENT_HEAD"] },
  // ── Distribution ──────────────────────────────────────────
  { label: "Allocations",      path: "/allocations",     section: "Distribution",    roles: ["SUPER_ADMIN","SYSTEM_ADMIN","STORE_OFFICER","DEPARTMENT_HEAD"] },
  { label: "Budget Approval",  path: "/approvals",       section: "Distribution",    roles: ["DEPARTMENT_HEAD"] }, // BR-004: Only Dept Head
  { label: "Deliveries",       path: "/deliveries",      section: "Distribution",    roles: ["SUPER_ADMIN","SYSTEM_ADMIN","STORE_OFFICER","DEPARTMENT_HEAD"] },
  { label: "Usage",            path: "/usage",           section: "Distribution",    roles: ["SUPER_ADMIN","SYSTEM_ADMIN","STORE_OFFICER","DEPARTMENT_HEAD","STAFF"] },
  { label: "Workflow",         path: "/workflow",        section: "Distribution",    roles: ["SUPER_ADMIN","SYSTEM_ADMIN","STORE_OFFICER","DEPARTMENT_HEAD","AUDITOR"] },
  // ── Reporting ─────────────────────────────────────────────
  { label: "Reports",          path: "/reports",         section: "Reporting",       roles: ["SUPER_ADMIN","SYSTEM_ADMIN","STORE_OFFICER","DEPARTMENT_HEAD","AUDITOR"] },
  { label: "Audit Logs",       path: "/audit-logs",      section: "Reporting",       roles: ["SUPER_ADMIN","SYSTEM_ADMIN","AUDITOR"] },
  // ── Administration ────────────────────────────────────────
  { label: "Users",            path: "/users",           section: "Administration",  roles: ["SUPER_ADMIN","SYSTEM_ADMIN"] },
  { label: "System Settings",  path: "/system-settings", section: "Administration",  roles: ["SUPER_ADMIN","SYSTEM_ADMIN"] },
  { label: "My Profile",       path: "/settings",        section: "Administration",  roles: ["SUPER_ADMIN","SYSTEM_ADMIN","STORE_OFFICER","DEPARTMENT_HEAD","STAFF","AUDITOR"] },
  { label: "QA & Deployment",  path: "/qa-checklist",    section: "Administration",  roles: ["SUPER_ADMIN","SYSTEM_ADMIN"] },
];

export const ROLE_META = {
  SUPER_ADMIN:     { label: "Super Admin",     color: "#9d174d", bg: "#fdf2f8" },
  SYSTEM_ADMIN:    { label: "System Admin",    color: "#5b21b6", bg: "#f5f3ff" },
  STORE_OFFICER:   { label: "Store Officer",   color: "#1e40af", bg: "#eff6ff" },
  DEPARTMENT_HEAD: { label: "Dept. Head",      color: "#065f46", bg: "#ecfdf5" },
  STAFF:           { label: "Staff",           color: "#075985", bg: "#f0f9ff" },
  AUDITOR:         { label: "Auditor",         color: "#9a3412", bg: "#fff7ed" },
};

export function canAccess(role, path) {
  const allowed = ROUTE_PERMISSIONS[path];
  if (!allowed) return true;
  return allowed.includes(role);
}

export function getNavForRole(role) {
  return NAV_ITEMS.filter(item => item.roles.includes(role));
}

export function getDefaultRoute() {
  return "/dashboard";
}
