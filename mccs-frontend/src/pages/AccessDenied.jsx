import { useNavigate } from "react-router-dom";
import { ROLE_META } from "../utils/permissions";

export default function AccessDenied() {
  const navigate = useNavigate();

  const user = (() => {
    try { return JSON.parse(localStorage.getItem("mccs_user") || "{}"); }
    catch { return {}; }
  })();

  const role     = user.role || "STAFF";
  const roleMeta = ROLE_META[role] || { label: role, icon: "", color: "#475569", bg: "#f1f5f9" };

  return (
    <div style={{
      minHeight: "100vh", background: "var(--bg)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "24px",
    }}>
      <div style={{
        background: "white", borderRadius: "20px", padding: "52px 44px",
        maxWidth: "500px", width: "100%", textAlign: "center",
        boxShadow: "0 10px 40px rgba(0,0,0,.1)",
        border: "1px solid var(--border)",
      }}>
        {/* Icon */}
        <div style={{
          width: "80px", height: "80px", borderRadius: "50%",
          background: "#fee2e2", display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: "36px", margin: "0 auto 24px",
        }}>
          
        </div>

        <div style={{ fontSize: "28px", fontWeight: 800, color: "var(--text-primary)", marginBottom: "8px" }}>
          Access Denied
        </div>
        <div style={{ fontSize: "15px", color: "var(--text-secondary)", marginBottom: "28px", lineHeight: 1.6 }}>
          You don't have permission to view this page.
        </div>

        {/* Current role chip */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: "8px",
          padding: "8px 18px", borderRadius: "999px",
          background: roleMeta.bg, color: roleMeta.color,
          fontWeight: 700, fontSize: "14px", marginBottom: "28px",
          border: `1px solid ${roleMeta.color}30`,
        }}>
          {roleMeta.icon} Your role: {roleMeta.label}
        </div>

        <div style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "32px" }}>
          {roleMeta.label} accounts do not have access to this module.<br />
          Contact your administrator if you need access.
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              padding: "11px 24px", borderRadius: "8px",
              border: "1.5px solid var(--border)", background: "white",
              fontWeight: 600, fontSize: "14px", cursor: "pointer",
              color: "var(--text-primary)", transition: "all .15s",
            }}
            onMouseEnter={e => e.target.style.background = "var(--bg)"}
            onMouseLeave={e => e.target.style.background = "white"}
          >
             Go Back
          </button>
          <button
            onClick={() => navigate("/dashboard")}
            style={{
              padding: "11px 24px", borderRadius: "8px",
              border: "none", background: "var(--primary)", color: "white",
              fontWeight: 700, fontSize: "14px", cursor: "pointer",
              boxShadow: "0 2px 8px rgba(37,99,235,.3)", transition: "all .15s",
            }}
            onMouseEnter={e => e.target.style.background = "var(--primary-dark)"}
            onMouseLeave={e => e.target.style.background = "var(--primary)"}
          >
             Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
