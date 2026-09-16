const express       = require("express");
const dotenv        = require("dotenv");
const cors          = require("cors");
const rateLimit     = require("express-rate-limit");
const session       = require("express-session");
const cookieParser  = require("cookie-parser");
const db            = require("./config/db");

// Routes
const authRoutes          = require("./routes/authRoutes");
const inventoryRoutes     = require("./routes/inventoryRoutes");
const distributionRoutes  = require("./routes/distributionRoutes");
const deliveryRoutes      = require("./routes/deliveryRoutes");
const confirmationRoutes  = require("./routes/confirmationRoutes");
const usageRoutes         = require("./routes/usageRoutes");
const auditRoutes         = require("./routes/auditRoutes");
const dashboardRoutes     = require("./routes/dashboardRoutes");
const departmentRoutes    = require("./routes/departmentRoutes");
const staffRoutes         = require("./routes/staffRoutes");
const reportRoutes        = require("./routes/reportRoutes");
const eligibilityRoutes   = require("./routes/eligibilityRoutes");
const userRoutes          = require("./routes/userRoutes");
const settingsRoutes      = require("./routes/settingsRoutes");
const notificationRoutes  = require("./routes/notificationRoutes");
const staffDashRoutes     = require("./routes/staffDashboardRoutes");
const approvalRoutes      = require("./routes/approvalRoutes");

const { protect }    = require("./middleware/authMiddleware");
const { authorize }  = require("./middleware/roleMiddleware");
const { trackActivity, checkSessionExpiry, setCookieHeaders, validateSession } = require("./middleware/sessionMiddleware");
const { startAllJobs } = require("./cron/reminderJobs");

dotenv.config();

// ── Section 17 & 22: Startup .env Validation ─────────────────
const requiredEnv = ["JWT_SECRET","DB_NAME","CARD_ENCRYPTION_KEY","DB_HOST","DB_USER"];
const missingEnv  = requiredEnv.filter(k => !process.env[k]);
if (missingEnv.length > 0) {
  console.error(`[STARTUP ERROR] Missing required environment variables: ${missingEnv.join(", ")}`);
  console.error("[STARTUP] Check your .env file and restart the server.");
  process.exit(1);
}
// Validate encryption key is 64-char hex
if (!/^[0-9a-fA-F]{64}$/.test(process.env.CARD_ENCRYPTION_KEY)) {
  console.error("[STARTUP ERROR] CARD_ENCRYPTION_KEY must be exactly 64 hexadecimal characters.");
  process.exit(1);
}
// Warn if JWT secret is too weak
if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
  console.warn("[SECURITY WARNING] JWT_SECRET is too short. Use at least 32 characters for production.");
}
console.log("[ENV] All required environment variables validated.");

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Cookie Parser ────────────────────────────────────────────
app.use(cookieParser(process.env.COOKIE_SECRET || "mccs-cookie-secret-key-change-in-production"));

// ── Session Management ───────────────────────────────────────
// NFR-002: Secure session handling with cookies
app.use(session({
  name: "mccs.sid",  // Custom session cookie name
  secret: process.env.SESSION_SECRET || process.env.JWT_SECRET || "mccs-session-secret-change-in-production",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,      // Prevents XSS attacks
    secure: process.env.NODE_ENV === "production",  // HTTPS only in production
    sameSite: "lax",     // CSRF protection
    maxAge: 24 * 60 * 60 * 1000,  // 24 hours
  },
  rolling: true,  // Reset cookie maxAge on every request
}));

// ── CORS ─────────────────────────────────────────────────────
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:5174"],
  methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization"],
  credentials: true,  // Allow cookies to be sent
}));

// ── Rate Limiting (NFR-002, Section 17) ──────────────────────
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, please try again later." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: "Too many login attempts. Please wait 15 minutes." },
});

const distributionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // FR-017 Section 17: 100 per hour per IP
  message: { success: false, message: "Distribution rate limit exceeded (100/hour)." },
});

app.use(generalLimiter);
app.use(express.json({ limit: "10mb" }));

// ── Session & Cookie Middleware ──────────────────────────────
app.use(setCookieHeaders);
app.use(checkSessionExpiry);
app.use(trackActivity);
app.use(validateSession);

// ── Routes ───────────────────────────────────────────────────
app.use("/api/auth",          authLimiter, authRoutes);
app.use("/api/dashboard",     dashboardRoutes);
app.use("/api/inventory",     inventoryRoutes);
app.use("/api/departments",   departmentRoutes);
app.use("/api/staff",         staffRoutes);
app.use("/api/distributions", distributionLimiter, distributionRoutes);
app.use("/api/deliveries",    deliveryRoutes);
app.use("/api/confirmations", confirmationRoutes);
app.use("/api/usage",         usageRoutes);
app.use("/api/audit-logs",    auditRoutes);
app.use("/api/reports",       reportRoutes);
app.use("/api/eligibility",   eligibilityRoutes);
app.use("/api/users",         userRoutes);
app.use("/api/settings",      settingsRoutes);
app.use("/api/notifications",   notificationRoutes);
app.use("/api/staff-dashboard", staffDashRoutes);
app.use("/api/approvals",       approvalRoutes);

// ── Health / Home ─────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ success: true, message: "MCCS Backend API is running", version: "1.0.0" });
});

