const db = require("../config/db");

// ============================================================
// GET /api/settings
// Return all settings grouped (mask sensitive values)
// ============================================================
const getSettings = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        id, setting_key, setting_value, setting_group, description, 
        is_sensitive, data_type, updated_at
      FROM system_settings
      ORDER BY setting_group, setting_key ASC
    `);

    const settings = rows.map(r => ({
      ...r,
      label: r.setting_key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    }));

    // Group settings by setting_group
    const grouped = {};
    settings.forEach(s => {
      if (!grouped[s.setting_group]) grouped[s.setting_group] = [];
      grouped[s.setting_group].push(s);
    });

    return res.json({ success: true, count: rows.length, settings, grouped });
  } catch (error) {
    console.error("Get settings error:", error);
    return res.status(500).json({ success: false, message: "Failed to load settings", error: error.message });
  }
};

// ============================================================
// PUT /api/settings
// Bulk update settings (key-value map)
// ============================================================
const updateSettings = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { updates } = req.body; // { key: value, key: value, ... }

    if (!updates || typeof updates !== "object" || Array.isArray(updates)) {
      return res.status(400).json({ success: false, message: "updates must be a key-value object" });
    }

    const keys = Object.keys(updates);
    if (keys.length === 0) {
      return res.status(400).json({ success: false, message: "No updates provided" });
    }

    // Verify all keys exist
    const placeholders = keys.map(() => "?").join(",");
    const [existing] = await connection.query(
      `SELECT setting_key FROM system_settings WHERE setting_key IN (${placeholders})`,
      keys,
    );
    const validKeys = new Set(existing.map(r => r.setting_key));
    const invalidKeys = keys.filter(k => !validKeys.has(k));
    if (invalidKeys.length > 0) {
      return res.status(400).json({ success: false, message: `Unknown setting keys: ${invalidKeys.join(", ")}` });
    }

    await connection.beginTransaction();

    for (const [key, value] of Object.entries(updates)) {
      await connection.query(
        "UPDATE system_settings SET setting_value = ?, updated_by = ? WHERE setting_key = ?",
        [value === null || value === undefined ? null : String(value), req.user?.id || null, key],
      );
    }

    await connection.commit();

    // Return fresh settings
    const [updated] = await db.query("SELECT setting_key, setting_value, description FROM system_settings ORDER BY setting_key");

    return res.json({
      success: true,
      message: `${keys.length} setting(s) updated successfully`,
      updated_keys: keys,
      settings: updated,
    });
  } catch (error) {
    try { await connection.rollback(); } catch (_) {}
    console.error("Update settings error:", error);
    return res.status(500).json({ success: false, message: "Failed to update settings", error: error.message });
  } finally {
    connection.release();
  }
};

// ============================================================
// PUT /api/settings/:key
// Update single setting
// ============================================================
const updateSetting = async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    const [rows] = await db.query("SELECT id FROM system_settings WHERE setting_key = ?", [key]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: `Setting '${key}' not found` });
    }

    await db.query(
      "UPDATE system_settings SET setting_value = ?, updated_by = ? WHERE setting_key = ?",
      [value === null || value === undefined ? null : String(value), req.user?.id || null, key],
    );

    const [updated] = await db.query(
      "SELECT setting_key, setting_value, description, updated_at FROM system_settings WHERE setting_key = ?",
      [key],
    );

    return res.json({ success: true, message: "Setting updated", setting: updated[0] });
  } catch (error) {
    console.error("Update setting error:", error);
    return res.status(500).json({ success: false, message: "Failed to update setting", error: error.message });
  }
};

// ============================================================
// POST /api/settings/test-email
// Send a test email using current SMTP settings
// ============================================================
const testEmail = async (req, res) => {
  try {
    const { to } = req.body;
    if (!to) return res.status(400).json({ success: false, message: "Recipient email (to) is required" });

    // Read SMTP settings from DB
    const [rows] = await db.query(
      "SELECT setting_key, setting_value FROM system_settings WHERE setting_key LIKE 'smtp_%'",
    );
    const cfg = {};
    rows.forEach(r => { cfg[r.setting_key] = r.setting_value; });

    if (!cfg.smtp_user || !cfg.smtp_pass) {
      return res.status(400).json({ success: false, message: "SMTP username and password are not configured yet" });
    }

    const nodemailer = require("nodemailer");
    const transporter = nodemailer.createTransport({
      host: cfg.smtp_host || "smtp.gmail.com",
      port: parseInt(cfg.smtp_port || "587", 10),
      secure: cfg.smtp_secure === "true",
      auth: { user: cfg.smtp_user, pass: cfg.smtp_pass },
    });

    await transporter.sendMail({
      from: `"${cfg.smtp_from_name || "MCCS System"}" <${cfg.smtp_user}>`,
      to,
      subject: "✅ MCCS Test Email — SMTP Working",
      html: `<div style="font-family:Arial;padding:24px;max-width:500px">
        <h2 style="color:#2563eb">MCCS Test Email</h2>
        <p>Your SMTP configuration is working correctly.</p>
        <hr/>
        <p style="color:#64748b;font-size:12px">Sent from Mobile Card Charging System v1.0</p>
      </div>`,
    });

    return res.json({ success: true, message: `Test email sent to ${to}` });
  } catch (error) {
    console.error("Test email error:", error);
    return res.status(500).json({ success: false, message: "Failed to send test email: " + error.message });
  }
};

// ============================================================
// GET /api/settings/health
// System health check
// ============================================================
const getHealth = async (req, res) => {
  const health = { db: false, tables: {}, uptime: process.uptime(), timestamp: new Date() };
  try {
    await db.query("SELECT 1");
    health.db = true;
    const tables = ["users","departments","staff","eligibility_rules","cards","distributions","distribution_items","deliveries","confirmations","usage_logs","audit_logs","system_settings"];
    for (const t of tables) {
      const [[row]] = await db.query(`SELECT COUNT(*) AS cnt FROM ${t}`);
      health.tables[t] = Number(row.cnt);
    }
    return res.json({ success: true, health });
  } catch (error) {
    health.db = false;
    return res.status(500).json({ success: false, health, error: error.message });
  }
};

module.exports = { getSettings, updateSettings, updateSetting, testEmail, getHealth };
