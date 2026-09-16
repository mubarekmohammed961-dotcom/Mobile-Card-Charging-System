import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import api from "../services/api";
import { getDefaultRoute } from "../utils/permissions";

// SRS Section 16: Enhanced Email & Password Validation
const validateEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }

  const trimmed = email.trim();

  if (trimmed.length > 255) {
    return { valid: false, error: 'Email must not exceed 255 characters' };
  }

  // Enhanced email regex
  const emailRegex = /^[a-zA-Z0-9][a-zA-Z0-9._-]*[a-zA-Z0-9]@[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,63}$/;
  
  if (!emailRegex.test(trimmed)) {
    return { valid: false, error: 'Invalid email format (must be user@domain.com)' };
  }

  const [localPart, domain] = trimmed.split('@');

  // Validate local part
  if (localPart.length < 1 || localPart.length > 64) {
    return { valid: false, error: 'Email username must be 1-64 characters' };
  }

  // Check for consecutive dots
  if (localPart.includes('..') || domain.includes('..')) {
    return { valid: false, error: 'Email cannot contain consecutive dots' };
  }

  // Check domain
  if (!domain.includes('.')) {
    return { valid: false, error: 'Email must have a valid domain (e.g., example.com)' };
  }

  // Extract TLD
  const parts = domain.split('.');
  const tld = parts[parts.length - 1].toLowerCase();

  // Valid TLDs
  const validTLDs = [
    'com', 'org', 'net', 'edu', 'gov', 'mil', 'int',
    'co', 'io', 'ai', 'app', 'dev', 'tech', 'online',
    'et', 'us', 'uk', 'ca', 'au', 'de', 'fr', 'jp', 'cn', 'in',
    'info', 'biz', 'name', 'pro', 'aero', 'museum'
  ];

  if (!validTLDs.includes(tld)) {
    return { 
      valid: false, 
      error: `Invalid domain extension '.${tld}' (must be .com, .org, .et, etc.)` 
    };
  }

  // Check for common typos
  const domainName = parts[0].toLowerCase();
  const commonDomains = {
    'gmail': ['gmai', 'gmial', 'gmaill', 'gamil'],
    'yahoo': ['yaho', 'yahooo', 'yhoo'],
    'outlook': ['outlok', 'outloook'],
    'hotmail': ['hotmial', 'hotmailll']
  };

  for (const [correct, typos] of Object.entries(commonDomains)) {
    if (typos.includes(domainName)) {
      return { 
        valid: false, 
        error: `Did you mean ${correct}.${parts.slice(1).join('.')}?` 
      };
    }
  }

  return { valid: true, sanitized: trimmed.toLowerCase() };
};

const validatePassword = (password) => {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required' };
  }

  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }

  if (password.length > 128) {
    return { valid: false, error: 'Password must not exceed 128 characters' };
  }

  // Check complexity
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  const missing = [];
  if (!hasUpperCase) missing.push('uppercase letter');
  if (!hasLowerCase) missing.push('lowercase letter');
  if (!hasDigit) missing.push('number');
  if (!hasSpecialChar) missing.push('special character');

  if (missing.length > 0) {
    return { 
      valid: false, 
      error: `Password must contain: ${missing.join(', ')}` 
    };
  }

  return { valid: true };
};

