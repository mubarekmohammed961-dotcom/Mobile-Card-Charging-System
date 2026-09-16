import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";

const pageTitles = {
  "/dashboard":       { title: "Dashboard",            sub: "System overview & KPIs" },
  "/inventory":       { title: "Card Inventory",        sub: "Manage mobile card stock" },
  "/departments":     { title: "Departments",           sub: "Manage department records" },
  "/staff":           { title: "Staff Management",      sub: "Staff profiles & assignments" },
  "/eligibility":     { title: "Eligibility Rules",     sub: "Monthly card quotas per staff" },
  "/allocations":     { title: "Monthly Distribution",  sub: "Preview & confirm card allocations" },
  "/deliveries":      { title: "Deliveries",            sub: "Card PIN delivery tracking" },
  "/usage":           { title: "Usage Tracking",        sub: "Mark cards as used & reconcile" },
  "/audit-logs":      { title: "Audit Logs",            sub: "Full forensic action trail" },
  "/reports":         { title: "Reports & Analytics",   sub: "Distribution & inventory reports" },
  "/users":           { title: "User Management",       sub: "RBAC — manage users, roles & permissions" },
  "/settings":        { title: "Admin Settings",        sub: "Profile, password & system configuration" },
  "/system-settings": { title: "System Settings",       sub: "SMTP, inventory, delivery, cron & security" },
  "/notifications":   { title: "Notifications",         sub: "Your alerts and system messages" },
  "/staff-dashboard": { title: "My Cards",               sub: "Your allocations, PIN cards and history" },
  "/workflow":        { title: "Distribution Workflow",   sub: "End-to-end card distribution lifecycle and system modules" },
  "/approvals":       { title: "Budget Approval",         sub: "Dept Head approves over-budget distributions (BR-004)" },
};

const typeColor = {
  CARD_READY:    { bg: "#dbeafe", color: "#1d4ed8" },
  REMINDER:      { bg: "#fef3c7", color: "#92400e" },
  LOW_INVENTORY: { bg: "#fee2e2", color: "#b91c1c" },
  DISTRIBUTION:  { bg: "#dcfce7", color: "#15803d" },
  SYSTEM:        { bg: "#f5f3ff", color: "#5b21b6" },
};

