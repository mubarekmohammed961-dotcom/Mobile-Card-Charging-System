import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

function fmtVal(v) { return Number(v || 0).toFixed(2) + ' ETB'; }

export default function Allocations() {
  const [departments, setDepts]   = useState([]);
  const [staff, setStaff]         = useState([]);
  const [allocations, setAllocs]  = useState([]);
  const [deptId, setDeptId]       = useState("");
  const [staffId, setStaffId]     = useState("");
  const [month, setMonth]         = useState("");
  const [preview, setPreview]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [prevLoading, setPrevLoad] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [msg, setMsg] = useState(""); const [err, setErr] = useState("");

  const token = localStorage.getItem("mccs_token");
  const h = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const load = async () => {
    setLoading(true);
    try {
      const [dR, sR, aR] = await Promise.all([
        api.get("/departments", { headers: h }),
        api.get("/staff", { headers: h }),
        api.get("/distributions", { headers: h }),
      ]);
      setDepts(dR.data?.departments || []);
      setStaff(sR.data?.staff || []);
      setAllocs(aR.data?.distributions || []);
    } catch (e) { setErr(e.response?.data?.message || "Load failed"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filteredStaff = useMemo(() =>
    staff.filter(m => deptId && Number(m.department_id) === Number(deptId) && Number(m.is_active) === 1),
    [staff, deptId]);

  const handlePreview = async e => {
    e.preventDefault(); setMsg(""); setErr(""); setPreview(null);
    if (!deptId || !staffId || !month) { setErr("Select department, staff, and month."); return; }
    try {
      setPrevLoad(true);
      const r = await api.post("/distributions/preview", {
        department_id: Number(deptId), staff_id: Number(staffId), month,
      }, { headers: h });
      setPreview(r.data?.preview || null);
    } catch (e) {
      setErr(e.response?.data?.message || "Preview failed");
      if (e.response?.data?.preview) setPreview(e.response.data.preview);
    } finally { setPrevLoad(false); }
  };

  const handleConfirm = async () => {
    if (!preview?.can_confirm) return;
    setMsg(""); setErr("");
    try {
      setConfirming(true);
      const r = await api.post("/distributions", {
        department_id: Number(deptId), staff_id: Number(staffId),
        card_ids: (preview.cards || []).map(c => Number(c.id)), month,
      }, { headers: h });
      setMsg(" " + (r.data?.message || "Distribution confirmed!"));
      setPreview(null); setDeptId(""); setStaffId(""); setMonth("");
      load();
    } catch (e) { setErr(e.response?.data?.message || "Confirm failed"); }
    finally { setConfirming(false); }
  };

  const statusBadge = s => ({
    DRAFT: "badge-gray", CONFIRMED: "badge-blue",
    SENT: "badge-orange", COMPLETED: "badge-green",
  }[s] || "badge-gray");

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-area">
        <Topbar />
        <div className="page-content">
          <div className="page-header">
            <div>
              <div className="page-title">Monthly Distribution</div>
              <div className="page-subtitle">Auto-allocate cards to eligible staff with full preview</div>
            </div>
            <button className="btn btn-outline btn-sm" onClick={load}>Refresh</button>
          </div>

          {msg && <div className="alert alert-success"><span></span><span>{msg}</span></div>}
          {err && <div className="alert alert-error"><span>!</span><span>{err}</span></div>}

          {loading ? (
            <div className="loading-wrap"><div className="spinner" /><span>Loading…</span></div>
          ) : (
            <>
              {/* Distribution Form */}
              <div className="panel">
                <div className="panel-header">
                  <div>
                    <div className="panel-title">Create Monthly Distribution</div>
                    <div className="panel-subtitle">Step 1: Select department → staff → month, then preview</div>
                  </div>
                </div>
                <div className="panel-body">
                  <form onSubmit={handlePreview}>
                    <div className="form-grid">
                      <div className="form-group">
                        <label className="form-label">Department <span className="required">*</span></label>
                        <select className="form-control" value={deptId}
                          onChange={e => { setDeptId(e.target.value); setStaffId(""); setPreview(null); }}
                          disabled={prevLoading || confirming}>
                          <option value="">— Select Department —</option>
                          {departments.filter(d => d.status === "ACTIVE").map(d => (
                            <option key={d.id} value={d.id}>{d.department_name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Staff Member <span className="required">*</span></label>
                        <select className="form-control" value={staffId}
                          onChange={e => { setStaffId(e.target.value); setPreview(null); }}
                          disabled={!deptId || prevLoading || confirming}>
                          <option value="">— Select Staff —</option>
                          {filteredStaff.map(m => (
                            <option key={m.id} value={m.id}>{m.full_name} ({m.employee_id})</option>
                          ))}
                        </select>
                        {deptId && filteredStaff.length === 0 && (
                          <span className="form-hint" style={{ color: "var(--danger)" }}>No active staff in this department</span>
                        )}
                      </div>

                      <div className="form-group">
                        <label className="form-label">Distribution Month <span className="required">*</span></label>
                        <input className="form-control" type="month" value={month.slice(0,7)}
                          onChange={e => { setMonth(e.target.value); setPreview(null); }}
                          disabled={prevLoading || confirming} />
                      </div>
                    </div>

                    <div className="form-actions">
                      <button type="submit" className="btn btn-primary"
                        disabled={prevLoading || confirming || !deptId || !staffId || !month}>
                        {prevLoading ? "Generating Preview…" : "Preview Distribution"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Preview Panel */}
              {preview && (
                <div className="panel" style={{ border: preview.can_confirm ? "2px solid #16a34a" : "2px solid #dc2626" }}>
                  <div className="panel-header" style={{ background: preview.can_confirm ? "#dcfce7" : "#fee2e2" }}>
                    <div>
                      <div className="panel-title">
                        {preview.can_confirm ? " Distribution Preview — Ready to Confirm" : "! Distribution Preview — Cannot Confirm"}
                      </div>
                      <div className="panel-subtitle">
                        {preview.department?.name} · {preview.staff?.full_name} · {preview.month}
                      </div>
                    </div>
                    <span className={`badge ${preview.can_confirm ? "badge-green" : "badge-red"}`} style={{ fontSize: "13px", padding: "6px 14px" }}>
                      {preview.can_confirm ? "READY" : "BLOCKED"}
                    </span>
                  </div>
                  <div className="panel-body">
                    {/* Summary */}
                    <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", padding: "14px 0", marginBottom: "16px", borderBottom: "1px solid var(--border)" }}>
                      {[
                        { label: "Department", val: preview.department?.name },
                        { label: "Staff", val: preview.staff?.full_name },
                        { label: "Month", val: preview.month },
                        { label: "Total Cards", val: preview.total_cards ?? 0 },
                        { label: "Total Value", val: `${fmtVal(preview.total_value)}` },
                      ].map(s => (
                        <div key={s.label} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                          <span style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase" }}>{s.label}</span>
                          <span style={{ fontSize: "16px", fontWeight: 700 }}>{s.val}</span>
                        </div>
                      ))}
                    </div>

                    {/* Exceptions */}
                    {preview.exceptions?.length > 0 && (
                      <div className="alert alert-error" style={{ marginBottom: "16px" }}>
                        <div>
                          <div className="alert-title">! Exceptions</div>
                          <ul style={{ margin: "6px 0 0", paddingLeft: "18px" }}>
                            {preview.exceptions.map((e, i) => <li key={i} style={{ fontSize: "13px" }}>{e}</li>)}
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* Eligibility */}
                    {preview.eligibility?.length > 0 && (
                      <>
                        <div style={{ fontWeight: 700, marginBottom: "10px", fontSize: "14px" }}>Eligibility & Quota</div>
                        <div className="table-container" style={{ marginBottom: "20px" }}>
                          <table className="data-table">
                            <thead><tr><th>Card Type</th><th>Monthly Quota</th><th>Consumed</th><th>Remaining</th></tr></thead>
                            <tbody>
                              {preview.eligibility.map(r => (
                                <tr key={r.id}>
                                  <td><span className="badge badge-blue">{r.card_type}</span></td>
                                  <td><strong>{r.monthly_quota}</strong></td>
                                  <td>{r.consumed}</td>
                                  <td><span className={`badge ${r.remaining > 0 ? "badge-green" : "badge-red"}`}>{r.remaining}</span></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}

                    {/* Cards */}
                    {preview.cards?.length > 0 && (
                      <>
                        <div style={{ fontWeight: 700, marginBottom: "10px", fontSize: "14px" }}>Cards Selected by Engine</div>
                        <div className="table-container" style={{ marginBottom: "20px" }}>
                          <table className="data-table">
                            <thead><tr><th>#</th><th>UUID</th><th>Provider</th><th>Type</th><th>Value</th><th>Expiry</th></tr></thead>
                            <tbody>
                              {preview.cards.map(c => (
                                <tr key={c.id}>
                                  <td className="text-secondary">{c.id}</td>
                                  <td><span className="mono">{c.card_uuid}</span></td>
                                  <td><span className="badge badge-blue">{c.provider}</span></td>
                                  <td><span className="badge badge-purple">{c.type}</span></td>
                                  <td><strong>{fmtVal(c.value)}</strong></td>
                                  <td>{c.expiry_date || "—"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}

                    {/* Actions */}
                    <div style={{ display: "flex", gap: "12px" }}>
                      <button className="btn btn-success btn-lg" onClick={handleConfirm}
                        disabled={confirming || !preview.can_confirm}>
                        {confirming ? "Confirming…" : "Confirm & Allocate"}
                      </button>
                      <button className="btn btn-outline" onClick={() => setPreview(null)} disabled={confirming}>
                        Cancel Preview
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* History */}
              <div className="panel">
                <div className="panel-header">
                  <div className="panel-title">Distribution History</div>
                  <div className="panel-subtitle">{allocations.length} total distributions</div>
                </div>
                {allocations.length === 0 ? (
                  <div className="empty-state"><div className="empty-state-icon"></div><p>No distributions yet</p></div>
                ) : (
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr><th>#</th><th>Month</th><th>Department</th><th>Cards</th><th>Value</th><th>Status</th><th>Created</th></tr>
                      </thead>
                      <tbody>
                        {allocations.map(a => (
                          <tr key={a.id}>
                            <td className="text-secondary">{a.id}</td>
                            <td><strong>{a.month ? new Date(a.month).toLocaleDateString("en-US", { year: "numeric", month: "long" }) : "—"}</strong></td>
                            <td>{a.department_name || "—"}</td>
                            <td><span className="badge badge-blue">{a.total_cards}</span></td>
                            <td><strong>{fmtVal(a.total_value)}</strong></td>
                            <td><span className={`badge ${statusBadge(a.status)}`}>{a.status}</span></td>
                            <td className="text-secondary text-sm">{a.created_at ? new Date(a.created_at).toLocaleString() : "—"}</td>
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
