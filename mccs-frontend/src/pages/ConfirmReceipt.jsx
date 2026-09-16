import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../services/api";

// — Confirmation Page:
// Card details (Provider, Type, Value, PIN masked until click),
// "Acknowledge Receipt" button, Timestamp log

export default function ConfirmReceipt() {
  const [params]   = useSearchParams();
  const navigate   = useNavigate();
  const urlToken   = params.get("token");
  const authToken  = localStorage.getItem("mccs_token");

  const [status,    setStatus]   = useState("idle");
  const [message,   setMessage]  = useState("");
  const [cardInfo,  setCardInfo] = useState(null);   // from /staff-dashboard/card/:token
  const [confirmed, setConfirmed] = useState(null);  // from /confirmations
  const [showPin,   setShowPin]  = useState(false);
  const [loading,   setLoading]  = useState(false);
  const [confirming,setConfirming]= useState(false);
  const [acknowledged, setAck]   = useState(false);
  const [confTime, setConfTime]  = useState(null);

  // Step 1: Load card details using the token
  const loadCard = async () => {
    if (!urlToken || !authToken) return;
    setLoading(true);
    try {
      const r = await api.get(`/staff-dashboard/card/${urlToken}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setCardInfo(r.data?.card || null);
      if (r.data?.card?.delivery_status === "CONFIRMED") {
        setStatus("already_confirmed");
      } else {
        setStatus("ready");
      }
    } catch (e) {
      setStatus("error");
      setMessage(e.response?.data?.message || "Invalid or expired confirmation link.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authToken && urlToken) {
      navigate(`/login?redirect=/confirm?token=${urlToken}`);
      return;
    }
    if (!urlToken) { setStatus("error"); setMessage("No confirmation token in URL."); return; }
    loadCard();
  }, []);

  // Step 2: Acknowledge receipt
  const handleConfirm = async () => {
    setConfirming(true);
    try {
      const r = await api.post("/confirmations", { token: urlToken }, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setStatus("success");
      setMessage(r.data?.message || "Receipt confirmed successfully!");
      setConfirmed(r.data?.delivery || null);
      setConfTime(new Date());
    } catch (e) {
      setStatus("error");
      setMessage(e.response?.data?.message || "Confirmation failed.");
    } finally {
      setConfirming(false);
    }
  };

  const fv = v => Number(v || 0).toFixed(2);

  return (
    <div style={{
      minHeight:"100vh", background:"linear-gradient(135deg,#0f172a,#1e3a8a,#312e81)",
      display:"flex", alignItems:"center", justifyContent:"center", padding:24,
    }}>
      <div style={{
        background:"white", borderRadius:20, width:"100%", maxWidth:520,
        boxShadow:"0 24px 60px rgba(0,0,0,.4)", overflow:"hidden",
      }}>
        {/* Header */}
        <div style={{ background:"linear-gradient(135deg,#1e3a8a,#2563eb)", padding:"28px 32px", textAlign:"center" }}>
          <div style={{ fontSize:40, marginBottom:10 }}>
            {status === "success" ? "" : status === "error" ? "X" : status === "already_confirmed" ? "" : ""}
          </div>
          <div style={{ fontSize:20, fontWeight:800, color:"white", marginBottom:4 }}>
            {status === "success" ? "Receipt Confirmed!" :
             status === "error"   ? "Confirmation Failed" :
             status === "already_confirmed" ? "Already Confirmed" :
             "Confirm Card Receipt"}
          </div>
          <div style={{ fontSize:13, color:"#93c5fd" }}>Mobile Card Charging System (MCCS)</div>
        </div>

        <div style={{ padding:"28px 32px" }}>
          {/* Loading */}
          {(loading || status === "idle") && (
            <div style={{ display:"flex", justifyContent:"center", padding:32 }}>
              <div className="spinner" style={{ width:32, height:32 }} />
            </div>
          )}

          {/* No auth */}
          {!authToken && urlToken && (
            <div style={{ textAlign:"center" }}>
              <div className="alert alert-info" style={{ marginBottom:20 }}>
                <span>i</span><span>Sign in to view and confirm your card receipt.</span>
              </div>
              <button onClick={() => navigate(`/login?redirect=/confirm?token=${urlToken}`)}
                style={{ width:"100%", padding:"14px", borderRadius:10, border:"none", background:"linear-gradient(135deg,#1e3a8a,#2563eb)", color:"white", fontWeight:700, fontSize:16, cursor:"pointer" }}>
                Sign In 
              </button>
            </div>
          )}

          {/* Card Details + PIN */}
          {(status === "ready" || status === "already_confirmed") && cardInfo && (
            <>
              {/* Card info box */}
              <div style={{ background:"#f8fafc", borderRadius:12, padding:18, marginBottom:20, border:"1px solid #e2e8f0" }}>
                <div style={{ fontWeight:700, fontSize:14, marginBottom:12, color:"#0f172a" }}>Card Details</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  {[
                    { label:"Provider",   val: cardInfo.provider || "—" },
                    { label:"Type",       val: cardInfo.type || "—"     },
                    { label:"Value",      val: `$${fv(cardInfo.value)}`  },
                    { label:"Expiry Date",val: cardInfo.expiry_date || "—" },
                    { label:"Month",      val: cardInfo.month ? new Date(cardInfo.month).toLocaleDateString("en-US",{year:"numeric",month:"long"}) : "—" },
                    { label:"Status",     val: cardInfo.card_status || "—" },
                  ].map(r => (
                    <div key={r.label} style={{ display:"flex", flexDirection:"column", gap:2 }}>
                      <span style={{ fontSize:10.5, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:".5px" }}>{r.label}</span>
                      <span style={{ fontSize:13.5, fontWeight:600, color:"#0f172a" }}>{r.val}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* PIN — masked until click (SRS "PIN masked until click") */}
              <div style={{ background:"linear-gradient(135deg,#1e3a8a,#2563eb)", borderRadius:12, padding:"20px 24px", textAlign:"center", marginBottom:20 }}>
                <div style={{ fontSize:11, color:"#93c5fd", fontWeight:700, textTransform:"uppercase", letterSpacing:1, marginBottom:10 }}>
                   Card PIN — {showPin ? "Visible" : "Hidden for security"}
                </div>
                <div style={{ fontSize:showPin ? 28 : 22, fontWeight:800, color:"white", letterSpacing:showPin?8:4, fontFamily:"'Courier New',monospace", marginBottom:14, minHeight:36 }}>
                  {showPin ? (cardInfo.pin || "DECRYPT ERROR") : "• • • • • • • •"}
                </div>
                <button onClick={() => setShowPin(p=>!p)}
                  style={{ padding:"8px 20px", borderRadius:8, border:"1px solid rgba(255,255,255,.3)", background:"rgba(255,255,255,.15)", color:"white", cursor:"pointer", fontSize:13, fontWeight:600 }}>
                  {showPin ? "Hide PIN" : "Reveal PIN"}
                </button>
              </div>

              {/* Already confirmed notice */}
              {status === "already_confirmed" ? (
                <div className="alert alert-success" style={{ marginBottom:20 }}>
                  <span></span><span>This card has already been confirmed. No action needed.</span>
                </div>
              ) : (
                <>
                  {/* Acknowledge checkbox */}
                  <label style={{ display:"flex", alignItems:"flex-start", gap:10, marginBottom:20, cursor:"pointer" }}>
                    <input type="checkbox" checked={acknowledged} onChange={e=>setAck(e.target.checked)}
                      style={{ width:18, height:18, marginTop:2, accentColor:"#16a34a", cursor:"pointer" }} />
                    <span style={{ fontSize:13.5, color:"#374151", lineHeight:1.6 }}>
                      I confirm I have received and viewed my card PIN. I understand this is recorded for audit purposes.
                    </span>
                  </label>

                  {/* Acknowledge button */}
                  <button
                    onClick={handleConfirm}
                    disabled={!acknowledged || confirming}
                    style={{
                      width:"100%", padding:"15px", borderRadius:10, border:"none",
                      background: acknowledged ? "linear-gradient(135deg,#166534,#16a34a)" : "#d1d5db",
                      color: acknowledged ? "white" : "#9ca3af",
                      fontWeight:700, fontSize:16, cursor: acknowledged?"pointer":"not-allowed",
                      boxShadow: acknowledged ? "0 4px 14px rgba(22,163,74,.3)" : "none",
                      transition:"all .15s",
                    }}
                  >
                    {confirming ? "Confirming…" : "Acknowledge Receipt"}
                  </button>
                </>
              )}
            </>
          )}

          {/* Success — Timestamp Log (SRS "Timestamp log") */}
          {status === "success" && (
            <>
              <div className="alert alert-success" style={{ marginBottom:20 }}>
                <span></span><span>{message}</span>
              </div>

              {/* Timestamp log */}
              <div style={{ background:"#f0fdf4", borderRadius:12, padding:18, border:"1px solid #86efac", marginBottom:20 }}>
                <div style={{ fontWeight:700, fontSize:14, marginBottom:12, color:"#15803d" }}> Confirmation Log</div>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {[
                    { label:"Delivery ID",       val: confirmed ? `#${confirmed.id}` : "—" },
                    { label:"Confirmed At",       val: confTime ? confTime.toLocaleString() : new Date().toLocaleString() },
                    { label:"Status",             val: "CONFIRMED" },
                    { label:"Recorded for",       val: "Financial compliance audit trail" },
                  ].map(r => (
                    <div key={r.label} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px solid #bbf7d0", fontSize:13.5 }}>
                      <span style={{ color:"#166534" }}>{r.label}</span>
                      <strong style={{ color:"#14532d" }}>{r.val}</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display:"flex", gap:10 }}>
                <button onClick={() => navigate("/staff-dashboard")}
                  style={{ flex:1, padding:"12px", borderRadius:10, border:"none", background:"linear-gradient(135deg,#1e3a8a,#2563eb)", color:"white", fontWeight:700, fontSize:14, cursor:"pointer" }}>
                   My Cards
                </button>
                <button onClick={() => navigate("/dashboard")}
                  style={{ flex:1, padding:"12px", borderRadius:10, border:"1.5px solid #e2e8f0", background:"white", color:"#475569", fontWeight:600, fontSize:14, cursor:"pointer" }}>
                   Dashboard
                </button>
              </div>
            </>
          )}

          {/* Error */}
          {status === "error" && (
            <>
              <div className="alert alert-error" style={{ marginBottom:20 }}>
                <span>X</span><span>{message}</span>
              </div>
              <button onClick={() => navigate("/dashboard")}
                style={{ width:"100%", padding:"13px", borderRadius:10, border:"none", background:"#475569", color:"white", fontWeight:700, fontSize:15, cursor:"pointer" }}>
                Go to Dashboard
              </button>
            </>
          )}

          <div style={{ marginTop:24, textAlign:"center", fontSize:12, color:"#94a3b8" }}>
            © {new Date().getFullYear()} Mobile Card Charging System · Secure Delivery
          </div>
        </div>
      </div>
    </div>
  );
}
