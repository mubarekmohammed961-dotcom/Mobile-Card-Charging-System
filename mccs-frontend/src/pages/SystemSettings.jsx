import { useEffect, useState } from "react";
import api from "../services/api";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

const GROUP_META = {
  general:      { label: "General",           icon: "",  color: "#2563eb" },
  email:        { label: "Email / SMTP",       icon: "",  color: "#7c3aed" },
  sms:          { label: "SMS / Twilio",       icon: "",  color: "#0891b2" },
  inventory:    { label: "Inventory",          icon: "",  color: "#16a34a" },
  delivery:     { label: "Delivery & Reminders", icon: "", color: "#d97706" },
  distribution: { label: "Distribution",       icon: "",  color: "#0d9488" },
  cron:         { label: "Cron Schedules",     icon: "!",  color: "#ea580c" },
  security:     { label: "Security",           icon: "",  color: "#dc2626" },
};

const CRON_PRESETS = [
  { label: "Every 1st of month 8am", value: "0 8 1 * *" },
  { label: "Daily at 9am",           value: "0 9 * * *" },
  { label: "Daily at 8am",           value: "0 8 * * *" },
  { label: "Every Sunday 2am",       value: "0 2 * * 0" },
  { label: "Every hour",             value: "0 * * * *" },
];

