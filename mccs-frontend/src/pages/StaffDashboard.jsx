import { useEffect, useState } from "react";
import api from "../services/api";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

const fv = v => Number(v || 0).toFixed(2);
const fn = v => Number(v || 0).toLocaleString();

/* ── Card type display config ── */
const cardTypeMeta = {
  AIRTIME: {
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
    color: "#1d4ed8", bg: "#dbeafe", label: "Airtime",
  },
  DATA: {
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
    color: "#5b21b6", bg: "#ede9fe", label: "Data",
  },
  SMS: {
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
    color: "#0f766e", bg: "#ccfbf1", label: "SMS",
  },
};

const deliveryStatusMeta = {
  PENDING:   { color: "#92400e", bg: "#fef3c7", label: "Pending"   },
  SENT:      { color: "#1d4ed8", bg: "#dbeafe", label: "Sent"      },
  DELIVERED: { color: "#5b21b6", bg: "#ede9fe", label: "Delivered" },
  CONFIRMED: { color: "#15803d", bg: "#dcfce7", label: "Confirmed" },
  EXPIRED:   { color: "#b91c1c", bg: "#fee2e2", label: "Expired"   },
};

/* ── Days remaining helper (BR-005 — 7-day confirmation window) ── */
function daysRemaining(expiry) {
  if (!expiry) return null;
  const diff = Math.ceil((new Date(expiry) - new Date()) / (1000 * 60 * 60 * 24));
  return diff;
}

