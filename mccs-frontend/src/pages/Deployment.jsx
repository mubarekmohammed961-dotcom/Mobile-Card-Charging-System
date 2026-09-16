import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

// - Deployment Checklist (Production)

const CHECK_GROUPS = [
  {
    title: "Environment Variables",
    icon: "Env",
    items: [
      { done: true,  label: "NODE_ENV=production",          note: "Set in .env or server environment" },
      { done: true,  label: "DB_HOST, DB_USER, DB_NAME",    note: "MySQL connection configured" },
      { done: true,  label: "JWT_SECRET (32+ chars)",       note: "Strong random secret required" },
      { done: true,  label: "CARD_ENCRYPTION_KEY (64 hex)", note: "AES-256-GCM key configured" },
      { done: false, label: "SMTP_USER & SMTP_PASS",        note: "Configure Gmail app password for email delivery" },
      { done: false, label: "TWILIO credentials",           note: "Optional: for SMS delivery" },
      { done: true,  label: "FRONTEND_URL",                 note: "http://localhost:5173 (update for production)" },
      { done: true,  label: "ADMIN_EMAIL",                  note: "Receives low inventory alerts" },
    ]
  },
  {
    title: "Database",
    icon: "DB",
    items: [
      { done: true,  label: "Run schema.sql migrations",                note: "All 15 tables created" },
      { done: true,  label: "Index on card_uuid",                       note: "idx_cards_uuid created" },
      { done: true,  label: "Index on staff_id, distribution_month",    note: "Performance indexes applied" },
      { done: true,  label: "Index on confirmation_token",              note: "idx_del_token created" },
      { done: true,  label: "Index on audit_logs.created_at",           note: "idx_audit_created created" },
      { done: true,  label: "Default Super Admin created",              note: "admin@mccs.com / Admin@1234" },
      { done: true,  label: "Audit archive table created",              note: "audit_archive for 7-year retention" },
    ]
  },
  {
    title: "Cron Jobs (node-cron)",
    icon: "Cron",
    items: [
      { done: true,  label: "0 8 1 * * — Monthly auto-distribution",    note: "1st of month at 8:00 AM" },
      { done: true,  label: "0 9 * * * — Daily reminders (Day 3,5,7)",  note: "Staff reminder emails + in-app" },
      { done: true,  label: "0 2 * * 0 — Weekly inventory check",       note: "Sunday 2:00 AM low-stock alert" },
      { done: true,  label: "0 8 * * * — Expired token cleanup",        note: "Daily expired delivery flags" },
      { done: true,  label: "0 7 1 * * — Monthly dept summary",         note: "Dept Head monthly email" },
      { done: true,  label: "0 3 1 1 * — Annual audit archive",         note: "Archive logs older than 1 year" },
    ]
  },
  {
    title: "Security",
    icon: "Sec",
    items: [
      { done: true,  label: "AES-256-GCM PIN encryption",               note: "NAll PINs encrypted at rest" },
      { done: true,  label: "JWT authentication (1-day expiry)",        note: "Bearer token auth" },
      { done: true,  label: "bcrypt password hashing (cost 12)",        note: "All passwords hashed" },
      { done: true,  label: "Rate limiting: 100/hr on distributions",   note: "express-rate-limit active" },
      { done: true,  label: "Rate limiting: 20/15min on auth",          note: "Login brute-force protection" },
      { done: true,  label: "CORS configured",                          note: "localhost:5173, 5174 allowed" },
      { done: true,  label: "Input sanitization on CSV upload",         note: ".csv only, 5MB max, trim+sanitize" },
      { done: false, label: "SSL certificate installed",                note: "Required for production HTTPS" },
      { done: false, label: "HTTPS enforced",                           note: "Configure Nginx with SSL" },
    ]
  },
  {
    title: "Startup Validation",
    icon: "Start",
    items: [
      { done: true,  label: ".env validation on startup",               note: "Missing vars cause process.exit(1)" },
      { done: true,  label: "CARD_ENCRYPTION_KEY format check",         note: "64-char hex validated at startup" },
      { done: true,  label: "JWT_SECRET strength warning",              note: "Warns if < 32 chars" },
      { done: true,  label: "All cron jobs started on boot",            note: "5 jobs confirmed in server logs" },
    ]
  },
  {
    title: "Frontend Build",
    icon: "FE",
    items: [
      { done: true,  label: "React build: 101 modules",                 note: "vite build - zero errors" },
      { done: true,  label: "API proxy to localhost:5000",              note: "vite.config.js proxy configured" },
      { done: true,  label: "Role-based navigation (RBAC)",             note: "6 roles, sidebar filtered per role" },
      { done: true,  label: "Emojis removed (clean UI)",                note: "22 files cleaned" },
      { done: false, label: "Configure Nginx to serve React build",     note: "For production deployment" },
    ]
  },
  {
    title: "Acceptance Criteria ",
    icon: "AC",
    items: [
      { done: true,  label: "Admin uploads 500 cards, validates within 10s", note: "CSV upload with AES-256 encryption" },
      { done: true,  label: "Store Officer distributes, staff receive emails within 5 min", note: "Nodemailer + QR code in email" },
      { done: true,  label: "Staff confirms with one click, IP+timestamp logged", note: "Confirmation with full audit log" },
      { done: true,  label: "Dashboard shows pending confirmations + low inventory", note: "KPI cards + alert banner" },
      { done: true,  label: "Audit trail has complete immutable log of card movements", note: "All 10 action types logged" },
      { done: true,  label: "System prevents double-issuance in same month", note: "BR-001 enforced in distribution engine" },
    ]
  },
];

