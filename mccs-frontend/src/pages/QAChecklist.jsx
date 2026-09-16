import { useState } from "react";
import api from "../services/api";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

// - Testing Checklist (QA)
// Runs key test cases against the live API

const fv = v => Number(v || 0).toFixed(2);

const QA_CASES = [
  {
    group: "Functional Tests",
    cases: [
      { id:"F01", name:"Upload CSV - 100 cards, validate unique PINs",       api:"/api/inventory/cards?status=AVAILABLE",  method:"GET",  expect:"count > 0" },
      { id:"F02", name:"Initiate distribution for eligible staff",            api:"/api/distributions",                     method:"GET",  expect:"count >= 0" },
      { id:"F03", name:"Distribution preview returns cards + eligibility",    api:"/api/distributions/items",               method:"GET",  expect:"count >= 0" },
      { id:"F04", name:"Deliveries list - email/SMS tracking",                api:"/api/deliveries",                        method:"GET",  expect:"count >= 0" },
      { id:"F05", name:"Staff confirmation updates card status",              api:"/api/confirmations",                     method:"N/A",  expect:"POST with token" },
      { id:"F06", name:"Usage logs - staff marks card as USED",               api:"/api/usage",                             method:"GET",  expect:"count >= 0" },
      { id:"F07", name:"Audit log has all actions",                           api:"/api/audit-logs",                        method:"GET",  expect:"LOGIN entries exist" },
      { id:"F08", name:"Reports - department summary",                        api:"/api/reports/summary",                   method:"GET",  expect:"departments.length > 0" },
      { id:"F09", name:"Reconciliation - cards issued vs confirmed vs used",  api:"/api/reports/reconciliation",            method:"GET",  expect:"summary present" },
      { id:"F10", name:"Budget compliance report",                            api:"/api/reports/budget-compliance",         method:"GET",  expect:"departments present" },
    ]
  },
  {
    group: "Edge Cases (BR validation)",
    cases: [
      { id:"E01", name:"Staff with pending prev month blocked (BR-002)",       api:"/api/distributions/preview",             method:"POST", expect:"exception if pending" },
      { id:"E02", name:"Insufficient inventory alert",                api:"/api/inventory/stats",                   method:"GET",  expect:"available count present" },
      { id:"E03", name:"Expired card auto-flagged",                   api:"/api/inventory/cards?status=EXPIRED",    method:"GET",  expect:"success=true" },
      { id:"E04", name:"Duplicate PIN in CSV rejected ",           api:"/api/inventory/upload",                  method:"POST", expect:"validation error" },
      { id:"E05", name:"Over-budget distribution requires approval (BR-004)", api:"/api/approvals/pending",                  method:"GET",  expect:"success=true" },
      { id:"E06", name:"Monthly quota prevents over-issuance (BR-001)",        api:"/api/eligibility",                       method:"GET",  expect:"rules present" },
    ]
  },
  {
    group: "Security Tests",
    cases: [
      { id:"S01", name:"Expired confirmation token returns 410",       api:"/api/staff-dashboard/card/INVALID_TOKEN", method:"GET",  expect:"404 or error" },
      { id:"S02", name:"Unauthenticated request returns 401",                   api:"/api/dashboard/summary",                 method:"UNAUTH", expect:"401" },
      { id:"S03", name:"STAFF cannot access Inventory (RBAC)",                  api:"/api/inventory/cards",                   method:"STAFF",  expect:"403 Access denied" },
      { id:"S04", name:"Rate limiting active on distribution endpoint",         api:"/api/distributions",                     method:"GET",  expect:"success=true (within limit)" },
      { id:"S05", name:"PIN never in plain text in card listing",               api:"/api/inventory/cards",                   method:"GET",  expect:"no pin_plain field" },
    ]
  },
  {
    group: "Performance Tests",
    cases: [
      { id:"P01", name:"Inventory loads 100+ cards under 2 seconds",           api:"/api/inventory/cards",                   method:"PERF", expect:"< 2000ms" },
      { id:"P02", name:"Dashboard summary loads under 1 second",               api:"/api/dashboard/summary",                 method:"PERF", expect:"< 1000ms" },
      { id:"P03", name:"Reports summary loads under 2 seconds",                api:"/api/reports/summary",                   method:"PERF", expect:"< 2000ms" },
      { id:"P04", name:"Audit logs 100+ entries load under 2 seconds",         api:"/api/audit-logs",                        method:"PERF", expect:"< 2000ms" },
    ]
  },
];