/* ══════════════════════════════════════════════════════════════
   PIN CARD MODAL — FR-030, BR-006
   Secure view: PIN hidden by default, revealed on user action
══════════════════════════════════════════════════════════════ */
function PinModal({ card, onClose, onConfirm, confirming }) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [showPin, setShowPin] = useState(false);
  if (!card) return null;
  const tm = cardTypeMeta[card.type] || cardTypeMeta.AIRTIME;
  const days = daysRemaining(card.token_expiry);

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.6)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <div style={{ background:"white", borderRadius:22, width:"100%", maxWidth:500, boxShadow:"0 32px 72px rgba(0,0,0,.28)", overflow:"hidden" }}>

        {/* Header */}
        <div style={{ background:"linear-gradient(135deg,#0f172a,#1e3a8a,#2563eb)", padding:"24px 28px", color:"white", position:"relative" }}>
          <div style={{ fontSize:12, color:"#93c5fd", fontWeight:700, textTransform:"uppercase", letterSpacing:1.2, marginBottom:6 }}>
            Secure Card View — PIN Protected
          </div>
          <div style={{ fontSize:22, fontWeight:900 }}>{card.provider} {card.type}</div>
          <div style={{ fontSize:14, color:"#bfdbfe", marginTop:4 }}>
            Value: <strong>${fv(card.value)}</strong>
            {card.expiry_date && <> · Expires: {new Date(card.expiry_date).toLocaleDateString("en-US",{year:"numeric",month:"short",day:"numeric"})}</>}
          </div>
          {/* BR-005: show days remaining */}
          {days !== null && days > 0 && card.delivery_status !== "CONFIRMED" && (
            <div style={{ position:"absolute", top:16, right:20, background: days <= 2 ? "#dc2626" : days <= 4 ? "#d97706" : "#16a34a", color:"white", fontSize:11, fontWeight:800, padding:"4px 10px", borderRadius:999 }}>
              {days}d to confirm
            </div>
          )}
        </div>

        <div style={{ padding:"24px 28px" }}>
          {/* Card details grid */}
          <div style={{ background:"#f8fafc", borderRadius:12, padding:16, marginBottom:20, display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            {[
              { label:"Provider",   val: card.provider },
              { label:"Type",       val: card.type },
              { label:"Value",      val: `$${fv(card.value)}` },
              { label:"Expiry",     val: card.expiry_date ? new Date(card.expiry_date).toLocaleDateString("en-US",{year:"numeric",month:"short",day:"numeric"}) : "—" },
              { label:"Staff",      val: card.staff_name },
              { label:"Month",      val: card.month ? new Date(card.month).toLocaleDateString("en-US",{year:"numeric",month:"long"}) : "—" },
            ].map(r => (
              <div key={r.label} style={{ display:"flex", flexDirection:"column", gap:2 }}>
                <span style={{ fontSize:10.5, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:".6px" }}>{r.label}</span>
                <span style={{ fontSize:13.5, fontWeight:600, color:"#0f172a" }}>{r.val}</span>
              </div>
            ))}
          </div>

          {/* PIN box — BR-006: hidden by default */}
          <div style={{ background:"linear-gradient(135deg,#1e3a8a,#2563eb)", borderRadius:14, padding:"20px 24px", textAlign:"center", marginBottom:20 }}>
            <div style={{ fontSize:11, color:"#93c5fd", fontWeight:700, textTransform:"uppercase", letterSpacing:1.2, marginBottom:10 }}>
              Your Card PIN — {showPin ? "Visible (keep private)" : "Hidden for security"}
            </div>
            <div style={{
              fontSize: showPin ? 34 : 22,
              fontWeight:900, color:"white",
              letterSpacing: showPin ? 10 : 5,
              fontFamily:"'Courier New', monospace",
              marginBottom:14,
              minHeight:44,
              display:"flex", alignItems:"center", justifyContent:"center",
            }}>
              {showPin ? (card.pin || "DECRYPTION ERROR") : "• • • • • • • •"}
            </div>
            <button onClick={() => setShowPin(p => !p)} style={{
              padding:"8px 22px", borderRadius:8,
              border:"1px solid rgba(255,255,255,.3)",
              background: showPin ? "rgba(220,38,38,.25)" : "rgba(255,255,255,.15)",
              color:"white", cursor:"pointer", fontSize:13, fontWeight:700,
              transition:"all .15s",
            }}>
              {showPin ? "Hide PIN" : "Reveal PIN"}
            </button>
          </div>

          {/* Confirm section */}
          {card.delivery_status !== "CONFIRMED" ? (
            <>
              {/* Acknowledge checkbox */}
              <label style={{ display:"flex", alignItems:"flex-start", gap:10, marginBottom:18, cursor:"pointer", padding:"12px 14px", background:"#f8fafc", borderRadius:10, border:"1.5px solid #e2e8f0" }}>
                <input type="checkbox" checked={acknowledged} onChange={e => setAcknowledged(e.target.checked)}
                  style={{ width:18, height:18, marginTop:2, cursor:"pointer", accentColor:"#16a34a", flexShrink:0 }} />
                <span style={{ fontSize:13.5, color:"#374151", lineHeight:1.6 }}>
                  I confirm I have received and noted my card PIN. I understand this acknowledgement is recorded for audit purposes.
                </span>
              </label>
              <div style={{ display:"flex", gap:10 }}>
                <button
                  onClick={() => acknowledged && onConfirm(card.confirmation_token)}
                  disabled={!acknowledged || confirming}
                  style={{
                    flex:1, padding:"13px", borderRadius:12, border:"none",
                    background: acknowledged ? "linear-gradient(135deg,#15803d,#16a34a)" : "#e2e8f0",
                    color: acknowledged ? "white" : "#94a3b8",
                    fontWeight:800, fontSize:15, cursor: acknowledged ? "pointer" : "not-allowed",
                    transition:"all .15s",
                    boxShadow: acknowledged ? "0 4px 14px rgba(22,163,74,.4)" : "none",
                  }}
                >
                  {confirming ? "Confirming…" : "Acknowledge Receipt"}
                </button>
                <button onClick={onClose} style={{
                  padding:"13px 20px", borderRadius:12, border:"1.5px solid #e2e8f0",
                  background:"white", color:"#475569", fontWeight:600, cursor:"pointer",
                }}>
                  Close
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={{ padding:"14px 16px", borderRadius:12, background:"#f0fdf4", border:"1px solid #86efac", color:"#15803d", fontWeight:700, fontSize:14, textAlign:"center", marginBottom:10 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ verticalAlign:"middle", marginRight:6 }}><polyline points="20 6 9 17 4 12"/></svg>
                Already Confirmed — Thank you!
              </div>
              <button onClick={onClose} style={{ width:"100%", padding:"12px", borderRadius:12, border:"1.5px solid #e2e8f0", background:"white", color:"#475569", fontWeight:600, cursor:"pointer" }}>
                Close
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN STAFF DASHBOARD
   FR-014, FR-029–033, FR-034, BR-001, BR-002, BR-005
══════════════════════════════════════════════════════════════ */
export default function StaffDashboard() {
  const [profile,       setProfile]       = useState(null);
  const [pending,       setPending]       = useState([]);
  const [history,       setHistory]       = useState([]);
  const [monthly,       setMonthly]       = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [err,           setErr]           = useState("");
  const [activeTab,     setActiveTab]     = useState("pending");
  const [selectedCard,  setSelected]      = useState(null);
  const [cardLoading,   setCardLoading]   = useState(false);
  const [confirming,    setConfirming]    = useState(false);
  const [confMsg,       setConfMsg]       = useState("");
  const [markingUsedId, setMarkingUsedId] = useState(null);

  const token = localStorage.getItem("mccs_token");
  const h = { Authorization: `Bearer ${token}` };

  const load = async () => {
    setLoading(true); setErr("");
    try {
      const prR = await api.get("/staff-dashboard/profile", { headers: h }).catch(() => ({ data: { staff: null } }));
      setProfile(prR.data?.staff || null);
      if (prR.data?.staff) {
        const [pR, hR, mR] = await Promise.all([
          api.get("/staff-dashboard/pending",        { headers: h }),
          api.get("/staff-dashboard/history",        { headers: h }),
          api.get("/staff-dashboard/monthly-status", { headers: h }),
        ]);
        setPending(pR.data?.pending        || []);
        setHistory(hR.data?.history        || []);
        setMonthly(mR.data?.monthly_status || []);
      }
    } catch (e) {
      setErr(e.response?.data?.message || "Failed to load dashboard.");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  /* FR-030: View card + decrypted PIN */
  const handleViewCard = async (deliveryToken) => {
    setCardLoading(true);
    try {
      const r = await api.get(`/staff-dashboard/card/${deliveryToken}`, { headers: h });
      setSelected(r.data?.card || null);
    } catch (e) { setErr(e.response?.data?.message || "Failed to load card details"); }
    finally { setCardLoading(false); }
  };

  /* FR-031, FR-033: Acknowledge receipt */
  const handleConfirm = async (confirmToken) => {
    setConfirming(true);
    try {
      await api.post("/confirmations", { token: confirmToken }, { headers: h });
      setConfMsg("Receipt confirmed! Your card delivery is now complete.");
      setSelected(null);
      load();
    } catch (e) { setErr(e.response?.data?.message || "Confirmation failed"); }
    finally { setConfirming(false); }
  };

  /* FR-034: Staff marks card as used */
  const handleMarkUsed = async (cardId) => {
    if (!profile) return;
    setMarkingUsedId(cardId);
    try {
      await api.post("/usage", { card_id: cardId, staff_id: profile.id, remarks: "Marked used by staff" }, { headers: h });
      setConfMsg("Card marked as USED successfully.");
      load();
    } catch (e) { setErr(e.response?.data?.message || "Failed to mark as used"); }
    finally { setMarkingUsedId(null); }
  };

  const confirmedCount = history.filter(h => h.delivery_status === "CONFIRMED").length;
  const usedCount      = history.filter(h => h.marked_used_at).length;
  /* BR-002: check if any previous month unconfirmed */
  const hasOldUnconfirmed = pending.some(p => {
    if (!p.month) return false;
    const cardMonth = new Date(p.month);
    const now = new Date();
    return cardMonth.getFullYear() < now.getFullYear() || cardMonth.getMonth() < now.getMonth();
  });

  const u = (() => { try { return JSON.parse(localStorage.getItem("mccs_user")||"{}"); } catch { return {}; } })();
  const isAdmin = ["SUPER_ADMIN","SYSTEM_ADMIN","STORE_OFFICER","AUDITOR"].includes(u.role);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-area">
        <Topbar />
        <div className="page-content" style={{ background:"#f1f5f9", minHeight:"100vh" }}>

          {selectedCard && (
            <PinModal card={selectedCard} onClose={() => setSelected(null)} onConfirm={handleConfirm} confirming={confirming} />
          )}

          {err    && <div className="alert alert-error"   style={{ marginBottom:16 }}><span>!</span><span>{err}</span></div>}
          {confMsg && <div className="alert alert-success" style={{ marginBottom:16 }}><span></span><span>{confMsg}</span></div>}

          {loading ? (
            <div className="loading-wrap"><div className="spinner" style={{ width:28, height:28 }} /><span>Loading your cards…</span></div>

          ) : !profile ? (
            /* ── No staff record — role-aware ── */
            <div style={{ background:"white", borderRadius:20, border:"1px solid #e2e8f0", padding:"48px 40px", textAlign:"center", boxShadow:"0 4px 20px rgba(0,0,0,.06)", maxWidth:600, margin:"0 auto" }}>
              <div style={{ width:72, height:72, borderRadius:"50%", background: isAdmin ? "#eff6ff" : "#f0fdf4", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px" }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={isAdmin ? "#2563eb" : "#16a34a"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
              </div>
              {isAdmin ? (
                <>
                  <div style={{ fontSize:20, fontWeight:800, marginBottom:8, color:"#0f172a" }}>My Cards — Admin View</div>
                  <div style={{ fontSize:14, color:"#64748b", lineHeight:1.7, marginBottom:24 }}>
                    Your account <strong>({u.email})</strong> — role <strong>{u.role?.replace(/_/g," ")}</strong>.<br/>
                    This page is for <strong>Staff</strong> members who receive monthly card allocations.<br/>
                    Use the admin modules below to manage the card system.
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, textAlign:"left", marginBottom:20 }}>
                    {[
                      { label:"Card Inventory",       path:"/inventory",   desc:"Upload and manage card stock" },
                      { label:"Monthly Distribution", path:"/allocations", desc:"Preview and confirm allocations" },
                      { label:"Deliveries",           path:"/deliveries",  desc:"Send PINs and track delivery" },
                      { label:"Usage Tracking",       path:"/usage",       desc:"Mark cards as used" },
                      { label:"Reports",              path:"/reports",     desc:"Export distribution reports" },
                      { label:"Audit Logs",           path:"/audit-logs",  desc:"Full system action trail" },
                    ].map(s => (
                      <a key={s.path} href={s.path} style={{ padding:"14px 16px", borderRadius:10, border:"1.5px solid #e2e8f0", background:"#f8fafc", display:"block", transition:"all .15s", textDecoration:"none" }}
                        onMouseEnter={e=>{e.currentTarget.style.borderColor="#2563eb";e.currentTarget.style.background="#eff6ff";}}
                        onMouseLeave={e=>{e.currentTarget.style.borderColor="#e2e8f0";e.currentTarget.style.background="#f8fafc";}}>
                        <div style={{ fontWeight:700, fontSize:13.5, color:"#0f172a", marginBottom:3 }}>{s.label}</div>
                        <div style={{ fontSize:12, color:"#64748b" }}>{s.desc}</div>
                      </a>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize:20, fontWeight:800, marginBottom:8, color:"#0f172a" }}>No Staff Record Linked</div>
                  <div style={{ fontSize:14, color:"#64748b", lineHeight:1.7, marginBottom:24 }}>
                    Your account <strong>({u.email})</strong> is not linked to a staff record.<br/>
                    Ask your administrator to create a staff record with this email address.
                  </div>
                </>
              )}
              <div style={{ padding:"12px 16px", background:"#f0f9ff", borderRadius:8, border:"1px solid #bae6fd", fontSize:13, color:"#0369a1" }}>
                {isAdmin
                  ? <>To test the staff view, create a staff record with email <strong>{u.email}</strong> in <a href="/staff" style={{ color:"#1d4ed8", fontWeight:700 }}>Staff Management</a>.</>
                  : <>Contact your system administrator to link your account.</>
                }
              </div>
            </div>

          ) : (
            <>
              {/* ── Hero Banner ── */}
              <div style={{ background:"linear-gradient(135deg,#0f172a,#1e3a8a,#312e81)", borderRadius:20, padding:"28px 32px", marginBottom:24, position:"relative", overflow:"hidden", boxShadow:"0 8px 32px rgba(15,23,42,.25)" }}>
                <div style={{ position:"absolute", top:-40, right:-40, width:200, height:200, borderRadius:"50%", background:"rgba(99,102,241,.15)" }} />
                <div style={{ position:"relative", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:16 }}>
                  <div>
                    <div style={{ fontSize:12, color:"#93c5fd", fontWeight:700, textTransform:"uppercase", letterSpacing:1.2, marginBottom:6 }}>My Cards — Staff Dashboard</div>
                    <div style={{ fontSize:26, fontWeight:900, color:"white", marginBottom:4 }}>{profile?.full_name}</div>
                    <div style={{ fontSize:13.5, color:"#94a3b8" }}>
                      {profile?.employee_id} · {profile?.department_name} · {profile?.designation}
                    </div>
                  </div>
                  <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
                    {[
                      { label:"Pending",   val: pending.length,   color:"#fb923c" },
                      { label:"Confirmed", val: confirmedCount,   color:"#34d399" },
                      { label:"Used",      val: usedCount,        color:"#a78bfa" },
                      { label:"Total",     val: history.length,   color:"#60a5fa" },
                    ].map(s => (
                      <div key={s.label} style={{ background:"rgba(255,255,255,.1)", borderRadius:12, padding:"12px 18px", backdropFilter:"blur(10px)", border:"1px solid rgba(255,255,255,.1)", textAlign:"center", minWidth:80 }}>
                        <div style={{ fontSize:22, fontWeight:900, color:s.color }}>{s.val}</div>
                        <div style={{ fontSize:11, color:"#94a3b8", marginTop:2, fontWeight:700 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* BR-002: Unconfirmed from previous month warning */}
              {hasOldUnconfirmed && (
                <div style={{ background:"linear-gradient(135deg,#7f1d1d,#dc2626)", borderRadius:14, padding:"14px 20px", marginBottom:20, color:"white", display:"flex", alignItems:"center", gap:14 }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  <div>
                    <div style={{ fontWeight:800, fontSize:14, marginBottom:2 }}>Previous Month Card Unconfirmed</div>
                    <div style={{ fontSize:13, opacity:.9 }}>You have unconfirmed cards from a previous month. New allocations may be blocked until you confirm them (BR-002).</div>
                  </div>
                </div>
              )}

              {/* ── Monthly Quota Cards — FR-013, BR-001 ── */}
              {monthly.length > 0 && (
                <div style={{ display:"grid", gridTemplateColumns:`repeat(${Math.min(monthly.length, 3)},1fr)`, gap:16, marginBottom:20 }}>
                  {monthly.map(m => {
                    const meta = cardTypeMeta[m.card_type] || cardTypeMeta.AIRTIME;
                    const isMaxed = m.remaining === 0;
                    return (
                      <div key={m.card_type} style={{ background:"white", borderRadius:16, padding:"20px 22px", border:`1px solid ${isMaxed ? "#fca5a5" : "#e2e8f0"}`, boxShadow:"0 1px 6px rgba(0,0,0,.06)" }}>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                            <div style={{ width:40, height:40, borderRadius:10, background:meta.bg, display:"flex", alignItems:"center", justifyContent:"center", color:meta.color }}>
                              {meta.icon}
                            </div>
                            <div>
                              <div style={{ fontSize:12, color:"#64748b", fontWeight:700, textTransform:"uppercase", letterSpacing:".5px" }}>Monthly Quota</div>
                              <div style={{ fontSize:15, fontWeight:800, color:meta.color }}>{meta.label}</div>
                            </div>
                          </div>
                          <span style={{ background: isMaxed ? "#fee2e2" : meta.bg, color: isMaxed ? "#b91c1c" : meta.color, fontSize:13, fontWeight:800, padding:"4px 12px", borderRadius:999 }}>
                            {m.consumed} / {m.monthly_quota}
                          </span>
                        </div>
                        <div style={{ height:8, background:"#f1f5f9", borderRadius:999, overflow:"hidden", marginBottom:8 }}>
                          <div style={{ height:"100%", width:`${Math.min(m.percentage,100)}%`, background: isMaxed ? "#dc2626" : meta.color, borderRadius:999, transition:"width .6s" }} />
                        </div>
                        <div style={{ display:"flex", justifyContent:"space-between", fontSize:12.5, color:"#64748b" }}>
                          <span>Used this month: <strong>{m.consumed}</strong></span>
                          <span style={{ color: m.remaining > 0 ? "#15803d" : "#dc2626", fontWeight:700 }}>
                            {m.remaining > 0 ? `${m.remaining} remaining` : "Quota reached"}
                          </span>
                        </div>
                        {/* BR-001 hint */}
                        <div style={{ marginTop:8, fontSize:11.5, color:"#94a3b8" }}>
                          Max {m.monthly_quota} card{m.monthly_quota !== 1 ? "s" : ""} per month (BR-001)
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── Tabs ── */}
              <div style={{ display:"flex", gap:4, padding:4, background:"#e2e8f0", borderRadius:10, marginBottom:20, width:"fit-content" }}>
                {[
                  { key:"pending", label:`Pending (${pending.length})` },
                  { key:"history", label:`History (${history.length})` },
                  { key:"profile", label:"My Profile & Eligibility"     },
                ].map(t => (
                  <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
                    padding:"9px 22px", borderRadius:7, border:"none",
                    background: activeTab === t.key ? "white" : "transparent",
                    color: activeTab === t.key ? "var(--primary)" : "var(--text-secondary)",
                    fontWeight: activeTab === t.key ? 700 : 500,
                    boxShadow: activeTab === t.key ? "0 1px 4px rgba(0,0,0,.1)" : "none",
                    cursor:"pointer", fontSize:13.5, transition:"all .15s",
                    position:"relative",
                  }}>
                    {t.label}
                    {/* Badge on pending tab */}
                    {t.key === "pending" && pending.length > 0 && (
                      <span style={{ position:"absolute", top:-4, right:-4, background:"#ef4444", color:"white", fontSize:10, fontWeight:800, width:17, height:17, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center" }}>
                        {pending.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* ══ TAB: PENDING (FR-029, FR-032) ══ */}
              {activeTab === "pending" && (
                <div style={{ background:"white", borderRadius:16, border:"1px solid #e2e8f0", overflow:"hidden", boxShadow:"0 1px 6px rgba(0,0,0,.06)" }}>
                  <div style={{ padding:"16px 22px", borderBottom:"1px solid #e2e8f0", background:"linear-gradient(to bottom,#fafbfc,#f6f8fb)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div>
                      <div style={{ fontSize:15, fontWeight:800, color:"#0f172a" }}>Pending Card Confirmations</div>
                      <div style={{ fontSize:12.5, color:"#64748b", marginTop:2 }}>Cards sent to you awaiting your acknowledgement — FR-029/032</div>
                    </div>
                    <button className="btn btn-outline btn-sm" onClick={load}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                      Refresh
                    </button>
                  </div>

                  {pending.length === 0 ? (
                    <div style={{ padding:52, textAlign:"center" }}>
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin:"0 auto 14px" }}><polyline points="20 6 9 17 4 12"/></svg>
                      <div style={{ fontSize:17, fontWeight:700, color:"#0f172a", marginBottom:6 }}>All caught up!</div>
                      <div style={{ fontSize:13.5, color:"#64748b" }}>No pending card confirmations right now.</div>
                    </div>
                  ) : (
                    <div style={{ padding:20, display:"flex", flexDirection:"column", gap:14 }}>
                      {pending.map(item => {
                        const tm  = cardTypeMeta[item.type] || cardTypeMeta.AIRTIME;
                        const dsm = deliveryStatusMeta[item.delivery_status] || deliveryStatusMeta.PENDING;
                        const isExpired = item.token_expiry && new Date(item.token_expiry) < new Date();
                        const days = daysRemaining(item.token_expiry);
                        const isUrgent = days !== null && days <= 2 && !isExpired;

                        return (
                          <div key={item.distribution_item_id} style={{
                            border:`2px solid ${isExpired ? "#fca5a5" : isUrgent ? "#fed7aa" : "#bfdbfe"}`,
                            borderRadius:14, overflow:"hidden",
                            background: isExpired ? "#fff9f9" : isUrgent ? "#fffbeb" : "#f8faff",
                            boxShadow:"0 1px 6px rgba(0,0,0,.06)",
                          }}>
                            {/* Urgency banner — BR-005 */}
                            {isUrgent && (
                              <div style={{ background:"linear-gradient(90deg,#92400e,#d97706)", padding:"7px 18px", fontSize:12.5, color:"white", fontWeight:700, display:"flex", alignItems:"center", gap:8 }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/></svg>
                                Action required! Only {days} day{days !== 1 ? "s" : ""} left to confirm — BR-005
                              </div>
                            )}
                            {isExpired && (
                              <div style={{ background:"linear-gradient(90deg,#7f1d1d,#dc2626)", padding:"7px 18px", fontSize:12.5, color:"white", fontWeight:700, display:"flex", alignItems:"center", gap:8 }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                                Confirmation token expired — contact admin to resend
                              </div>
                            )}

                            <div style={{ padding:20, display:"flex", alignItems:"center", gap:18, flexWrap:"wrap" }}>
                              {/* Card type icon */}
                              <div style={{ width:60, height:60, borderRadius:14, background:tm.bg, display:"flex", alignItems:"center", justifyContent:"center", color:tm.color, flexShrink:0 }}>
                                {tm.icon}
                              </div>

                              {/* Details */}
                              <div style={{ flex:1, minWidth:180 }}>
                                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5, flexWrap:"wrap" }}>
                                  <span style={{ fontSize:17, fontWeight:900, color:"#0f172a" }}>{item.provider} {item.type}</span>
                                  <span style={{ background:dsm.bg, color:dsm.color, fontSize:11.5, fontWeight:700, padding:"2px 9px", borderRadius:999 }}>{dsm.label}</span>
                                  {days !== null && !isExpired && (
                                    <span style={{ background: days <= 2 ? "#fee2e2" : days <= 4 ? "#fef3c7" : "#dcfce7", color: days <= 2 ? "#b91c1c" : days <= 4 ? "#92400e" : "#15803d", fontSize:11, fontWeight:700, padding:"2px 9px", borderRadius:999 }}>
                                      {days}d left
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize:26, fontWeight:900, color:"#0f172a", marginBottom:4 }}>${fv(item.value)}</div>
                                <div style={{ fontSize:12, color:"#64748b" }}>
                                  Month: <strong>{item.month ? new Date(item.month).toLocaleDateString("en-US",{year:"numeric",month:"long"}) : "—"}</strong>
                                  {" · "}Allocated: {item.allocated_at ? new Date(item.allocated_at).toLocaleDateString() : "—"}
                                  {item.token_expiry && <>{" · "}Confirm by: <strong style={{ color: isUrgent ? "#d97706" : isExpired ? "#dc2626" : "#64748b" }}>{new Date(item.token_expiry).toLocaleDateString()}</strong></>}
                                </div>
                              </div>

                              {/* Action button — US-03: one-click confirm */}
                              <div style={{ flexShrink:0 }}>
                                {!isExpired && item.confirmation_token ? (
                                  <button
                                    onClick={() => handleViewCard(item.confirmation_token)}
                                    disabled={cardLoading}
                                    style={{
                                      padding:"12px 22px", borderRadius:12, border:"none",
                                      background:"linear-gradient(135deg,#1e3a8a,#2563eb)", color:"white",
                                      fontWeight:800, fontSize:14, cursor:"pointer",
                                      boxShadow:"0 4px 14px rgba(37,99,235,.35)",
                                      display:"flex", alignItems:"center", gap:8,
                                    }}
                                  >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                                    {cardLoading ? "Loading…" : "View PIN & Confirm"}
                                  </button>
                                ) : (
                                  <span style={{ fontSize:12.5, color:"#dc2626", fontWeight:700, background:"#fee2e2", padding:"8px 14px", borderRadius:8 }}>
                                    Token Expired
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ══ TAB: HISTORY (FR-014, FR-034) ══ */}
              {activeTab === "history" && (
                <div style={{ background:"white", borderRadius:16, border:"1px solid #e2e8f0", overflow:"hidden", boxShadow:"0 1px 6px rgba(0,0,0,.06)" }}>
                  <div style={{ padding:"16px 22px", borderBottom:"1px solid #e2e8f0", background:"linear-gradient(to bottom,#fafbfc,#f6f8fb)" }}>
                    <div style={{ fontSize:15, fontWeight:800, color:"#0f172a" }}>My Card History</div>
                    <div style={{ fontSize:12.5, color:"#64748b", marginTop:2 }}>All cards allocated to you — personal distribution history (FR-014)</div>
                  </div>

                  {history.length === 0 ? (
                    <div className="empty-state">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom:12 }}><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                      <p>No card history yet</p>
                    </div>
                  ) : (
                    <div className="table-container">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Card</th><th>Value</th><th>Month</th>
                            <th>Delivery</th><th>Confirmed</th><th>Usage</th><th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {history.map(item => {
                            const tm  = cardTypeMeta[item.type] || cardTypeMeta.AIRTIME;
                            const dsm = deliveryStatusMeta[item.delivery_status] || deliveryStatusMeta.PENDING;
                            const isUsed      = !!item.marked_used_at;
                            const isConfirmed = item.delivery_status === "CONFIRMED";
                            const canMarkUsed = item.card_status === "ALLOCATED" && isConfirmed && !isUsed;
                            return (
                              <tr key={item.distribution_item_id}>
                                <td>
                                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                                    <div style={{ width:36, height:36, borderRadius:9, background:tm.bg, display:"flex", alignItems:"center", justifyContent:"center", color:tm.color, flexShrink:0 }}>
                                      {tm.icon}
                                    </div>
                                    <div>
                                      <div style={{ fontWeight:700, fontSize:13 }}>{item.provider}</div>
                                      <span style={{ background:tm.bg, color:tm.color, padding:"2px 8px", borderRadius:5, fontSize:11, fontWeight:700 }}>{item.type}</span>
                                    </div>
                                  </div>
                                </td>
                                <td><strong style={{ fontSize:15 }}>${fv(item.value)}</strong></td>
                                <td className="text-secondary text-sm">{item.month ? new Date(item.month).toLocaleDateString("en-US",{year:"numeric",month:"short"}) : "—"}</td>
                                <td><span style={{ background:dsm.bg, color:dsm.color, padding:"3px 10px", borderRadius:6, fontSize:11.5, fontWeight:700 }}>{dsm.label}</span></td>
                                <td className="text-secondary text-sm">{item.confirmed_at ? new Date(item.confirmed_at).toLocaleDateString() : "—"}</td>
                                <td>
                                  {isUsed
                                    ? <span style={{ background:"#f1f5f9", color:"#475569", padding:"3px 10px", borderRadius:6, fontSize:11.5, fontWeight:700 }}>Used {new Date(item.marked_used_at).toLocaleDateString()}</span>
                                    : <span style={{ color:"#94a3b8", fontSize:12 }}>Not used yet</span>
                                  }
                                </td>
                                <td>
                                  {/* FR-034: Mark as used */}
                                  {canMarkUsed && (
                                    <button
                                      className="btn btn-primary btn-sm"
                                      onClick={() => handleMarkUsed(item.card_id)}
                                      disabled={markingUsedId === item.card_id}
                                    >
                                      {markingUsedId === item.card_id ? "…" : "Mark as Used"}
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ══ TAB: PROFILE & ELIGIBILITY (FR-014) ══ */}
              {activeTab === "profile" && (
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
                  {/* Profile */}
                  <div style={{ background:"white", borderRadius:16, border:"1px solid #e2e8f0", overflow:"hidden", boxShadow:"0 1px 6px rgba(0,0,0,.06)" }}>
                    <div style={{ padding:"16px 22px", borderBottom:"1px solid #e2e8f0", background:"linear-gradient(to bottom,#fafbfc,#f6f8fb)" }}>
                      <div style={{ fontSize:15, fontWeight:800 }}>My Profile</div>
                      <div style={{ fontSize:12.5, color:"#64748b", marginTop:2 }}>Your staff record details</div>
                    </div>
                    <div style={{ padding:22 }}>
                      {/* Avatar */}
                      <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:20, padding:"14px 16px", background:"linear-gradient(135deg,#eff6ff,#dbeafe)", borderRadius:12 }}>
                        <div style={{ width:54, height:54, borderRadius:"50%", background:"linear-gradient(135deg,#2563eb,#7c3aed)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, fontWeight:900, color:"white", flexShrink:0 }}>
                          {profile.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize:16, fontWeight:800, color:"#0f172a" }}>{profile.full_name}</div>
                          <div style={{ fontSize:13, color:"#1d4ed8" }}>{profile.employee_id} · {profile.department_name}</div>
                        </div>
                      </div>
                      <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
                        {[
                          { label:"Full Name",   val: profile.full_name },
                          { label:"Employee ID", val: profile.employee_id },
                          { label:"Department",  val: profile.department_name },
                          { label:"Designation", val: profile.designation || "—" },
                          { label:"Email",       val: profile.email },
                          { label:"Phone",       val: profile.phone || "—" },
                          { label:"Status",      val: Number(profile.is_active) === 1 ? "Active" : "Inactive" },
                        ].map(r => (
                          <div key={r.label} style={{ display:"flex", justifyContent:"space-between", padding:"11px 0", borderBottom:"1px solid #f1f5f9", fontSize:13.5 }}>
                            <span style={{ color:"#64748b", fontWeight:500 }}>{r.label}</span>
                            <strong style={{ color:"#0f172a" }}>{r.val}</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Eligibility — FR-010, FR-014 */}
                  <div style={{ background:"white", borderRadius:16, border:"1px solid #e2e8f0", overflow:"hidden", boxShadow:"0 1px 6px rgba(0,0,0,.06)" }}>
                    <div style={{ padding:"16px 22px", borderBottom:"1px solid #e2e8f0", background:"linear-gradient(to bottom,#fafbfc,#f6f8fb)" }}>
                      <div style={{ fontSize:15, fontWeight:800 }}>My Eligibility Rules</div>
                      <div style={{ fontSize:12.5, color:"#64748b", marginTop:2 }}>Monthly card entitlements — FR-010, BR-001</div>
                    </div>
                    <div style={{ padding:22 }}>
                      {monthly.length === 0 ? (
                        <div style={{ textAlign:"center", color:"#94a3b8", padding:32 }}>
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin:"0 auto 10px" }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                          No eligibility rules assigned yet
                        </div>
                      ) : (
                        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                          {monthly.map(m => {
                            const meta = cardTypeMeta[m.card_type] || cardTypeMeta.AIRTIME;
                            const isMaxed = m.remaining === 0;
                            return (
                              <div key={m.card_type} style={{ background:meta.bg, borderRadius:14, padding:"16px 18px", border:`1.5px solid ${meta.color}30` }}>
                                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                                    <div style={{ color:meta.color }}>{meta.icon}</div>
                                    <span style={{ fontSize:15, fontWeight:800, color:meta.color }}>{meta.label}</span>
                                  </div>
                                  <span style={{ fontSize:18, fontWeight:900, color: isMaxed ? "#dc2626" : meta.color }}>{m.consumed} / {m.monthly_quota}</span>
                                </div>
                                <div style={{ height:9, background:"rgba(255,255,255,.6)", borderRadius:999, overflow:"hidden", marginBottom:8 }}>
                                  <div style={{ height:"100%", width:`${Math.min(m.percentage,100)}%`, background: isMaxed ? "#dc2626" : meta.color, borderRadius:999, transition:"width .6s" }} />
                                </div>
                                <div style={{ display:"flex", justifyContent:"space-between", fontSize:12.5, color:meta.color, fontWeight:700 }}>
                                  <span>This month: {m.consumed} used</span>
                                  <span>{isMaxed ? "Quota reached" : `${m.remaining} remaining`}</span>
                                </div>
                                <div style={{ marginTop:6, fontSize:11.5, color:"#64748b" }}>
                                  Quota: {m.monthly_quota} card{m.monthly_quota !== 1?"s":""}/month · Resets on the 1st of each month
                                </div>
                              </div>
                            );
                          })}

                          {/* BR-001 info */}
                          <div style={{ padding:"12px 14px", background:"#f8fafc", borderRadius:10, border:"1px solid #e2e8f0", fontSize:12.5, color:"#64748b", display:"flex", gap:10, alignItems:"flex-start" }}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0, marginTop:1 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r=".5" fill="currentColor"/></svg>
                            <span><strong>BR-001:</strong> You may receive one card per eligible type per month. Quotas reset on the 1st of each month.</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