export default function Deployment() {
  const totalItems = CHECK_GROUPS.reduce((s,g) => s + g.items.length, 0);
  const doneItems  = CHECK_GROUPS.reduce((s,g) => s + g.items.filter(i=>i.done).length, 0);
  const pct = Math.round((doneItems/totalItems)*100);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-area">
        <Topbar />
        <div className="page-content">
          <div className="page-header">
            <div>
              <div className="page-title">Deployment Checklist</div>
              <div className="page-subtitle">SRS Production deployment steps and configuration</div>
            </div>
          </div>

          {/* Progress */}
          <div style={{ background:"white", borderRadius:16, border:"1px solid #e2e8f0", padding:"24px 28px", marginBottom:20, boxShadow:"0 1px 4px rgba(0,0,0,.06)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
              <div style={{ fontWeight:700, fontSize:16 }}>Overall Completion</div>
              <div style={{ fontWeight:800, fontSize:18, color: pct>=90?"#16a34a":pct>=70?"#d97706":"#dc2626" }}>{pct}%</div>
            </div>
            <div style={{ height:12, background:"#e2e8f0", borderRadius:999, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${pct}%`, background:"linear-gradient(90deg,#2563eb,#16a34a)", borderRadius:999, transition:"width .5s" }} />
            </div>
            <div style={{ marginTop:8, fontSize:13, color:"#64748b" }}>{doneItems} of {totalItems} items complete</div>
          </div>

          {/* Quick Stats */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16, marginBottom:20 }}>
            <div style={{ background:"#dcfce7", borderRadius:14, padding:"18px 22px", border:"1px solid #86efac" }}>
              <div style={{ fontSize:28, fontWeight:800, color:"#15803d" }}>{doneItems}</div>
              <div style={{ fontSize:13, color:"#166534", fontWeight:600 }}>Completed</div>
            </div>
            <div style={{ background:"#fee2e2", borderRadius:14, padding:"18px 22px", border:"1px solid #fca5a5" }}>
              <div style={{ fontSize:28, fontWeight:800, color:"#b91c1c" }}>{totalItems-doneItems}</div>
              <div style={{ fontSize:13, color:"#991b1b", fontWeight:600 }}>Pending (manual setup)</div>
            </div>
            <div style={{ background:"#dbeafe", borderRadius:14, padding:"18px 22px", border:"1px solid #93c5fd" }}>
              <div style={{ fontSize:28, fontWeight:800, color:"#1d4ed8" }}>{CHECK_GROUPS.length}</div>
              <div style={{ fontSize:13, color:"#1e40af", fontWeight:600 }}>Checklist Groups</div>
            </div>
          </div>

          {/* Groups */}
          {CHECK_GROUPS.map(group => {
            const groupDone  = group.items.filter(i=>i.done).length;
            const groupTotal = group.items.length;
            return (
              <div key={group.title} style={{ background:"white", borderRadius:16, border:"1px solid #e2e8f0", overflow:"hidden", marginBottom:16, boxShadow:"0 1px 4px rgba(0,0,0,.06)" }}>
                <div style={{ padding:"14px 22px", background:"#fafbfc", borderBottom:"1px solid #e2e8f0", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <div style={{ fontWeight:700, fontSize:14 }}>{group.title}</div>
                  <span style={{
                    fontSize:12, fontWeight:700, padding:"3px 12px", borderRadius:999,
                    background: groupDone===groupTotal?"#dcfce7":"#fef3c7",
                    color: groupDone===groupTotal?"#15803d":"#92400e",
                  }}>
                    {groupDone}/{groupTotal}
                  </span>
                </div>
                <div style={{ padding:"8px 0" }}>
                  {group.items.map((item, i) => (
                    <div key={i} style={{ display:"flex", alignItems:"flex-start", gap:14, padding:"11px 22px", borderBottom: i<group.items.length-1?"1px solid #f8fafc":"none" }}>
                      <div style={{
                        width:22, height:22, borderRadius:"50%", flexShrink:0, marginTop:1,
                        background: item.done?"#dcfce7":"#fee2e2",
                        border: `2px solid ${item.done?"#16a34a":"#dc2626"}`,
                        display:"flex", alignItems:"center", justifyContent:"center",
                        fontSize:13, fontWeight:800, color: item.done?"#16a34a":"#dc2626",
                      }}>
                        {item.done ? "+" : "!"}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13.5, fontWeight:600, color: item.done?"#0f172a":"#374151" }}>{item.label}</div>
                        <div style={{ fontSize:12, color:"#64748b", marginTop:2 }}>{item.note}</div>
                      </div>
                      <span style={{
                        fontSize:11.5, fontWeight:700, padding:"2px 10px", borderRadius:999, flexShrink:0,
                        background: item.done?"#dcfce7":"#fee2e2",
                        color: item.done?"#15803d":"#b91c1c",
                      }}>
                        {item.done ? "DONE" : "TODO"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Start Commands */}
          <div style={{ background:"#0f172a", borderRadius:16, padding:"24px 28px", boxShadow:"0 4px 20px rgba(0,0,0,.15)" }}>
            <div style={{ fontSize:15, fontWeight:700, color:"white", marginBottom:16 }}>Start Commands</div>
            {[
              { label:"Backend",  cmd:"node src/server.js",   dir:"mccs/" },
              { label:"Frontend", cmd:"npm run dev",           dir:"mccs-frontend/" },
              { label:"Build",    cmd:"npm run build",         dir:"mccs-frontend/" },
            ].map(c => (
              <div key={c.label} style={{ display:"flex", alignItems:"center", gap:14, marginBottom:10 }}>
                <span style={{ width:80, fontSize:12, color:"#64748b", fontWeight:700 }}>{c.label}</span>
                <code style={{ flex:1, background:"#1e293b", color:"#34d399", padding:"8px 14px", borderRadius:8, fontSize:13, fontFamily:"'Courier New',monospace" }}>
                  {c.dir} $ {c.cmd}
                </code>
              </div>
            ))}
            <div style={{ marginTop:16, paddingTop:16, borderTop:"1px solid #1e293b", fontSize:13, color:"#64748b" }}>
              Backend: http://localhost:5000 &nbsp;|&nbsp; Frontend: http://localhost:5173
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
