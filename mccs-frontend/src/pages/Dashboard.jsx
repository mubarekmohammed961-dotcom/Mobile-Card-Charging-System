import { useEffect, useState } from "react";
import api from "../services/api";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

const fv = v => Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fn = v => Number(v || 0).toLocaleString();

/* ── Theme options ── */
const THEMES = [
  { id:"ocean",   label:"Ocean",    hero:"linear-gradient(135deg,#0f172a 0%,#1e3a8a 55%,#312e81 100%)", accent:"#2563eb", accent2:"#7c3aed" },
  { id:"forest",  label:"Forest",   hero:"linear-gradient(135deg,#052e16 0%,#14532d 55%,#166534 100%)", accent:"#16a34a", accent2:"#0d9488" },
  { id:"sunset",  label:"Sunset",   hero:"linear-gradient(135deg,#431407 0%,#9a3412 50%,#92400e 100%)", accent:"#ea580c", accent2:"#d97706" },
  { id:"violet",  label:"Violet",   hero:"linear-gradient(135deg,#2e1065 0%,#4c1d95 55%,#5b21b6 100%)", accent:"#7c3aed", accent2:"#a855f7" },
  { id:"rose",    label:"Rose",     hero:"linear-gradient(135deg,#4c0519 0%,#881337 55%,#9f1239 100%)", accent:"#e11d48", accent2:"#f43f5e" },
  { id:"slate",   label:"Slate",    hero:"linear-gradient(135deg,#020617 0%,#1e293b 55%,#334155 100%)", accent:"#64748b", accent2:"#475569" },
  { id:"cyan",    label:"Cyan",     hero:"linear-gradient(135deg,#083344 0%,#155e75 55%,#0e7490 100%)", accent:"#0891b2", accent2:"#06b6d4" },
  { id:"amber",   label:"Amber",    hero:"linear-gradient(135deg,#431407 0%,#78350f 55%,#92400e 100%)", accent:"#d97706", accent2:"#f59e0b" },
];

/* ── Action icons (SVG) ── */
const actionColor = {
  UPLOAD:"#16a34a", ALLOCATE:"#2563eb", SEND:"#d97706",
  CONFIRM:"#0d9488", USE:"#64748b", EXPIRE:"#dc2626",
  LOGIN:"#7c3aed", LOGOUT:"#475569", DELETE:"#dc2626", UPDATE:"#ea580c",
};
const actionIcon = {
  UPLOAD:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>,
  ALLOCATE: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  SEND:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  CONFIRM:  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  USE:      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  EXPIRE:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>,
  LOGIN:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>,
  LOGOUT:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  DELETE:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
  UPDATE:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
};

/* ── Donut chart (fixed — no overlap) ── */
function Donut({ pct = 0, size = 100, stroke = 10, color = "#2563eb", bg = "#e2e8f0", label, value }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = Math.min(pct / 100, 1) * circ;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={bg} strokeWidth={stroke} />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
            style={{ transition: "stroke-dasharray .7s ease" }} />
        </svg>
        {/* Center text — absolutely positioned, no overlap */}
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          pointerEvents: "none",
        }}>
          <span style={{ fontSize: size * 0.18, fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>{value}</span>
        </div>
      </div>
      <span style={{ fontSize: 11.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".5px", textAlign: "center" }}>{label}</span>
    </div>
  );
}

