import { useEffect, useState } from "react";
import api from "../services/api";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

const empty = { staff_id: "", card_type: "AIRTIME", monthly_quota: 1, is_active: 1 };

export default function Eligibility() {
  const [rules, setRules]       = useState([]);
  const [staff, setStaff]       = useState([]);
  const [form, setForm]         = useState(empty);
  const [search, setSearch]     = useState("");
  const [typeFilter, setType]   = useState("");
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [delId, setDelId]       = useState(null);
  const [msg, setMsg] = useState(""); const [err, setErr] = useState("");

  const token = localStorage.getItem("mccs_token");
  const h = { Authorization: `Bearer ${token}` };

  const load = async () => {
    setLoading(true);
    try {
      const [rR, sR] = await Promise.all([
        api.get("/eligibility", { headers: h }),
        api.get("/staff", { headers: h }),
      ]);
      setRules(rR.data?.eligibility || []);
      setStaff(sR.data?.staff || []);
    } catch (e) { setErr(e.response?.data?.message || "Load failed"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const change = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  const reset  = () => { setForm(empty); setMsg(""); setErr(""); };

  const submit = async e => {
    e.preventDefault(); setMsg(""); setErr("");
    if (!form.staff_id) { setErr("Please select a staff member."); return; }
    try {
      setSaving(true);
      const r = await api.post("/eligibility", {
        staff_id: Number(form.staff_id),
        card_type: form.card_type,
        monthly_quota: Number(form.monthly_quota),
        is_active: Number(form.is_active),
      }, { headers: h });
      setMsg(r.data?.message || "Saved"); reset(); load();
    } catch (e) { setErr(e.response?.data?.message || "Save failed"); }
    finally { setSaving(false); }
  };

  const del = async id => {
    setMsg(""); setErr(""); setDelId(id);
    try {
      await api.delete(`/eligibility/${id}`, { headers: h });
      setMsg("Rule deleted."); load();
    } catch (e) { setErr(e.response?.data?.message || "Delete failed"); }
    finally { setDelId(null); }
  };

  const filtered = rules.filter(r => {
    const q = search.toLowerCase();
    const matchQ    = !q || (r.full_name||"").toLowerCase().includes(q) || (r.employee_id||"").toLowerCase().includes(q);
    const matchType = !typeFilter || r.card_type === typeFilter;
    return matchQ && matchType;
  });

  // Summary counts
  const totalActive = rules.filter(r => Number(r.is_active) === 1).length;
  const byType = ["AIRTIME","DATA","SMS"].map(t => ({ type: t, count: rules.filter(r => r.card_type === t).length }));

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-area">
        <Topbar />
        <div className="page-content">
          <div className="page-header">
            <div>
              <div className="page-title">Eligibility Rules</div>
              <div className="page-subtitle">Set monthly card quotas per staff member</div>
            </div>
            <div className="page-header-actions">
              <button className="btn btn-outline btn-sm" onClick={load}>Refresh</button>
            </div>
          </div>

          {msg && <div className="alert alert-success"><span></span><span>{msg}</span></div>}
          {err && <div className="alert alert-error"><span>!</span><span>{err}</span></div>}

          {/* Summary KPIs */}
          <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
            <div className="kpi-card kpi-blue">
              <div className="kpi-icon-wrap"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg></div>
              <div className="kpi-label">Total Rules</div>
              <div className="kpi-value">{rules.length}</div>
            </div>
            <div className="kpi-card kpi-green">
              <div className="kpi-icon-wrap"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
              <div className="kpi-label">Active Rules</div>
              <div className="kpi-value">{totalActive}</div>
            </div>
            {byType.map(b => (
              <div key={b.type} className="kpi-card kpi-orange">
                <div className="kpi-icon-wrap"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg></div>
                <div className="kpi-label">{b.type} Rules</div>
                <div className="kpi-value">{b.count}</div>
              </div>
            ))}
          </div>

          {/* Add Form */}
          <div className="panel">
            <div className="panel-header">
              <div>
                <div className="panel-title">+ Add / Update Rule</div>
                <div className="panel-subtitle">If a rule exists for the staff + card type combination, it will be updated</div>
              </div>
            </div>
            <div className="panel-body">
              <form onSubmit={submit}>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Staff Member <span className="required">*</span></label>
                    <select className="form-control" name="staff_id" value={form.staff_id} onChange={change}>
                      <option value="">— Select Staff —</option>
                      {staff.filter(s => Number(s.is_active) === 1).map(s => (
                        <option key={s.id} value={s.id}>
                          {s.full_name} ({s.employee_id}) — {s.department_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Card Type <span className="required">*</span></label>
                    <select className="form-control" name="card_type" value={form.card_type} onChange={change}>
                      <option value="AIRTIME"> AIRTIME</option>
                      <option value="DATA"> DATA</option>
                      <option value="SMS"> SMS</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Monthly Quota</label>
                    <input className="form-control" name="monthly_quota" type="number" min="0"
                      value={form.monthly_quota} onChange={change} />
                    <span className="form-hint">Cards per month (0 = none)</span>
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
                    {saving ? "Saving…" : "Save Rule"}
                  </button>
                  <button type="button" className="btn btn-outline" onClick={reset}>Clear</button>
                </div>
              </form>
            </div>
          </div>

          {/* Table */}
          <div className="panel">
            <div className="filters-bar">
              <div className="filter-item">
                <div className="filter-label"> Search Staff</div>
                <input className="filter-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Name or employee ID…" />
              </div>
              <div className="filter-item">
                <div className="filter-label"> Card Type</div>
                <select className="filter-select" value={typeFilter} onChange={e => setType(e.target.value)}>
                  <option value="">All Types</option>
                  <option value="AIRTIME">AIRTIME</option>
                  <option value="DATA">DATA</option>
                  <option value="SMS">SMS</option>
                </select>
              </div>
              <div className="filter-actions">
                <button className="btn btn-ghost btn-sm" onClick={() => { setSearch(""); setType(""); }}>Clear</button>
              </div>
            </div>

            {loading ? (
              <div className="loading-wrap"><div className="spinner" /><span>Loading…</span></div>
            ) : filtered.length === 0 ? (
              <div className="empty-state"><div className="empty-state-icon"></div><p>No eligibility rules found</p></div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th><th>Staff Member</th><th>Employee ID</th>
                      <th>Department</th><th>Card Type</th><th>Monthly Quota</th>
                      <th>Status</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(r => (
                      <tr key={r.id}>
                        <td className="text-secondary">{r.id}</td>
                        <td><strong>{r.full_name}</strong></td>
                        <td><span className="badge badge-blue">{r.employee_id}</span></td>
                        <td>{r.department_name || "—"}</td>
                        <td>
                          <span className={`badge ${r.card_type === "AIRTIME" ? "badge-blue" : r.card_type === "DATA" ? "badge-purple" : "badge-teal"}`}>
                            {r.card_type === "AIRTIME" ? "" : r.card_type === "DATA" ? "" : ""} {r.card_type}
                          </span>
                        </td>
                        <td>
                          <strong style={{ fontSize: "16px" }}>{r.monthly_quota}</strong>
                          <span className="text-secondary text-sm"> /month</span>
                        </td>
                        <td>
                          <span className={`badge ${Number(r.is_active) === 1 ? "badge-active" : "badge-inactive"}`}>
                            {Number(r.is_active) === 1 ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td>
                          <button className="btn btn-danger btn-sm" onClick={() => del(r.id)} disabled={delId === r.id}>
                            {delId === r.id ? "…" : "Delete"}
                          </button>
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
