import { useEffect, useState } from "react";
import api from "../services/api";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

const ROLES = [
  { value: "SUPER_ADMIN",     label: "Super Admin",      desc: "Full system access",                  color: "badge-super_admin" },
  { value: "SYSTEM_ADMIN",    label: "System Admin",     desc: "System settings & all modules",       color: "badge-system_admin" },
  { value: "STORE_OFFICER",   label: "Store Officer",    desc: "Inventory, distribution, delivery",   color: "badge-store_officer" },
  { value: "DEPARTMENT_HEAD", label: "Department Head",  desc: "Approve budgets, view dept reports",  color: "badge-department_head" },
  { value: "STAFF",           label: "Staff",            desc: "Receive & confirm card PIN",          color: "badge-staff" },
  { value: "AUDITOR",         label: "Auditor",          desc: "Read-only — view logs & reports",     color: "badge-auditor" },
];

const emptyForm = { full_name: "", email: "", password: "", role: "STORE_OFFICER", phone: "", status: "ACTIVE" };
const emptyPwd  = { new_password: "", confirm_password: "", current_password: "" };

const roleIcon = {};

export default function Users() {
  const [users, setUsers]       = useState([]);
  const [form, setForm]         = useState(emptyForm);
  const [pwdForm, setPwdForm]   = useState(emptyPwd);
  const [editId, setEditId]     = useState(null);
  const [pwdUserId, setPwdUserId] = useState(null);
  const [search, setSearch]     = useState("");
  const [roleFilter, setRole]   = useState("");
  const [statusFilter, setStat] = useState("");
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);
  const [msg, setMsg] = useState(""); const [err, setErr] = useState("");
  const [pwdErr, setPwdErr] = useState(""); const [pwdMsg, setPwdMsg] = useState("");
  const [showPwd, setShowPwd]   = useState(false);

  const token = localStorage.getItem("mccs_token");
  const currentUser = (() => { try { return JSON.parse(localStorage.getItem("mccs_user") || "{}"); } catch { return {}; } })();
  const h = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get("/users", { headers: h });
      setUsers(r.data?.users || []);
    } catch (e) { setErr(e.response?.data?.message || "Failed to load users"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const change    = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  const changePwd = e => setPwdForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const reset = () => { setForm(emptyForm); setEditId(null); setMsg(""); setErr(""); };

  const submit = async e => {
    e.preventDefault(); setMsg(""); setErr("");
    if (!form.full_name.trim() || !form.email.trim()) { setErr("Full name and email are required."); return; }
    if (!editId && !form.password) { setErr("Password is required for new users."); return; }
    if (!editId && form.password.length < 6) { setErr("Password must be at least 6 characters."); return; }
    try {
      setSaving(true);
      const payload = { full_name: form.full_name.trim(), email: form.email.trim(), role: form.role, phone: form.phone.trim() || null, status: form.status };
      if (!editId) payload.password = form.password;
      const r = editId
        ? await api.put(`/users/${editId}`, payload, { headers: h })
        : await api.post("/users", payload, { headers: h });
      setMsg(r.data?.message || "Saved successfully"); reset(); load();
    } catch (e) { setErr(e.response?.data?.message || "Save failed"); }
    finally { setSaving(false); }
  };

  const startEdit = u => {
    setEditId(u.id);
    setForm({ full_name: u.full_name, email: u.email, password: "", role: u.role, phone: u.phone || "", status: u.status });
    setMsg(""); setErr("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleStatus = async u => {
    setMsg(""); setErr("");
    try {
      setSaving(true);
      const ns = u.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      const r = await api.patch(`/users/${u.id}/status`, { status: ns }, { headers: h });
      setMsg(r.data?.message || "Updated"); load();
    } catch (e) { setErr(e.response?.data?.message || "Update failed"); }
    finally { setSaving(false); }
  };

  const openPwd = u => { setPwdUserId(u.id); setPwdForm(emptyPwd); setPwdErr(""); setPwdMsg(""); };
  const closePwd = () => { setPwdUserId(null); setPwdForm(emptyPwd); };

  const submitPwd = async e => {
    e.preventDefault(); setPwdErr(""); setPwdMsg("");
    if (pwdForm.new_password !== pwdForm.confirm_password) { setPwdErr("Passwords do not match."); return; }
    if (pwdForm.new_password.length < 6) { setPwdErr("Password must be at least 6 characters."); return; }
    try {
      setPwdSaving(true);
      const payload = { new_password: pwdForm.new_password };
      if (Number(pwdUserId) === Number(currentUser.id)) payload.current_password = pwdForm.current_password;
      const r = await api.patch(`/users/${pwdUserId}/password`, payload, { headers: h });
      setPwdMsg(r.data?.message || "Password changed!"); setTimeout(closePwd, 1500);
    } catch (e) { setPwdErr(e.response?.data?.message || "Failed"); }
    finally { setPwdSaving(false); }
  };

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchQ    = !q || u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    const matchRole = !roleFilter || u.role === roleFilter;
    const matchStat = !statusFilter || u.status === statusFilter;
    return matchQ && matchRole && matchStat;
  });

  // KPI stats
  const total  = users.length;
  const active = users.filter(u => u.status === "ACTIVE").length;
  const byRole = ROLES.map(r => ({ ...r, count: users.filter(u => u.role === r.value).length }));

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-area">
        <Topbar />
        <div className="page-content">
          <div className="page-header">
            <div>
              <div className="page-title">User Management</div>
              <div className="page-subtitle">RBAC Matrix: Create and manage system users with roles and permissions</div>
            </div>
            <button className="btn btn-outline btn-sm" onClick={load}>Refresh</button>
          </div>

          {msg && <div className="alert alert-success"><span></span><span>{msg}</span></div>}
          {err && <div className="alert alert-error"><span>!</span><span>{err}</span></div>}

          {/* Role Overview Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: "12px", marginBottom: "20px" }}>
            {byRole.map(r => (
              <div key={r.value} style={{
                background: "white", border: "1px solid var(--border)", borderRadius: "12px",
                padding: "14px", textAlign: "center", cursor: "pointer",
                borderTop: `3px solid ${r.value === "SUPER_ADMIN" ? "#9d174d" : r.value === "SYSTEM_ADMIN" ? "#5b21b6" : r.value === "STORE_OFFICER" ? "#1e40af" : r.value === "DEPARTMENT_HEAD" ? "#065f46" : r.value === "STAFF" ? "#075985" : "#9a3412"}`,
                transition: "all .15s",
              }}
              onClick={() => setRole(v => v === r.value ? "" : r.value)}
              >
                <div style={{ fontSize: "22px", marginBottom: "6px" }}></div>
                <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: ".4px" }}>{r.label}</div>
                <div style={{ fontSize: "22px", fontWeight: 800, marginTop: "4px" }}>{r.count}</div>
                <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>{r.desc}</div>
              </div>
            ))}
          </div>

          {/* RBAC Permission Matrix */}
          <div className="panel">
            <div className="panel-header">
              <div className="panel-title">RBAC Permission Matrix</div>
              <div className="panel-subtitle">Role-based access control — Section 5 of SRS</div>
            </div>
            <div className="panel-body" style={{ padding: 0, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "700px" }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    <th style={{ padding: "10px 16px", textAlign: "left", fontSize: "12px", fontWeight: 700, color: "var(--text-secondary)", borderBottom: "1px solid var(--border)" }}>Module / Permission</th>
                    {ROLES.map(r => (
                      <th key={r.value} style={{ padding: "10px 10px", textAlign: "center", fontSize: "11px", fontWeight: 700, color: "var(--text-secondary)", borderBottom: "1px solid var(--border)", minWidth: "90px" }}>
                        {r.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { module: "Manage System Settings",         perms: [1,1,0,0,0,0] },
                    { module: "Upload / Manage Card Inventory", perms: [1,1,1,0,0,0] },
                    { module: "Manage Staff & Eligibility",     perms: [1,1,0,1,0,0] },
                    { module: "Initiate Monthly Distribution",  perms: [1,1,1,0,0,0] },
                    { module: "Approve Department Budget",      perms: [0,0,0,1,0,0] },
                    { module: "Receive & Confirm Card PIN",     perms: [0,0,0,0,1,0] },
                    { module: "View Department Reports",        perms: [0,0,0,1,0,1] },
                    { module: "View Personal History",          perms: [0,0,0,0,1,0] },
                    { module: "View Full Audit Logs",           perms: [1,1,0,0,0,1] },
                    { module: "Run Reports & Export",           perms: [1,1,1,1,0,1] },
                    { module: "Manage Users & Roles",           perms: [1,1,0,0,0,0] },
                  ].map((row, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "10px 16px", fontSize: "13px", fontWeight: 600 }}>{row.module}</td>
                      {row.perms.map((p, j) => (
                        <td key={j} style={{ textAlign: "center", padding: "10px" }}>
                          {p ? <span style={{ color: "#16a34a", fontSize: "18px" }}></span> : <span style={{ color: "#d1d5db", fontSize: "16px" }}>—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Create / Edit Form */}
          <div className="panel">
            <div className="panel-header">
              <div>
                <div className="panel-title">{editId ? "Edit User" : "+ Create New User"}</div>
                <div className="panel-subtitle">
                  {editId ? "Update user details, role or status" : "Create a new system user with a role and password"}
                </div>
              </div>
              {editId && <button className="btn btn-ghost btn-sm" onClick={reset}>Cancel</button>}
            </div>
            <div className="panel-body">
              <form onSubmit={submit}>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Full Name <span className="required">*</span></label>
                    <input className="form-control" name="full_name" value={form.full_name}
                      onChange={change} placeholder="John Doe" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email Address <span className="required">*</span></label>
                    <input className="form-control" name="email" type="email" value={form.email}
                      onChange={change} placeholder="john@company.com" />
                  </div>
                  {!editId && (
                    <div className="form-group">
                      <label className="form-label">Password <span className="required">*</span></label>
                      <div style={{ position: "relative" }}>
                        <input className="form-control" name="password" type={showPwd ? "text" : "password"}
                          value={form.password} onChange={change} placeholder="Min. 6 characters"
                          style={{ paddingRight: "42px" }} />
                        <button type="button" onClick={() => setShowPwd(p => !p)} style={{
                          position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)",
                          background: "none", border: "none", cursor: "pointer", fontSize: "15px", color: "var(--text-muted)"
                        }}>{showPwd ? "Hide" : "Show"}</button>
                      </div>
                    </div>
                  )}
                  <div className="form-group">
                    <label className="form-label">Role <span className="required">*</span></label>
                    <select className="form-control" name="role" value={form.role} onChange={change}>
                      {ROLES.map(r => (
                        <option key={r.value} value={r.value}>{r.label} — {r.desc}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input className="form-control" name="phone" value={form.phone}
                      onChange={change} placeholder="+251900000000" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-control" name="status" value={form.status} onChange={change}>
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  </div>
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? "Saving…" : editId ? "Update User" : "+ Create User"}
                  </button>
                  {editId && <button type="button" className="btn btn-outline" onClick={reset}>Cancel</button>}
                </div>
              </form>
            </div>
          </div>

          {/* Password Reset Modal */}
          {pwdUserId && (
            <div className="modal-overlay" onClick={closePwd}>
              <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: "440px" }}>
                <div className="modal-header">
                  <div className="modal-title">Reset Password</div>
                  <button className="modal-close" onClick={closePwd}>X</button>
                </div>
                <div className="modal-body">
                  {pwdMsg && <div className="alert alert-success"><span></span><span>{pwdMsg}</span></div>}
                  {pwdErr && <div className="alert alert-error"><span>!</span><span>{pwdErr}</span></div>}
                  <form onSubmit={submitPwd}>
                    {Number(pwdUserId) === Number(currentUser.id) && (
                      <div className="form-group" style={{ marginBottom: "16px" }}>
                        <label className="form-label">Current Password <span className="required">*</span></label>
                        <input className="form-control" name="current_password" type="password"
                          value={pwdForm.current_password} onChange={changePwd} placeholder="Your current password" />
                      </div>
                    )}
                    <div className="form-group" style={{ marginBottom: "16px" }}>
                      <label className="form-label">New Password <span className="required">*</span></label>
                      <input className="form-control" name="new_password" type="password"
                        value={pwdForm.new_password} onChange={changePwd} placeholder="Min. 6 characters" />
                    </div>
                    <div className="form-group" style={{ marginBottom: "16px" }}>
                      <label className="form-label">Confirm New Password <span className="required">*</span></label>
                      <input className="form-control" name="confirm_password" type="password"
                        value={pwdForm.confirm_password} onChange={changePwd} placeholder="Repeat new password" />
                      {pwdForm.confirm_password && pwdForm.new_password !== pwdForm.confirm_password && (
                        <span className="form-error-msg">Passwords do not match</span>
                      )}
                    </div>
                    <div className="modal-footer" style={{ padding: "0", marginTop: "8px" }}>
                      <button type="button" className="btn btn-outline" onClick={closePwd}>Cancel</button>
                      <button type="submit" className="btn btn-primary" disabled={pwdSaving}>
                        {pwdSaving ? "Saving…" : "Change Password"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Filters + Table */}
          <div className="panel">
            <div className="filters-bar">
              <div className="filter-item">
                <div className="filter-label"> Search</div>
                <input className="filter-input" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Name or email…" />
              </div>
              <div className="filter-item" style={{ maxWidth: "200px" }}>
                <div className="filter-label">Role</div>
                <select className="filter-select" value={roleFilter} onChange={e => setRole(e.target.value)}>
                  <option value="">All Roles</option>
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div className="filter-item" style={{ maxWidth: "160px" }}>
                <div className="filter-label">Status</div>
                <select className="filter-select" value={statusFilter} onChange={e => setStat(e.target.value)}>
                  <option value="">All</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
              <div className="filter-actions">
                <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(""); setRole(""); setStat(""); }}>Clear</button>
              </div>
            </div>

            {/* Count bar */}
            <div style={{ padding: "10px 22px", background: "#fafbfc", borderBottom: "1px solid var(--border)", fontSize: "13px", color: "var(--text-secondary)", display: "flex", gap: "20px" }}>
              <span>Total: <strong style={{ color: "var(--text-primary)" }}>{total}</strong></span>
              <span style={{ color: "var(--success)" }}>Active: <strong>{active}</strong></span>
              <span style={{ color: "var(--danger)" }}>Inactive: <strong>{total - active}</strong></span>
              <span>Showing: <strong style={{ color: "var(--text-primary)" }}>{filtered.length}</strong></span>
            </div>

            {loading ? (
              <div className="loading-wrap"><div className="spinner" /><span>Loading users…</span></div>
            ) : filtered.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon"></div>
                <p>No users found</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Full Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Phone</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(u => (
                      <tr key={u.id} style={{ opacity: u.status === "INACTIVE" ? .6 : 1 }}>
                        <td className="text-secondary">{u.id}</td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <div style={{
                              width: "34px", height: "34px", borderRadius: "50%",
                              background: "linear-gradient(135deg,#2563eb,#7c3aed)",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: "13px", fontWeight: 700, color: "white", flexShrink: 0,
                            }}>
                              {u.full_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600 }}>{u.full_name}</div>
                              {Number(u.id) === Number(currentUser.id) && (
                                <span className="badge badge-green" style={{ fontSize: "10px", padding: "1px 6px" }}>You</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="text-secondary">{u.email}</td>
                        <td>
                          <span className={`badge badge-${u.role.toLowerCase()}`}>
                            {u.role.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="text-secondary">{u.phone || "—"}</td>
                        <td>
                          <span className={`badge ${u.status === "ACTIVE" ? "badge-active" : "badge-inactive"}`}>
                            {u.status === "ACTIVE" ? " Active" : " Inactive"}
                          </span>
                        </td>
                        <td className="text-secondary text-sm">
                          {u.created_at ? new Date(u.created_at).toLocaleDateString() : "—"}
                        </td>
                        <td>
                          <div className="table-action-group">
                            <button className="btn btn-outline btn-sm" onClick={() => startEdit(u)}>Edit</button>
                            <button className="btn btn-outline btn-sm" onClick={() => openPwd(u)}> Pwd</button>
                            <button
                              className={`btn btn-sm ${u.status === "ACTIVE" ? "btn-warning" : "btn-success"}`}
                              onClick={() => toggleStatus(u)}
                              disabled={saving || Number(u.id) === Number(currentUser.id)}
                              title={Number(u.id) === Number(currentUser.id) ? "Cannot deactivate yourself" : ""}
                            >
                              {u.status === "ACTIVE" ? "Deactivate" : "Activate"}
                            </button>
                          </div>
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
