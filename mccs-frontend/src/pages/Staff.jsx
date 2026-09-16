import { useEffect, useRef, useState } from "react";
import api from "../services/api";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

const empty = { employee_id:"", full_name:"", department_id:"", designation:"", email:"", phone:"", is_active:1 };

export default function Staff() {
  const [staff,    setStaff]   = useState([]);
  const [depts,    setDepts]   = useState([]);
  const [eligMap,  setEligMap] = useState({}); // staffId -> [{card_type, monthly_quota}]
  const [form,     setForm]    = useState(empty);
  const [editId,   setEditId]  = useState(null);
  const [search,   setSearch]  = useState("");
  const [deptF,    setDeptF]   = useState("");
  const [loading,  setLoading] = useState(true);
  const [saving,   setSaving]  = useState(false);
  const [bulkUp,   setBulkUp]  = useState(false);
  const [msg,setMsg] = useState(""); const [err,setErr] = useState("");
  const bulkRef = useRef(null);

  const token = localStorage.getItem("mccs_token");
  const h = { Authorization:`Bearer ${token}` };

  const load = async () => {
    setLoading(true);
    try {
      const [sR, dR, eR] = await Promise.all([
        api.get("/staff",       { headers:h }),
        api.get("/departments", { headers:h }),
        api.get("/eligibility", { headers:h }),
      ]);
      setStaff(sR.data?.staff || []);
      setDepts(dR.data?.departments || []);
      // Build eligibility map keyed by staff_id
      const map = {};
      for (const r of (eR.data?.eligibility || [])) {
        if (!map[r.staff_id]) map[r.staff_id] = [];
        map[r.staff_id].push(r);
      }
      setEligMap(map);
    } catch (e) { setErr(e.response?.data?.message || "Load failed"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const change = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  const reset  = () => { setForm(empty); setEditId(null); setMsg(""); setErr(""); };

  const submit = async e => {
    e.preventDefault(); setMsg(""); setErr("");
    if (!form.employee_id.trim() || !form.full_name.trim() || !form.department_id || !form.email.trim()) {
      setErr("Employee ID, full name, department and email are required."); return;
    }
    try {
      setSaving(true);
      const payload = { ...form, department_id:Number(form.department_id), is_active:Number(form.is_active) };
      const r = editId
        ? await api.put(`/staff/${editId}`, payload, { headers:h })
        : await api.post("/staff", payload, { headers:h });
      setMsg(r.data?.message || "Saved."); reset(); load();
    } catch (e) { setErr(e.response?.data?.message || "Save failed"); }
    finally { setSaving(false); }
  };

  const edit = m => {
    setEditId(m.id);
    setForm({ employee_id:m.employee_id, full_name:m.full_name,
      department_id:String(m.department_id), designation:m.designation,
      email:m.email, phone:m.phone||"", is_active:Number(m.is_active) });
    window.scrollTo({ top:0, behavior:"smooth" });
    setMsg(""); setErr("");
  };

  const toggle = async m => {
    try {
      setSaving(true);
      await api.put(`/staff/${m.id}`, { is_active: Number(m.is_active)===1?0:1 }, { headers:h });
      setMsg(Number(m.is_active)===1 ? "Deactivated." : "Activated."); load();
    } catch (e) { setErr(e.response?.data?.message || "Failed"); }
    finally { setSaving(false); }
  };

  //Bulk CSV upload
  const handleBulkUpload = async e => {
    e.preventDefault(); setMsg(""); setErr("");
    const file = bulkRef.current?.files?.[0];
    if (!file) { setErr("Select a CSV file."); return; }
    const fd = new FormData(); fd.append("file", file);
    try {
      setBulkUp(true);
      const r = await api.post("/staff/bulk-upload", fd, { headers:{ Authorization:`Bearer ${token}` } });
      setMsg(` Bulk upload: ${r.data.imported} imported, ${r.data.failed} failed.`);
      e.target.reset(); load();
    } catch (e) { setErr(e.response?.data?.message || "Bulk upload failed"); }
    finally { setBulkUp(false); }
  };

  const filtered = staff.filter(m => {
    const q = search.toLowerCase();
    return (!q || m.full_name.toLowerCase().includes(q) || m.employee_id.toLowerCase().includes(q) || m.email.toLowerCase().includes(q))
      && (!deptF || String(m.department_id) === deptF);
  });

  const ctColor = { AIRTIME:"#1d4ed8", DATA:"#5b21b6", SMS:"#0f766e" };
  const ctBg    = { AIRTIME:"#dbeafe",  DATA:"#ede9fe",  SMS:"#ccfbf1"  };
  const ctIcon  = { AIRTIME:"", DATA:"", SMS:"" };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-area">
        <Topbar />
        <div className="page-content">
          <div className="page-header">
            <div>
              <div className="page-title">Staff Management</div>
              <div className="page-subtitle">Manage staff profiles, departments and monthly card quotas</div>
            </div>
            <div className="page-header-actions">
              <button className="btn btn-outline btn-sm" onClick={load}>Refresh</button>
            </div>
          </div>

          {msg && <div className="alert alert-success"><span></span><span>{msg}</span></div>}
          {err && <div className="alert alert-error"><span>!</span><span>{err}</span></div>}

          {/* ── KPI row ── */}
          <div className="kpi-grid" style={{ gridTemplateColumns:"repeat(4,1fr)", marginBottom:20 }}>
            <div className="kpi-card kpi-blue"><div className="kpi-icon-wrap"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div><div className="kpi-label">Total Staff</div><div className="kpi-value">{staff.length}</div></div>
            <div className="kpi-card kpi-green"><div className="kpi-icon-wrap"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div><div className="kpi-label">Active</div><div className="kpi-value">{staff.filter(s=>Number(s.is_active)===1).length}</div></div>
            <div className="kpi-card kpi-orange"><div className="kpi-icon-wrap"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg></div><div className="kpi-label">Departments</div><div className="kpi-value">{depts.filter(d=>d.status==="ACTIVE").length}</div></div>
            <div className="kpi-card kpi-purple"><div className="kpi-icon-wrap"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg></div><div className="kpi-label">Eligibility Rules</div><div className="kpi-value">{Object.values(eligMap).flat().length}</div></div>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginBottom:20 }}>
            {/* ── Add/Edit Form ── */}
            <div className="panel" style={{ marginTop:0 }}>
              <div className="panel-header">
                <div>
                  <div className="panel-title">{editId ? "Edit Staff" : "+ Add Staff Member"}</div>
                  <div className="panel-subtitle">Name, Department, Designation, Email, Phone</div>
                </div>
                {editId && <button className="btn btn-ghost btn-sm" onClick={reset}>Cancel</button>}
              </div>
              <div className="panel-body">
                <form onSubmit={submit}>
                  <div className="form-grid form-grid-2">
                    <div className="form-group">
                      <label className="form-label">Employee ID <span className="required">*</span></label>
                      <input className="form-control" name="employee_id" value={form.employee_id} onChange={change} placeholder="EMP001" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Full Name <span className="required">*</span></label>
                      <input className="form-control" name="full_name" value={form.full_name} onChange={change} placeholder="John Doe" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Department <span className="required">*</span></label>
                      <select className="form-control" name="department_id" value={form.department_id} onChange={change}>
                        <option value="">— Select —</option>
                        {depts.filter(d=>d.status==="ACTIVE").map(d=><option key={d.id} value={d.id}>{d.department_name}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Designation</label>
                      <input className="form-control" name="designation" value={form.designation} onChange={change} placeholder="Software Engineer" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Email <span className="required">*</span></label>
                      <input className="form-control" name="email" type="email" value={form.email} onChange={change} placeholder="john@company.com" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Phone</label>
                      <input className="form-control" name="phone" value={form.phone} onChange={change} placeholder="+251900000000" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Status</label>
                      <select className="form-control" name="is_active" value={form.is_active} onChange={change}>
                        <option value={1}>Active</option>
                        <option value={0}>Inactive</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-actions">
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                      {saving ? "Saving…" : editId ? "Save Update" : "+ Add Staff"}
                    </button>
                    {editId && <button type="button" className="btn btn-outline" onClick={reset}>Cancel</button>}
                  </div>
                </form>
              </div>
            </div>

            {/* Bulk Upload CSV */}
            <div className="panel" style={{ marginTop:0 }}>
              <div className="panel-header">
                <div>
                  <div className="panel-title">Bulk Upload Staff</div>
                  <div className="panel-subtitle">Upload staff + eligibility rules via CSV file</div>
                </div>
              </div>
              <div className="panel-body">
                <form onSubmit={handleBulkUpload}>
                  <div className="form-group" style={{ marginBottom:16 }}>
                    <label className="form-label">CSV File <span className="required">*</span></label>
                    <input ref={bulkRef} type="file" accept=".csv" className="form-control" />
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={bulkUp}>
                    {bulkUp ? "Uploading…" : " Upload CSV"}
                  </button>
                </form>

                <div style={{ marginTop:16, background:"#f8fafc", borderRadius:10, padding:"14px 16px", border:"1px solid #e2e8f0", fontSize:13 }}>
                  <div style={{ fontWeight:700, marginBottom:8, color:"#0f172a" }}> CSV Column Format</div>
                  <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                    {[
                      ["EmployeeID","EMP001","Required"],
                      ["FullName","John Doe","Required"],
                      ["Department","Information Technology","Must exist in system"],
                      ["Designation","Engineer","Optional"],
                      ["Email","john@co.com","Required, unique"],
                      ["Phone","+251900000000","Optional"],
                      ["CardType","AIRTIME / DATA / SMS","Sets eligibility"],
                      ["MonthlyQuota","1","Cards per month"],
                    ].map(([col, ex, note]) => (
                      <div key={col} style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
                        <code style={{ background:"#e2e8f0", padding:"1px 7px", borderRadius:5, fontSize:12, flexShrink:0, fontWeight:700 }}>{col}</code>
                        <span style={{ color:"#64748b", fontSize:12 }}>{ex} — <em>{note}</em></span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Filters + Table ── */}
          <div className="panel">
            <div className="filters-bar">
              <div className="filter-item">
                <div className="filter-label"> Search</div>
                <input className="filter-input" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Name, ID or email…" />
              </div>
              <div className="filter-item">
                <div className="filter-label"> Department</div>
                <select className="filter-select" value={deptF} onChange={e=>setDeptF(e.target.value)}>
                  <option value="">All Departments</option>
                  {depts.map(d=><option key={d.id} value={String(d.id)}>{d.department_name}</option>)}
                </select>
              </div>
              <div style={{ display:"flex", alignItems:"flex-end", gap:8 }}>
                <button className="btn btn-ghost btn-sm" onClick={()=>{setSearch("");setDeptF("");}}>Clear</button>
                <span style={{ fontSize:13, color:"#64748b", fontWeight:600 }}>{filtered.length} staff</span>
              </div>
            </div>

            {loading ? (
              <div className="loading-wrap"><div className="spinner"/><span>Loading…</span></div>
            ) : filtered.length === 0 ? (
              <div className="empty-state"><div className="empty-state-icon"></div><p>No staff found</p></div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th><th>Employee ID</th><th>Full Name</th><th>Department</th>
                      <th>Designation</th><th>Email</th><th>Eligibility (Quota/mo)</th><th>Status</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(m => {
                      const rules = eligMap[m.id] || [];
                      return (
                        <tr key={m.id}>
                          <td className="text-secondary">{m.id}</td>
                          <td><span className="badge badge-blue">{m.employee_id}</span></td>
                          <td>
                            <div style={{ display:"flex", alignItems:"center", gap:9 }}>
                              <div style={{ width:32, height:32, borderRadius:"50%", background:"linear-gradient(135deg,#2563eb,#7c3aed)", display:"flex", alignItems:"center", justifyContent:"center", color:"white", fontWeight:700, fontSize:13, flexShrink:0 }}>
                                {m.full_name.charAt(0).toUpperCase()}
                              </div>
                              <strong>{m.full_name}</strong>
                            </div>
                          </td>
                          <td>{m.department_name||"—"}</td>
                          <td className="text-secondary">{m.designation}</td>
                          <td className="text-secondary" style={{ fontSize:12.5 }}>{m.email}</td>
                          <td>
                            {rules.length === 0 ? (
                              <span style={{ fontSize:12, color:"#94a3b8", fontStyle:"italic" }}>No rules</span>
                            ) : (
                              <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                                {rules.map(r => (
                                  <span key={r.id} style={{ background:ctBg[r.card_type]||"#f1f5f9", color:ctColor[r.card_type]||"#475569", fontSize:11.5, fontWeight:700, padding:"2px 8px", borderRadius:999 }}>
                                    {ctIcon[r.card_type]} {r.card_type} ×{r.monthly_quota}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td>
                            <span className={`badge ${Number(m.is_active)===1?"badge-active":"badge-inactive"}`}>
                              {Number(m.is_active)===1?" Active":" Inactive"}
                            </span>
                          </td>
                          <td>
                            <div className="table-action-group">
                              <button className="btn btn-outline btn-sm" onClick={()=>edit(m)}>Edit</button>
                              <button
                                className={`btn btn-sm ${Number(m.is_active)===1?"btn-warning":"btn-success"}`}
                                onClick={()=>toggle(m)} disabled={saving}
                              >
                                {Number(m.is_active)===1?"Deactivate":"Activate"}
                              </button>
                            </div>
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
