import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

export default function Usage() {
  const [staff, setStaff]         = useState([]);
  const [allocated, setAllocated] = useState([]);
  const [logs, setLogs]           = useState([]);
  const [staffId, setStaffId]     = useState("");
  const [cardId, setCardId]       = useState("");
  const [remarks, setRemarks]     = useState("");
  const [loading, setLoading]     = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState(""); const [err, setErr] = useState("");

  const token = localStorage.getItem("mccs_token");
  const h = { Authorization: `Bearer ${token}` };

  const load = async () => {
    setLoading(true);
    try {
      const [sR, cR, uR] = await Promise.all([
        api.get("/staff", { headers: h }),
        api.get("/usage/allocated-cards", { headers: h }),
        api.get("/usage", { headers: h }),
      ]);
      setStaff(sR.data?.staff || []);
      setAllocated(cR.data?.allocated_cards || []);
      setLogs(uR.data?.usage_logs || []);
    } catch (e) { setErr(e.response?.data?.message || "Load failed"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const staffCards = useMemo(() =>
    allocated.filter(c => Number(c.staff_id) === Number(staffId)),
    [allocated, staffId]);

  const submit = async e => {
    e.preventDefault(); setMsg(""); setErr("");
    if (!staffId || !cardId) { setErr("Select staff and card."); return; }
    try {
      setSubmitting(true);
      const r = await api.post("/usage",
        { card_id: Number(cardId), staff_id: Number(staffId), remarks: remarks.trim() || null },
        { headers: h });
      setMsg(" " + (r.data?.message || "Card marked as USED.")); setCardId(""); setRemarks(""); load();
    } catch (e) { setErr(e.response?.data?.message || "Failed"); }
    finally { setSubmitting(false); }
  };

  // Stats
  const totalUsed  = logs.length;
  const totalValue = logs.reduce((s, l) => s + Number(l.value || 0), 0);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-area">
        <Topbar />
        <div className="page-content">
          <div className="page-header">
            <div>
              <div className="page-title">Usage Tracking</div>
              <div className="page-subtitle">Mark cards as used and reconcile distribution</div>
            </div>
            <button className="btn btn-outline btn-sm" onClick={load}>Refresh</button>
          </div>

          {msg && <div className="alert alert-success"><span></span><span>{msg}</span></div>}
          {err && <div className="alert alert-error"><span>!</span><span>{err}</span></div>}

          {/* KPIs */}
          <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
            <div className="kpi-card kpi-blue">
              <div className="kpi-icon-wrap"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg></div>
              <div className="kpi-label">Allocated Cards</div>
              <div className="kpi-value">{allocated.length}</div>
              <div className="kpi-sub">Awaiting use</div>
            </div>
            <div className="kpi-card kpi-green">
              <div className="kpi-icon-wrap"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
              <div className="kpi-label">Cards Used</div>
              <div className="kpi-value">{totalUsed}</div>
            </div>
            <div className="kpi-card kpi-purple">
              <div className="kpi-icon-wrap"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg></div>
              <div className="kpi-label">Value Used</div>
              <div className="kpi-value">${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            </div>
          </div>

          {loading ? (
            <div className="loading-wrap"><div className="spinner" /><span>Loading…</span></div>
          ) : (
            <>
              {/* Mark as Used Form */}
              <div className="panel">
                <div className="panel-header">
                  <div>
                    <div className="panel-title">Mark Card as Used</div>
                    <div className="panel-subtitle">Select a staff member then their allocated card</div>
                  </div>
                </div>
                <div className="panel-body">
                  <form onSubmit={submit}>
                    <div className="form-grid">
                      <div className="form-group">
                        <label className="form-label">Staff Member <span className="required">*</span></label>
                        <select className="form-control" value={staffId}
                          onChange={e => { setStaffId(e.target.value); setCardId(""); }}>
                          <option value="">— Select Staff —</option>
                          {staff.filter(s => Number(s.is_active) === 1).map(s => (
                            <option key={s.id} value={s.id}>{s.full_name} ({s.employee_id})</option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Allocated Card <span className="required">*</span></label>
                        <select className="form-control" value={cardId}
                          onChange={e => setCardId(e.target.value)}
                          disabled={!staffId || staffCards.length === 0}>
                          <option value="">
                            {!staffId ? "Select staff first" : staffCards.length === 0 ? "No allocated cards" : "— Select Card —"}
                          </option>
                          {staffCards.map(c => (
                            <option key={c.card_id} value={c.card_id}>
                              Card #{c.card_id} · {c.provider || "N/A"} {c.type} · ${Number(c.value || 0).toFixed(2)}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Remarks (optional)</label>
                        <input className="form-control" value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="e.g. redeemed for airtime" maxLength={255} />
                      </div>
                    </div>
                    <div className="form-actions">
                      <button type="submit" className="btn btn-primary" disabled={submitting || !staffId || !cardId}>
                        {submitting ? "Processing…" : "Mark as Used"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/*Usage History */}
              <div className="panel">
                <div className="panel-header">
                  <div className="panel-title">Usage History</div>
                  <div className="panel-subtitle">{logs.length} records</div>
                </div>
                {logs.length === 0 ? (
                  <div className="empty-state"><div className="empty-state-icon"></div><p>No usage records</p></div>
                ) : (
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr><th>#</th><th>Card</th><th>Staff</th><th>Provider</th><th>Type</th><th>Value</th><th>Remarks</th><th>Used At</th></tr>
                      </thead>
                      <tbody>
                        {logs.map(l => (
                          <tr key={l.id}>
                            <td className="text-secondary">{l.id}</td>
                            <td><span className="badge badge-gray">#{l.card_id}</span></td>
                            <td><strong>{l.staff_name || "—"}</strong></td>
                            <td>{l.provider || "—"}</td>
                            <td><span className={`badge ${l.type === "AIRTIME" ? "badge-blue" : l.type === "DATA" ? "badge-purple" : "badge-teal"}`}>{l.type}</span></td>
                            <td><strong>${Number(l.value || 0).toFixed(2)}</strong></td>
                            <td className="text-secondary text-sm">{l.remarks || "—"}</td>
                            <td className="text-secondary text-sm">{l.marked_used_at ? new Date(l.marked_used_at).toLocaleString() : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