/* ── KPI card ── */
function KpiCard({ icon, label, value, sub, color, bg, trend, trendUp, accent }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: "white", borderRadius: 18, padding: "22px 20px",
        border: `1px solid ${hov ? color : "#e2e8f0"}`,
        position: "relative", overflow: "hidden",
        boxShadow: hov ? `0 8px 28px ${color}30` : "0 1px 6px rgba(0,0,0,.06)",
        transition: "all .2s", cursor: "default",
        transform: hov ? "translateY(-3px)" : "none",
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: `linear-gradient(90deg,${color},${color}aa)`, borderRadius: "18px 18px 0 0" }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: 4, marginBottom: 14 }}>
        <div style={{ width: 46, height: 46, borderRadius: 13, background: bg, display: "flex", alignItems: "center", justifyContent: "center", color }}>
          {icon}
        </div>
        {trend !== undefined && (
          <span style={{
            fontSize: 11.5, fontWeight: 700,
            color: trendUp ? "#16a34a" : "#dc2626",
            background: trendUp ? "#dcfce7" : "#fee2e2",
            padding: "3px 9px", borderRadius: 999,
          }}>{trendUp ? "▲" : "▼"} {trend}</span>
        )}
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 900, color: "#0f172a", lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const [now, setNow]         = useState(new Date());
  const [themeId, setThemeId] = useState(() => localStorage.getItem("mccs_theme") || "ocean");
  const [showPicker, setShowPicker] = useState(false);

  const theme = THEMES.find(t => t.id === themeId) || THEMES[0];
  const user  = (() => { try { return JSON.parse(localStorage.getItem("mccs_user") || "{}"); } catch { return {}; } })();

  const setTheme = (id) => {
    setThemeId(id);
    localStorage.setItem("mccs_theme", id);
    setShowPicker(false);
  };

  const load = async () => {
    try {
      setLoading(true); setError("");
      const token = localStorage.getItem("mccs_token");
      const res = await api.get("/dashboard/summary", { headers: { Authorization: `Bearer ${token}` } });
      setData(res.data);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to load dashboard");
    } finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const total     = data ? Number(data.summary.total_cards) : 0;
  const available = data ? Number(data.summary.available_cards) : 0;
  const allocated = data ? Number(data.summary.allocated_cards) : 0;
  const used      = data ? Number(data.summary.used_cards) : 0;
  const confirmed = data ? Number(data.deliveries.confirmed) : 0;
  const pending   = data ? Number(data.deliveries.pending) + Number(data.deliveries.sent) : 0;
  const expired   = data ? Number(data.deliveries.expired) : 0;
  const totalDel  = confirmed + pending + expired + (data ? Number(data.deliveries.delivered) : 0);
  const confRate  = totalDel > 0 ? Math.round((confirmed / totalDel) * 100) : 0;
  const availPct  = total > 0 ? Math.round((available / total) * 100) : 0;
  const usedPct   = total > 0 ? Math.round((used / total) * 100) : 0;
  const allocPct  = total > 0 ? Math.round((allocated / total) * 100) : 0;
  const maxDept   = data ? Math.max(...(data.departments || []).map(d => Number(d.allocated_value || 0)), 1) : 1;
  const greeting  = now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";
  const dateStr   = now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const deptColors = [theme.accent, "#16a34a", "#d97706", "#7c3aed", "#0d9488", "#dc2626"];

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-area">
        <Topbar />
        <div style={{ padding: "24px 28px", background: "#f1f5f9", minHeight: "100vh" }}>

          {error && <div className="alert alert-error" style={{ marginBottom: 16 }}><span>!</span><span>{error}</span></div>}

          {/* ── HERO BANNER ── */}
          <div style={{
            background: theme.hero,
            borderRadius: 20, padding: "28px 32px", marginBottom: 24,
            position: "relative", overflow: "hidden",
            boxShadow: "0 12px 40px rgba(0,0,0,.28)",
          }}>
            {/* Decorative circles */}
            <div style={{ position: "absolute", top: -50, right: -50, width: 220, height: 220, borderRadius: "50%", background: "rgba(255,255,255,.06)" }} />
            <div style={{ position: "absolute", bottom: -60, right: 180, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,.04)" }} />
            <div style={{ position: "absolute", top: 10, right: 90, width: 110, height: 110, borderRadius: "50%", background: "rgba(255,255,255,.05)" }} />

            <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
              {/* Left: greeting */}
              <div>
                <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.55)", fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".8px" }}>{dateStr}</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: "white", marginBottom: 6, letterSpacing: "-.3px" }}>
                  {greeting}, {user.full_name?.split(" ")[0] || "Admin"} 👋
                </div>
                <div style={{ fontSize: 14, color: "rgba(255,255,255,.6)" }}>Mobile Card Charging System — real-time overview</div>
              </div>

              {/* Right: quick stats + theme picker */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                {[
                  { label: "Total Cards", val: fn(total), color: "#93c5fd" },
                  { label: "Available",   val: fn(available), color: "#6ee7b7" },
                  { label: "Conf. Rate",  val: `${confRate}%`, color: "#c4b5fd" },
                  { label: "Pending",     val: fn(pending), color: "#fca5a5" },
                ].map(s => (
                  <div key={s.label} style={{
                    background: "rgba(255,255,255,.1)", borderRadius: 12,
                    padding: "12px 16px", backdropFilter: "blur(10px)",
                    border: "1px solid rgba(255,255,255,.15)", minWidth: 85, textAlign: "center",
                  }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.val}</div>
                    <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.5)", marginTop: 3, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".4px" }}>{s.label}</div>
                  </div>
                ))}

                {/* Theme picker button */}
                <div style={{ position: "relative" }}>
                  <button
                    onClick={() => setShowPicker(p => !p)}
                    title="Change dashboard theme"
                    style={{
                      width: 42, height: 42, borderRadius: 12,
                      background: "rgba(255,255,255,.15)", border: "1.5px solid rgba(255,255,255,.3)",
                      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                      backdropFilter: "blur(10px)", transition: "all .15s",
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 1.47 13.78L19.07 4.93z" style={{display:"none"}}/>
                      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
                    </svg>
                  </button>

                  {showPicker && (
                    <div style={{
                      position: "absolute", top: "calc(100% + 10px)", right: 0,
                      background: "white", borderRadius: 14, padding: 16,
                      boxShadow: "0 16px 48px rgba(0,0,0,.2)", border: "1px solid #e2e8f0",
                      zIndex: 200, width: 240,
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 12 }}>Dashboard Theme</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        {THEMES.map(t => (
                          <button key={t.id} onClick={() => setTheme(t.id)} style={{
                            padding: "8px 10px", borderRadius: 10, border: `2px solid ${themeId === t.id ? t.accent : "#e2e8f0"}`,
                            background: themeId === t.id ? `${t.accent}12` : "white",
                            cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                            transition: "all .15s",
                          }}>
                            <div style={{
                              width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                              background: t.hero,
                              boxShadow: themeId === t.id ? `0 0 0 2px ${t.accent}` : "none",
                            }} />
                            <span style={{ fontSize: 13, fontWeight: themeId === t.id ? 700 : 500, color: themeId === t.id ? t.accent : "#374151" }}>
                              {t.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 80, gap: 14, color: "#64748b" }}>
              <div className="spinner" style={{ width: 32, height: 32 }} />
              <span style={{ fontSize: 16, fontWeight: 600 }}>Loading dashboard…</span>
            </div>
          ) : data && (
            <>
              {/* ── ROW 1: 4 Main KPIs ── */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 16 }}>
                <KpiCard
                  icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>}
                  label="Total Cards" value={fn(total)} sub={`${fv(data.summary.total_value)} ETB total value`}
                  color={theme.accent} bg={`${theme.accent}18`} />
                <KpiCard
                  icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                  label="Available" value={fn(available)} sub={`${fv(data.summary.available_value)} ETB`}
                  color="#16a34a" bg="#dcfce7" trendUp trend={`${availPct}%`} />
                <KpiCard
                  icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>}
                  label="Allocated" value={fn(allocated)} sub={`${fv(data.summary.allocated_value)} ETB`}
                  color="#d97706" bg="#fef3c7" />
                <KpiCard
                  icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}
                  label="Used" value={fn(used)} sub={`${fv(data.summary.used_value)} ETB redeemed`}
                  color="#7c3aed" bg="#f5f3ff" trendUp trend={`${usedPct}%`} />
              </div>

              {/* ── ROW 2: 4 Distribution KPIs ── */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 20 }}>
                <KpiCard
                  icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>}
                  label="Distributions" value={fn(data.distributions.total_distributions)} sub={`${fn(data.distributions.distributed_cards)} cards sent`}
                  color="#0d9488" bg="#f0fdfa" />
                <KpiCard
                  icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>}
                  label="Confirmed" value={fn(confirmed)} sub="Staff confirmed"
                  color="#16a34a" bg="#dcfce7" trendUp={confRate >= 60} trend={`${confRate}%`} />
                <KpiCard
                  icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
                  label="Pending Confirm" value={fn(pending)} sub="Awaiting confirmation"
                  color="#dc2626" bg="#fee2e2" trendUp={false} trend={pending > 0 ? "Action needed" : "All clear"} />
                <KpiCard
                  icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>}
                  label="Value Distributed" value={`${fv(data.distributions.distributed_value)} ETB`} sub="All-time"
                  color={theme.accent2} bg={`${theme.accent2}18`} />
              </div>

              {/* ── ROW 3: Donut + Dept + Pipeline ── */}
              <div style={{ display: "grid", gridTemplateColumns: "300px 1fr 1fr", gap: 16, marginBottom: 16 }}>

                {/* ── Card Breakdown (fixed donuts) ── */}
                <div style={{ background: "white", borderRadius: 18, padding: "22px", border: "1px solid #e2e8f0", boxShadow: "0 1px 6px rgba(0,0,0,.06)" }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", marginBottom: 2 }}>Card Breakdown</div>
                  <div style={{ fontSize: 12.5, color: "#64748b", marginBottom: 24 }}>Distribution of {fn(total)} cards</div>

                  {/* Three donuts side by side with proper spacing */}
                  <div style={{ display: "flex", justifyContent: "space-around", alignItems: "flex-start", marginBottom: 24 }}>
                    <Donut pct={availPct} color="#16a34a" bg="#dcfce7" label="Available" value={`${availPct}%`} size={90} stroke={9} />
                    <Donut pct={allocPct} color="#d97706" bg="#fef3c7" label="Allocated" value={`${allocPct}%`} size={90} stroke={9} />
                    <Donut pct={usedPct}  color="#7c3aed" bg="#f5f3ff" label="Used"      value={`${usedPct}%`}  size={90} stroke={9} />
                  </div>

                  {/* Legend with mini bars */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {[
                      { label: "Available", val: available, color: "#16a34a", pct: availPct },
                      { label: "Allocated", val: allocated, color: "#d97706", pct: allocPct },
                      { label: "Used",      val: used,      color: "#7c3aed", pct: usedPct  },
                    ].map(r => (
                      <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 3, background: r.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 12.5, color: "#475569", width: 64 }}>{r.label}</span>
                        <strong style={{ fontSize: 13, color: "#0f172a", width: 28, textAlign: "right" }}>{fn(r.val)}</strong>
                        <div style={{ flex: 1, height: 6, background: "#f1f5f9", borderRadius: 999, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${Math.min(r.pct, 100)}%`, background: r.color, borderRadius: 999, transition: "width .6s" }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Department Allocation ── */}
                <div style={{ background: "white", borderRadius: 18, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,.06)" }}>
                  <div style={{ padding: "18px 22px", borderBottom: "1px solid #f1f5f9", background: "linear-gradient(135deg,#fafbfc,#f1f5f9)" }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>Department Allocation</div>
                    <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 2 }}>Cards & value issued per department</div>
                  </div>
                  <div style={{ padding: "16px 22px" }}>
                    {(data.departments || []).length === 0 ? (
                      <div style={{ textAlign: "center", color: "#94a3b8", padding: 24 }}>No department data</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        {data.departments.slice(0, 5).map((d, i) => {
                          const pct = Math.round((Number(d.allocated_value || 0) / maxDept) * 100);
                          const c = deptColors[i % deptColors.length];
                          return (
                            <div key={d.id}>
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                                  <div style={{ width: 9, height: 9, borderRadius: 3, background: c }} />
                                  <span style={{ fontWeight: 700, color: "#0f172a" }}>{d.department_name}</span>
                                </div>
                                <span style={{ color: "#64748b", fontSize: 12 }}>
                                  <strong style={{ color: "#0f172a" }}>{fn(d.allocated_cards)}</strong> cards · {fv(d.allocated_value)} ETB
                                </span>
                              </div>
                              <div style={{ height: 8, background: "#f1f5f9", borderRadius: 999, overflow: "hidden" }}>
                                <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg,${c}bb,${c})`, borderRadius: 999, transition: "width .7s ease" }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Delivery Pipeline ── */}
                <div style={{ background: "white", borderRadius: 18, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,.06)" }}>
                  <div style={{ padding: "18px 22px", borderBottom: "1px solid #f1f5f9", background: "linear-gradient(135deg,#fafbfc,#f1f5f9)" }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>Delivery Pipeline</div>
                    <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 2 }}>{fn(totalDel)} total deliveries</div>
                  </div>
                  <div style={{ padding: "16px 22px" }}>
                    {/* Big confirmation rate donut */}
                    <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 20, padding: "14px 16px", background: "linear-gradient(135deg,#f0fdf4,#dcfce7)", borderRadius: 12 }}>
                      <Donut pct={confRate} color="#16a34a" bg="#bbf7d0" label="" value={`${confRate}%`} size={72} stroke={8} />
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: "#15803d" }}>Confirmation Rate</div>
                        <div style={{ fontSize: 12.5, color: "#166534", marginTop: 3 }}>{fn(confirmed)} confirmed of {fn(totalDel)}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                      {[
                        { label: "Pending",   val: data.deliveries.pending,   color: "#f59e0b", bg: "#fef3c7" },
                        { label: "Sent",      val: data.deliveries.sent,      color: "#3b82f6", bg: "#dbeafe" },
                        { label: "Confirmed", val: confirmed,                  color: "#16a34a", bg: "#dcfce7" },
                        { label: "Delivered", val: data.deliveries.delivered, color: "#8b5cf6", bg: "#ede9fe" },
                        { label: "Expired",   val: expired,                    color: "#ef4444", bg: "#fee2e2" },
                      ].map(s => (
                        <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 11.5, fontWeight: 700, padding: "2px 10px", borderRadius: 999, background: s.bg, color: s.color, minWidth: 74, textAlign: "center" }}>
                            {s.label}
                          </span>
                          <div style={{ flex: 1, height: 6, background: "#f1f5f9", borderRadius: 999, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${totalDel > 0 ? Math.round((Number(s.val) / totalDel) * 100) : 0}%`, background: s.color, borderRadius: 999, transition: "width .5s" }} />
                          </div>
                          <strong style={{ fontSize: 13, minWidth: 26, textAlign: "right", color: "#0f172a" }}>{fn(s.val)}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── ROW 4: Recent Activity ── */}
              <div style={{ background: "white", borderRadius: 18, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,.06)", marginBottom: 16 }}>
                <div style={{ padding: "18px 24px", borderBottom: "1px solid #f1f5f9", background: "linear-gradient(135deg,#fafbfc,#f1f5f9)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>Recent Activity</div>
                    <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 2 }}>Latest system actions across all modules</div>
                  </div>
                  <button onClick={load} style={{
                    padding: "8px 16px", borderRadius: 9, border: "1px solid #e2e8f0",
                    background: "white", cursor: "pointer", fontSize: 13, fontWeight: 600,
                    color: "#475569", display: "flex", alignItems: "center", gap: 6, transition: "all .15s",
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                    onMouseLeave={e => e.currentTarget.style.background = "white"}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                    Refresh
                  </button>
                </div>

                {(data.recent_activity || []).length === 0 ? (
                  <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>No recent activity</div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)" }}>
                    {data.recent_activity.slice(0, 8).map((a, i) => {
                      let detail = "";
                      try { const d = typeof a.details === "string" ? JSON.parse(a.details) : a.details; detail = d?.message || ""; } catch {}
                      const color = actionColor[a.action] || "#94a3b8";
                      const icon  = actionIcon[a.action];
                      return (
                        <div key={a.id} style={{
                          display: "flex", alignItems: "flex-start", gap: 12,
                          padding: "13px 22px",
                          borderBottom: i < 6 ? "1px solid #f8fafc" : "none",
                          borderRight: i % 2 === 0 ? "1px solid #f8fafc" : "none",
                          transition: "background .1s",
                        }}
                          onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                        >
                          <div style={{ width: 34, height: 34, borderRadius: 9, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", color, flexShrink: 0 }}>
                            {icon}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 2 }}>
                              <span style={{ fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 999, background: `${color}18`, color, letterSpacing: ".3px" }}>{a.action}</span>
                              <span style={{ fontSize: 13, fontWeight: 600, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.user_name || "System"}</span>
                            </div>
                            {detail && <div style={{ fontSize: 12, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{detail}</div>}
                          </div>
                          <div style={{ fontSize: 11, color: "#94a3b8", whiteSpace: "nowrap", flexShrink: 0 }}>
                            {a.created_at ? new Date(a.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── ROW 5: Department Trend Chart ── */}
              <div style={{ background: "white", borderRadius: 18, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,.06)" }}>
                <div style={{ padding: "18px 24px", borderBottom: "1px solid #f1f5f9", background: "linear-gradient(135deg,#fafbfc,#f1f5f9)" }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>Monthly Distribution Trend</div>
                  <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 2 }}>Card issuance trend across departments</div>
                </div>
                <div style={{ padding: "24px" }}>
                  {(data.departments || []).length === 0 ? (
                    <div style={{ textAlign: "center", color: "#94a3b8", padding: 24 }}>No distribution data</div>
                  ) : (
                    <>
                      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        {data.departments.slice(0, 6).map((d, i) => {
                          const c = deptColors[i % deptColors.length];
                          const pct = Math.round((Number(d.allocated_value || 0) / maxDept) * 100);
                          return (
                            <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 16 }}>
                              <div style={{ width: 150, fontSize: 13, fontWeight: 600, color: "#475569", textAlign: "right", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {d.department_name}
                              </div>
                              <div style={{ flex: 1, height: 28, background: "#f1f5f9", borderRadius: 7, overflow: "hidden" }}>
                                <div style={{
                                  height: "100%", width: `${pct}%`,
                                  background: `linear-gradient(90deg,${c}cc,${c})`,
                                  borderRadius: 7, transition: "width .8s ease",
                                  display: "flex", alignItems: "center", paddingLeft: 10,
                                }}>
                                  {pct > 15 && <span style={{ fontSize: 12, fontWeight: 700, color: "white" }}>{d.allocated_cards} cards</span>}
                                </div>
                              </div>
                              <div style={{ width: 80, fontSize: 13, fontWeight: 700, color: "#0f172a", flexShrink: 0, textAlign: "right" }}>
                                {fv(d.allocated_value)} ETB
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {/* Summary footer */}
                      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginTop: 20, paddingTop: 16, borderTop: "1px solid #f1f5f9" }}>
                        {[
                          { label: "Total Distributions", val: fn(data.distributions.total_distributions) },
                          { label: "Total Cards Issued",  val: fn(data.distributions.distributed_cards) },
                          { label: "Total Value",          val: `${fv(data.distributions.distributed_value)} ETB` },
                          { label: "Avg per Distribution", val: data.distributions.total_distributions > 0 ? fn(Math.round(data.distributions.distributed_cards / data.distributions.total_distributions)) + " cards" : "—" },
                        ].map(s => (
                          <div key={s.label}>
                            <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px" }}>{s.label}</div>
                            <div style={{ fontSize: 20, fontWeight: 900, color: "#0f172a", marginTop: 2 }}>{s.val}</div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
