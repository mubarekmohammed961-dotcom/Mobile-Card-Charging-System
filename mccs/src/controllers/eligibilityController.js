const db = require("../config/db");

// ============================================================
// GET /api/staff/:staffId/eligibility
// Get eligibility rules for a staff member
// ============================================================
const getEligibility = async (req, res) => {
  try {
    const { staffId } = req.params;

    const [rows] = await db.query(
      `
      SELECT
        er.id,
        er.staff_id,
        s.full_name,
        s.employee_id,
        er.card_type,
        er.monthly_quota,
        er.is_active,
        er.created_at
      FROM eligibility_rules er
      INNER JOIN staff s ON s.id = er.staff_id
      WHERE er.staff_id = ?
      ORDER BY er.card_type ASC
      `,
      [staffId],
    );

    return res.json({
      success: true,
      count: rows.length,
      eligibility: rows,
    });
  } catch (error) {
    console.error("Get eligibility error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve eligibility rules",
      error: error.message,
    });
  }
};

// ============================================================
// GET /api/eligibility
// Get all eligibility rules (admin view)
// ============================================================
const getAllEligibility = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        er.id,
        er.staff_id,
        s.full_name,
        s.employee_id,
        d.department_name,
        er.card_type,
        er.monthly_quota,
        er.is_active,
        er.created_at
      FROM eligibility_rules er
      INNER JOIN staff s ON s.id = er.staff_id
      INNER JOIN departments d ON d.id = s.department_id
      ORDER BY s.full_name ASC, er.card_type ASC
    `);

    return res.json({
      success: true,
      count: rows.length,
      eligibility: rows,
    });
  } catch (error) {
    console.error("Get all eligibility error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve eligibility rules",
      error: error.message,
    });
  }
};

// ============================================================
// POST /api/eligibility
// Create or update eligibility rule for a staff member
// ============================================================
const createEligibility = async (req, res) => {
  try {
    const { staff_id, card_type, monthly_quota, is_active } = req.body;

    if (!staff_id || !card_type || monthly_quota === undefined) {
      return res.status(400).json({
        success: false,
        message: "staff_id, card_type, and monthly_quota are required",
      });
    }

    const allowedTypes = ["AIRTIME", "DATA", "SMS"];
    if (!allowedTypes.includes(String(card_type).toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: "card_type must be AIRTIME, DATA, or SMS",
      });
    }

    const quota = parseInt(monthly_quota, 10);
    if (isNaN(quota) || quota < 0) {
      return res.status(400).json({
        success: false,
        message: "monthly_quota must be a non-negative integer",
      });
    }

    // Check staff exists
    const [staffRows] = await db.query(
      "SELECT id FROM staff WHERE id = ?",
      [staff_id],
    );
    if (staffRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Staff member not found",
      });
    }

    // Check if rule already exists for this staff + card_type
    const [existing] = await db.query(
      "SELECT id FROM eligibility_rules WHERE staff_id = ? AND card_type = ?",
      [staff_id, card_type.toUpperCase()],
    );

    let ruleId;
    if (existing.length > 0) {
      // Update existing rule
      await db.query(
        `UPDATE eligibility_rules
         SET monthly_quota = ?, is_active = ?
         WHERE staff_id = ? AND card_type = ?`,
        [
          quota,
          is_active !== undefined ? Number(is_active) : 1,
          staff_id,
          card_type.toUpperCase(),
        ],
      );
      ruleId = existing[0].id;
    } else {
      // Create new rule
      const [result] = await db.query(
        `INSERT INTO eligibility_rules (staff_id, card_type, monthly_quota, is_active)
         VALUES (?, ?, ?, ?)`,
        [
          staff_id,
          card_type.toUpperCase(),
          quota,
          is_active !== undefined ? Number(is_active) : 1,
        ],
      );
      ruleId = result.insertId;
    }

    const [rule] = await db.query(
      `SELECT er.*, s.full_name, s.employee_id
       FROM eligibility_rules er
       INNER JOIN staff s ON s.id = er.staff_id
       WHERE er.id = ?`,
      [ruleId],
    );

    return res.status(201).json({
      success: true,
      message: existing.length > 0
        ? "Eligibility rule updated successfully"
        : "Eligibility rule created successfully",
      rule: rule[0],
    });
  } catch (error) {
    console.error("Create eligibility error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save eligibility rule",
      error: error.message,
    });
  }
};

// ============================================================
// DELETE /api/eligibility/:id
// Delete eligibility rule
// ============================================================
const deleteEligibility = async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await db.query(
      "SELECT id FROM eligibility_rules WHERE id = ?",
      [id],
    );
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Eligibility rule not found",
      });
    }

    await db.query("DELETE FROM eligibility_rules WHERE id = ?", [id]);

    return res.json({
      success: true,
      message: "Eligibility rule deleted successfully",
    });
  } catch (error) {
    console.error("Delete eligibility error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete eligibility rule",
      error: error.message,
    });
  }
};

module.exports = {
  getEligibility,
  getAllEligibility,
  createEligibility,
  deleteEligibility,
};
