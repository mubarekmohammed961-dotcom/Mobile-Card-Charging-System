import { useEffect, useMemo, useRef, useState } from "react";
import api from "../services/api";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

const emptyCard = { 
  provider: "", 
  type: "AIRTIME", 
  value: "", 
  pin: "", 
  expiry_date: "", 
  batch_number: "" 
};

function fmtVal(v) { return Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2 }); }

const statusBadge = s => ({
  AVAILABLE: "badge-available", ALLOCATED: "badge-allocated",
  DELIVERED: "badge-delivered", CONFIRMED: "badge-confirmed",
  USED: "badge-used", EXPIRED: "badge-expired",
}[s] || "badge-gray");

export default function Inventory() {
  const [cards, setCards]     = useState([]);
  const [stats, setStats]     = useState(null);
  const [statusF, setStatusF] = useState("");
  const [typeF, setTypeF]     = useState("");
  const [provF, setProvF]     = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [addingCard, setAddingCard] = useState(false);
  const [cardForm, setCardForm] = useState(emptyCard);
  const [showAddForm, setShowAddForm] = useState(false);
  const [msg, setMsg] = useState(""); const [err, setErr] = useState("");
  const fileRef = useRef(null);

  const token = localStorage.getItem("mccs_token");
  const h = { Authorization: `Bearer ${token}` };

  const load = async () => {
    setLoading(true); setErr("");
    try {
      const [cR, sR] = await Promise.all([
        api.get("/inventory/cards", { headers: h, params: { ...(statusF && { status: statusF }), ...(typeF && { type: typeF }), ...(provF && { provider: provF }) } }),
        api.get("/inventory/stats", { headers: h }),
      ]);
      setCards(cR.data?.cards || []);
      setStats(sR.data || null);
    } catch (e) { setErr(e.response?.data?.message || "Load failed"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [statusF, typeF, provF]);

  const providers = useMemo(() => [...new Set(cards.map(c => c.provider).filter(Boolean))].sort(), [cards]);

  const handleUpload = async e => {
    e.preventDefault(); setMsg(""); setErr("");
    const file = fileRef.current?.files?.[0];
    if (!file) { setErr("Select a CSV file first."); return; }
    if (!file.name.toLowerCase().endsWith(".csv")) { setErr("Only CSV files allowed."); return; }
    const fd = new FormData(); fd.append("file", file);
    try {
      setUploading(true);
      const r = await api.post("/inventory/upload", fd, { headers: { Authorization: `Bearer ${token}` } });
      setMsg(` Import done: ${r.data.imported} imported, ${r.data.failed} failed.`);
      e.target.reset(); load();
    } catch (e) { setErr(e.response?.data?.message || "Upload failed"); }
    finally { setUploading(false); }
  };

  const handleAddCard = async e => {
    e.preventDefault(); setMsg(""); setErr("");
    const { provider, type, value, pin, expiry_date } = cardForm;
    
    // Validate required fields
    if (!provider.trim() || !value.trim() || !pin.trim() || !expiry_date) { 
      setErr("Provider, Type, Value, PIN and Expiry Date are required."); 
      return; 
    }
    
    try {
      setAddingCard(true);
      const r = await api.post("/inventory/cards", {
        provider: provider.trim(), 
        type,
        value: parseFloat(value.trim()),
        pin: pin.trim(), 
        expiry_date, 
        batch_number: cardForm.batch_number || null,
      }, { headers: h });
      setMsg(` ${r.data.message || 'Card added successfully'}`);
      setCardForm(emptyCard); setShowAddForm(false); load();
    } catch (e) { setErr(e.response?.data?.message || "Add failed"); }
    finally { setAddingCard(false); }
  };

  const totalVal = cards.reduce((s, c) => s + Number(c.value || 0), 0);
  const avail    = cards.filter(c => c.status === "AVAILABLE").length;
  const alloc    = cards.filter(c => c.status === "ALLOCATED").length;
  const used     = cards.filter(c => c.status === "USED").length;

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-area">
        <Topbar />
        <div className="page-content">
          <div className="page-header">
            <div>
              <div className="page-title">Card Inventory</div>
              <div className="page-subtitle">Upload, manage, and track mobile card stock</div>
            </div>
            <div className="page-header-actions">
              <button className="btn btn-outline btn-sm" onClick={() => setShowAddForm(p => !p)}>
                {showAddForm ? "X Close Form" : "+ Add Single Card"}
              </button>
              <button className="btn btn-outline btn-sm" onClick={load}>Refresh</button>
            </div>
          </div>

          {msg && <div className="alert alert-success"><span></span><span>{msg}</span></div>}
          {err && <div className="alert alert-error"><span>!</span><span>{err}</span></div>}

          {/* Low Stock Alert Banner */}
          {stats && (stats.expiring_soon > 0 || stats.expired_available > 0 || (stats.stats.available < 50)) && (
            <div style={{ borderRadius:12, overflow:"hidden", marginBottom:16 }}>
              {stats.stats.available < 50 && (
                <div style={{ background:"linear-gradient(135deg,#7f1d1d,#dc2626)", color:"white", padding:"14px 20px", display:"flex", alignItems:"center", gap:12 }}>
                  <span style={{ fontSize:24 }}>!</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:800, fontSize:15 }}>Low Inventory Alert — Action Required</div>
                    <div style={{ fontSize:13, opacity:.9, marginTop:2 }}>
                      Only <strong>{stats.stats.available}</strong> cards available (threshold: 50). Upload new cards to avoid disruption.
                    </div>
                  </div>
                  <button className="btn btn-sm" onClick={() => document.getElementById("csv-upload-form")?.scrollIntoView({ behavior:"smooth" })}
                    style={{ background:"rgba(255,255,255,.2)", border:"1px solid rgba(255,255,255,.3)", color:"white", fontWeight:700 }}>
                    Upload Now 
                  </button>
                </div>
              )}
              {stats.expiring_soon > 0 && (
                <div style={{ background:"linear-gradient(135deg,#78350f,#d97706)", color:"white", padding:"12px 20px", display:"flex", alignItems:"center", gap:12, borderTop: stats.stats.available < 50 ? "1px solid rgba(255,255,255,.1)" : "none" }}>
                  <span style={{ fontSize:20 }}>!</span>
                  <div>
                    <strong>{stats.expiring_soon}</strong> card{stats.expiring_soon !== 1 ? "s" : ""} expiring within 7 days — reallocate or remove before they expire.
                  </div>
                </div>
              )}
              {stats.expired_available > 0 && (
                <div style={{ background:"linear-gradient(135deg,#3f3f46,#52525b)", color:"white", padding:"12px 20px", display:"flex", alignItems:"center", gap:12 }}>
                  <span style={{ fontSize:20 }}>X</span>
                  <div>
                    <strong>{stats.expired_available}</strong> expired card{stats.expired_available !== 1 ? "s" : ""} still marked AVAILABLE — run the cleanup cron or mark them EXPIRED manually.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Stats */}
          {stats && (
            <div className="kpi-grid">
              <div className="kpi-card kpi-blue">
                <div className="kpi-icon-wrap"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg></div>
                <div className="kpi-label">Total Stock</div>
                <div className="kpi-value">{stats.stats.total || 0}</div>
              </div>
              <div className="kpi-card kpi-green">
                <div className="kpi-icon-wrap"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
                <div className="kpi-label">Available</div>
                <div className="kpi-value">{stats.stats.available || 0}</div>
                <div className="kpi-sub">{fmtVal(stats.by_provider?.reduce((s,r) => s + Number(r.total_value || 0), 0))} ETB</div>
              </div>
              <div className="kpi-card kpi-orange">
                <div className="kpi-icon-wrap"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg></div>
                <div className="kpi-label">Allocated</div>
                <div className="kpi-value">{stats.stats.allocated || 0}</div>
              </div>
              <div className="kpi-card kpi-purple">
                <div className="kpi-icon-wrap"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div>
                <div className="kpi-label">Used</div>
                <div className="kpi-value">{stats.stats.used || 0}</div>
              </div>
              {stats.expiring_soon > 0 && (
                <div className="kpi-card kpi-red">
                  <div className="kpi-icon-wrap"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
                  <div className="kpi-label">Expiring in 7 Days</div>
                  <div className="kpi-value" style={{ color: "var(--danger)" }}>{stats.expiring_soon}</div>
                </div>
              )}
            </div>
          )}

          {/* CSV Upload */}
          <div className="panel" id="csv-upload-form">
            <div className="panel-header">
              <div>
                <div className="panel-title">📤 Bulk Upload via CSV</div>
                <div className="panel-subtitle">Required columns: Provider, Category, PackageType, PackageValue, PIN, ExpiryDate, BatchNumber</div>
              </div>
            </div>
            <div className="panel-body">
              <form onSubmit={handleUpload} style={{ display: "flex", gap: "12px", alignItems: "flex-end", flexWrap: "wrap" }}>
                <div className="form-group" style={{ flex: 1, minWidth: "240px" }}>
                  <label className="form-label">CSV File</label>
                  <input ref={fileRef} type="file" accept=".csv,text/csv" className="form-control" />
                </div>
                <button type="submit" className="btn btn-primary" disabled={uploading} style={{ marginBottom: 0 }}>
                  {uploading ? "Uploading…" : "📤 Upload CSV"}
                </button>
              </form>
              <div style={{ marginTop: "10px", padding: "10px 14px", background: "#f8fafc", borderRadius: "8px", fontSize: "12.5px", color: "#64748b", border: "1px solid #e2e8f0" }}>
                <strong>CSV Template:</strong> Provider, Category (AIRTIME/DATA/SMS), PackageValue (e.g., "50 ETB", "500 MB", "2 GB", "Unlimited", "100 SMS"), PIN (10-20 alphanumeric), ExpiryDate (YYYY-MM-DD), BatchNumber
                <div style={{ fontSize: 11, marginTop: 4, fontStyle: 'italic' }}>Note: System auto-detects package type from value (ETB→BIRR, MB→MB, GB→GB, SMS→SMS_PACKAGE)</div>
              </div>
            </div>
          </div>

          {/* Single Card Add */}
          {showAddForm && (
            <div className="panel">
              <div className="panel-header">
                <div>
                  <div className="panel-title">+ Add Single Card</div>
                  <div className="panel-subtitle">Manually add one card to inventory</div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowAddForm(false)}>X</button>
              </div>
              <div className="panel-body">
                {/* SRS Compliance Info */}
                <div style={{ marginBottom: 16, padding: "12px 16px", background: "linear-gradient(135deg,#dbeafe,#eff6ff)", borderRadius: 10, border: "1px solid #bfdbfe" }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1e40af", marginBottom: 6 }}>📋 SRS FR-001 Simplified: Just Category + Value</div>
                  <div style={{ fontSize: 12.5, color: "#1e3a8a", lineHeight: 1.6 }}>
                    <strong>AIRTIME:</strong> "50 ETB", "100 ETB" · 
                    <strong style={{ marginLeft: 8 }}>DATA:</strong> "500 MB", "2 GB", "Unlimited" · 
                    <strong style={{ marginLeft: 8 }}>SMS:</strong> "100 SMS", "200 SMS"
                  </div>
                </div>
                <form onSubmit={handleAddCard}>
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Provider <span className="required">*</span></label>
                      <input className="form-control" value={cardForm.provider} onChange={e => setCardForm(p => ({ ...p, provider: e.target.value }))} placeholder="MTN, Ethio Telecom, Safaricom…" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Type <span className="required">*</span></label>
                      <select className="form-control" value={cardForm.type} onChange={e => setCardForm(p => ({ ...p, type: e.target.value }))}>
                        <option value="AIRTIME">📱 AIRTIME</option>
                        <option value="DATA">📶 DATA</option>
                        <option value="SMS">💬 SMS</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Value (ETB) <span className="required">*</span></label>
                      <input className="form-control" type="number" step="0.01" value={cardForm.value} onChange={e => setCardForm(p => ({ ...p, value: e.target.value }))} placeholder="100.00" />
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                        Enter value in Ethiopian Birr (ETB)
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">PIN (10–20 chars) <span className="required">*</span></label>
                      <input className="form-control" value={cardForm.pin} onChange={e => setCardForm(p => ({ ...p, pin: e.target.value }))} placeholder="ABCD1234WXYZ" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Expiry Date <span className="required">*</span></label>
                      <input className="form-control" type="date" value={cardForm.expiry_date} onChange={e => setCardForm(p => ({ ...p, expiry_date: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Batch Number</label>
                      <input className="form-control" value={cardForm.batch_number} onChange={e => setCardForm(p => ({ ...p, batch_number: e.target.value }))} placeholder="Optional" />
                    </div>
                  </div>
                  <div className="form-actions">
                    <button type="submit" className="btn btn-success" disabled={addingCard}>
                      {addingCard ? "Adding…" : "+ Add Card"}
                    </button>
                    <button type="button" className="btn btn-outline" onClick={() => setCardForm(emptyCard)}>Clear</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Filters + Table */}
          <div className="panel">
            <div className="filters-bar">
              <div className="filter-item">
                <div className="filter-label">Status</div>
                <select className="filter-select" value={statusF} onChange={e => setStatusF(e.target.value)}>
                  <option value="">All Statuses</option>
                  {["AVAILABLE","ALLOCATED","DELIVERED","CONFIRMED","USED","EXPIRED"].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="filter-item">
                <div className="filter-label">Type</div>
                <select className="filter-select" value={typeF} onChange={e => setTypeF(e.target.value)}>
                  <option value="">All Types</option>
                  <option value="AIRTIME"> AIRTIME</option>
                  <option value="DATA"> DATA</option>
                  <option value="SMS"> SMS</option>
                </select>
              </div>
              <div className="filter-item">
                <div className="filter-label">Provider</div>
                <select className="filter-select" value={provF} onChange={e => setProvF(e.target.value)}>
                  <option value="">All Providers</option>
                  {providers.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="filter-actions">
                <button className="btn btn-ghost btn-sm" onClick={() => { setStatusF(""); setTypeF(""); setProvF(""); }}>Clear</button>
              </div>
            </div>

            {/* Summary bar */}
            <div style={{ padding: "12px 22px", borderBottom: "1px solid var(--border)", display: "flex", gap: "20px", flexWrap: "wrap", background: "#fafbfc" }}>
              {[
                { label: "Showing", val: cards.length, color: "#0f172a" },
                { label: "Available", val: avail, color: "#15803d" },
                { label: "Allocated", val: alloc, color: "#1d4ed8" },
                { label: "Used", val: used, color: "#64748b" },
                { label: "Total Value", val: `${fmtVal(totalVal)} ETB`, color: "#0f172a" },
              ].map(s => (
                <div key={s.label} style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>{s.label}</span>
                  <span style={{ fontSize: "16px", fontWeight: 700, color: s.color }}>{s.val}</span>
                </div>
              ))}
            </div>

            {loading ? (
              <div className="loading-wrap"><div className="spinner" /><span>Loading inventory…</span></div>
            ) : cards.length === 0 ? (
              <div className="empty-state"><div className="empty-state-icon"></div><p>No cards found</p></div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th><th>UUID</th><th>Provider</th><th>Category</th><th>Package Type</th>
                      <th>Package Value</th><th>Expiry</th><th>Batch</th><th>Status</th><th>Added</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cards.map(c => {
                      const categoryIcon = c.category === "AIRTIME" ? "📱" : c.category === "VOICE" ? "📞" : c.category === "DATA" ? "📶" : "💬";
                      const categoryColor = c.category === "AIRTIME" ? "badge-blue" : c.category === "VOICE" ? "badge-teal" : c.category === "DATA" ? "badge-purple" : "badge-green";
                      return (
                        <tr key={c.id}>
                          <td className="text-secondary">{c.id}</td>
                          <td><span className="mono">{c.card_uuid}</span></td>
                          <td><span className="badge badge-blue">{c.provider || "—"}</span></td>
                          <td>
                            <span className={`badge ${categoryColor}`}>
                              {categoryIcon} {c.category || c.type}
                            </span>
                          </td>
                          <td>
                            <span className="badge badge-gray">{c.package_type || "—"}</span>
                          </td>
                          <td><strong>{c.package_value || (c.value + ' ETB')}</strong></td>
                          <td style={{ color: c.expiry_date && new Date(c.expiry_date) < new Date() ? "var(--danger)" : "inherit" }}>
                            {c.expiry_date || "—"}
                          </td>
                          <td className="text-secondary">{c.batch_number || "—"}</td>
                          <td><span className={`badge ${statusBadge(c.status)}`}>{c.status}</span></td>
                          <td className="text-secondary text-sm">{c.created_at ? new Date(c.created_at).toLocaleDateString() : "—"}</td>
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
