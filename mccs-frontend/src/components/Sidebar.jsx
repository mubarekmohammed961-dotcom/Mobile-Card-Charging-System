import { NavLink, useNavigate } from "react-router-dom";
import { getNavForRole, ROLE_META } from "../utils/permissions";

export default function Sidebar() {
  const navigate = useNavigate();

  const user = (() => {
    try { return JSON.parse(localStorage.getItem("mccs_user") || "{}"); }
    catch { return {}; }
  })();

  const role     = user.role || "STAFF";
  const roleMeta = ROLE_META[role] || { label: role, color: "#475569", bg: "#f1f5f9" };
  const navItems = getNavForRole(role);
  const sections = [...new Set(navItems.map(n => n.section))];

  const handleLogout = () => {
    localStorage.removeItem("mccs_token");
    localStorage.removeItem("mccs_user");
    navigate("/login");
  };

  const navIcons = {
    "/dashboard":       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
    "/inventory":       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
    "/departments":     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    "/staff":           <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    "/eligibility":     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
    "/allocations":     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
    "/deliveries":      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
    "/approvals":       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
    "/usage":           <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
    "/staff-dashboard": <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
    "/notifications":   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
    "/reports":         <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>,
    "/audit-logs":      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
    "/users":           <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    "/settings":        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 1.47 13.78M4.93 4.93a10 10 0 0 0-1.47 13.78"/></svg>,
    "/system-settings": <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 1.47 13.78M4.93 4.93a10 10 0 0 0-1.47 13.78"/></svg>,
    "/workflow":        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/></svg>,
    "/qa-checklist":    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
    "/deployment":      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>,
  };

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:80, height:80, borderRadius:"50%", overflow:"hidden", border:"2px solid rgba(255,255,255,.25)", background:"white", flexShrink:0, boxShadow:"0 2px 8px rgba(0,0,0,.3)" }}>
            <img src="/wollo-logo.png" alt="WU" style={{ width:"100%", height:"100%", objectFit:"cover" }}
              onError={e => { e.target.style.display="none"; e.target.parentElement.innerHTML='<div style="display:flex;align-items:center;justify-content:center;height:100%;width:100%;background:linear-gradient(135deg,#1e40af,#7c3aed);font-size:16px;font-weight:900;color:white">WU</div>'; }} />
          </div>
          <div style={{ width:80, height:80, borderRadius:12, overflow:"hidden", border:"2px solid rgba(255,255,255,.25)", background:"white", flexShrink:0, boxShadow:"0 2px 8px rgba(0,0,0,.3)", padding:4 }}>
            <img src="/appfactory-logo.png" alt="AF" style={{ width:"100%", height:"100%", objectFit:"contain" }}
              onError={e => { e.target.style.display="none"; e.target.parentElement.innerHTML='<div style="display:flex;align-items:center;justify-content:center;height:100%;width:100%;background:linear-gradient(135deg,#4c1d95,#7c3aed);font-size:10px;font-weight:900;color:white">AF</div>'; }} />
          </div>
        </div>
        <div className="brand-text">
          <h2>MCCS</h2>
          <span>Card Charging System</span>
        </div>
      </div>

      {/* Role badge */}
      <div style={{ margin:"8px 12px", padding:"8px 12px", borderRadius:8, background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.06)", display:"flex", alignItems:"center", gap:8 }}>
        <div style={{ width:7, height:7, borderRadius:"50%", background:"#22c55e", flexShrink:0, boxShadow:"0 0 0 3px rgba(34,197,94,.2)" }} />
        <span style={{ fontSize:11.5, color:"#64748b" }}>Logged in as</span>
        <span style={{ fontSize:11.5, fontWeight:700, color:roleMeta.color, background:roleMeta.bg, padding:"1px 8px", borderRadius:999 }}>
          {roleMeta.label}
        </span>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {sections.map(section => (
          <div key={section}>
            <div className="sidebar-section-label">{section}</div>
            {navItems.filter(n => n.section === section).map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `sidebar-link${isActive ? " active" : ""}`}
              >
                <span className="nav-icon">{navIcons[item.path]}</span>
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* User + logout */}
      <div className="sidebar-bottom">
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">
            {(user.full_name || "A").charAt(0).toUpperCase()}
          </div>
          <div className="sidebar-user-info">
            <strong>{user.full_name || "User"}</strong>
            <span>{roleMeta.label}</span>
          </div>
        </div>
        <button type="button" className="logout-button" onClick={handleLogout}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Sign Out
        </button>
      </div>
    </aside>
  );
}