export default function Login() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [form, setForm]         = useState({ email: "", password: "" });
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showPass, setShowPass] = useState(false);

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
    
    // Clear field-specific errors on change
    if (name === 'email') setEmailError("");
    if (name === 'password') setPasswordError("");
    setError("");
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true); 
    setError("");
    setEmailError("");
    setPasswordError("");

    // Client-side validation (SRS Section 16)
    const emailValidation = validateEmail(form.email);
    if (!emailValidation.valid) {
      setEmailError(emailValidation.error);
      setLoading(false);
      return;
    }

    // Password validation
    const passwordValidation = validatePassword(form.password);
    if (!passwordValidation.valid) {
      setPasswordError(passwordValidation.error);
      setLoading(false);
      return;
    }

    try {
      const res = await api.post("/auth/login", { 
        email: emailValidation.sanitized, 
        password: form.password 
      });
      
      if (!res.data.success) throw new Error(res.data.message);
      
      const token = res.data.token;
      if (!token) throw new Error("No token returned");
      
      localStorage.setItem("mccs_token", token);
      const userData = res.data.user;
      if (userData) localStorage.setItem("mccs_user", JSON.stringify(userData));
      
      const from = location.state?.from?.pathname;
      const dest = from && from !== "/login" ? from : getDefaultRoute(userData?.role);
      navigate(dest, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Login failed");
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
      <div style={{ position:"absolute", top:"-15%", left:"60%", width:500, height:500, borderRadius:"50%", background:"radial-gradient(circle, rgba(37,99,235,.18) 0%, transparent 70%)", pointerEvents:"none" }} />
      <div style={{ position:"absolute", bottom:"-10%", left:"-5%", width:400, height:400, borderRadius:"50%", background:"radial-gradient(circle, rgba(124,58,237,.15) 0%, transparent 70%)", pointerEvents:"none" }} />
      <div style={{ position:"absolute", top:"30%", right:"5%", width:250, height:250, borderRadius:"50%", background:"radial-gradient(circle, rgba(16,185,129,.1) 0%, transparent 70%)", pointerEvents:"none" }} />

      {/* Grid pattern overlay */}
      <div style={{
        position:"absolute", inset:0, pointerEvents:"none",
        backgroundImage: "linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }} />

      {/* Main card */}
      <div style={{
        width: "100%",
        maxWidth: 960,
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        borderRadius: 24,
        overflow: "hidden",
        boxShadow: "0 32px 80px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.06)",
        position: "relative",
        zIndex: 1,
      }}>

        {/* ── LEFT: Branding ── */}
        <div style={{
          background: "linear-gradient(160deg, rgba(255,255,255,.06) 0%, rgba(255,255,255,.02) 100%)",
          backdropFilter: "blur(20px)",
          borderRight: "1px solid rgba(255,255,255,.08)",
          padding: "52px 48px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}>
          {/* Top: University logo + system title */}
          <div>
            {/* Logo */}
            <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:36 }}>
              <div style={{ width:90, height:90, borderRadius:"50%", overflow:"hidden", border:"3px solid rgba(255,255,255,.3)", boxShadow:"0 6px 24px rgba(0,0,0,.5)", flexShrink:0, background:"white" }}>
                <img src="/wollo-logo.png" alt="Wollo University"
                  style={{ width:"100%", height:"100%", objectFit:"cover" }}
                  onError={e => { e.target.style.display="none"; e.target.parentElement.style.background="linear-gradient(135deg,#1e40af,#7c3aed)"; e.target.parentElement.innerHTML='<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:28px;font-weight:900;color:white">WU</div>'; }} />
              </div>
              <div style={{ width:90, height:60, borderRadius:14, overflow:"hidden", border:"3px solid rgba(255,255,255,.3)", boxShadow:"0 6px 24px rgba(0,0,0,.5)", flexShrink:0, background:"white", padding:5 }}>
                <img src="/appfactory-logo.png" alt="App Factory Academy"
                  style={{ width:"100%", height:"100%", objectFit:"contain" }}
                  onError={e => { e.target.style.display="none"; e.target.parentElement.style.background="linear-gradient(135deg,#4c1d95,#7c3aed)"; e.target.parentElement.innerHTML='<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:10px;font-weight:900;color:white;text-align:center">APP<br/>FACTORY</div>'; }} />
              </div>
              <div>
                <div style={{ fontSize:12, color:"#60a5fa", fontWeight:700, textTransform:"uppercase", letterSpacing:1.5, marginBottom:2 }}>Wollo University</div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,.6)", fontWeight:500 }}>App Factory Academy · Project 1226</div>
              </div>
            </div>

            {/* System name */}
            <div style={{ marginBottom:32 }}>
              <h1 style={{ fontSize:32, fontWeight:900, color:"white", margin:"0 0 10px", lineHeight:1.2, letterSpacing:-0.5 }}>
                Mobile Card<br />
                <span style={{ background:"linear-gradient(90deg,#60a5fa,#a78bfa)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>
                  Charging System
                </span>
              </h1>
              <p style={{ fontSize:13.5, color:"rgba(255,255,255,.5)", lineHeight:1.7, margin:0 }}>
                Automated monthly distribution of mobile service cards to office holders and employees.
              </p>
            </div>

            {/* Features */}
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              {[
                { label:"Secure PIN Delivery",       desc:"AES-256-GCM encrypted card PINs" },
                { label:"Auto Distribution Engine",  desc:"Monthly allocation with eligibility rules" },
                { label:"Full Audit Trail",           desc:"Every action logged with timestamp" },
                { label:"Role-Based Access Control",  desc:"6 roles with fine-grained permissions" },
              ].map(f => (
                <div key={f.label} style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
                  <div style={{
                    width:18, height:18, borderRadius:"50%", flexShrink:0, marginTop:1,
                    background:"rgba(96,165,250,.15)",
                    border:"1px solid rgba(96,165,250,.3)",
                    display:"flex", alignItems:"center", justifyContent:"center",
                  }}>
                    <div style={{ width:6, height:6, borderRadius:"50%", background:"#60a5fa" }} />
                  </div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:"rgba(255,255,255,.85)" }}>{f.label}</div>
                    <div style={{ fontSize:11.5, color:"rgba(255,255,255,.4)", marginTop:1 }}>{f.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom: Tech stack */}
          <div style={{ marginTop:32 }}>
            <div style={{ fontSize:10.5, color:"rgba(255,255,255,.3)", fontWeight:700, textTransform:"uppercase", letterSpacing:1.5, marginBottom:8 }}>
              Built With
            </div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {["MySQL","React.js","Node.js","Express","AES-256","JWT"].map(t => (
                <span key={t} style={{
                  fontSize:11, fontWeight:600,
                  padding:"3px 9px", borderRadius:999,
                  background:"rgba(255,255,255,.06)",
                  border:"1px solid rgba(255,255,255,.1)",
                  color:"rgba(255,255,255,.5)",
                }}>
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Login Form ── */}
        <div style={{
          background: "rgba(255,255,255,.97)",
          padding: "52px 48px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}>
          {/* Header */}
          <div style={{ marginBottom:36 }}>
            <div style={{
              display:"inline-flex", alignItems:"center", gap:6,
              padding:"5px 12px", borderRadius:999,
              background:"#eff6ff", marginBottom:16,
            }}>
              <div style={{ width:7, height:7, borderRadius:"50%", background:"#22c55e" }} />
              <span style={{ fontSize:11.5, fontWeight:700, color:"#1d4ed8", letterSpacing:.5 }}>SYSTEM ONLINE</span>
            </div>
            <h2 style={{ fontSize:26, fontWeight:900, color:"#0f172a", margin:"0 0 6px" }}>
              Welcome back
            </h2>
            <p style={{ fontSize:13.5, color:"#64748b", margin:0 }}>
              Sign in to access the MCCS dashboard
            </p>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background:"#fff1f2", color:"#be123c",
              border:"1px solid #fda4af",
              borderRadius:10, padding:"12px 16px",
              fontSize:13.5, marginBottom:20,
              display:"flex", alignItems:"center", gap:8,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <circle cx="12" cy="16" r=".5" fill="currentColor"/>
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Email field */}
            <div style={{ marginBottom:18 }}>
              <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#374151", marginBottom:7 }}>
                Email Address {emailError && <span style={{ color:"#dc2626", fontSize:12 }}>*</span>}
              </label>
              <div style={{ position:"relative" }}>
                <div style={{ position:"absolute", left:13, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={emailError ? "#dc2626" : "#9ca3af"} strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                    <polyline points="22,6 12,13 2,6"/>
                  </svg>
                </div>
                <input
                  name="email" type="email"
                  value={form.email} onChange={handleChange}
                  placeholder="your@email.com"
                  required
                  style={{
                    width:"100%", height:46,
                    padding:"0 14px 0 40px",
                    border: emailError ? "1.5px solid #dc2626" : "1.5px solid #e5e7eb",
                    borderRadius:10, fontSize:14,
                    background: emailError ? "#fef2f2" : "#f9fafb",
                    outline:"none",
                    boxSizing:"border-box", transition:"all .15s",
                    color:"#0f172a",
                  }}
                  onFocus={e => { 
                    if (!emailError) {
                      e.target.style.borderColor="#2563eb"; 
                      e.target.style.background="white"; 
                      e.target.style.boxShadow="0 0 0 3px rgba(37,99,235,.1)"; 
                    }
                  }}
                  onBlur={e  => { 
                    if (!emailError) {
                      e.target.style.borderColor="#e5e7eb"; 
                      e.target.style.background="#f9fafb"; 
                      e.target.style.boxShadow="none"; 
                    }
                  }}
                />
                {emailError && (
                  <div style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="8" x2="12" y2="12"/>
                      <circle cx="12" cy="16" r=".5" fill="#dc2626"/>
                    </svg>
                  </div>
                )}
              </div>
              {emailError && (
                <div style={{ 
                  marginTop:6, fontSize:12.5, color:"#dc2626", 
                  display:"flex", alignItems:"center", gap:5 
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="15" y1="9" x2="9" y2="15"/>
                    <line x1="9" y1="9" x2="15" y2="15"/>
                  </svg>
                  {emailError}
                </div>
              )}
            </div>

            {/* Password field */}
            <div style={{ marginBottom:24 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:7 }}>
                <label style={{ fontSize:13, fontWeight:600, color:"#374151" }}>
                  Password {passwordError && <span style={{ color:"#dc2626", fontSize:12 }}>*</span>}
                </label>
                <Link to="/forgot-password" style={{
                  fontSize:12.5, fontWeight:600, color:"#2563eb",
                  textDecoration:"none", transition:"color .15s",
                }}
                onMouseEnter={e => e.target.style.color="#1e40af"}
                onMouseLeave={e => e.target.style.color="#2563eb"}>
                  Forgot Password?
                </Link>
              </div>
              <div style={{ position:"relative" }}>
                <div style={{ position:"absolute", left:13, top:"50%", transform:"translateY(-50%)", pointerEvents:"none" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={passwordError ? "#dc2626" : "#9ca3af"} strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
                <input
                  name="password"
                  type={showPass ? "text" : "password"}
                  value={form.password} onChange={handleChange}
                  placeholder="Enter your password"
                  required
                  style={{
                    width:"100%", height:46,
                    padding:"0 46px 0 40px",
                    border: passwordError ? "1.5px solid #dc2626" : "1.5px solid #e5e7eb",
                    borderRadius:10, fontSize:14,
                    background: passwordError ? "#fef2f2" : "#f9fafb",
                    outline:"none",
                    boxSizing:"border-box", transition:"all .15s",
                    color:"#0f172a",
                  }}
                  onFocus={e => { 
                    if (!passwordError) {
                      e.target.style.borderColor="#2563eb"; 
                      e.target.style.background="white"; 
                      e.target.style.boxShadow="0 0 0 3px rgba(37,99,235,.1)"; 
                    }
                  }}
                  onBlur={e  => { 
                    if (!passwordError) {
                      e.target.style.borderColor="#e5e7eb"; 
                      e.target.style.background="#f9fafb"; 
                      e.target.style.boxShadow="none"; 
                    }
                  }}
                />
                <button type="button" onClick={() => setShowPass(p => !p)}
                  style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:"#9ca3af", padding:4, display:"flex" }}>
                  {showPass ? (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
              {passwordError && (
                <div style={{ 
                  marginTop:6, fontSize:12.5, color:"#dc2626", 
                  display:"flex", alignItems:"flex-start", gap:5 
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink:0, marginTop:1 }}>
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="15" y1="9" x2="9" y2="15"/>
                    <line x1="9" y1="9" x2="15" y2="15"/>
                  </svg>
                  {passwordError}
                </div>
              )}
            </div>

            {/* Submit button */}
            <button type="submit" disabled={loading}
              style={{
                width:"100%", height:48,
                background: loading
                  ? "#93c5fd"
                  : "linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #3b82f6 100%)",
                color:"white", border:"none",
                borderRadius:12, fontSize:15, fontWeight:700,
                cursor: loading ? "not-allowed" : "pointer",
                boxShadow: loading ? "none" : "0 4px 20px rgba(37,99,235,.4)",
                transition:"all .2s",
                display:"flex", alignItems:"center", justifyContent:"center", gap:10,
                letterSpacing:.3,
              }}
              onMouseEnter={e => { if(!loading) { e.target.style.transform="translateY(-1px)"; e.target.style.boxShadow="0 6px 24px rgba(37,99,235,.5)"; }}}
              onMouseLeave={e => { e.target.style.transform="translateY(0)"; e.target.style.boxShadow=loading?"none":"0 4px 20px rgba(37,99,235,.4)"; }}
            >
              {loading ? (
                <>
                  <div style={{ width:18, height:18, border:"2.5px solid rgba(255,255,255,.4)", borderTopColor:"white", borderRadius:"50%", animation:"spin .7s linear infinite" }} />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Access Roles
          <div style={{ marginTop:28, padding:"16px 18px", background:"#f8fafc", borderRadius:12, border:"1px solid #e5e7eb" }}>
            <div style={{ fontSize:11, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:1.2, marginBottom:10 }}>
              Access Roles
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"6px 12px" }}>
              {[
                { role:"Super Admin",   color:"#9d174d" },
                { role:"System Admin",  color:"#5b21b6" },
                { role:"Store Officer", color:"#1e40af" },
                { role:"Dept. Head",    color:"#065f46" },
                { role:"Staff",         color:"#075985" },
                { role:"Auditor",       color:"#9a3412" },
              ].map(r => (
                <div key={r.role} style={{ display:"flex", alignItems:"center", gap:6, fontSize:12 }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background:r.color, flexShrink:0 }} />
                  <span style={{ color:"#475569", fontWeight:500 }}>{r.role}</span>
                </div>
              ))}
            </div>
          </div> */}

          <div style={{ textAlign:"center", marginTop:16, fontSize:12, color:"#94a3b8" }}>
            Mobile Card Charging System &nbsp;·&nbsp; v1.0 &nbsp;·&nbsp; 2026
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: #9ca3af; font-size: 13.5px; }
        @media (max-width: 680px) {
          .login-grid { grid-template-columns: 1fr !important; }
          .login-left  { display: none !important; }
        }
      `}</style>
    </div>
  );
}
