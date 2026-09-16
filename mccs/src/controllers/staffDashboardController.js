const db = require("../config/db");
const { decrypt } = require("../utils/encryption");

// ============================================================
// Helper: find staff record linked to logged-in user
// Matches by email (users.email = staff.email)
// ============================================================
const findStaffByUser = async (userId) => {
  const [users] = await db.query("SELECT email FROM users WHERE id = ?", [userId]);
  if (users.length === 0) return null;

  const [staffRows] = await db.query(
    "SELECT * FROM staff WHERE email = ? AND is_active = 1 LIMIT 1",
    [users[0].email],
  );
  return staffRows.length > 0 ? staffRows[0] : null;
};

// ============================================================
// GET /api/staff-dashboard/profile
// FR-014: Staff views own profile + eligibility
// ============================================================
const getProfile = async (req, res) => {
  try {
    const staff = await findStaffByUser(req.user?.id);
    if (!staff) {
      return res.status(404).json({
        success: false,
        message: "No staff record linked to your account. Contact admin.",
      });
    }

    // Eligibility rules
    const [eligibility] = await db.query(
      `SELECT id, card_type, monthly_quota, is_active FROM eligibility_rules
       WHERE staff_id = ? ORDER BY card_type`,
      [staff.id],
    );

    // Department info
    const [deptRows] = await db.query(
      "SELECT department_name, department_code FROM departments WHERE id = ?",
      [staff.department_id],
    );

    return res.json({
      success: true,
      staff: {
        ...staff,
        department_name: deptRows[0]?.department_name || "—",
        department_code: deptRows[0]?.department_code || "—",
      },
      eligibility,
    });
  } catch (error) {
    console.error("Staff profile error:", error);
    return res.status(500).json({ success: false, message: "Failed to load profile", error: error.message });
  }
};

// ============================================================
// GET /api/staff-dashboard/pending
// FR-029/032: Staff views pending allocations awaiting confirmation
// ============================================================
const getPendingAllocations = async (req, res) => {
  try {
    const staff = await findStaffByUser(req.user?.id);
    if (!staff) {
      return res.status(404).json({ success: false, message: "No staff record linked to your account." });
    }

    const [rows] = await db.query(
      `SELECT
         di.id AS distribution_item_id,
         di.allocated_at,
         c.id AS card_id,
         c.provider,
         c.type,
         c.value,
         c.expiry_date,
         c.status AS card_status,
         dl.id AS delivery_id,
         dl.status AS delivery_status,
         dl.confirmation_token,
         dl.token_expiry,
         dl.sent_at,
         dl.delivery_method,
         d.month,
         d.distribution_uuid
       FROM distribution_items di
       INNER JOIN cards c ON c.id = di.card_id
       INNER JOIN distributions d ON d.id = di.distribution_id
       LEFT JOIN deliveries dl ON dl.distribution_item_id = di.id
       WHERE di.staff_id = ?
         AND dl.status IN ('PENDING','SENT','DELIVERED')
         AND (dl.token_expiry IS NULL OR dl.token_expiry > NOW())
       ORDER BY di.allocated_at DESC`,
      [staff.id],
    );

    return res.json({
      success: true,
      count: rows.length,
      pending: rows,
    });
  } catch (error) {
    console.error("Pending allocations error:", error);
    return res.status(500).json({ success: false, message: "Failed to load pending allocations", error: error.message });
  }
};

// ============================================================
// GET /api/staff-dashboard/history
// FR-014: Staff views personal distribution history
// ============================================================
const getHistory = async (req, res) => {
  try {
    const staff = await findStaffByUser(req.user?.id);
    if (!staff) {
      return res.status(404).json({ success: false, message: "No staff record linked to your account." });
    }

    const [rows] = await db.query(
      `SELECT
         di.id AS distribution_item_id,
         di.allocated_at,
         c.id AS card_id,
         c.provider,
         c.type,
         c.value,
         c.expiry_date,
         c.status AS card_status,
         dl.status AS delivery_status,
         dl.sent_at,
         conf.confirmed_at,
         ul.marked_used_at,
         ul.remarks,
         d.month
       FROM distribution_items di
       INNER JOIN cards c ON c.id = di.card_id
       INNER JOIN distributions d ON d.id = di.distribution_id
       LEFT JOIN deliveries dl ON dl.distribution_item_id = di.id
       LEFT JOIN confirmations conf ON conf.delivery_id = dl.id
       LEFT JOIN usage_logs ul ON ul.card_id = c.id AND ul.staff_id = di.staff_id
       WHERE di.staff_id = ?
       ORDER BY di.allocated_at DESC
       LIMIT 50`,
      [staff.id],
    );

    return res.json({
      success: true,
      count: rows.length,
      history: rows,
    });
  } catch (error) {
    console.error("History error:", error);
    return res.status(500).json({ success: false, message: "Failed to load history", error: error.message });
  }
};

