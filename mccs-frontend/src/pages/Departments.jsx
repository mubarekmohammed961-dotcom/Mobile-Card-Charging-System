import { useEffect, useState } from "react";
import api from "../services/api";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

const empty = { department_name: "", department_code: "", budget: "", description: "", status: "ACTIVE" };

function fmtBudget(v) { return Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2 }) + ' ETB'; }

export default function Departments() {
  const [departments, setDepartments] = useState([]);
  const [form, setForm]       = useState(empty);
  const [editId, setEditId]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]   = useState("");
  const [err, setErr]   = useState("");

  const token = localStorage.getItem("mccs_token");
  const h = { Authorization: `Bearer ${token}` };

  const load = async () => {
    setLoading(true); setErr("");
    try {
      const r = await api.get("/departments", { headers: h });
      setDepartments(r.data?.departments || []);
    } catch (e) { setErr(e.response?.data?.message || "Failed to load"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const change = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const reset = () => { setForm(empty); setEditId(null); setMsg(""); setErr(""); };

  const submit = async e => {
    e.preventDefault(); setMsg(""); setErr("");
    if (!form.department_name.trim() || !form.department_code.trim()) { setErr("Name and code are required."); return; }
    try {
      setSaving(true);
      const payload = { ...form, budget: form.budget === "" ? 0 : Number(form.budget) };
      let r;
      if (editId) r = await api.put(`/departments/${editId}`, payload, { headers: h });
      else        r = await api.post("/departments", payload, { headers: h });
      setMsg(r.data?.message || "Saved successfully");
      reset(); load();
    } catch (e) { setErr(e.response?.data?.message || "Save failed"); }
    finally { setSaving(false); }
  };

  const edit = d => {
    setEditId(d.id);
    setForm({ department_name: d.department_name, department_code: d.department_code,
      budget: d.budget ?? "", description: d.description || "", status: d.status });
    window.scrollTo({ top: 0, behavior: "smooth" });
    setMsg(""); setErr("");
  };

  const toggle = async d => {
    setMsg(""); setErr("");
    try {
      setSaving(true);
      const ns = d.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
      await api.put(`/departments/${d.id}`, { status: ns }, { headers: h });
      setMsg(`Department ${ns === "ACTIVE" ? "activated" : "deactivated"}.`);
      load();
    } catch (e) { setErr(e.response?.data?.message || "Update failed"); }
    finally { setSaving(false); }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-area">
        <Topbar />
        <div className="page-content">
          <div className="page-header">
            <div className="page-header-left">
              <div className="page-title">Departments</div>
              <div className="page-subtitle">Manage departments and budget allocations (RBAC Module)</div>
            </div>
            <div className="page-header-actions">
              <button className="btn btn-outline btn-sm" onClick={load}>Refresh</button>
            </div>
          </div>

          {msg && <div className="alert alert-success"><span></span><span>{msg}</span></div>}
          {err && <div className="alert alert-error"><span>!</span><span>{err}</span></div>}

          {/* Form */}
          <div className="panel">
            <div className="panel-header">
              <div>
                <div className="panel-title">{editId ? "Edit Department" : "+ Add Department"}</div>
                <div className="panel-subtitle">Fill in the department details</div>
              </div>
              {editId && <button className="btn btn-ghost btn-sm" onClick={reset}>Cancel</button>}
            </div>
            <div className="panel-body">
              <form onSubmit={submit}>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Department Name <span className="required">*</span></label>
                    <input className="form-control" name="department_name" value={form.department_name}
                      onChange={change} placeholder="Information Technology" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Department Code <span className="required">*</span></label>
                    <input className="form-control" name="department_code" value={form.department_code}
                      onChange={change} placeholder="IT" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Monthly Budget (ETB)</label>
                    <input className="form-control" name="budget" type="number" min="0" step="0.01"
                      value={form.budget} onChange={change} placeholder="0.00" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-control" name="status" value={form.status} onChange={change}>
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  </div>
                  <div className="form-group col-span-2">
                    <label className="form-label">Description</label>
                    <input className="form-control" name="description" value={form.description}
                      onChange={change} placeholder="Optional description" />
                  </div>
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? "Saving…" : editId ? "Update Department" : "+ Create Department"}
                  </button>
                  {editId && <button type="button" className="btn btn-outline" onClick={reset}>Cancel</button>}
                </div>
              </form>
            </div>
          </div>

          {/* Table */}
          <div className="panel">
            <div className="panel-header">
              <div>
                <div className="panel-title">All Departments</div>
                <div className="panel-subtitle">{departments.length} department{departments.length !== 1 ? "s" : ""}</div>
              </div>
            </div>
            {loading ? (
              <div className="loading-wrap"><div className="spinner" /><span>Loading…</span></div>
            ) : departments.length === 0 ? (
              <div className="empty-state"><div className="empty-state-icon"></div><p>No departments found</p></div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th><th>Department Name</th><th>Code</th>
                      <th>Budget</th><th>Description</th><th>Status</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departments.map(d => (
                      <tr key={d.id}>
                        <td className="text-secondary">{d.id}</td>
                        <td><strong>{d.department_name}</strong></td>
                        <td><span className="badge badge-blue">{d.department_code}</span></td>
                        <td>{fmtBudget(d.budget)}</td>
                        <td className="text-secondary" style={{ maxWidth: 200 }}>{d.description || "—"}</td>
                        <td>
                          <span className={`badge ${d.status === "ACTIVE" ? "badge-active" : "badge-inactive"}`}>
                            {d.status}
                          </span>
                        </td>
                        <td>
                          <div className="table-action-group">
                            <button className="btn btn-outline btn-sm" onClick={() => edit(d)} disabled={saving}>Edit</button>
                            <button
                              className={`btn btn-sm ${d.status === "ACTIVE" ? "btn-warning" : "btn-success"}`}
                              onClick={() => toggle(d)} disabled={saving}
                            >
                              {d.status === "ACTIVE" ? "Deactivate" : "Activate"}
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