app.get("/api/health", (req, res) => {
  console.log("Health check hit");
  res.json({ success: true, status: "OK", timestamp: new Date().toISOString() });
});

app.get("/api/test-db", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT 1 AS result");
    res.json({ success: true, message: "MySQL connected", database: process.env.DB_NAME, result: rows[0].result });
  } catch (error) {
    res.status(500).json({ success: false, message: "DB connection failed", error: error.message });
  }
});

// Test email endpoint (check email/notification system)
app.post('/api/test-email', async (req, res) => {
  try {
    const { toEmail } = req.body;
    
    if (!toEmail) {
      return res.status(400).json({ success: false, message: 'Email address required' });
    }
    
    // Check if SMTP is configured
    if (!process.env.SMTP_USER || process.env.SMTP_USER === 'your_email@gmail.com') {
      return res.json({ 
        success: false, 
        message: 'Email not configured. Update SMTP_USER and SMTP_PASS in .env file',
        configured: false,
        instructions: 'To enable email: 1) Use a Gmail account, 2) Enable 2FA, 3) Generate App Password, 4) Update .env'
      });
    }
    
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    
    await transporter.sendMail({
      from: `"MCCS System" <${process.env.SMTP_USER}>`,
      to: toEmail,
      subject: '✅ MCCS Email Test - Success!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f8fafc;">
          <div style="background: white; border-radius: 12px; padding: 30px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
            <h2 style="color: #16a34a; margin: 0 0 16px;">✅ Email System Working!</h2>
            <p style="color: #334155; font-size: 15px; line-height: 1.6;">
              This is a test email from your <strong>Mobile Card Charging System (MCCS)</strong>.
            </p>
            <div style="background: #f1f5f9; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <p style="margin: 0 0 8px; color: #64748b; font-size: 13px;"><strong>Timestamp:</strong></p>
              <p style="margin: 0; color: #0f172a; font-size: 14px;">${new Date().toLocaleString()}</p>
              <p style="margin: 16px 0 8px; color: #64748b; font-size: 13px;"><strong>System:</strong></p>
              <p style="margin: 0; color: #0f172a; font-size: 14px;">MCCS Backend (Node.js + Nodemailer)</p>
            </div>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
            <p style="color: #64748b; font-size: 14px; margin: 0; line-height: 1.6;">
              ✉️ Your notification system is configured correctly. Card delivery emails, 
              reminders, and alerts will be sent to users automatically.
            </p>
          </div>
        </div>
      `
    });
    
    return res.json({ 
      success: true, 
      message: `✅ Test email sent successfully to ${toEmail}`,
      configured: true,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Test email error:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to send test email',
      error: error.message,
      hint: 'Check SMTP credentials in .env file. Gmail requires App Password (not regular password).'
    });
  }
});

// Create test notification (for debugging)
app.post('/api/test-notification', protect, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { createNotification } = require('./controllers/notificationController');
    
    // Create a test notification for current user
    await createNotification({
      userId: userId,
      type: 'SYSTEM',
      title: '🔔 Test Notification',
      message: 'This is a test notification created at ' + new Date().toLocaleString() + '. If you see this, the notification system is working!',
      link: '/notifications'
    });
    
    return res.json({
      success: true,
      message: 'Test notification created for current user',
      user_id: userId
    });
  } catch (error) {
    console.error('Test notification error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Diagnostic endpoint - check dept head setup
app.get('/api/diagnostic/dept-head', protect, async (req, res) => {
  try {
    // Get all users with DEPARTMENT_HEAD role
    const [deptHeads] = await db.query(`
      SELECT u.id, u.full_name, u.email, u.role, u.status,
             s.id as staff_id, s.department_id, d.department_name
      FROM users u
      LEFT JOIN staff s ON s.email = u.email AND s.is_active = 1
      LEFT JOIN departments d ON d.id = s.department_id
      WHERE u.role = 'DEPARTMENT_HEAD'
    `);
    
    // Get pending distributions requiring approval
    const [pendingDist] = await db.query(`
      SELECT id, month, department_id, total_value, approval_status
      FROM distributions
      WHERE requires_approval = 1 AND approval_status = 'PENDING'
    `);
    
    // Get notifications for dept heads
    const [notifications] = await db.query(`
      SELECT n.id, n.user_id, n.type, n.title, n.message, n.is_read, n.created_at,
             u.full_name, u.email
      FROM notifications n
      INNER JOIN users u ON u.id = n.user_id
      WHERE u.role = 'DEPARTMENT_HEAD'
      ORDER BY n.created_at DESC
      LIMIT 20
    `);
    
    return res.json({
      success: true,
      dept_heads: deptHeads,
      pending_distributions: pendingDist,
      recent_notifications: notifications,
      summary: {
        total_dept_heads: deptHeads.length,
        heads_with_dept: deptHeads.filter(h => h.department_id).length,
        pending_approvals: pendingDist.length,
        notifications_sent: notifications.length
      }
    });
  } catch (error) {
    console.error('Diagnostic error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 MCCS Server running on http://localhost:${PORT}`);
  console.log(`📦 Database: ${process.env.DB_NAME}`);
  console.log(`🔐 JWT expiry: 1d | AES-256-GCM encryption active`);
  startAllJobs();
});
