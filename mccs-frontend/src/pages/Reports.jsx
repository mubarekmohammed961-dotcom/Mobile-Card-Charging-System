import { useEffect, useState } from "react";
import api from "../services/api";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

const fv = v => Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fn = v => Number(v || 0).toLocaleString();

// — roles allowed to export
const EXPORT_ROLES = ["SUPER_ADMIN","SYSTEM_ADMIN","STORE_OFFICER","DEPARTMENT_HEAD","AUDITOR"];
const AUDIT_ROLES  = ["SUPER_ADMIN","SYSTEM_ADMIN","AUDITOR"];

/* ── Export button component ── */
function ExportBtn({ label, url, format, color = "#2563eb", disabled = false }) {
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem("mccs_token");

  const handleExport = async () => {
    setLoading(true);
    try {
      const fullUrl = `${url}?format=${format}&t=${Date.now()}`;
      const res = await fetch(`/api${fullUrl}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const ext  = format === "html" ? "html" : "csv";
      const name = url.split("/").pop() + `_${new Date().toISOString().slice(0,10)}.${ext}`;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      alert("Export failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={loading || disabled}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "8px 16px", borderRadius: 8, border: "none",
        background: disabled ? "#e2e8f0" : color,
        color: disabled ? "#94a3b8" : "white",
        fontWeight: 700, fontSize: 13, cursor: disabled ? "not-allowed" : "pointer",
        transition: "all .15s", boxShadow: disabled ? "none" : "0 1px 4px rgba(0,0,0,.15)",
      }}
    >
      {loading ? "..." : format === "html" ? "" : "Download"} {loading ? "Exporting…" : label}
    </button>
  );
}

/* ── Section wrapper ── */
function ReportSection({ title, subtitle, icon, children, exportUrl, canAuditExport = true, filters }) {
  const user = (() => { try { return JSON.parse(localStorage.getItem("mccs_user") || "{}"); } catch { return {}; } })();
  const role = user.role || "";
  const canExport = EXPORT_ROLES.includes(role);
  const canAudit  = AUDIT_ROLES.includes(role);

  return (
    <div style={{ background:"white", borderRadius:16, border:"1px solid #e2e8f0", overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,.06)", marginBottom:20 }}>
      <div style={{ padding:"16px 24px", borderBottom:"1px solid #e2e8f0", background:"#fafbfc", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12 }}>
        <div>
          <div style={{ fontSize:15, fontWeight:700 }}>{icon} {title}</div>
          <div style={{ fontSize:12.5, color:"#64748b", marginTop:2 }}>{subtitle}</div>
        </div>
        {exportUrl && (canExport && canAuditExport) && (
          <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
            {filters}
            <ExportBtn label="CSV"  url={exportUrl} format="csv"  color="#16a34a" />
            <ExportBtn label="HTML/Print" url={exportUrl} format="html" color="#2563eb" />
          </div>
        )}
        {exportUrl && !canExport && (
          <span style={{ fontSize:12, color:"#94a3b8", fontStyle:"italic" }}>Export not available for your role</span>
        )}
      </div>
      <div style={{ padding:"0 24px 20px" }}>{children}</div>
    </div>
  );
}

export default function Reports() {
  const [report, setReport]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr]         = useState("");
  const [deptFilter, setDeptFilter] = useState("");

  const user = (() => { try { return JSON.parse(localStorage.getItem("mccs_user") || "{}"); } catch { return {}; } })();
  const role = user.role || "";
  const canExport   = EXPORT_ROLES.includes(role);
  const canAuditExp = AUDIT_ROLES.includes(role);

  const token = localStorage.getItem("mccs_token");
  const load = async () => {
    setLoading(true); setErr("");
    try {
      const r = await api.get("/reports/summary", { headers: { Authorization: `Bearer ${token}` } });
      setReport(r.data);
    } catch (e) { setErr(e.response?.data?.message || "Failed to load reports"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  if (loading) return (
    <div className="app-layout"><Sidebar /><div className="main-area"><Topbar />
      <div className="page-content"><div className="loading-wrap"><div className="spinner" /><span>Loading reports…</span></div></div>
    </div></div>
  );

  const { inventory={}, allocations={}, deliveries={}, usage={}, departments=[], staff_usage=[], audit_actions=[], recent_distributions=[], recent_deliveries=[] } = report || {};
  const totalDel = (deliveries.confirmed||0) + (deliveries.pending||0) + (deliveries.sent||0) + (deliveries.expired||0);
  const confRate = totalDel > 0 ? Math.round(((deliveries.confirmed||0) / totalDel) * 100) : 0;

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-area">
        <Topbar />
        <div className="page-content">
          <div className="page-header">
            <div>
              <div className="page-title">Reports & Analytics</div>
              <div className="page-subtitle">
                Export CSV or HTML/Print for all report types ·
                <span style={{ marginLeft:8, padding:"2px 10px", borderRadius:999, fontSize:12, fontWeight:700,
                  background: canExport ? "#dcfce7" : "#fee2e2", color: canExport ? "#15803d" : "#b91c1c" }}>
                  {canExport ? `Export enabled (${role})` : `Export restricted (${role})`}
                </span>
              </div>
            </div>
            <button className="btn btn-outline btn-sm" onClick={load}>Refresh</button>
          </div>

          {err && <div className="alert alert-error"><span>!</span><span>{err}</span></div>}

          {/* ── KPI Overview ── */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:20 }}>
            {[
              { icon:"", label:"Total Cards",       val: fn(inventory.total_cards),    sub:`${fv(inventory.total_value)} ETB`,   color:"#2563eb", bg:"#eff6ff" },
              { icon:"", label:"Distributions",     val: fn(allocations.total_distributions), sub:`${fn(allocations.total_cards)} cards`, color:"#0d9488", bg:"#f0fdfa" },
              { icon:"", label:"Confirmation Rate", val: `${confRate}%`,               sub:`${fn(deliveries.confirmed)} confirmed`, color:"#16a34a", bg:"#dcfce7" },
              { icon:"", label:"Cards Used",        val: fn(usage.total_used_cards),   sub:`${fv(usage.used_value)} ETB value`,  color:"#7c3aed", bg:"#f5f3ff" },
            ].map(k => (
              <div key={k.label} style={{ background:"white", borderRadius:14, padding:"18px 20px", border:"1px solid #e2e8f0", borderTop:`3px solid ${k.color}`, boxShadow:"0 1px 4px rgba(0,0,0,.05)" }}>
                <div style={{ width:40, height:40, borderRadius:10, background:k.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, marginBottom:12 }}>{k.icon}</div>
                <div style={{ fontSize:12, fontWeight:700, color:"#64748b", textTransform:"uppercase", letterSpacing:".5px" }}>{k.label}</div>
                <div style={{ fontSize:28, fontWeight:800, color:"#0f172a", lineHeight:1, marginTop:2 }}>{k.val}</div>
                <div style={{ fontSize:12, color:"#94a3b8", marginTop:4 }}>{k.sub}</div>
              </div>
            ))}
          </div>

          {/* ── 1. Inventory Report ── */}
          <ReportSection title="Inventory Valuation Report" subtitle="Total value by provider, type, expiry status" icon="" exportUrl="/reports/export/inventory">
            <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12, paddingTop:16 }}>
              {[
                { label:"Total Cards",  val:fn(inventory.total_cards),    color:"#2563eb" },
                { label:"Total Value",  val:`${fv(inventory.total_value)} ETB`, color:"#0f172a" },
                { label:"Available",    val:fn(inventory.available_cards), color:"#16a34a" },
                { label:"Allocated",    val:fn(inventory.allocated_cards), color:"#d97706" },
                { label:"Used",         val:fn(inventory.used_cards),      color:"#7c3aed" },
              ].map(s => (
                <div key={s.label} style={{ padding:"14px 16px", borderRadius:10, background:"#f8fafc", border:"1px solid #e2e8f0", textAlign:"center" }}>
                  <div style={{ fontSize:11, color:"#64748b", fontWeight:700, textTransform:"uppercase", marginBottom:6 }}>{s.label}</div>
                  <div style={{ fontSize:20, fontWeight:800, color:s.color }}>{s.val}</div>
                </div>
              ))}
            </div>
          </ReportSection>

          {/* ── 2. Department Report ── */}
          <ReportSection title="Department Distribution Summary" subtitle="Cards issued, confirmed, pending per department" icon="" exportUrl="/reports/export/department">
            {departments.length === 0 ? (
              <div className="empty-state" style={{ paddingTop:16 }}><div className="empty-state-icon"></div><p>No department data</p></div>
            ) : (
              <div className="table-container" style={{ paddingTop:8 }}>
                <table className="data-table">
                  <thead><tr><th>Department</th><th>Code</th><th>Status</th><th>Cards Allocated</th><th>Value Allocated</th></tr></thead>
                  <tbody>
                    {departments.map(d => (
                      <tr key={d.id}>
                        <td><strong>{d.department_name}</strong></td>
                        <td><span className="badge badge-blue">{d.department_code}</span></td>
                        <td><span className={`badge ${d.status==="ACTIVE"?"badge-active":"badge-inactive"}`}>{d.status}</span></td>
                        <td><span className="badge badge-blue">{fn(d.allocated_cards)}</span></td>
                        <td><strong>{fv(d.allocated_value)} ETB</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ReportSection>

          {/* ── 3. Staff Utilization ── */}
          <ReportSection title="Staff Utilization Report" subtitle="Cards received vs used per staff member" icon="" exportUrl="/reports/export/staff">
            {staff_usage.length === 0 ? (
              <div className="empty-state" style={{ paddingTop:16 }}><div className="empty-state-icon"></div><p>No data</p></div>
            ) : (
              <div className="table-container" style={{ paddingTop:8 }}>
                <table className="data-table">
                  <thead><tr><th>Employee ID</th><th>Staff Name</th><th>Cards Used</th><th>Value Used</th><th>Usage Bar</th></tr></thead>
                  <tbody>
                    {staff_usage.map(s => {
                      const maxUsed = Math.max(...staff_usage.map(x => Number(x.used_cards||0)), 1);
                      const pct = Math.round((Number(s.used_cards||0)/maxUsed)*100);
                      return (
                        <tr key={s.staff_id}>
                          <td><span className="badge badge-blue">{s.employee_id}</span></td>
                          <td><strong>{s.full_name}</strong></td>
                          <td><span className={`badge ${Number(s.used_cards)>0?"badge-green":"badge-gray"}`}>{fn(s.used_cards)}</span></td>
                          <td><strong>{fv(s.used_value)} ETB</strong></td>
                          <td style={{ minWidth:120 }}>
                            <div style={{ height:6, background:"#e2e8f0", borderRadius:999, overflow:"hidden" }}>
                              <div style={{ height:"100%", width:`${pct}%`, background:"#2563eb", borderRadius:999 }} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </ReportSection>

          {/* ── 4. Monthly Distribution ── */}
          <ReportSection title="Monthly Distribution Report" subtitle="All distributions with status, value, department" icon="" exportUrl="/reports/export/distribution">
            {recent_distributions.length === 0 ? (
              <div className="empty-state" style={{ paddingTop:16 }}><div className="empty-state-icon"></div><p>No distributions</p></div>
            ) : (
              <div className="table-container" style={{ paddingTop:8 }}>
                <table className="data-table">
                  <thead><tr><th>#</th><th>Department</th><th>Month</th><th>Cards</th><th>Value</th><th>Status</th><th>Date</th></tr></thead>
                  <tbody>
                    {recent_distributions.map(d => (
                      <tr key={d.id}>
                        <td className="text-secondary">{d.id}</td>
                        <td><strong>{d.department_name||"—"}</strong></td>
                        <td>{d.month ? new Date(d.month).toLocaleDateString("en-US",{year:"numeric",month:"short"}) : "—"}</td>
                        <td><span className="badge badge-blue">{d.total_cards}</span></td>
                        <td><strong>{fv(d.total_value)} ETB</strong></td>
                        <td><span className={`badge ${d.status==="CONFIRMED"?"badge-blue":"badge-green"}`}>{d.status}</span></td>
                        <td className="text-secondary text-sm">{d.created_at ? new Date(d.created_at).toLocaleDateString() : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ReportSection>

          {/* ── 5. Delivery Summary ── */}
          <ReportSection title="Delivery Summary" subtitle="Delivery pipeline — pending, sent, confirmed, expired" icon="">
            <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12, paddingTop:16 }}>
              {[
                { label:"Pending",   val:deliveries.pending,   color:"#d97706", bg:"#fef3c7" },
                { label:"Sent",      val:deliveries.sent,      color:"#2563eb", bg:"#dbeafe" },
                { label:"Delivered", val:deliveries.delivered, color:"#7c3aed", bg:"#ede9fe" },
                { label:"Confirmed", val:deliveries.confirmed, color:"#16a34a", bg:"#dcfce7" },
                { label:"Expired",   val:deliveries.expired,   color:"#dc2626", bg:"#fee2e2" },
              ].map(s => (
                <div key={s.label} style={{ padding:"14px 16px", borderRadius:10, background:s.bg, textAlign:"center" }}>
                  <div style={{ fontSize:11, color:s.color, fontWeight:700, textTransform:"uppercase", marginBottom:6 }}>{s.label}</div>
                  <div style={{ fontSize:22, fontWeight:800, color:s.color }}>{fn(s.val)}</div>
                </div>
              ))}
            </div>
          </ReportSection>

          {/* ── 6. Audit Report ── */}
          <ReportSection
            title="Audit Trail Report"
            subtitle="Full distribution log with timestamps and user actions"
            icon=""
            exportUrl="/reports/export/audit"
            canAuditExport={canAuditExp}
          >
            {!canAuditExp ? (
              <div className="alert alert-warning" style={{ marginTop:16 }}>
                <span></span>
                <span>Full audit export is restricted to <strong>Super Admin</strong>, <strong>System Admin</strong>, and <strong>Auditor</strong> roles only (Section 5 RBAC).</span>
              </div>
            ) : audit_actions.length === 0 ? (
              <div className="empty-state" style={{ paddingTop:16 }}><div className="empty-state-icon"></div><p>No audit data</p></div>
            ) : (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))", gap:12, paddingTop:16 }}>
                {audit_actions.map(a => (
                  <div key={a.action} style={{ padding:"14px 16px", borderRadius:10, background:"#f8fafc", border:"1px solid #e2e8f0", textAlign:"center" }}>
                    <span className={`badge badge-${(a.action||"").toLowerCase()}`}>{a.action}</span>
                    <div style={{ fontSize:24, fontWeight:800, marginTop:8 }}>{fn(a.total)}</div>
                  </div>
                ))}
              </div>
            )}
          </ReportSection>

          {/* ── Role Access Info ── */}
          <div style={{ background:"white", borderRadius:16, border:"1px solid #e2e8f0", padding:"20px 24px", boxShadow:"0 1px 4px rgba(0,0,0,.06)" }}>
            <div style={{ fontSize:15, fontWeight:700, marginBottom:12 }}> Export Access by Role</div>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Role</th>
                    <th>Inventory</th>
                    <th>Distribution</th>
                    <th>Staff History</th>
                    <th>Department</th>
                    <th>Audit Trail</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { role:" Super Admin",     inv:true, dist:true, staff:true, dept:true, audit:true  },
                    { role:" System Admin",    inv:true, dist:true, staff:true, dept:true, audit:true  },
                    { role:" Store Officer",   inv:true, dist:true, staff:true, dept:true, audit:false },
                    { role:" Dept. Head",      inv:true, dist:true, staff:true, dept:true, audit:false },
                    { role:" Auditor",         inv:true, dist:true, staff:true, dept:true, audit:true  },
                    { role:" Staff",           inv:false,dist:false,staff:false,dept:false,audit:false },
                  ].map(r => (
                    <tr key={r.role} style={{ fontWeight: r.role.includes(role.split("_").join(" ").toLowerCase()) ? 700 : 400 }}>
                      <td>{r.role}</td>
                      {[r.inv,r.dist,r.staff,r.dept,r.audit].map((v,i) => (
                        <td key={i} style={{ textAlign:"center" }}>
                          {v ? <span style={{ color:"#16a34a", fontSize:16 }}></span> : <span style={{ color:"#d1d5db", fontSize:14 }}>—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