export default function SystemSettings() {
  const [grouped, setGrouped]     = useState({});
  const [edits, setEdits]         = useState({});
  const [health, setHealth]       = useState(null);
  const [activeTab, setActiveTab] = useState("general");
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [testTo, setTestTo]       = useState("");
  const [testing, setTesting]     = useState(false);
  const [msg, setMsg]   = useState("");
  const [err, setErr]   = useState("");
  const [showSensitive, setShowSensitive] = useState({});

  const token = localStorage.getItem("mccs_token");
  const h = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const load = async () => {
    setLoading(true); setErr("");
    try {
      const [sR, hR] = await Promise.all([
        api.get("/settings", { headers: h }),
        api.get("/settings/health", { headers: h }),
      ]);
      setGrouped(sR.data?.grouped || {});
      // Init edits with current values
      const init = {};
      (sR.data?.settings || []).forEach(s => { init[s.setting_key] = s.setting_value || ""; });
      setEdits(init);
      setHealth(hR.data?.health || null);
    } catch (e) { setErr(e.response?.data?.message || "Failed to load settings"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleChange = (key, value) => {
    setEdits(p => ({ ...p, [key]: value }));
    setMsg(""); setErr("");
  };

  const saveGroup = async (group) => {
    setMsg(""); setErr("");
    const groupSettings = grouped[group] || [];
    const updates = {};
    groupSettings.forEach(s => {
      if (edits[s.setting_key] !== undefined) updates[s.setting_key] = edits[s.setting_key];
    });
    try {
      setSaving(true);
      const r = await api.put("/settings", { updates }, { headers: h });
      setMsg(` ${r.data?.message || "Saved"}`);
    } catch (e) { setErr(e.response?.data?.message || "Save failed"); }
    finally { setSaving(false); }
  };

  const sendTestEmail = async () => {
    if (!testTo.trim()) { setErr("Enter recipient email for test."); return; }
    setMsg(""); setErr(""); setTesting(true);
    try {
      const r = await api.post("/settings/test-email", { to: testTo.trim() }, { headers: h });
      setMsg(" " + r.data.message);
    } catch (e) { setErr(e.response?.data?.message || "Test email failed"); }
    finally { setTesting(false); }
  };

  const uptimeFmt = (secs) => {
    const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = Math.floor(secs % 60);
    return `${h}h ${m}m ${s}s`;
  };

  const tabs = Object.keys(GROUP_META);
  const currentGroup = grouped[activeTab] || [];

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-area">
        <Topbar />
        <div className="page-content">
          <div className="page-header">
            <div>
              <div className="page-title">System Settings</div>
              <div className="page-subtitle">Configure SMTP, inventory thresholds, delivery rules, cron jobs and security</div>
            </div>
            <button className="btn btn-outline btn-sm" onClick={load}>Refresh</button>
          </div>

          {msg && <div className="alert alert-success"><span></span><span>{msg}</span></div>}
          {err && <div className="alert alert-error"><span>!</span><span>{err}</span></div>}

          {/* System Health Bar */}
          {health && (
            <div style={{ background: "white", border: "1px solid var(--border)", borderRadius: "12px", padding: "16px 22px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap", boxShadow: "var(--shadow-sm)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: health.db ? "#16a34a" : "#dc2626", boxShadow: `0 0 6px ${health.db ? "#16a34a" : "#dc2626"}` }} />
                <span style={{ fontWeight: 700, fontSize: "14px" }}>System {health.db ? "Online" : "DB Error"}</span>
              </div>
              <div style={{ height: "24px", width: "1px", background: "var(--border)" }} />
              <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                 Uptime: <strong>{uptimeFmt(health.uptime)}</strong>
              </span>
              <div style={{ height: "24px", width: "1px", background: "var(--border)" }} />
              <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
                {Object.entries(health.tables || {}).map(([tbl, cnt]) => (
                  <span key={tbl} style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                    <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{cnt}</span> {tbl.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: "20px", alignItems: "start" }}>

            {/* Left: Tab Navigation */}
            <div style={{ background: "white", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden", boxShadow: "var(--shadow-sm)", position: "sticky", top: "88px" }}>
              <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", fontWeight: 700, fontSize: "12px", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "1px", background: "#fafbfc" }}>
                Settings Groups
              </div>
              {tabs.map(tab => {
                const m = GROUP_META[tab] || {};
                const count = (grouped[tab] || []).length;
                return (
                  <button key={tab} onClick={() => { setActiveTab(tab); setMsg(""); setErr(""); }}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: "10px",
                      padding: "12px 16px", border: "none", background: activeTab === tab ? `${m.color}12` : "transparent",
                      cursor: "pointer", textAlign: "left", borderLeft: `3px solid ${activeTab === tab ? m.color : "transparent"}`,
                      transition: "all .15s",
                    }}>
                    <span style={{ fontSize: "18px" }}>{m.icon}</span>
                    <span style={{ flex: 1, fontSize: "13.5px", fontWeight: activeTab === tab ? 700 : 500, color: activeTab === tab ? m.color : "var(--text-primary)" }}>
                      {m.label}
                    </span>
                    <span style={{ fontSize: "11px", background: "var(--bg)", padding: "2px 7px", borderRadius: "999px", color: "var(--text-secondary)", fontWeight: 600 }}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Right: Settings Form */}
            <div>
              {loading ? (
                <div className="loading-wrap"><div className="spinner" /><span>Loading settings…</span></div>
              ) : (
                <div style={{ background: "white", border: "1px solid var(--border)", borderRadius: "12px", overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
                  {/* Panel header */}
                  <div style={{
                    padding: "18px 24px", borderBottom: "1px solid var(--border)",
                    background: `${(GROUP_META[activeTab]?.color || "#2563eb")}08`,
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ fontSize: "24px" }}>{GROUP_META[activeTab]?.icon}</span>
                      <div>
                        <div style={{ fontSize: "17px", fontWeight: 700 }}>{GROUP_META[activeTab]?.label} Settings</div>
                        <div style={{ fontSize: "12.5px", color: "var(--text-secondary)", marginTop: "1px" }}>
                          {currentGroup.length} configuration {currentGroup.length === 1 ? "item" : "items"}
                        </div>
                      </div>
                    </div>
                    <button className="btn btn-primary" disabled={saving} onClick={() => saveGroup(activeTab)}>
                      {saving ? "Saving…" : `Save ${GROUP_META[activeTab]?.label}`}
                    </button>
                  </div>

                  {/* Settings fields */}
                  <div style={{ padding: "24px" }}>
                    {currentGroup.length === 0 ? (
                      <div className="empty-state"><div className="empty-state-icon"></div><p>No settings in this group</p></div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                        {currentGroup.map(s => {
                          const isSensitive = s.is_sensitive === 1;
                          const shown = showSensitive[s.setting_key];
                          const isCron = activeTab === "cron";
                          const isBool = ["smtp_secure"].includes(s.setting_key);
                          const isNumber = ["smtp_port","low_inventory_threshold","card_expiry_alert_days","confirmation_token_days","max_distribution_retries","max_csv_size_mb","rate_limit_per_hour"].includes(s.setting_key);

                          return (
                            <div key={s.setting_key} style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: "20px", padding: "18px", background: "#fafbfc", borderRadius: "10px", border: "1px solid var(--border)", alignItems: "start" }}>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "4px" }}>{s.label}</div>
                                <div style={{ fontSize: "12.5px", color: "var(--text-secondary)", marginBottom: "6px" }}>{s.description}</div>
                                <code style={{ fontSize: "11px", background: "#e2e8f0", padding: "2px 8px", borderRadius: "5px", color: "#475569" }}>{s.setting_key}</code>
                                {isSensitive && <span className="badge badge-red" style={{ marginLeft: "6px", fontSize: "10px" }}> Sensitive</span>}
                              </div>

                              <div>
                                {isBool ? (
                                  <select
                                    className="form-control"
                                    value={edits[s.setting_key] || "false"}
                                    onChange={e => handleChange(s.setting_key, e.target.value)}
                                  >
                                    <option value="false">false — TLS (recommended)</option>
                                    <option value="true">true — SSL</option>
                                  </select>
                                ) : isCron ? (
                                  <div>
                                    <input
                                      className="form-control"
                                      value={edits[s.setting_key] || ""}
                                      onChange={e => handleChange(s.setting_key, e.target.value)}
                                      placeholder="cron expression e.g. 0 8 1 * *"
                                      style={{ fontFamily: "monospace", marginBottom: "8px" }}
                                    />
                                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                                      {CRON_PRESETS.map(p => (
                                        <button key={p.value} type="button"
                                          onClick={() => handleChange(s.setting_key, p.value)}
                                          style={{
                                            padding: "3px 10px", borderRadius: "6px", border: "1px solid var(--border)",
                                            background: edits[s.setting_key] === p.value ? "var(--primary)" : "white",
                                            color: edits[s.setting_key] === p.value ? "white" : "var(--text-secondary)",
                                            fontSize: "11.5px", cursor: "pointer", fontWeight: 500,
                                          }}>
                                          {p.label}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                ) : isNumber ? (
                                  <input
                                    className="form-control"
                                    type="number"
                                    value={edits[s.setting_key] || ""}
                                    onChange={e => handleChange(s.setting_key, e.target.value)}
                                    placeholder={`e.g. ${s.setting_value}`}
                                  />
                                ) : (
                                  <div style={{ position: "relative" }}>
                                    <input
                                      className="form-control"
                                      type={isSensitive && !shown ? "password" : "text"}
                                      value={edits[s.setting_key] || ""}
                                      onChange={e => handleChange(s.setting_key, e.target.value)}
                                      placeholder={isSensitive ? "Enter value…" : `e.g. ${s.setting_value || s.label}`}
                                      style={{ paddingRight: isSensitive ? "42px" : "12px" }}
                                    />
                                    {isSensitive && (
                                      <button type="button"
                                        onClick={() => setShowSensitive(p => ({ ...p, [s.setting_key]: !p[s.setting_key] }))}
                                        style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: "15px", color: "var(--text-muted)" }}>
                                        {shown ? "Hide" : "Show"}
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* SMTP Test Email — shown only on email tab */}
                    {activeTab === "email" && (
                      <div style={{ marginTop: "24px", padding: "18px", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "10px" }}>
                        <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "4px" }}> Test SMTP Connection</div>
                        <div style={{ fontSize: "12.5px", color: "var(--text-secondary)", marginBottom: "14px" }}>
                          Save SMTP settings first, then send a test email to verify the configuration works.
                        </div>
                        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                          <input
                            className="form-control"
                            type="email"
                            value={testTo}
                            onChange={e => setTestTo(e.target.value)}
                            placeholder="recipient@email.com"
                            style={{ maxWidth: "280px" }}
                          />
                          <button className="btn btn-primary" onClick={sendTestEmail} disabled={testing || !testTo.trim()}>
                            {testing ? "Sending…" : "Send Test Email"}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Cron help */}
                    {activeTab === "cron" && (
                      <div style={{ marginTop: "20px", padding: "16px", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: "10px" }}>
                        <div style={{ fontWeight: 700, marginBottom: "8px", fontSize: "13.5px" }}>! Cron Expression Format</div>
                        <code style={{ fontSize: "13px", background: "#fef3c7", padding: "4px 10px", borderRadius: "6px", display: "block", marginBottom: "8px" }}>
                          ┌───── minute (0-59)<br/>
                          │ ┌───── hour (0-23)<br/>
                          │ │ ┌───── day of month (1-31)<br/>
                          │ │ │ ┌───── month (1-12)<br/>
                          │ │ │ │ ┌───── day of week (0-7, Sun=0)<br/>
                          * * * * *
                        </code>
                        <div style={{ fontSize: "12.5px", color: "var(--text-secondary)" }}>
                          ! Changes to cron schedules take effect after restarting the backend server.
                        </div>
                      </div>
                    )}

                    {/* Security info */}
                    {activeTab === "security" && (
                      <div style={{ marginTop: "20px", padding: "16px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "10px" }}>
                        <div style={{ fontWeight: 700, marginBottom: "8px", fontSize: "13.5px" }}> Security Notes</div>
                        <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12.5px", color: "var(--text-secondary)", lineHeight: "1.8" }}>
                          <li>Card PINs are encrypted with <strong>AES-256-GCM</strong> — encryption key is set via <code>CARD_ENCRYPTION_KEY</code> env variable</li>
                          <li>JWT secret is set via <code>JWT_SECRET</code> env variable — never stored in DB</li>
                          <li>Passwords are hashed with <strong>bcrypt (cost 12)</strong></li>
                          <li>Rate limiting applies to distribution endpoints</li>
                          <li>CSV uploads are validated for file type and max size</li>
                        </ul>
                      </div>
                    )}

                    {/* Save button bottom */}
                    {currentGroup.length > 0 && (
                      <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end", paddingTop: "16px", borderTop: "1px solid var(--border)" }}>
                        <button className="btn btn-primary btn-lg" disabled={saving} onClick={() => saveGroup(activeTab)}>
                          {saving ? "Saving…" : `Save ${GROUP_META[activeTab]?.label} Settings`}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