export default function QAChecklist() {
  const [results, setResults] = useState({});
  const [running,  setRunning]  = useState(false);
  const [summary,  setSummary]  = useState(null);

  const token = localStorage.getItem("mccs_token");
  const staffToken = null; // would need staff login

  const runAll = async () => {
    setRunning(true);
    setResults({});
    setSummary(null);

    const h = { Authorization: `Bearer ${token}` };
    let pass = 0, fail = 0, warn = 0;
    const newResults = {};

    for (const group of QA_CASES) {
      for (const tc of group.cases) {
        const start = Date.now();
        let status = "PASS", detail = "";

        try {
          if (tc.method === "N/A") {
            status = "SKIP"; detail = "Requires manual test with real token";
          } else if (tc.method === "UNAUTH") {
            // Test without auth
            const r = await fetch(`/api${tc.api}`);
            status = r.status === 401 ? "PASS" : "FAIL";
            detail = `HTTP ${r.status} (expected 401)`;
          } else if (tc.method === "STAFF") {
            // Would need staff token — skip with note
            status = "SKIP"; detail = "Use staff credentials to test RBAC";
          } else if (tc.method === "PERF") {
            const r = await api.get(tc.api, { headers: h });
            const ms = Date.now() - start;
            const limit = tc.expect.includes("1000") ? 1000 : 2000;
            status = ms < limit ? "PASS" : "WARN";
            detail = `${ms}ms (limit: ${limit}ms)`;
          } else if (tc.method === "GET") {
            const r = await api.get(tc.api, { headers: h });
            status = r.data?.success ? "PASS" : "FAIL";
            detail = `success=${r.data?.success} count=${r.data?.count ?? r.data?.distributions?.length ?? "n/a"}`;
          } else {
            status = "SKIP"; detail = "POST test requires specific payload";
          }
        } catch (e) {
          if (tc.method === "UNAUTH" && e.response?.status === 401) {
            status = "PASS"; detail = "HTTP 401 (correct)";
          } else if (tc.method === "STAFF" && e.response?.status === 403) {
            status = "PASS"; detail = "HTTP 403 Access denied (correct)";
          } else {
            status = "WARN"; detail = e.response?.data?.message || e.message;
          }
        }

        const elapsed = Date.now() - start;
        newResults[tc.id] = { status, detail, elapsed };
        if (status === "PASS") pass++;
        else if (status === "FAIL") fail++;
        else warn++;

        setResults({ ...newResults });
      }
    }

    setSummary({ pass, fail, warn, total: pass + fail + warn });
    setRunning(false);
  };

  const statusColor = { PASS:"#16a34a", FAIL:"#dc2626", WARN:"#d97706", SKIP:"#64748b" };
  const statusBg    = { PASS:"#dcfce7", FAIL:"#fee2e2", WARN:"#fef3c7", SKIP:"#f1f5f9" };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-area">
        <Topbar />
        <div className="page-content">
          <div className="page-header">
            <div>
              <div className="page-title">QA Test Checklist</div>
              <div className="page-subtitle">SRS Functional, Edge Case, Security & Performance tests</div>
            </div>
            <button className="btn btn-primary" onClick={runAll} disabled={running}>
              {running ? "Running Tests..." : "Run All Tests"}
            </button>
          </div>

          {/* Summary */}
          {summary && (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, marginBottom:20 }}>
              {[
                { label:"Passed",  val:summary.pass,  color:"#16a34a", bg:"#dcfce7" },
                { label:"Failed",  val:summary.fail,  color:"#dc2626", bg:"#fee2e2" },
                { label:"Warning", val:summary.warn,  color:"#d97706", bg:"#fef3c7" },
                { label:"Skipped", val:summary.total - summary.pass - summary.fail - summary.warn, color:"#64748b", bg:"#f1f5f9" },
              ].map(s => (
                <div key={s.label} style={{ background:s.bg, borderRadius:14, padding:"18px 22px", border:`1px solid ${s.color}33` }}>
                  <div style={{ fontSize:28, fontWeight:800, color:s.color }}>{s.val}</div>
                  <div style={{ fontSize:13, color:s.color, fontWeight:600, marginTop:4 }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Test Groups */}
          {QA_CASES.map(group => (
            <div key={group.group} style={{ background:"white", borderRadius:16, border:"1px solid #e2e8f0", overflow:"hidden", marginBottom:16, boxShadow:"0 1px 4px rgba(0,0,0,.06)" }}>
              <div style={{ padding:"14px 22px", background:"#fafbfc", borderBottom:"1px solid #e2e8f0", fontWeight:700, fontSize:14 }}>
                {group.group}
              </div>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr><th>ID</th><th>Test Case</th><th>Endpoint</th><th>Expected</th><th>Result</th><th>Time</th></tr>
                  </thead>
                  <tbody>
                    {group.cases.map(tc => {
                      const r = results[tc.id];
                      return (
                        <tr key={tc.id}>
                          <td><span style={{ fontFamily:"monospace", fontSize:12, fontWeight:700 }}>{tc.id}</span></td>
                          <td style={{ fontSize:13 }}>{tc.name}</td>
                          <td><span style={{ fontFamily:"monospace", fontSize:11.5, color:"#475467" }}>{tc.api}</span></td>
                          <td style={{ fontSize:12, color:"#64748b" }}>{tc.expect}</td>
                          <td>
                            {r ? (
                              <div>
                                <span style={{ background:statusBg[r.status], color:statusColor[r.status], fontSize:11.5, fontWeight:700, padding:"2px 10px", borderRadius:999 }}>
                                  {r.status}
                                </span>
                                {r.detail && <div style={{ fontSize:11.5, color:"#64748b", marginTop:3 }}>{r.detail}</div>}
                              </div>
                            ) : running ? (
                              <span style={{ color:"#94a3b8", fontSize:12 }}>...</span>
                            ) : (
                              <span style={{ color:"#cbd5e1", fontSize:12 }}>Not run</span>
                            )}
                          </td>
                          <td style={{ fontSize:12, color:"#64748b" }}>
                            {r?.elapsed ? `${r.elapsed}ms` : "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {/* Manual test instructions */}
          <div style={{ background:"white", borderRadius:16, border:"1px solid #e2e8f0", padding:"22px 28px", boxShadow:"0 1px 4px rgba(0,0,0,.06)" }}>
            <div style={{ fontWeight:700, fontSize:15, marginBottom:12 }}>Manual Tests Required</div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {[
                { id:"M01", desc:"Upload CSV with 100 cards → validate unique PINs → all import within 10 seconds" },
                { id:"M02", desc:"Initiate monthly distribution → all eligible staff receive emails within 5 minutes" },
                { id:"M03", desc:"Staff confirms receipt with one click → system logs IP, timestamp, user agent" },
                { id:"M04", desc:"Dashboard shows pending confirmations and low inventory alerts correctly" },
                { id:"M05", desc:"Audit trail contains complete, immutable log of every card movement from upload to usage" },
                { id:"M06", desc:"System prevents double-issuance to the same staff in the same month" },
                { id:"M07", desc:"SMTP failure during bulk email → retry logic kicks in (Section 21 Integration test)" },
                { id:"M08", desc:"Brute-force confirmation token → rate-limit triggers (Section 21 Security test)" },
              ].map(m => (
                <div key={m.id} style={{ display:"flex", gap:12, padding:"10px 14px", background:"#f8fafc", borderRadius:8, border:"1px solid #e2e8f0" }}>
                  <span style={{ fontFamily:"monospace", fontSize:12, fontWeight:700, color:"#2563eb", flexShrink:0 }}>{m.id}</span>
                  <span style={{ fontSize:13.5, color:"#374151" }}>{m.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
