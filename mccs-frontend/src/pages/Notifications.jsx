import { useEffect, useState } from "react";
import api from "../services/api";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

const typeMeta = {
  CARD_READY:    { bg: "#dbeafe", color: "#1d4ed8", label: "Card Ready" },
  REMINDER:      { bg: "#fef3c7", color: "#92400e", label: "Reminder" },
  LOW_INVENTORY: { bg: "#fee2e2", color: "#b91c1c", label: "Low Inventory" },
  DISTRIBUTION:  { bg: "#dcfce7", color: "#15803d", label: "Distribution" },
  SYSTEM:        { bg: "#f5f3ff", color: "#5b21b6", label: "System" },
};

export default function Notifications() {
  const [notifs, setNotifs]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("all"); // all | unread
  const [err, setErr]         = useState("");

  const token = localStorage.getItem("mccs_token");
  const h = { Authorization: `Bearer ${token}` };

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get("/notifications?limit=50", { headers: h });
      setNotifs(r.data?.notifications || []);
    } catch (e) { setErr(e.response?.data?.message || "Failed"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const markRead = async id => {
    try {
      await api.patch(`/notifications/${id}/read`, {}, { headers: h });
      setNotifs(p => p.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    } catch (_) {}
  };

  const markAll = async () => {
    try {
      await api.patch("/notifications/read-all", {}, { headers: h });
      setNotifs(p => p.map(n => ({ ...n, is_read: 1 })));
    } catch (_) {}
  };

  const shown  = filter === "unread" ? notifs.filter(n => !Number(n.is_read)) : notifs;
  const unread = notifs.filter(n => !Number(n.is_read)).length;

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-area">
        <Topbar />
        <div className="page-content">
          <div className="page-header">
            <div>
              <div className="page-title">Notifications</div>
              <div className="page-subtitle">Your alerts, card delivery notices, and system messages</div>
            </div>
            <div className="page-header-actions">
              {unread > 0 && <button className="btn btn-outline btn-sm" onClick={markAll}>Mark all read</button>}
              <button className="btn btn-outline btn-sm" onClick={load}>Refresh</button>
            </div>
          </div>

          {err && <div className="alert alert-error"><span>!</span><span>{err}</span></div>}

          {/* KPIs */}
          <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(3,1fr)", marginBottom: 20 }}>
            <div className="kpi-card kpi-blue">
              <div className="kpi-icon-wrap"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg></div>
              <div className="kpi-label">Total</div>
              <div className="kpi-value">{notifs.length}</div>
            </div>
            <div className="kpi-card kpi-red">
              <div className="kpi-icon-wrap"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
              <div className="kpi-label">Unread</div>
              <div className="kpi-value">{unread}</div>
            </div>
            <div className="kpi-card kpi-green">
              <div className="kpi-icon-wrap"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
              <div className="kpi-label">Read</div>
              <div className="kpi-value">{notifs.length - unread}</div>
            </div>
          </div>

          {/* Filter tabs */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {[["all","All"],["unread","Unread"]].map(([v,l]) => (
              <button key={v} onClick={() => setFilter(v)}
                style={{
                  padding: "7px 20px", borderRadius: 8,
                  border: "1.5px solid", cursor: "pointer", fontWeight: 600, fontSize: 13,
                  borderColor: filter === v ? "var(--primary)" : "var(--border)",
                  background: filter === v ? "var(--primary)" : "white",
                  color: filter === v ? "white" : "var(--text-primary)",
                  transition: "all .15s",
                }}>
                {l} {v === "unread" && unread > 0 && `(${unread})`}
              </button>
            ))}
          </div>

          {/* List */}
          <div style={{ background: "white", borderRadius: 16, border: "1px solid var(--border)", overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
            {loading ? (
              <div className="loading-wrap"><div className="spinner" /><span>Loading…</span></div>
            ) : shown.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon"></div>
                <p>{filter === "unread" ? "No unread notifications" : "No notifications yet"}</p>
              </div>
            ) : (
              shown.map((n, i) => {
                const meta = typeMeta[n.type] || typeMeta.SYSTEM;
                const isUnread = !Number(n.is_read);
                return (
                  <div key={n.id}
                    style={{
                      display: "flex", gap: 16, padding: "16px 22px",
                      borderBottom: i < shown.length - 1 ? "1px solid #f1f5f9" : "none",
                      background: isUnread ? "#f8faff" : "white",
                      alignItems: "flex-start",
                      transition: "background .1s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "#f1f5f9"}
                    onMouseLeave={e => e.currentTarget.style.background = isUnread ? "#f8faff" : "white"}
                  >
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: meta.color }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 3 }}>
                        <span style={{ fontWeight: isUnread ? 700 : 600, fontSize: 14.5 }}>{n.title}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, background: meta.bg, color: meta.color }}>{meta.label}</span>
                        {isUnread && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--primary)", display: "inline-block" }} />}
                      </div>
                      <div style={{ fontSize: 13.5, color: "var(--text-secondary)", lineHeight: 1.5 }}>{n.message}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>
                        {n.created_at ? new Date(n.created_at).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                      </div>
                    </div>
                    {isUnread && (
                      <button className="btn btn-ghost btn-sm" onClick={() => markRead(n.id)} style={{ flexShrink: 0 }}>
                        Mark read
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
