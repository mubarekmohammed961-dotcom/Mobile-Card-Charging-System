import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../services/api";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Invalid reset link. Token is missing.");
    }
  }, [token]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Validate passwords match
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    // Validate password length
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters long");
      setLoading(false);
      return;
    }

    try {
      const res = await api.post("/auth/reset-password", {
        token,
        newPassword: form.password,
      });

      if (res.data.success) {
        setSuccess(true);
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate("/login");
        }, 3000);
      } else {
        setError(res.data.message || "Failed to reset password");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0a0e27 0%, #0f1b4d 40%, #0d2260 70%, #0a1a4a 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Animated background orbs */}
      <div style={{ position:"absolute", top:"-15%", left:"60%", width:500, height:500, borderRadius:"50%", background:"radial-gradient(circle, rgba(16,185,129,.18) 0%, transparent 70%)", pointerEvents:"none" }} />
      <div style={{ position:"absolute", bottom:"-10%", left:"-5%", width:400, height:400, borderRadius:"50%", background:"radial-gradient(circle, rgba(37,99,235,.15) 0%, transparent 70%)", pointerEvents:"none" }} />

      {/* Grid pattern */}
      <div style={{
        position:"absolute", inset:0, pointerEvents:"none",
        backgroundImage: "linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }} />

      {/* Main card */}
      <div style={{
        width: "100%",
        maxWidth: 480,
        background: "rgba(255,255,255,.97)",
        borderRadius: 24,
        padding: "48px 40px",
        boxShadow: "0 32px 80px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.06)",
        position: "relative",
        zIndex: 1,
      }}>
        {/* Header */}
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <div style={{
            width:72, height:72, margin:"0 auto 20px",
            background:"linear-gradient(135deg,#10b981,#14b8a6)",
            borderRadius:"50%",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:36,
            boxShadow:"0 8px 24px rgba(16,185,129,.3)",
          }}>
            🔑
          </div>
          <h1 style={{ fontSize:28, fontWeight:900, color:"#0f172a", margin:"0 0 8px" }}>
            Reset Password
          </h1>
          <p style={{ fontSize:14, color:"#64748b", margin:0 }}>
            Enter your new password below
          </p>
        </div>

        {/* Success message */}
        {success && (
          <div style={{
            background:"#f0fdf4", color:"#15803d",
            border:"1px solid #bbf7d0",
            borderRadius:12, padding:"16px 20px",
            fontSize:14, marginBottom:24,
            display:"flex", alignItems:"flex-start", gap:10,
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{flexShrink:0,marginTop:2}}>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <div>
              <strong>Password reset successful!</strong><br/>
              Redirecting you to login page...
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div style={{
            background:"#fff1f2", color:"#be123c",
            border:"1px solid #fda4af",
            borderRadius:12, padding:"14px 18px",
            fontSize:13.5, marginBottom:24,
            display:"flex", alignItems:"center", gap:10,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <circle cx="12" cy="16" r=".5" fill="currentColor"/>
            </svg>
            {error}
          </div>
        )}

        {/* Form */}
        {!success && token && (
          <form onSubmit={handleSubmit}>
            {/* New Password */}
            <div style={{ marginBottom:18 }}>
              <label style={{ display:"block", fontSize:13.5, fontWeight:600, color:"#374151", marginBottom:8 }}>
                New Password
              </label>
              <div style={{ position:"relative" }}>
                <div style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
                <input
                  name="password"
                  type={showPass ? "text" : "password"}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Enter new password"
                  required
                  minLength={6}
                  style={{
                    width:"100%", height:50,
                    padding:"0 44px",
                    border:"1.5px solid #e5e7eb",
                    borderRadius:12, fontSize:15,
                    background:"#f9fafb", outline:"none",
                    boxSizing:"border-box", transition:"all .15s",
                    color:"#0f172a",
                  }}
                  onFocus={e => { e.target.style.borderColor="#10b981"; e.target.style.background="white"; e.target.style.boxShadow="0 0 0 3px rgba(16,185,129,.1)"; }}
                  onBlur={e  => { e.target.style.borderColor="#e5e7eb"; e.target.style.background="#f9fafb"; e.target.style.boxShadow="none"; }}
                />
                <button type="button" onClick={() => setShowPass(p => !p)}
                  style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"#9ca3af", padding:4, display:"flex" }}>
                  {showPass ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div style={{ marginBottom:24 }}>
              <label style={{ display:"block", fontSize:13.5, fontWeight:600, color:"#374151", marginBottom:8 }}>
                Confirm New Password
              </label>
              <div style={{ position:"relative" }}>
                <div style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                </div>
                <input
                  name="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm new password"
                  required
                  minLength={6}
                  style={{
                    width:"100%", height:50,
                    padding:"0 44px",
                    border:"1.5px solid #e5e7eb",
                    borderRadius:12, fontSize:15,
                    background:"#f9fafb", outline:"none",
                    boxSizing:"border-box", transition:"all .15s",
                    color:"#0f172a",
                  }}
                  onFocus={e => { e.target.style.borderColor="#10b981"; e.target.style.background="white"; e.target.style.boxShadow="0 0 0 3px rgba(16,185,129,.1)"; }}
                  onBlur={e  => { e.target.style.borderColor="#e5e7eb"; e.target.style.background="#f9fafb"; e.target.style.boxShadow="none"; }}
                />
                <button type="button" onClick={() => setShowConfirm(p => !p)}
                  style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"#9ca3af", padding:4, display:"flex" }}>
                  {showConfirm ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Password requirements */}
            <div style={{
              background:"#f0f9ff", border:"1px solid#bae6fd",
              borderRadius:10, padding:"12px 16px",
              fontSize:12.5, color:"#0c4a6e", marginBottom:24,
            }}>
              <div style={{fontWeight:600,marginBottom:4}}>Password Requirements:</div>
              <ul style={{margin:"4px 0 0",paddingLeft:20}}>
                <li>At least 6 characters long</li>
                <li>Passwords must match</li>
              </ul>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width:"100%", height:52,
                background: loading
                  ? "#6ee7b7"
                  : "linear-gradient(135deg, #10b981 0%, #14b8a6 50%, #2dd4bf 100%)",
                color:"white", border:"none",
                borderRadius:12, fontSize:16, fontWeight:700,
                cursor: loading ? "not-allowed" : "pointer",
                boxShadow: loading ? "none" : "0 4px 20px rgba(16,185,129,.4)",
                transition:"all .2s",
                display:"flex", alignItems:"center", justifyContent:"center", gap:10,
                letterSpacing:.3,
                marginBottom:20,
              }}
              onMouseEnter={e => { if(!loading) { e.target.style.transform="translateY(-1px)"; e.target.style.boxShadow="0 6px 24px rgba(16,185,129,.5)"; }}}
              onMouseLeave={e => { e.target.style.transform="translateY(0)"; e.target.style.boxShadow=loading?"none":"0 4px 20px rgba(16,185,129,.4)"; }}
            >
              {loading ? (
                <>
                  <div style={{ width:18, height:18, border:"2.5px solid rgba(255,255,255,.4)", borderTopColor:"white", borderRadius:"50%", animation:"spin .7s linear infinite" }} />
                  Resetting...
                </>
              ) : (
                <>
                  Reset Password
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </>
              )}
            </button>

            {/* Back to login */}
            <Link
              to="/login"
              style={{
                display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                fontSize:14, fontWeight:600, color:"#64748b",
                textDecoration:"none", transition:"color .15s",
              }}
              onMouseEnter={e => e.target.style.color="#0f172a"}
              onMouseLeave={e => e.target.style.color="#64748b"}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
              Back to Login
            </Link>
          </form>
        )}

        {/* Invalid token state */}
        {!token && (
          <div style={{textAlign:"center"}}>
            <Link
              to="/forgot-password"
              style={{
                display:"inline-block",
                background:"linear-gradient(135deg,#7c3aed,#8b5cf6)",
                color:"white", padding:"14px 32px",
                borderRadius:10, fontSize:15, fontWeight:700,
                textDecoration:"none", transition:"all .2s",
                boxShadow:"0 4px 16px rgba(124,58,237,.3)",
              }}
            >
              Request New Reset Link
            </Link>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop:32, paddingTop:24, borderTop:"1px solid #e5e7eb", textAlign:"center", fontSize:12, color:"#94a3b8" }}>
          Mobile Card Charging System · Security
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: #9ca3af; font-size: 14px; }
      `}</style>
    </div>
  );
}
