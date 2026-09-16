import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

const actionColors = {
  UPLOAD: "#16a34a", ALLOCATE: "#2563eb", SEND: "#d97706",
  CONFIRM: "#0d9488", USE: "#64748b", EXPIRE: "#dc2626",
  LOGIN: "#7c3aed", LOGOUT: "#475569", DELETE: "#dc2626", UPDATE: "#ea580c",
};

export default function AuditLogs() {
  const [logs, setLogs]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [err, setErr]             = useState("");
  const [actionFilter, setAction] = useState("");
  const [search, setSearch]       = useState("");
  const [expandId, setExpandId]   = useState(null);

  const token = localStorage.getItem("mccs_token");

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get("/audit-logs", { headers: { Authorization: `Bearer ${token}` } });
      setLogs(r.data?.audit_logs || []);
    } catch (e) { setErr(e.response?.data?.message || "Load failed"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter(l => {
      const matchAction = !actionFilter || l.action === actionFilter;
      const matchSearch = !q || [l.user_name, l.email, l.action, String(l.card_id || ""), String(l.details || ""), l.ip]
        .some(v => (v || "").toLowerCase().includes(q));
      return matchAction && matchSearch;
    });
  }, [logs, actionFilter, search]);

  // Stats
  const actionStats = useMemo(() => {
    const counts = {};
    logs.forEach(l => { counts[l.action] = (counts[l.action] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [logs]);

  const parseDetails = d => {
    try { return typeof d === "string" ? JSON.parse(d) : d; }
    catch { return d; }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-area">
        <Topbar />
        <div className="page-content">
          <div className="page-header">
            <div>
              <div className="page-title">Audit Logs</div>
              <div className="page-subtitle">Full forensic audit trail — every action logged with timestamp & IP</div>
            </div>
            <button className="btn btn-outline btn-sm" onClick={load}>Refresh</button>
          </div>

          {err && <div className="alert alert-error"><span>!</span><span>{err}</span></div>}

          {/* Action summary chips */}
          {actionStats.length > 0 && (
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "16px" }}>
              {actionStats.map(([action, count]) => (
                <button
                  key={action}
                  onClick={() => setAction(a => a === action ? "" : action)}
                  style={{
                    padding: "6px 14px", borderRadius: "999px", border: "1.5px solid",
                    borderColor: actionFilter === action ? actionColors[action] : "var(--border)",
                    background: actionFilter === action ? actionColors[action] : "white",
                    color: actionFilter === action ? "white" : actionColors[action] || "#475569",
                    fontWeight: 700, fontSize: "12.5px", cursor: "pointer", transition: "all .15s",
                  }}
                >
                  {action} <span style={{ opacity: .7 }}>({count})</span>
                </button>
              ))}
              {actionFilter && (
                <button onClick={() => setAction("")}
                  style={{ padding: "6px 14px", borderRadius: "999px", border: "1.5px solid var(--border)", background: "var(--bg)", color: "var(--text-secondary)", fontWeight: 600, fontSize: "12.5px", cursor: "pointer" }}>
                  X Clear
                </button>
              )}
            </div>
          )}

          {/* Filters */}
          <div className="panel" style={{ overflow: "visible" }}>
            <div className="filters-bar">
              <div className="filter-item" style={{ maxWidth: "200px" }}>
                <div className="filter-label">Action</div>
                <select className="filter-select" value={actionFilter} onChange={e => setAction(e.target.value)}>
                  <option value="">All Actions</option>
                  {["LOGIN","LOGOUT","UPLOAD","ALLOCATE","SEND","CONFIRM","USE","EXPIRE","UPDATE","DELETE"].map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
              <div className="filter-item">
                <div className="filter-label"> Search</div>
                <input className="filter-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="User, email, action, details, IP…" />
              </div>
              <div className="filter-actions">
                <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(""); setAction(""); }}>Clear</button>
              </div>
            </div>

            <div style={{ padding: "10px 22px", background: "#fafbfc", borderBottom: "1px solid var(--border)", fontSize: "13px", color: "var(--text-secondary)" }}>
              Showing <strong style={{ color: "var(--text-primary)" }}>{filtered.length}</strong> of <strong style={{ color: "var(--text-primary)" }}>{logs.length}</strong> entries
            </div>

            {loading ? (
              <div className="loading-wrap"><div className="spinner" /><span>Loading audit logs…</span></div>
            ) : filtered.length === 0 ? (
              <div className="empty-state"><div className="empty-state-icon"></div><p>No audit logs match your filters</p></div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th><th>User</th><th>Email</th><th>Action</th>
                      <th>Card</th><th>Details</th><th>IP Address</th><th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(l => {
                      const details = parseDetails(l.details);
                      const msg = details?.message || "";
                      const isExpanded = expandId === l.id;
                      return (
                        <tr key={l.id}>
                          <td className="text-secondary">{l.id}</td>
                          <td><strong>{l.user_name || "System"}</strong></td>
                          <td className="text-secondary text-sm">{l.email || "—"}</td>
                          <td>
                            <span className={`badge badge-${(l.action||"").toLowerCase()}`}>
                              {l.action}
                            </span>
                          </td>
                          <td>{l.card_id ? <span className="badge badge-gray">#{l.card_id}</span> : "—"}</td>
                          <td style={{ maxWidth: "260px" }}>
                            {msg && <div style={{ fontSize: "13px", color: "var(--text-secondary)" }}>{msg}</div>}
                            {details && typeof details === "object" && Object.keys(details).length > 1 && (
                              <button
                                onClick={() => setExpandId(isExpanded ? null : l.id)}
                                style={{ marginTop: "4px", background: "none", border: "none", color: "var(--primary)", cursor: "pointer", fontSize: "12px", padding: 0 }}
                              >
                                {isExpanded ? " Less" : " Details"}
                              </button>
                            )}
                            {isExpanded && (
                              <pre style={{ marginTop: "6px", background: "#f8fafc", padding: "8px", borderRadius: "6px", fontSize: "11px", overflowX: "auto", maxWidth: "300px" }}>
                                {JSON.stringify(details, null, 2)}
                              </pre>
                            )}
                          </td>
                          <td className="text-secondary text-sm mono">{l.ip || "—"}</td>
                          <td className="text-secondary text-sm">
                            {l.created_at ? new Date(l.created_at).toLocaleString() : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