export default function Topbar() {
  const { pathname } = useLocation();
  const navigate     = useNavigate();
  const info = pageTitles[pathname] || { title: "MCCS", sub: "Mobile Card Charging System" };

  const user = (() => {
    try { return JSON.parse(localStorage.getItem("mccs_user") || "{}"); }
    catch { return {}; }
  })();

  const name     = user.full_name || "Administrator";
  const role     = user.role || "SUPER_ADMIN";
  const initials = name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  const roleLabel = { SUPER_ADMIN:"Super Admin", SYSTEM_ADMIN:"System Admin", STORE_OFFICER:"Store Officer", DEPARTMENT_HEAD:"Dept. Head", STAFF:"Staff", AUDITOR:"Auditor" }[role] || role;

  const [notifs, setNotifs]     = useState([]);
  const [unread, setUnread]     = useState(0);
  const [open, setOpen]         = useState(false);
  const [loading, setLoading]   = useState(false);
  const bellRef = useRef(null);

  const token = localStorage.getItem("mccs_token");
  const h = { Authorization: `Bearer ${token}` };

  const loadNotifs = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const r = await api.get("/notifications?limit=10", { headers: h });
      setNotifs(r.data?.notifications || []);
      setUnread(r.data?.unread_count || 0);
    } catch (_) {}
    finally { setLoading(false); }
  };

  useEffect(() => {
    loadNotifs();
    const t = setInterval(loadNotifs, 30000); // poll every 30s
    return () => clearInterval(t);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = e => { if (bellRef.current && !bellRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const markRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`, {}, { headers: h });
      setNotifs(p => p.map(n => n.id === id ? { ...n, is_read: 1 } : n));
      setUnread(p => Math.max(0, p - 1));
    } catch (_) {}
  };

  const markAllRead = async () => {
    try {
      await api.patch("/notifications/read-all", {}, { headers: h });
      setNotifs(p => p.map(n => ({ ...n, is_read: 1 })));
      setUnread(0);
    } catch (_) {}
  };

  return (
    <header className="topbar">
      <div>
        <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-primary)" }}>{info.title}</div>
        <div style={{ fontSize: "12.5px", color: "var(--text-secondary)", marginTop: "1px" }}>{info.sub}</div>
      </div>

      <div className="topbar-right">
        {/* ── Notification Bell ── */}
        <div ref={bellRef} style={{ position: "relative" }}>
          <button
            className="topbar-icon-btn"
            title="Notifications"
            onClick={() => { setOpen(p => !p); if (!open) loadNotifs(); }}
            style={{ position: "relative", fontSize: "18px" }}
          >
            {/* SVG Bell Icon */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {unread > 0 && (
              <span style={{
                position: "absolute", top: -4, right: -4,
                background: "#ef4444", color: "white",
                fontSize: "10px", fontWeight: 800,
                width: 18, height: 18, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                border: "2px solid white", minWidth: 18,
              }}>
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>

          {/* Dropdown */}
          {open && (
            <div style={{
              position: "absolute", top: "calc(100% + 8px)", right: 0,
              width: 360, background: "white", borderRadius: 14,
              boxShadow: "0 12px 40px rgba(0,0,0,.15)",
              border: "1px solid var(--border)", zIndex: 999,
              overflow: "hidden",
            }}>
              {/* Header */}
              <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fafbfc" }}>
                <div style={{ fontWeight: 700, fontSize: "15px" }}>
                 Notifications {unread > 0 && <span style={{ background: "#ef4444", color: "white", fontSize: "11px", padding: "1px 7px", borderRadius: 999, marginLeft: 6 }}>{unread}</span>}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {unread > 0 && (
                    <button onClick={markAllRead} style={{ fontSize: "12px", color: "var(--primary)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
                     Mark all read
                    </button>
                  )}
                  <button onClick={() => { setOpen(false); navigate("/notifications"); }} style={{ fontSize: "12px", color: "var(--primary)", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
                    View all 
                  </button>
                </div>
              </div>

              {/* List */}
              <div style={{ maxHeight: 360, overflowY: "auto" }}>
                {loading && notifs.length === 0 ? (
                  <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>Loading…</div>
                ) : notifs.length === 0 ? (
                  <div style={{ padding: 32, textAlign: "center" }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin:"0 auto 8px" }}>
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                    </svg>
                    <div style={{ color: "var(--text-muted)", fontSize: 13 }}>No notifications yet</div>
                  </div>
                ) : (
                  notifs.map(n => {
                    const meta = typeColor[n.type] || typeColor.SYSTEM;
                    return (
                      <div key={n.id}
                        onClick={() => { markRead(n.id); if (n.link) navigate(n.link); setOpen(false); }}
                        style={{
                          padding: "12px 18px", borderBottom: "1px solid #f1f5f9", cursor: "pointer",
                          background: Number(n.is_read) === 0 ? "#f8faff" : "white",
                          display: "flex", gap: 12, alignItems: "flex-start",
                          transition: "background .1s",
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = "#f1f5f9"}
                        onMouseLeave={e => e.currentTarget.style.background = Number(n.is_read) === 0 ? "#f8faff" : "white"}
                      >
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: meta.color }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: Number(n.is_read) === 0 ? 700 : 500, fontSize: 13.5, color: "var(--text-primary)", marginBottom: 2 }}>{n.title}</div>
                          <div style={{ fontSize: 12, color: "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{n.message}</div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                            {n.created_at ? new Date(n.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                          </div>
                        </div>
                        {Number(n.is_read) === 0 && (
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--primary)", marginTop: 6, flexShrink: 0 }} />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── User chip ── */}
        <div className="topbar-user">
          <div className="topbar-avatar">{initials}</div>
          <div className="topbar-user-info">
            <strong>{name}</strong>
            <span>{roleLabel}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
