import { useEffect, useState } from "react";
import api from "../services/api";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

const statusBadge = s => ({
  PENDING: "badge-pending", SENT: "badge-sent",
  DELIVERED: "badge-delivered", CONFIRMED: "badge-confirmed",
  EXPIRED: "badge-expired",
}[s] || "badge-gray");

export default function Deliveries() {
  const [deliveries, setDeliveries]   = useState([]);
  const [distItems, setDistItems]     = useState([]);
  const [itemId, setItemId]           = useState("");
  const [method, setMethod]           = useState("EMAIL");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading]         = useState(true);
  const [creating, setCreating]       = useState(false);
  const [sendingId, setSendingId]     = useState(null);
  const [msg, setMsg] = useState(""); const [err, setErr] = useState("");

  const token = localStorage.getItem("mccs_token");
  const h = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const load = async () => {
    setLoading(true);
    try {
      const [dR, iR] = await Promise.all([
        api.get("/deliveries", { headers: h }),
        api.get("/distributions/items", { headers: h }),
      ]);
      setDeliveries(dR.data?.deliveries || []);
      setDistItems(iR.data?.items || []);
    } catch (e) { setErr(e.response?.data?.message || "Load failed"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async e => {
    e.preventDefault(); setMsg(""); setErr("");
    if (!itemId) { setErr("Select a distribution item."); return; }
    try {
      setCreating(true);
      const r = await api.post("/deliveries", { distribution_item_id: Number(itemId), delivery_method: method }, { headers: h });
      setMsg(" " + (r.data?.message || "Delivery created.")); setItemId(""); load();
    } catch (e) { setErr(e.response?.data?.message || "Create failed"); }
    finally { setCreating(false); }
  };

  const handleSend = async id => {
    setMsg(""); setErr(""); setSendingId(id);
    try {
      const r = await api.post(`/deliveries/${id}/send`, {}, { headers: h });
      setMsg(" " + (r.data?.message || "Delivery sent.")); load();
    } catch (e) { setErr(e.response?.data?.message || "Send failed"); }
    finally { setSendingId(null); }
  };

  const handleResend = async id => {
    setMsg(""); setErr(""); setSendingId(id);
    try {
      const r = await api.post(`/deliveries/${id}/resend`, {}, { headers: h });
      setMsg(" " + (r.data?.message || "Delivery resent with new token.")); load();
    } catch (e) { setErr(e.response?.data?.message || "Resend failed"); }
    finally { setSendingId(null); }
  };

  // Stats
  const stats = ["PENDING","SENT","DELIVERED","CONFIRMED","EXPIRED"].map(s => ({
    label: s, count: deliveries.filter(d => d.status === s).length,
  }));
  const kpiColors = { PENDING: "kpi-orange", SENT: "kpi-blue", DELIVERED: "kpi-purple", CONFIRMED: "kpi-green", EXPIRED: "kpi-red" };

  // Items ready for delivery — backend already filters out active ones
  const allocatedItems = distItems;

  const filtered = deliveries.filter(d => !statusFilter || d.status === statusFilter);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-area">
        <Topbar />
        <div className="page-content">
          <div className="page-header">
            <div>
              <div className="page-title">Deliveries</div>
              <div className="page-subtitle">Secure PIN delivery via Email/SMS with confirmation tracking</div>
            </div>
            <button className="btn btn-outline btn-sm" onClick={load}>Refresh</button>
          </div>

          {msg && <div className="alert alert-success"><span></span><span>{msg}</span></div>}
          {err && <div className="alert alert-error"><span>!</span><span>{err}</span></div>}

          {/* KPIs */}
          <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(5,1fr)" }}>
            {stats.map(s => {
              const kpiIconMap = {
                PENDING:   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
                SENT:      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
                DELIVERED: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>,
                CONFIRMED: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
                EXPIRED:   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>,
              };
              return (
                <div key={s.label} className={`kpi-card ${kpiColors[s.label]}`}>
                  <div className="kpi-icon-wrap">{kpiIconMap[s.label]}</div>
                  <div className="kpi-label">{s.label}</div>
                  <div className="kpi-value">{s.count}</div>
                </div>
              );
            })}
          </div>

          {/* Create Delivery */}
          <div className="panel">
            <div className="panel-header">
              <div>
                <div className="panel-title">Create Delivery</div>
                <div className="panel-subtitle">Only items without an active delivery are shown below</div>
              </div>
              <span style={{ fontSize: 12.5, fontWeight: 700, padding: "4px 12px", borderRadius: 999,
                background: allocatedItems.length > 0 ? "#dcfce7" : "#f1f5f9",
                color: allocatedItems.length > 0 ? "#15803d" : "#94a3b8" }}>
                {allocatedItems.length} item{allocatedItems.length !== 1 ? "s" : ""} ready
              </span>
            </div>
            <div className="panel-body">
              {allocatedItems.length === 0 ? (
                <div style={{ display: "flex", gap: 14, alignItems: "flex-start", background: "#f0fdf4", borderRadius: 10, padding: "16px 20px", border: "1px solid #bbf7d0" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }}><polyline points="20 6 9 17 4 12"/></svg>
                  <div>
                    <div style={{ fontWeight: 700, color: "#15803d", marginBottom: 4 }}>All allocated items already have active deliveries</div>
                    <div style={{ fontSize: 13, color: "#166534" }}>
                      Every card is either PENDING, SENT, or DELIVERED.
                      Use the <strong>Resend</strong> button in the table below to re-send any expired or failed delivery.
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleCreate}>
                  <div className="form-grid form-grid-2">
                    <div className="form-group">
                      <label className="form-label">Distribution Item <span className="required">*</span></label>
                      <select className="form-control" value={itemId} onChange={e => setItemId(e.target.value)}>
                        <option value="">— Select Allocated Item —</option>
                        {allocatedItems.map(i => (
                          <option key={i.distribution_item_id} value={i.distribution_item_id}>
                            #{i.distribution_item_id} · {i.full_name} · {i.provider} {i.type} · ${Number(i.value || 0).toFixed(2)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Delivery Method</label>
                      <select className="form-control" value={method} onChange={e => setMethod(e.target.value)}>
                        <option value="EMAIL">Email</option>
                        <option value="SMS">SMS</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-actions">
                    <button type="submit" className="btn btn-primary" disabled={creating || !itemId}>
                      {creating ? "Creating…" : "Create Delivery"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="panel">
            <div className="filters-bar">
              <div className="filter-item">
                <div className="filter-label">Status</div>
                <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                  <option value="">All Statuses</option>
                  {["PENDING","SENT","DELIVERED","CONFIRMED","EXPIRED"].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="filter-actions">
                <button className="btn btn-ghost btn-sm" onClick={() => setStatusFilter("")}>Clear</button>
              </div>
            </div>

            {loading ? (
              <div className="loading-wrap"><div className="spinner" /><span>Loading…</span></div>
            ) : filtered.length === 0 ? (
              <div className="empty-state"><div className="empty-state-icon"></div><p>No deliveries found</p></div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th><th>Item #</th><th>Staff</th><th>Email</th><th>Card</th>
                      <th>Method</th><th>Status</th><th>Sent At</th><th>Expires</th><th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(d => (
                      <tr key={d.id}>
                        <td className="text-secondary">{d.id}</td>
                        <td>{d.distribution_item_id}</td>
                        <td><strong>{d.staff_name || "—"}</strong></td>
                        <td className="text-secondary text-sm">{d.email || "—"}</td>
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                            <span className="badge badge-blue">{d.provider}</span>
                            <span className="text-secondary text-sm">${Number(d.value || 0).toFixed(2)}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${d.delivery_method === "EMAIL" ? "badge-blue" : "badge-teal"}`}>
                            {d.delivery_method === "EMAIL" ? "" : ""} {d.delivery_method}
                          </span>
                        </td>
                        <td><span className={`badge ${statusBadge(d.status)}`}>{d.status}</span></td>
                        <td className="text-secondary text-sm">{d.sent_at ? new Date(d.sent_at).toLocaleString() : "—"}</td>
                        <td className="text-secondary text-sm" style={{ color: d.token_expiry && new Date(d.token_expiry) < new Date() ? "var(--danger)" : "inherit" }}>
                          {d.token_expiry ? new Date(d.token_expiry).toLocaleDateString() : "—"}
                        </td>
                        <td>
                          {d.status === "PENDING" ? (
                            <button className="btn btn-success btn-sm" onClick={() => handleSend(d.id)} disabled={sendingId === d.id}>
                              {sendingId === d.id ? "…" : "Send"}
                            </button>
                          ) : ["SENT","EXPIRED"].includes(d.status) ? (
                            <button className="btn btn-outline btn-sm" onClick={() => handleResend(d.id)} disabled={sendingId === d.id}>
                              {sendingId === d.id ? "…" : " Resend"}
                            </button>
                          ) : "—"}
                        </td>
                      </tr>
                    ))}
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
