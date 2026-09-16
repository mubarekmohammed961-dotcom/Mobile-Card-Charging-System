import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

//  UC-01 Monthly Bulk Distribution workflow
// Monthly Distribution Cycle — 7 steps
//  System Modules overview

const fv = v => Number(v || 0).toFixed(2);
const fn = v => Number(v || 0).toLocaleString();

const WORKFLOW_STEPS = [
  { step: 1, icon: "Send", title: "Inventory Upload",       desc: "Admin uploads cards (PINs, values, providers)  System validates  Cards marked AVAILABLE",         color: "#2563eb", page: "/inventory"   },
  { step: 2, icon: "", title: "Eligibility Setup",       desc: "Admin sets staff quotas and eligibility rules per card type",                                          color: "#7c3aed", page: "/eligibility" },
  { step: 3, icon: "", title: "Distribution Initiation", desc: "Store Officer selects month + department  System identifies eligible staff  Auto-allocates cards  Status = ALLOCATED", color: "#0d9488", page: "/allocations" },
  { step: 4, icon: "", title: "Delivery",               desc: "System generates encrypted PINs  Sends emails/SMS with 'Confirm Receipt' links  Status = SENT",      color: "#d97706", page: "/deliveries" },
  { step: 5, icon: "", title: "Staff Confirmation",      desc: "Staff clicks link  Logs in  Views PIN  Clicks 'Acknowledge'  Status = DELIVERED",                  color: "#16a34a", page: "/staff-dashboard" },
  { step: 6, icon: "", title: "Tracking & Reconciliation","desc":"Admin monitors confirmation rates  Flags unconfirmed after 7 days  Follows up manually",           color: "#dc2626", page: "/reports"    },
  { step: 7, icon: "", title: "Usage Reporting",         desc: "Staff marks as 'Used'  Admin reconciles issued vs used  Generates monthly report",                   color: "#475569", page: "/usage"      },
];

const MODULE_LIST = [
  { icon: "", name: "Inventory Management",       desc: "Upload, validate, categorize, track cards",        route: "/inventory",    color: "#2563eb", bg: "#eff6ff"  },
  { icon: "", name: "Staff & Eligibility",         desc: "CRUD staff, set quotas, manage departments",       route: "/staff",        color: "#7c3aed", bg: "#f5f3ff"  },
  { icon: "", name: "Distribution Engine",         desc: "Auto-allocation, scheduling, preview, confirm",    route: "/allocations",  color: "#0d9488", bg: "#f0fdfa"  },
  { icon: "", name: "Secure Delivery",             desc: "Encryption, email/SMS dispatch, token management", route: "/deliveries",   color: "#d97706", bg: "#fef3c7"  },
  { icon: "", name: "Confirmation & Acknowledgment","desc":"Receipt links, logging, reminders",               route: "/staff-dashboard",color:"#16a34a", bg:"#dcfce7" },
  { icon: "", name: "Reporting & Analytics",       desc: "Dashboards, exports, KPIs",                        route: "/reports",      color: "#2563eb", bg: "#eff6ff"  },
  { icon: "", name: "Audit & Logging",             desc: "Immutable logs for all actions",                   route: "/audit-logs",   color: "#dc2626", bg: "#fee2e2"  },
  { icon: "", name: "User & Role Management",      desc: "Authentication, RBAC (6 roles)",                   route: "/users",        color: "#9d174d", bg: "#fdf2f8"  },
];

