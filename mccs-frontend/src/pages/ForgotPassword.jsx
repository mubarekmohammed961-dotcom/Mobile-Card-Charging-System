import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const res = await api.post("/auth/forgot-password", { email });
      
      if (res.data.success) {
        setSuccess(true);
        setEmail(""); // Clear form
      } else {
        setError(res.data.message || "Failed to send reset email");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send reset email. Please try again.");
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
      <div style={{ position:"absolute", top:"-15%", left:"60%", width:500, height:500, borderRadius:"50%", background:"radial-gradient(circle, rgba(124,58,237,.18) 0%, transparent 70%)", pointerEvents:"none" }} />
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
            background:"linear-gradient(135deg,#7c3aed,#8b5cf6)",
            borderRadius:"50%",
            display:"flex", alignItems:"center", justifyContent:"center",
            fontSize:36,
            boxShadow:"0 8px 24px rgba(124,58,237,.3)",
          }}>
            🔐
          </div>
          <h1 style={{ fontSize:28, fontWeight:900, color:"#0f172a", margin:"0 0 8px" }}>
            Forgot Password?
          </h1>
          <p style={{ fontSize:14, color:"#64748b", margin:0 }}>
            No worries. Enter your email and we'll send you a password reset link.
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
              <strong>Check your email!</strong><br/>
              If your email exists in our system, you'll receive a password reset link shortly.
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
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom:24 }}>
            <label style={{ display:"block", fontSize:13.5, fontWeight:600, color:"#374151", marginBottom:8 }}>
              Email Address
            </label>
            <div style={{ position:"relative" }}>
              <div style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                disabled={loading || success}
                style={{
                  width:"100%", height:50,
                  padding:"0 14px 0 44px",
                  border:"1.5px solid #e5e7eb",
                  borderRadius:12, fontSize:15,
                  background:"#f9fafb", outline:"none",
                  boxSizing:"border-box", transition:"all .15s",
                  color:"#0f172a",
                }}
                onFocus={e => { e.target.style.borderColor="#8b5cf6"; e.target.style.background="white"; e.target.style.boxShadow="0 0 0 3px rgba(139,92,246,.1)"; }}
                onBlur={e  => { e.target.style.borderColor="#e5e7eb"; e.target.style.background="#f9fafb"; e.target.style.boxShadow="none"; }}
              />
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading || success}
            style={{
              width:"100%", height:52,
              background: loading || success
                ? "#c4b5fd"
                : "linear-gradient(135deg, #7c3aed 0%, #8b5cf6 50%, #a78bfa 100%)",
              color:"white", border:"none",
              borderRadius:12, fontSize:16, fontWeight:700,
              cursor: (loading || success) ? "not-allowed" : "pointer",
              boxShadow: (loading || success) ? "none" : "0 4px 20px rgba(124,58,237,.4)",
              transition:"all .2s",
              display:"flex", alignItems:"center", justifyContent:"center", gap:10,
              letterSpacing:.3,
              marginBottom:20,
            }}
            onMouseEnter={e => { if(!loading && !success) { e.target.style.transform="translateY(-1px)"; e.target.style.boxShadow="0 6px 24px rgba(124,58,237,.5)"; }}}
            onMouseLeave={e => { e.target.style.transform="translateY(0)"; e.target.style.boxShadow=(loading||success)?"none":"0 4px 20px rgba(124,58,237,.4)"; }}
          >
            {loading ? (
              <>
                <div style={{ width:18, height:18, border:"2.5px solid rgba(255,255,255,.4)", borderTopColor:"white", borderRadius:"50%", animation:"spin .7s linear infinite" }} />
                Sending...
              </>
            ) : success ? (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Email Sent
              </>
            ) : (
              <>
                Send Reset Link
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
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
