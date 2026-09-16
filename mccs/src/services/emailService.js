const nodemailer = require("nodemailer");
const QRCode     = require("qrcode");
const { decrypt } = require("../utils/encryption");

// ============================================================
// Create transporter from env or DB settings
// ============================================================
const createTransporter = () => {
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST || "smtp.gmail.com",
    port:   parseInt(process.env.SMTP_PORT || "587", 10),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

// ============================================================
// Generate QR code as base64 data URL (FR-023, tech stack)
// ============================================================
const generateQRCode = async (data) => {
  try {
    return await QRCode.toDataURL(String(data), {
      width: 200,
      margin: 2,
      color: { dark: "#0f172a", light: "#ffffff" },
    });
  } catch (err) {
    console.error("QR generation error:", err.message);
    return null;
  }
};

// ============================================================
// Send card delivery email with QR code (FR-024, FR-025)
// ============================================================
const sendCardDeliveryEmail = async ({
  toEmail, toName, card, confirmationToken, month,
}) => {
  const transporter = createTransporter();

  // Decrypt PIN only at delivery moment (FR-025)
  let pin = "••••••••";
  try {
    if (card.pin_encrypted && card.pin_iv && card.pin_auth_tag) {
      pin = decrypt(card.pin_encrypted, card.pin_iv, card.pin_auth_tag);
    }
  } catch (err) {
    console.error("PIN decrypt error:", err.message);
  }

  const confirmUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/confirm?token=${confirmationToken}`;

  // Generate QR code for the confirmation URL (FR-023: Secure Delivery Token)
  const qrDataUrl = await generateQRCode(confirmUrl);

  const qrImgTag = qrDataUrl
    ? `<img src="${qrDataUrl}" alt="Scan to confirm" width="140" style="border-radius:8px;border:4px solid #e2e8f0;" />`
    : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <style>
    *{box-sizing:border-box;}
    body{font-family:'Segoe UI',Arial,sans-serif;background:#f1f5f9;margin:0;padding:0;}
    .wrap{max-width:620px;margin:32px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,.1);}
    .hdr{background:linear-gradient(135deg,#1e3a8a,#2563eb);padding:36px 32px;text-align:center;}
    .hdr-logo{width:52px;height:52px;background:rgba(255,255,255,.2);border-radius:12px;display:inline-flex;align-items:center;justify-content:center;font-size:26px;margin-bottom:14px;}
    .hdr h1{margin:0;color:white;font-size:22px;font-weight:800;}
    .hdr p{margin:6px 0 0;color:#93c5fd;font-size:13px;}
    .body{padding:32px;}
    .greeting{font-size:16px;color:#0f172a;margin-bottom:8px;}
    .subtitle{font-size:13.5px;color:#64748b;margin-bottom:24px;}
    .card-details{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:24px;}
    .card-row{display:flex;justify-content:space-between;padding:12px 18px;border-bottom:1px solid #e2e8f0;font-size:14px;}
    .card-row:last-child{border-bottom:none;}
    .card-row .lbl{color:#64748b;font-weight:500;}
    .card-row .val{color:#0f172a;font-weight:700;}
    .pin-section{background:linear-gradient(135deg,#1e3a8a,#2563eb);border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;}
    .pin-label{color:#93c5fd;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;}
    .pin-value{color:white;font-size:32px;font-weight:800;letter-spacing:6px;font-family:'Courier New',monospace;}
    .qr-section{text-align:center;margin-bottom:24px;padding:20px;background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;}
    .qr-label{font-size:13px;color:#64748b;margin-bottom:12px;font-weight:600;}
    .confirm-btn{display:block;background:#16a34a;color:white;padding:15px 28px;border-radius:10px;text-decoration:none;font-size:16px;font-weight:700;text-align:center;margin-bottom:8px;}
    .confirm-url{font-size:11px;color:#94a3b8;text-align:center;word-break:break-all;margin-bottom:24px;}
    .warning{background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:14px 18px;font-size:13px;color:#c2410c;}
    .footer{background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 32px;text-align:center;font-size:12px;color:#94a3b8;}
  </style>
</head>
<body>
<div class="wrap">
  <div class="hdr">
    <div class="hdr-logo">📱</div>
    <h1>Your Monthly Card is Ready</h1>
    <p>Mobile Card Charging System (MCCS)</p>
  </div>
  <div class="body">
    <div class="greeting">Hello <strong>${toName}</strong>,</div>
    <div class="subtitle">Your monthly mobile card allocation for <strong>${month || "this month"}</strong> is ready.</div>

    <div class="card-details">
      <div class="card-row"><span class="lbl">Provider</span><span class="val">${card.provider || "—"}</span></div>
      <div class="card-row"><span class="lbl">Type</span><span class="val">${card.type || "—"}</span></div>
      <div class="card-row"><span class="lbl">Value</span><span class="val">$${Number(card.value || 0).toFixed(2)}</span></div>
      <div class="card-row"><span class="lbl">Expiry Date</span><span class="val">${card.expiry_date || "—"}</span></div>
    </div>

    <div class="pin-section">
      <div class="pin-label">🔐 Your Card PIN</div>
      <div class="pin-value">${pin}</div>
    </div>

    <p style="font-size:14px;color:#475569;margin-bottom:16px;">
      Confirm your receipt by clicking the button below or scanning the QR code.
      <strong>This link expires in 7 days.</strong>
    </p>

    <a href="${confirmUrl}" class="confirm-btn">✅ Confirm Receipt</a>
    <div class="confirm-url">${confirmUrl}</div>

    ${qrDataUrl ? `
    <div class="qr-section">
      <div class="qr-label">📷 Or scan this QR code to confirm</div>
      ${qrImgTag}
    </div>` : ""}

    <div class="warning">
      ⚠️ Keep your PIN confidential. If you did not request this card, contact your administrator immediately.
    </div>
  </div>
  <div class="footer">
    Automated message from MCCS — do not reply &nbsp;·&nbsp;
    &copy; ${new Date().getFullYear()} Mobile Card Charging System
  </div>
</div>
</body>
</html>`;

  const info = await transporter.sendMail({
    from:    `"MCCS System" <${process.env.SMTP_USER}>`,
    to:      toEmail,
    subject: `📱 Your Monthly Card is Ready — ${card.provider || ""} ${card.type || ""} (${month || "This Month"})`,
    html,
  });

  return { info, qrDataUrl };
};

// ============================================================
// Reminder email (FR-028)
// ============================================================
const sendReminderEmail = async ({ toEmail, toName, confirmationToken, dayNumber }) => {
  const transporter = createTransporter();
  const confirmUrl  = `${process.env.FRONTEND_URL || "http://localhost:5173"}/confirm?token=${confirmationToken}`;
  const qrDataUrl   = await generateQRCode(confirmUrl);

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/>
<style>
  body{font-family:'Segoe UI',Arial,sans-serif;background:#f1f5f9;margin:0;}
  .wrap{max-width:600px;margin:32px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08);}
  .hdr{background:linear-gradient(135deg,#92400e,#d97706);padding:28px 32px;text-align:center;}
  .hdr h2{margin:0;color:white;font-size:20px;}
  .hdr p{margin:6px 0 0;color:#fde68a;font-size:13px;}
  .body{padding:28px 32px;}
  .day-badge{display:inline-block;background:#fef3c7;color:#92400e;padding:6px 18px;border-radius:999px;font-weight:800;font-size:14px;margin-bottom:18px;}
  .btn{display:block;background:#2563eb;color:white;padding:14px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;text-align:center;margin:20px 0;}
  .qr-wrap{text-align:center;padding:16px;background:#f8fafc;border-radius:10px;margin-bottom:16px;}
  .footer{background:#f8fafc;padding:16px 32px;font-size:12px;color:#94a3b8;text-align:center;border-top:1px solid #e2e8f0;}
</style>
</head>
<body>
<div class="wrap">
  <div class="hdr">
    <h2>⏰ Reminder: Confirm Your Card Receipt</h2>
    <p>Mobile Card Charging System (MCCS)</p>
  </div>
  <div class="body">
    <div class="day-badge">Day ${dayNumber} Reminder</div>
    <p>Hello <strong>${toName}</strong>,</p>
    <p>Your mobile card allocation is still <strong>pending confirmation</strong>. Please confirm receipt to complete the process.</p>
    <a href="${confirmUrl}" class="btn">✅ Confirm Receipt Now</a>
    ${qrDataUrl ? `<div class="qr-wrap"><p style="font-size:12px;color:#64748b;margin-bottom:10px;">Or scan to confirm</p><img src="${qrDataUrl}" width="120" alt="QR Code" style="border-radius:6px;"/></div>` : ""}
    <p style="font-size:12px;color:#94a3b8;">If you have already confirmed, please disregard this message.</p>
  </div>
  <div class="footer">Automated from MCCS &copy; ${new Date().getFullYear()}</div>
</div>
</body>
</html>`;

  return transporter.sendMail({
    from:    `"MCCS System" <${process.env.SMTP_USER}>`,
    to:      toEmail,
    subject: `⏰ Reminder (Day ${dayNumber}): Please Confirm Your Card Receipt`,
    html,
  });
};

// ============================================================
// Low inventory alert (FR-006)
// ============================================================
const sendLowInventoryAlert = async ({ toEmail, cardType, count, threshold }) => {
  const transporter = createTransporter();
  return transporter.sendMail({
    from:    `"MCCS System" <${process.env.SMTP_USER}>`,
    to:      toEmail,
    subject: `⚠️ Low Inventory Alert: ${cardType} (${count} remaining)`,
    html: `<!DOCTYPE html><html><head><meta charset="UTF-8"/></head>
<body style="font-family:Arial,sans-serif;background:#f1f5f9;padding:20px;">
<div style="max-width:500px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,.08);">
  <div style="background:linear-gradient(135deg,#7f1d1d,#dc2626);padding:24px;text-align:center;">
    <h2 style="margin:0;color:white;">⚠️ Low Inventory Alert</h2>
  </div>
  <div style="padding:28px;">
    <p>The inventory for <strong>${cardType}</strong> cards has fallen below the configured threshold.</p>
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:16px 0;">
      <div style="font-size:32px;font-weight:800;color:#dc2626;text-align:center;">${count}</div>
      <div style="text-align:center;color:#b91c1c;font-size:13px;margin-top:4px;">cards remaining (threshold: ${threshold})</div>
    </div>
    <p>Please upload new card inventory via the MCCS system to avoid disruption in the next distribution cycle.</p>
  </div>
  <div style="background:#f8fafc;padding:14px;text-align:center;font-size:12px;color:#94a3b8;border-top:1px solid #e2e8f0;">
    MCCS Automated Alert &copy; ${new Date().getFullYear()}
  </div>
</div>
</body></html>`,
  });
};

// ============================================================
// Password Reset Email (FR-SECURITY)
// ============================================================
const sendPasswordResetEmail = async (toEmail, toName, resetUrl) => {
  const transporter = createTransporter();
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <style>
    *{box-sizing:border-box;}
    body{font-family:'Segoe UI',Arial,sans-serif;background:#f1f5f9;margin:0;padding:0;}
    .wrap{max-width:600px;margin:32px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,.1);}
    .hdr{background:linear-gradient(135deg,#7c3aed,#8b5cf6);padding:32px;text-align:center;}
    .hdr-icon{width:56px;height:56px;background:rgba(255,255,255,.2);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:28px;margin-bottom:12px;}
    .hdr h1{margin:0;color:white;font-size:22px;font-weight:800;}
    .hdr p{margin:6px 0 0;color:#ddd6fe;font-size:13px;}
    .body{padding:32px;}
    .greeting{font-size:16px;color:#0f172a;margin-bottom:8px;}
    .message{font-size:14px;color:#475569;line-height:1.7;margin-bottom:24px;}
    .reset-btn{display:block;background:#8b5cf6;color:white;padding:16px 32px;border-radius:10px;text-decoration:none;font-size:16px;font-weight:700;text-align:center;margin:24px 0;transition:all .2s;}
    .reset-btn:hover{background:#7c3aed;transform:translateY(-1px);}
    .expires{background:#fef3c7;border:1px solid #fde047;border-radius:8px;padding:14px;text-align:center;font-size:13px;color:#854d0e;margin-bottom:24px;}
    .expires strong{color:#713f12;}
    .security-notice{background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:16px;font-size:13px;color:#0c4a6e;margin-bottom:16px;}
    .security-notice strong{color:#075985;}
    .alt-link{font-size:12px;color:#94a3b8;word-break:break-all;text-align:center;margin-top:12px;}
    .footer{background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 32px;text-align:center;font-size:12px;color:#94a3b8;}
  </style>
</head>
<body>
<div class="wrap">
  <div class="hdr">
    <div class="hdr-icon">🔐</div>
    <h1>Password Reset Request</h1>
    <p>Mobile Card Charging System (MCCS)</p>
  </div>
  <div class="body">
    <div class="greeting">Hello <strong>${toName || 'User'}</strong>,</div>
    <div class="message">
      We received a request to reset your password for your MCCS account. 
      Click the button below to create a new password.
    </div>

    <a href="${resetUrl}" class="reset-btn">Reset Password</a>

    <div class="expires">
      ⏰ This link will <strong>expire in 1 hour</strong> for security reasons.
    </div>

    <div class="security-notice">
      <strong>🛡️ Security Notice:</strong><br/>
      If you did not request a password reset, please ignore this email. 
      Your account remains secure and no changes have been made.
    </div>

    <div class="alt-link">
      Or copy and paste this link into your browser:<br/>
      ${resetUrl}
    </div>
  </div>
  <div class="footer">
    Automated security message from MCCS — do not reply<br/>
    &copy; ${new Date().getFullYear()} Mobile Card Charging System
  </div>
</div>
</body>
</html>`;

  return transporter.sendMail({
    from:    `"MCCS Security" <${process.env.SMTP_USER}>`,
    to:      toEmail,
    subject: `🔐 Password Reset Request - MCCS`,
    html,
  });
};


module.exports = { sendCardDeliveryEmail, sendReminderEmail, sendLowInventoryAlert, generateQRCode, sendPasswordResetEmail };