export default function Workflow() {
  const [stats,   setStats]   = useState(null);
  const [dists,   setDists]   = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const token = localStorage.getItem("mccs_token");
  const h = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    const load = async () => {
      try {
        const [dR, sR] = await Promise.all([
          api.get("/distributions?limit=5", { headers: h }),
          api.get("/dashboard/summary",     { headers: h }),
        ]);
        setDists(dR.data?.distributions?.slice(0, 5) || []);
        setStats(sR.data || null);
      } catch (_) {}
      finally { setLoading(false); }
    };
    load();
  }, []);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-area">
        <Topbar />
        <div className="page-content">

          {/* Header */}
          <div className="page-header">
            <div>
              <div className="page-title">Distribution Workflow</div>
              <div className="page-subtitle">Monthly card distribution lifecycle — from inventory upload to usage tracking</div>
            </div>
          </div>

          {/* ── 7-Step Workflow ── */}
          <div style={{ background:"white", borderRadius:16, border:"1px solid #e2e8f0", overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,.06)", marginBottom:20 }}>
            <div style={{ padding:"18px 24px", borderBottom:"1px solid #e2e8f0", background:"linear-gradient(135deg,#1e3a8a,#2563eb)", color:"white" }}>
              <div style={{ fontSize:16, fontWeight:800 }}>Monthly Distribution Cycle</div>
              <div style={{ fontSize:12.5, opacity:.85, marginTop:2 }}>Complete card lifecycle from upload to usage tracking</div>
            </div>
            <div style={{ padding:"24px" }}>
              <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
                {WORKFLOW_STEPS.map((s, i) => (
                  <div key={s.step} style={{ display:"flex", gap:0 }}>
                    {/* Left: line + circle */}
                    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", width:52, flexShrink:0 }}>
                      <div style={{ width:44, height:44, borderRadius:"50%", background:s.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, boxShadow:`0 2px 8px ${s.color}44`, flexShrink:0, zIndex:1 }}>
                        {s.icon}
                      </div>
                      {i < WORKFLOW_STEPS.length - 1 && (
                        <div style={{ width:2, flex:1, background:"#e2e8f0", minHeight:32 }} />
                      )}
                    </div>
                    {/* Right: content */}
                    <div style={{ flex:1, paddingBottom: i < WORKFLOW_STEPS.length - 1 ? 20 : 0, paddingLeft:16, paddingTop:8 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
                        <span style={{ background:s.color, color:"white", fontSize:10, fontWeight:800, padding:"2px 8px", borderRadius:999 }}>Step {s.step}</span>
                        <span style={{ fontWeight:700, fontSize:15, color:"#0f172a" }}>{s.title}</span>
                        <button onClick={() => navigate(s.page)}
                          style={{ marginLeft:"auto", padding:"4px 12px", borderRadius:6, border:`1px solid ${s.color}`, background:"white", color:s.color, fontSize:12, fontWeight:700, cursor:"pointer" }}>
                          Go 
                        </button>
                      </div>
                      <div style={{ fontSize:13.5, color:"#64748b", lineHeight:1.6 }}>{s.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Use Cases ── */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16, marginBottom:20 }}>
            {[
              { uc:"Step 1", title:"Monthly Bulk Distribution", icon:"",
                steps:["Store Officer selects month + department","System auto-allocates eligible cards","Preview distribution","Confirm  System sends delivery notifications"],
                color:"#2563eb", page:"/allocations" },
              { uc:"Step 2", title:"Staff Confirms Receipt",    icon:"",
                steps:["Opens email  Clicks 'Confirm Receipt'","Logs in  Views card details","Clicks 'Acknowledge'","System logs confirmation with IP + timestamp"],
                color:"#16a34a", page:"/staff-dashboard" },
              { uc:"Step 3", title:"Inventory Replenishment",   icon:"",
                steps:["Admin uploads new CSV","System validates PINs for uniqueness","Cards added to inventory","Status = AVAILABLE"],
                color:"#d97706", page:"/inventory" },
            ].map(uc => (
              <div key={uc.uc} style={{ background:"white", borderRadius:14, border:"1px solid #e2e8f0", overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,.06)" }}>
                <div style={{ background:uc.color, padding:"16px 20px", color:"white" }}>
                  <div style={{ fontSize:11, opacity:.8, fontWeight:700, textTransform:"uppercase", letterSpacing:1 }}>{uc.uc}</div>
                  <div style={{ fontSize:16, fontWeight:800, marginTop:2 }}>{uc.icon} {uc.title}</div>
                </div>
                <div style={{ padding:"16px 20px" }}>
                  <ol style={{ margin:0, paddingLeft:18, display:"flex", flexDirection:"column", gap:8 }}>
                    {uc.steps.map((step, i) => (
                      <li key={i} style={{ fontSize:13, color:"#475569", lineHeight:1.5 }}>{step}</li>
                    ))}
                  </ol>
                  <button onClick={() => navigate(uc.page)}
                    style={{ marginTop:14, width:"100%", padding:"9px", borderRadius:8, border:`1.5px solid ${uc.color}`, background:"white", color:uc.color, fontSize:13, fontWeight:700, cursor:"pointer" }}>
                    Open Module 
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* ── 8 System Modules ── */}
          <div style={{ background:"white", borderRadius:16, border:"1px solid #e2e8f0", overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,.06)", marginBottom:20 }}>
            <div style={{ padding:"18px 24px", borderBottom:"1px solid #e2e8f0", background:"#fafbfc" }}>
              <div style={{ fontSize:16, fontWeight:700 }}> System Modules</div>
              <div style={{ fontSize:12.5, color:"#64748b", marginTop:2 }}>All 8 MCCS modules — click to navigate</div>
            </div>
            <div style={{ padding:"20px 24px", display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14 }}>
              {MODULE_LIST.map(m => (
                <div key={m.name}
                  onClick={() => navigate(m.route)}
                  style={{ padding:"16px", borderRadius:12, background:m.bg, border:`1px solid ${m.color}22`, cursor:"pointer", transition:"all .15s" }}
                  onMouseEnter={e => { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow=`0 4px 16px ${m.color}22`; }}
                  onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="none"; }}
                >
                  <div style={{ fontSize:28, marginBottom:8 }}>{m.icon}</div>
                  <div style={{ fontWeight:700, fontSize:13.5, color:m.color, marginBottom:4 }}>{m.name}</div>
                  <div style={{ fontSize:12, color:"#64748b", lineHeight:1.5 }}>{m.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Live Distribution Status ── */}
          <div style={{ background:"white", borderRadius:16, border:"1px solid #e2e8f0", overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,.06)" }}>
            <div style={{ padding:"18px 24px", borderBottom:"1px solid #e2e8f0", background:"#fafbfc", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontSize:15, fontWeight:700 }}> Live Cycle Status</div>
                <div style={{ fontSize:12.5, color:"#64748b", marginTop:2 }}>Current distribution pipeline health</div>
              </div>
            </div>
            {loading ? (
              <div className="loading-wrap"><div className="spinner"/><span>Loading…</span></div>
            ) : stats && (
              <div style={{ padding:"20px 24px" }}>
                {/* Pipeline progress */}
                <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:12, marginBottom:24 }}>
                  {[
                    { label:"Available",   val: stats.summary?.available_cards,      color:"#16a34a", icon:"" },
                    { label:"Allocated",   val: stats.summary?.allocated_cards,      color:"#d97706", icon:"" },
                    { label:"Sent",        val: stats.deliveries?.sent,              color:"#2563eb", icon:"Send" },
                    { label:"Confirmed",   val: stats.deliveries?.confirmed,         color:"#0d9488", icon:"" },
                    { label:"Used",        val: stats.summary?.used_cards,           color:"#7c3aed", icon:"" },
                    { label:"Pending",     val: (stats.deliveries?.pending||0)+(stats.deliveries?.sent||0), color:"#dc2626", icon:"..." },
                  ].map(s => (
                    <div key={s.label} style={{ textAlign:"center", padding:"14px 10px", borderRadius:10, background:"#f8fafc", border:"1px solid #e2e8f0" }}>
                      <div style={{ fontSize:22, marginBottom:6 }}>{s.icon}</div>
                      <div style={{ fontSize:22, fontWeight:800, color:s.color }}>{fn(s.val||0)}</div>
                      <div style={{ fontSize:11.5, color:"#64748b", fontWeight:600, textTransform:"uppercase", letterSpacing:".4px", marginTop:2 }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Recent distributions */}
                {dists.length > 0 && (
                  <>
                    <div style={{ fontWeight:700, fontSize:14, marginBottom:12 }}>Recent Distributions</div>
                    <div className="table-container">
                      <table className="data-table">
                        <thead>
                          <tr><th>#</th><th>Month</th><th>Department</th><th>Cards</th><th>Value</th><th>Status</th><th>Approval</th></tr>
                        </thead>
                        <tbody>
                          {dists.map(d => (
                            <tr key={d.id}>
                              <td className="text-secondary">{d.id}</td>
                              <td><strong>{d.month ? new Date(d.month).toLocaleDateString("en-US",{year:"numeric",month:"short"}) : "—"}</strong></td>
                              <td>{d.department_name || "—"}</td>
                              <td><span className="badge badge-blue">{d.total_cards}</span></td>
                              <td><strong>${fv(d.total_value)}</strong></td>
                              <td><span className={`badge ${d.status==="CONFIRMED"?"badge-blue":d.status==="COMPLETED"?"badge-green":"badge-gray"}`}>{d.status}</span></td>
                              <td>
                                {d.requires_approval ? (
                                  <span className={`badge ${d.approval_status==="APPROVED"?"badge-green":d.approval_status==="REJECTED"?"badge-red":"badge-yellow"}`}>
                                    {d.approval_status || "PENDING"}
                                  </span>
                                ) : <span className="text-muted text-sm">N/A</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