// ============================================================
// GET /api/staff-dashboard/card/:token
// FR-030: Staff views full card details after clicking confirm link
// PIN is only decrypted here — never shown in plain text elsewhere (BR-006)
// ============================================================
const getCardByToken = async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ success: false, message: "Token required" });
    }

    const [rows] = await db.query(
      `SELECT
         dl.id AS delivery_id,
         dl.status AS delivery_status,
         dl.token_expiry,
         dl.confirmation_token,
         dl.delivery_method,
         di.id AS distribution_item_id,
         di.staff_id,
         c.id AS card_id,
         c.provider,
         c.type,
         c.value,
         c.expiry_date,
         c.pin_encrypted,
         c.pin_iv,
         c.pin_auth_tag,
         c.status AS card_status,
         s.full_name,
         s.employee_id,
         d.month
       FROM deliveries dl
       INNER JOIN distribution_items di ON di.id = dl.distribution_item_id
       INNER JOIN cards c ON c.id = di.card_id
       INNER JOIN staff s ON s.id = di.staff_id
       INNER JOIN distributions d ON d.id = di.distribution_id
       WHERE dl.confirmation_token = ?
       LIMIT 1`,
      [token],
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Invalid or expired confirmation token" });
    }

    const row = rows[0];

    // Token expired?
    if (row.token_expiry && new Date(row.token_expiry) < new Date()) {
      return res.status(410).json({ success: false, message: "This confirmation link has expired" });
    }

    // Decrypt PIN (FR-025: only at moment of delivery/confirmation)
    let pin = null;
    try {
      if (row.pin_encrypted && row.pin_iv && row.pin_auth_tag) {
        pin = decrypt(row.pin_encrypted, row.pin_iv, row.pin_auth_tag);
      }
    } catch (err) {
      console.error("PIN decrypt error:", err.message);
    }

    return res.json({
      success: true,
      card: {
        delivery_id:           row.delivery_id,
        delivery_status:       row.delivery_status,
        distribution_item_id:  row.distribution_item_id,
        card_id:               row.card_id,
        provider:              row.provider,
        type:                  row.type,
        value:                 row.value,
        expiry_date:           row.expiry_date,
        card_status:           row.card_status,
        pin:                   pin,   // FR-025 — decrypted only here
        month:                 row.month,
        staff_name:            row.full_name,
        employee_id:           row.employee_id,
        confirmation_token:    row.confirmation_token,
        token_expiry:          row.token_expiry,
      },
    });
  } catch (error) {
    console.error("Get card by token error:", error);
    return res.status(500).json({ success: false, message: "Failed to retrieve card details", error: error.message });
  }
};

// ============================================================
// GET /api/staff-dashboard/monthly-status
// FR-013: Check current month consumption vs quota
// ============================================================
const getMonthlyStatus = async (req, res) => {
  try {
    const staff = await findStaffByUser(req.user?.id);
    if (!staff) {
      return res.status(404).json({ success: false, message: "No staff record linked." });
    }

    const currentMonth = new Date();
    const monthStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-01`;

    // Eligibility rules
    const [eligibility] = await db.query(
      "SELECT card_type, monthly_quota FROM eligibility_rules WHERE staff_id = ? AND is_active = 1",
      [staff.id],
    );

    // Current month consumption
    const [consumed] = await db.query(
      `SELECT UPPER(c.type) AS card_type, COUNT(*) AS used
       FROM distribution_items di
       INNER JOIN distributions d ON d.id = di.distribution_id
       INNER JOIN cards c ON c.id = di.card_id
       WHERE di.staff_id = ? AND d.month = ?
         AND d.status IN ('CONFIRMED','SENT','COMPLETED')
       GROUP BY UPPER(c.type)`,
      [staff.id, monthStr],
    );

    const consumedMap = {};
    consumed.forEach(r => { consumedMap[r.card_type] = Number(r.used); });

    const status = eligibility.map(e => ({
      card_type:     e.card_type,
      monthly_quota: Number(e.monthly_quota),
      consumed:      consumedMap[e.card_type] || 0,
      remaining:     Math.max(Number(e.monthly_quota) - (consumedMap[e.card_type] || 0), 0),
      percentage:    Number(e.monthly_quota) > 0
        ? Math.round(((consumedMap[e.card_type] || 0) / Number(e.monthly_quota)) * 100)
        : 0,
    }));

    return res.json({
      success: true,
      month: monthStr,
      monthly_status: status,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed", error: error.message });
  }
};

module.exports = {
  getProfile,
  getPendingAllocations,
  getHistory,
  getCardByToken,
  getMonthlyStatus,
};
