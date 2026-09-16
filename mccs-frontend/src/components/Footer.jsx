export default function Footer() {
  const year = new Date().getFullYear();

  const links = [
    { label: "Dashboard",    href: "/dashboard" },
    { label: "Inventory",    href: "/inventory" },
    { label: "Distributions",href: "/allocations" },
    { label: "Deliveries",   href: "/deliveries" },
    { label: "Reports",      href: "/reports" },
    { label: "Audit Logs",   href: "/audit-logs" },
  ];

  const stack = [
    { name: "React.js",  color: "#61dafb" },
    { name: "Node.js",   color: "#6ee7b7" },
    { name: "MySQL",     color: "#60a5fa" },
    { name: "Express",   color: "#a78bfa" },
    { name: "AES-256",   color: "#fb923c" },
    { name: "JWT Auth",  color: "#34d399" },
  ];

  return (
    <footer className="app-footer">

      {/* ── Top accent line ── */}
      <div style={{
        height: 3,
        background: "linear-gradient(90deg, #2563eb, #7c3aed, #0d9488, #16a34a, #d97706)",
        marginLeft: "var(--sidebar-width)",
      }} />

      {/* ── Main footer body ── */}
      <div className="footer-main">

        {/* Column 1 — Project identity */}
        <div className="footer-col footer-col-brand">
          {/* MCCS Logo */}
          <div className="footer-logo-wrap">
            <div className="footer-logo-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="4" width="22" height="16" rx="2"/>
                <line x1="1" y1="10" x2="23" y2="10"/>
              </svg>
            </div>
            <div>
              <div className="footer-logo-name">MCCS</div>
              <div className="footer-logo-sub">Mobile Card Charging System</div>
            </div>
          </div>

          <p className="footer-desc">
            A secure, role-based card distribution platform built for Wollo University
            staff — automating monthly mobile card allocation, delivery, and confirmation.
          </p>

          {/* Security badges */}
          <div className="footer-security-row">
            <div className="footer-security-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              AES-256 Encrypted
            </div>
            <div className="footer-security-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              JWT Secured
            </div>
            <div className="footer-security-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              RBAC
            </div>
          </div>
        </div>

        {/* Column 2 — Quick links */}
        <div className="footer-col">
          <div className="footer-col-title">Quick Navigation</div>
          <ul className="footer-links">
            {links.map(l => (
              <li key={l.href}>
                <a href={l.href} className="footer-link">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Column 3 — Institution */}
        <div className="footer-col">
          <div className="footer-col-title">Institution</div>

          {/* Wollo University block */}
          <div className="footer-institution-card">
            <div className="footer-institution-icon" style={{ background:"white", overflow:"hidden", width:52, height:52, borderRadius:"50%", border:"2px solid #1e3a8a30" }}>
              <img src="/wollo-logo.png" alt="Wollo University" style={{ width:"100%", height:"100%", objectFit:"cover" }}
                onError={e => { e.target.style.display="none"; e.target.parentElement.style.background="linear-gradient(135deg,#1e3a8a,#2563eb)"; e.target.parentElement.innerHTML='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>'; }} />
            </div>
            <div>
              <div className="footer-institution-name">Wollo University</div>
              <div className="footer-institution-sub">Dessie &amp; Kombolcha, Ethiopia</div>
            </div>
          </div>

          {/* App Factory Academy block */}
          <div className="footer-institution-card" style={{ marginTop: 10 }}>
            <div className="footer-institution-icon" style={{ background:"white", overflow:"hidden", width:52, height:52, borderRadius:10, border:"2px solid #4c1d9530", padding:3 }}>
              <img src="/appfactory-logo.png" alt="App Factory" style={{ width:"100%", height:"100%", objectFit:"contain" }}
                onError={e => { e.target.style.display="none"; e.target.parentElement.style.background="linear-gradient(135deg,#4c1d95,#7c3aed)"; e.target.parentElement.innerHTML='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'; }} />
            </div>
            <div>
              <div className="footer-institution-name">App Factory Academy</div>
              <div className="footer-institution-sub">Project ID: 1226 &mdash; Internship 2026</div>
            </div>
          </div>

          <div style={{ marginTop: 14, padding: "10px 14px", background: "rgba(37,99,235,.08)", borderRadius: 8, border: "1px solid rgba(37,99,235,.15)", fontSize: 12, color: "#94a3b8", lineHeight: 1.6 }}>
            Developed as part of the App Factory Academy internship program under Wollo University, Faculty of Computing and Informatics.
          </div>
        </div>

        {/* Column 4 — Tech stack */}
        <div className="footer-col">
          <div className="footer-col-title">Technology Stack</div>
          <div className="footer-stack-grid">
            {stack.map(t => (
              <div key={t.name} className="footer-stack-chip" style={{ borderColor: `${t.color}30`, background: `${t.color}10` }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: t.color, flexShrink: 0 }} />
                <span style={{ color: t.color, fontWeight: 700, fontSize: 12 }}>{t.name}</span>
              </div>
            ))}
          </div>

          {/* Version info */}
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              { label: "Version",    val: "v1.0.0" },
              { label: "Build",      val: "2026 Release" },
              { label: "License",    val: "Academic Use" },
            ].map(r => (
              <div key={r.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#475569", borderBottom: "1px solid #1e293b", paddingBottom: 5 }}>
                <span style={{ color: "#64748b" }}>{r.label}</span>
                <span style={{ color: "#94a3b8", fontWeight: 600 }}>{r.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div className="footer-bottom">
        <div className="footer-bottom-left">
          <span>&copy; {year} Mobile Card Charging System</span>
          <span className="footer-dot" />
          <span>Wollo University</span>
          <span className="footer-dot" />
          <span>App Factory Academy</span>
          <span className="footer-dot" />
          <span>All rights reserved</span>
        </div>
        <div className="footer-bottom-right">
          <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "#334155" }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="20 6 9 17 4 12"/></svg>
            All systems operational
          </span>
          <span className="footer-dot" style={{ background: "#334155" }} />
          <span style={{ fontSize: 11.5, color: "#334155" }}>Secure &bull; Encrypted &bull; RBAC Protected</span>
        </div>
      </div>
    </footer>
  );
}
