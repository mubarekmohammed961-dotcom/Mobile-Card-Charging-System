import { useEffect, useState } from "react";
import api from "../services/api";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

export default function AdminSettings() {
  const [profile, setProfile]   = useState(null);
  const [profileForm, setProf]  = useState({ full_name: "", email: "", phone: "" });
  const [pwdForm, setPwd]       = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [profSaving, setProfSav] = useState(false);
  const [pwdSaving, setPwdSav]  = useState(false);
  const [profMsg, setProfMsg]   = useState(""); const [profErr, setProfErr] = useState("");
  const [pwdMsg, setPwdMsg]     = useState(""); const [pwdErr, setPwdErr]   = useState("");
  const [showPwd, setShowPwd]   = useState({ cur: false, new: false, con: false });

  const token = localStorage.getItem("mccs_token");
  const currentUser = (() => { try { return JSON.parse(localStorage.getItem("mccs_user") || "{}"); } catch { return {}; } })();
  const h = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const loadProfile = async () => {
    try {
      const r = await api.get("/users/me", { headers: h });
      const u = r.data?.user;
      setProfile(u);
      setProf({ full_name: u.full_name || "", email: u.email || "", phone: u.phone || "" });
    } catch (e) { setProfErr(e.response?.data?.message || "Failed to load profile"); }
  };

  useEffect(() => { loadProfile(); }, []);

  const updateProfile = async e => {
    e.preventDefault(); setProfMsg(""); setProfErr("");
    try {
      setProfSav(true);
      const r = await api.put(`/users/${currentUser.id}`, {
        full_name: profileForm.full_name.trim(),
        email: profileForm.email.trim(),
        phone: profileForm.phone.trim() || null,
      }, { headers: h });
      setProfMsg(r.data?.message || "Profile updated.");
      // Update local storage
      const updated = { ...currentUser, full_name: profileForm.full_name.trim(), email: profileForm.email.trim() };
      localStorage.setItem("mccs_user", JSON.stringify(updated));
      loadProfile();
    } catch (e) { setProfErr(e.response?.data?.message || "Update failed"); }
    finally { setProfSav(false); }
  };

  const changePassword = async e => {
    e.preventDefault(); setPwdMsg(""); setPwdErr("");
    if (pwdForm.new_password !== pwdForm.confirm_password) { setPwdErr("Passwords do not match."); return; }
    if (pwdForm.new_password.length < 6) { setPwdErr("Password must be at least 6 characters."); return; }
    try {
      setPwdSav(true);
      const r = await api.patch(`/users/${currentUser.id}/password`, {
        current_password: pwdForm.current_password,
        new_password: pwdForm.new_password,
      }, { headers: h });
      setPwdMsg(r.data?.message || "Password changed.");
      setPwd({ current_password: "", new_password: "", confirm_password: "" });
    } catch (e) { setPwdErr(e.response?.data?.message || "Password change failed"); }
    finally { setPwdSav(false); }
  };

  const roleColors = {
    SUPER_ADMIN: { bg: "#fdf2f8", color: "#9d174d" },
    SYSTEM_ADMIN: { bg: "#f5f3ff", color: "#5b21b6" },
    STORE_OFFICER: { bg: "#eff6ff", color: "#1e40af" },
    DEPARTMENT_HEAD: { bg: "#ecfdf5", color: "#065f46" },
    STAFF: { bg: "#f0f9ff", color: "#075985" },
    AUDITOR: { bg: "#fff7ed", color: "#9a3412" },
  };
  const roleStyle = roleColors[profile?.role] || { bg: "#f1f5f9", color: "#475569" };

  // RBAC: Only SUPER_ADMIN and SYSTEM_ADMIN can edit profile/password/settings (SRS Section 5)
  const canEditProfile = currentUser.role === "SUPER_ADMIN" || currentUser.role === "SYSTEM_ADMIN";

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-area">
        <Topbar />
        <div className="page-content">
          <div className="page-header">
            <div>
              <div className="page-title">{canEditProfile ? "Admin Settings" : "My Profile"}</div>
              <div className="page-subtitle">
                {canEditProfile 
                  ? "Manage your profile, password, and system configuration"
                  : "View your profile information"}
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: "20px", alignItems: "start" }}>

            {/* LEFT: Profile Card */}
            <div>
              <div className="panel" style={{ marginTop: 0 }}>
                <div style={{ padding: "28px 22px", textAlign: "center", borderBottom: "1px solid var(--border)" }}>
                  <div style={{
                    width: "80px", height: "80px", borderRadius: "50%",
                    background: "linear-gradient(135deg,#2563eb,#7c3aed)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "30px", fontWeight: 800, color: "white",
                    margin: "0 auto 14px",
                    boxShadow: "0 4px 14px rgba(37,99,235,.3)",
                  }}>
                    {(profile?.full_name || "A").charAt(0).toUpperCase()}
                  </div>
                  <div style={{ fontSize: "18px", fontWeight: 700, marginBottom: "4px" }}>
                    {profile?.full_name || "—"}
                  </div>
                  <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "12px" }}>
                    {profile?.email}
                  </div>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: "6px",
                    padding: "5px 14px", borderRadius: "999px",
                    background: roleStyle.bg, color: roleStyle.color,
                    fontSize: "12.5px", fontWeight: 700,
                  }}>
                     {profile?.role?.replace(/_/g, " ")}
                  </span>
                </div>

                <div style={{ padding: "16px 22px" }}>
                  {[
                    { label: "User ID",   val: `#${profile?.id || "—"}` },
                    { label: "Phone",     val: profile?.phone || "Not set" },
                    { label: "Status",    val: profile?.status || "—" },
                    { label: "Member Since", val: profile?.created_at ? new Date(profile.created_at).toLocaleDateString("en-US", { year:"numeric", month:"long", day:"numeric" }) : "—" },
                  ].map(r => (
                    <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border)", fontSize: "13.5px" }}>
                      <span style={{ color: "var(--text-secondary)" }}>{r.label}</span>
                      <strong>{r.val}</strong>
                    </div>
                  ))}
                </div>
              </div>

              {/* System Info Card */}
              <div className="panel">
                <div className="panel-header">
                  <div className="panel-title">System Info</div>
                </div>
                <div style={{ padding: "16px 22px" }}>
                  {[
                    { label: "System",    val: "MCCS v1.0" },
                    { label: "Backend",   val: "Node.js / Express" },
                    { label: "Database",  val: "MySQL (XAMPP)" },
                    { label: "Frontend",  val: "React.js + Vite" },
                    { label: "Encryption",val: "AES-256-GCM" },
                    { label: "Auth",      val: "JWT (1 day)" },
                    { label: "Scheduler", val: "node-cron (3 jobs)" },
                    { label: "Email",     val: "Nodemailer / SMTP" },
                  ].map(r => (
                    <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: "13px" }}>
                      <span style={{ color: "var(--text-secondary)" }}>{r.label}</span>
                      <strong style={{ fontSize: "12.5px" }}>{r.val}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT: Forms or Read-Only View */}
            <div>
              {!canEditProfile && (
                /* Read-Only Profile View for Non-Admin Users */
                <div className="panel" style={{ marginTop: 0 }}>
                  <div className="panel-header">
                    <div>
                      <div className="panel-title">Profile Information</div>
                      <div className="panel-subtitle">Your profile details are managed by administrators</div>
                    </div>
                  </div>
                  <div className="panel-body">
                    <div className="alert alert-info" style={{ marginBottom: "20px" }}>
                      <span>ℹ️</span>
                      <span>
                        <strong>Profile Editing Restricted:</strong> Only Super Admin and System Admin can edit profile information.
                        Contact your administrator if you need to update your name, email, or phone number.
                      </span>
                    </div>
                    <div style={{ display: "grid", gap: "16px" }}>
                      {[
                        { label: "Full Name", value: profile?.full_name || "—" },
                        { label: "Email Address", value: profile?.email || "—" },
                        { label: "Phone Number", value: profile?.phone || "Not set" },
                        { label: "Role", value: profile?.role?.replace(/_/g, " ") || "—" },
                        { label: "Status", value: profile?.status || "—" },
                        { label: "User ID", value: `#${profile?.id || "—"}` },
                        { label: "Member Since", value: profile?.created_at ? new Date(profile.created_at).toLocaleDateString("en-US", { year:"numeric", month:"long", day:"numeric" }) : "—" },
                      ].map(item => (
                        <div key={item.label} style={{ padding: "14px", background: "#f8fafc", borderRadius: "8px", border: "1px solid var(--border)" }}>
                          <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                            {item.label}
                          </div>
                          <div style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)" }}>
                            {item.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {canEditProfile && (
                <>
              {/* Profile Form */}
              <div className="panel" style={{ marginTop: 0 }}>
                <div className="panel-header">
                  <div>
                    <div className="panel-title">Edit Profile</div>
                    <div className="panel-subtitle">Update your name, email and phone number</div>
                  </div>
                </div>
                <div className="panel-body">
                  {profMsg && <div className="alert alert-success" style={{ marginBottom: "16px" }}><span></span><span>{profMsg}</span></div>}
                  {profErr && <div className="alert alert-error" style={{ marginBottom: "16px" }}><span>!</span><span>{profErr}</span></div>}
                  <form onSubmit={updateProfile}>
                    <div className="form-grid form-grid-2">
                      <div className="form-group">
                        <label className="form-label">Full Name <span className="required">*</span></label>
                        <input className="form-control" value={profileForm.full_name}
                          onChange={e => setProf(p => ({ ...p, full_name: e.target.value }))} placeholder="Your full name" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Email Address <span className="required">*</span></label>
                        <input className="form-control" type="email" value={profileForm.email}
                          onChange={e => setProf(p => ({ ...p, email: e.target.value }))} placeholder="your@email.com" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Phone Number</label>
                        <input className="form-control" value={profileForm.phone}
                          onChange={e => setProf(p => ({ ...p, phone: e.target.value }))} placeholder="+251900000000" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Role</label>
                        <input className="form-control" value={profile?.role?.replace(/_/g, " ") || "—"} disabled
                          style={{ background: "#f8fafc", color: "var(--text-secondary)", cursor: "not-allowed" }} />
                        <span className="form-hint">Role can only be changed by a Super Admin</span>
                      </div>
                    </div>
                    <div className="form-actions">
                      <button type="submit" className="btn btn-primary" disabled={profSaving}>
                        {profSaving ? "Saving…" : "Save Profile"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
              </>
              )}

              {/* Change Password - Available to ALL users */}
              <div className="panel">
                <div className="panel-header">
                  <div>
                    <div className="panel-title">Change Password</div>
                    <div className="panel-subtitle">Passwords are hashed with bcrypt (cost factor 12)</div>
                  </div>
                </div>
                <div className="panel-body">
                  {pwdMsg && <div className="alert alert-success" style={{ marginBottom: "16px" }}><span>✓</span><span>{pwdMsg}</span></div>}
                  {pwdErr && <div className="alert alert-error" style={{ marginBottom: "16px" }}><span>!</span><span>{pwdErr}</span></div>}
                  <form onSubmit={changePassword}>
                    <div className="form-grid">
                      {[
                        { name: "current_password", label: "Current Password", key: "cur" },
                        { name: "new_password",     label: "New Password",     key: "new" },
                        { name: "confirm_password", label: "Confirm Password", key: "con" },
                      ].map(f => (
                        <div key={f.name} className="form-group">
                          <label className="form-label">{f.label} <span className="required">*</span></label>
                          <div style={{ position: "relative" }}>
                            <input className="form-control" name={f.name}
                              type={showPwd[f.key] ? "text" : "password"}
                              value={pwdForm[f.name]}
                              onChange={e => setPwd(p => ({ ...p, [f.name]: e.target.value }))}
                              placeholder="••••••••"
                              style={{ paddingRight: "42px" }} />
                            <button type="button"
                              onClick={() => setShowPwd(p => ({ ...p, [f.key]: !p[f.key] }))}
                              style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: "15px", color: "var(--text-muted)" }}>
                              {showPwd[f.key] ? "Hide" : "Show"}
                            </button>
                          </div>
                          {f.name === "confirm_password" && pwdForm.confirm_password && pwdForm.new_password !== pwdForm.confirm_password && (
                            <span className="form-error-msg">Passwords do not match</span>
                          )}
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: "12px", padding: "12px 14px", background: "#f8fafc", borderRadius: "8px", border: "1px solid var(--border)" }}>
                      <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-secondary)", marginBottom: "6px" }}>PASSWORD REQUIREMENTS</div>
                      <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "12.5px", color: "var(--text-secondary)" }}>
                        <li>Minimum 6 characters</li>
                        <li>Mix of letters and numbers recommended</li>
                        <li>Avoid using your name or email</li>
                      </ul>
                    </div>
                    <div className="form-actions">
                      <button type="submit" className="btn btn-primary" disabled={pwdSaving}>
                        {pwdSaving ? "Changing…" : "Change Password"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* System Configuration - Only for Admins */}
              {canEditProfile && (
              <div className="panel">
                <div className="panel-header">
                  <div>
                    <div className="panel-title">System Configuration</div>
                    <div className="panel-subtitle">Go to System Settings for SMTP, SMS, Cron and Security</div>
                  </div>
                </div>
                <div className="panel-body">
                  <a href="/system-settings" className="btn btn-primary" style={{ textDecoration:"none" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 1.47 13.78M4.93 4.93a10 10 0 0 0-1.47 13.78"/></svg>
                    Open System Settings
                  </a>
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
