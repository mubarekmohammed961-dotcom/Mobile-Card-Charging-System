import { useEffect, useState } from "react";
import api from "../services/api";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

// SRS: Department Heads approve/reject budget allocations (BR-004)
// RBAC: ONLY DEPARTMENT_HEAD can approve/reject. Others can view only.

const fv = v => Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fn = v => Number(v || 0).toLocaleString();

const approvalStatusMeta = {
  PENDING:  { bg: "#fef3c7", color: "#92400e", icon: "...", label: "Pending" },
  APPROVED: { bg: "#dcfce7", color: "#15803d", icon: "", label: "Approved" },
  REJECTED: { bg: "#fee2e2", color: "#b91c1c", icon: "X", label: "Rejected" },
};

export default function Approvals() {
  const [pending,    setPending]    = useState([]);
  const [history,    setHistory]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [actionId,   setActionId]   = useState(null);
  const [showReject, setShowReject] = useState(null);
  const [reason,     setReason]     = useState("");
  const [activeTab,  setTab]        = useState("pending");
  const [msg, setMsg] = useState(""); const [err, setErr] = useState("");

  const user  = (() => { try { return JSON.parse(localStorage.getItem("mccs_user")||"{}"); } catch { return {}; } })();
  const token = localStorage.getItem("mccs_token");
  const h     = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const isDeptHead = user.role === "DEPARTMENT_HEAD";
  const canAct     = user.role === "DEPARTMENT_HEAD"; // BR-004: Only Dept Head can approve/reject

  const load = async () => {
    setLoading(true); setErr("");
    try {
      const [pR, aR] = await Promise.all([
        api.get("/approvals/pending", { headers: h }),
        api.get("/approvals",         { headers: h }),
      ]);
      setPending(pR.data?.approvals || []);
      setHistory(aR.data?.approvals  || []);
    } catch (e) { setErr(e.response?.data?.message || "Failed to load approvals"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const approve = async (id) => {
    setMsg(""); setErr(""); setActionId(id);
    try {
      const r = await api.post(`/approvals/${id}/approve`, {}, { headers: h });
      setMsg(" " + r.data.message); load();
    } catch (e) { setErr(e.response?.data?.message || "Approval failed"); }
    finally { setActionId(null); }
  };

  const reject = async (id) => {
    setMsg(""); setErr(""); setActionId(id);
    try {
      const r = await api.post(`/approvals/${id}/reject`, { reason }, { headers: h });
      setMsg(" " + r.data.message); setShowReject(null); setReason(""); load();
    } catch (e) { setErr(e.response?.data?.message || "Rejection failed"); }
    finally { setActionId(null); }
  };

  const shown = activeTab === "pending" ? pending : history;

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-area">
        <Topbar />
        <div className="page-content">

          {/* Reject modal */}
          {showReject && (
            <div className="modal-overlay" onClick={() => setShowReject(null)}>
              <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
                <div className="modal-header">
                  <div className="modal-title">Reject Distribution #{showReject}</div>
                  <button className="modal-close" onClick={() => setShowReject(null)}>X</button>
                </div>
                <div className="modal-body">
                  <div className="alert alert-warning" style={{ marginBottom: 16 }}>
                    <span>!</span>
                    <span>Cards will be reverted to AVAILABLE status. The initiator will be notified.</span>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Rejection Reason <span className="required">*</span></label>
                    <textarea className="form-control" rows={3} value={reason}
                      onChange={e => setReason(e.target.value)}
                      placeholder="e.g. Exceeds department monthly budget limit for this period" />
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-outline" onClick={() => setShowReject(null)}>Cancel</button>
                  <button className="btn btn-danger" disabled={!reason.trim() || actionId === showReject}
                    onClick={() => reject(showReject)}>
                    {actionId === showReject ? "Rejecting…" : "Confirm Rejection"}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="page-header">
            <div>
              <div className="page-title">Budget Approval</div>
              <div className="page-subtitle">Department Heads approve allocations that exceed department budget ·
                <span style={{ marginLeft: 8, padding: "2px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700,
                  background: isDeptHead ? "#dcfce7" : "#dbeafe", color: isDeptHead ? "#15803d" : "#1d4ed8" }}>
                  {isDeptHead ? "Dept. Head View" : ` ${user.role?.replace(/_/g," ")} View`}
                </span>
              </div>
            </div>
            <button className="btn btn-outline btn-sm" onClick={load}>Refresh</button>
          </div>

          {msg && <div className="alert alert-success"><span></span><span>{msg}</span></div>}
          {err && <div className="alert alert-error"><span>!</span><span>{err}</span></div>}

          {/* KPIs */}
          <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(3,1fr)", marginBottom: 20 }}>
            <div className="kpi-card kpi-orange">
              <div className="kpi-icon-wrap"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
              <div className="kpi-label">Pending Approval</div>
              <div className="kpi-value">{pending.length}</div>
              {pending.length > 0 && <div className="kpi-sub" style={{ color: "#dc2626", fontWeight: 700 }}>Action required!</div>}
            </div>
            <div className="kpi-card kpi-green">
              <div className="kpi-icon-wrap"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
              <div className="kpi-label">Approved</div>
              <div className="kpi-value">{history.filter(a => a.approval_status === "APPROVED").length}</div>
            </div>
            <div className="kpi-card kpi-red">
              <div className="kpi-icon-wrap"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg></div>
              <div className="kpi-label">Rejected</div>
              <div className="kpi-value">{history.filter(a => a.approval_status === "REJECTED").length}</div>
            </div>
          </div>

          {/* BR-004 Info banner */}
          <div style={{ background: "linear-gradient(135deg,#1e3a8a,#2563eb)", borderRadius: 14, padding: "16px 22px", marginBottom: 20, color: "white" }}>
            <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>📋 Budget Approval Rule (BR-004)</div>
            <div style={{ fontSize: 13.5, opacity: .9, lineHeight: 1.6 }}>
              Any distribution whose total value exceeds the department's monthly budget requires approval from the <strong>Department Head</strong> before cards are delivered.
              {isDeptHead && " As Department Head, you can approve or reject distributions for your department below."}
              {!isDeptHead && " You can view approval status but only Department Heads can approve/reject."}
            </div>
          </div>

          {/* Warning for non-dept heads */}
          {!isDeptHead && pending.length > 0 && (
            <div className="alert alert-warning" style={{ marginBottom: 20 }}>
              <span>ℹ️</span>
              <span>
                <strong>View Only:</strong> You are viewing as {user.role?.replace(/_/g," ")}. 
                Only Department Heads can approve or reject budget allocations for their departments.
              </span>
            </div>
          )}

          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, padding: 4, background: "#e2e8f0", borderRadius: 10, marginBottom: 20, width: "fit-content" }}>
            {[
              ["pending", `... Pending (${pending.length})`],
              ["history", ` All History (${history.length})`],
            ].map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)} style={{
                padding: "9px 20px", borderRadius: 7, border: "none",
                background: activeTab === k ? "white" : "transparent",
                color: activeTab === k ? "var(--primary)" : "var(--text-secondary)",
                fontWeight: activeTab === k ? 700 : 500, cursor: "pointer",
                fontSize: 13.5, transition: "all .15s",
                boxShadow: activeTab === k ? "0 1px 4px rgba(0,0,0,.1)" : "none",
              }}>
                {l}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="loading-wrap"><div className="spinner" /><span>Loading approvals…</span></div>
          ) : shown.length === 0 ? (
            <div style={{ background: "white", borderRadius: 16, border: "1px solid #e2e8f0", padding: "48px 24px", textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>{activeTab === "pending" ? "" : ""}</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>
                {activeTab === "pending" ? "No pending approvals" : "No approval history"}
              </div>
              <div style={{ fontSize: 13.5, color: "#64748b" }}>
                {activeTab === "pending" ? "All distributions are within budget." : "No distributions have required approval yet."}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {shown.map(a => {
                const statusMeta = approvalStatusMeta[a.approval_status] || approvalStatusMeta.PENDING;
                const overBudget = Number(a.total_value) > Number(a.budget);
                const overAmount = Number(a.total_value) - Number(a.budget);
                return (
                  <div key={a.id} style={{
                    background: "white", borderRadius: 16, border: "2px solid",
                    borderColor: a.approval_status === "PENDING" ? "#fed7aa" : a.approval_status === "APPROVED" ? "#86efac" : "#fca5a5",
                    boxShadow: "0 2px 8px rgba(0,0,0,.06)", overflow: "hidden",
                  }}>
                    {/* Header */}
                    <div style={{ padding: "16px 22px", background: a.approval_status === "PENDING" ? "#fff7ed" : a.approval_status === "APPROVED" ? "#f0fdf4" : "#fef2f2", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontWeight: 800, fontSize: 16 }}>Distribution #{a.id}</span>
                          <span style={{ background: statusMeta.bg, color: statusMeta.color, fontSize: 12, fontWeight: 700, padding: "3px 10px", borderRadius: 999 }}>
                            {statusMeta.icon} {statusMeta.label}
                          </span>
                        </div>
                        <div style={{ fontSize: 13, color: "#64748b", marginTop: 3 }}>
                          {a.department_name} · {a.month ? new Date(a.month).toLocaleDateString("en-US",{year:"numeric",month:"long"}) : "—"}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: overBudget ? "#dc2626" : "#0f172a" }}>{fv(a.total_value)} ETB</div>
                        <div style={{ fontSize: 12.5, color: "#64748b" }}>Budget: {fv(a.budget)} ETB {overBudget && <span style={{ color: "#dc2626", fontWeight: 700 }}>+{fv(overAmount)} ETB over</span>}</div>
                      </div>
                    </div>

                    {/* Body */}
                    <div style={{ padding: "16px 22px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 16 }}>
                        {[
                          { label: "Cards",        val: fn(a.total_cards)     },
                          { label: "Total Value",  val: `${fv(a.total_value)} ETB`},
                          { label: "Dept Budget",  val: `${fv(a.budget)} ETB`     },
                          { label: "Initiated By", val: a.initiated_by_name || "—" },
                        ].map(s => (
                          <div key={s.label} style={{ background: "#f8fafc", borderRadius: 8, padding: "10px 14px" }}>
                            <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".4px" }}>{s.label}</div>
                            <div style={{ fontSize: 15, fontWeight: 700, marginTop: 3 }}>{s.val}</div>
                          </div>
                        ))}
                      </div>

                      {/* Over-budget warning */}
                      {overBudget && (
                        <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 13.5, color: "#92400e" }}>
                          ! This distribution exceeds the department budget by <strong>{fv(overAmount)} ETB</strong>. Requires your approval per BR-004.
                        </div>
                      )}

                      {/* Rejection reason */}
                      {a.approval_status === "REJECTED" && a.rejection_reason && (
                        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 13.5, color: "#b91c1c" }}>
                          <strong>Rejection Reason:</strong> {a.rejection_reason}
                        </div>
                      )}

                      {/* Approval info */}
                      {a.approval_status !== "PENDING" && a.approved_at && (
                        <div style={{ fontSize: 12.5, color: "#64748b", marginBottom: 12 }}>
                          {a.approval_status === "APPROVED" ? "Approved" : "Rejected"} by <strong>{a.approved_by_name || "—"}</strong> on {new Date(a.approved_at).toLocaleString()}
                        </div>
                      )}

                      {/* Actions — DEPARTMENT_HEAD only for pending */}
                      {canAct && a.approval_status === "PENDING" && (
                        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                          <button className="btn btn-success"
                            onClick={() => approve(a.id)}
                            disabled={actionId === a.id}
                            style={{ flex: 1, padding: "12px" }}>
                            {actionId === a.id ? "Approving…" : "Approve Budget"}
                          </button>
                          <button className="btn btn-danger"
                            onClick={() => { setShowReject(a.id); setReason(""); }}
                            disabled={actionId === a.id}
                            style={{ flex: 1, padding: "12px" }}>
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
