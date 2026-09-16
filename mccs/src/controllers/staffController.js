const db = require("../config/db");
const fs = require("fs");
const csv = require("csv-parser");

const getStaff = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        s.id,
        s.employee_id,
        s.full_name,
        s.department_id,
        d.department_name,
        s.designation,
        s.email,
        s.phone,
        s.is_active,
        s.created_at,
        s.updated_at
      FROM staff s
      INNER JOIN departments d
        ON d.id = s.department_id
      ORDER BY s.full_name ASC
    `);

    return res.json({
      success: true,
      count: rows.length,
      staff: rows,
    });
  } catch (error) {
    console.error("Get staff error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve staff",
      error: error.message,
    });
  }
};

// ============================================================
// GET /api/staff/:id
// Get one staff member
// ============================================================
const getStaffById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.query(
      `
      SELECT
        s.id,
        s.employee_id,
        s.full_name,
        s.department_id,
        d.department_name,
        s.designation,
        s.email,
        s.phone,
        s.is_active,
        s.created_at,
        s.updated_at
      FROM staff s
      INNER JOIN departments d
        ON d.id = s.department_id
      WHERE s.id = ?
      `,
      [id],
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Staff member not found",
      });
    }

    return res.json({
      success: true,
      staff: rows[0],
    });
  } catch (error) {
    console.error("Get staff error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve staff member",
      error: error.message,
    });
  }
};

// ============================================================
// POST /api/staff
// Create staff member
// ============================================================
const createStaff = async (req, res) => {
  try {
    const {
      employee_id,
      full_name,
      department_id,
      designation,
      email,
      phone,
      is_active,
    } = req.body;

    if (
      !employee_id ||
      !full_name ||
      !department_id ||
      !designation ||
      !email
    ) {
      return res.status(400).json({
        success: false,
        message:
          "employee_id, full_name, department_id, designation, and email are required",
      });
    }

    // Section 16: Email format validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ success: false, message: "Invalid email format" });
    }

    const active =
      is_active === undefined ? 1 : Number(is_active);

    if (![0, 1].includes(active)) {
      return res.status(400).json({
        success: false,
        message: "is_active must be 0 or 1",
      });
    }

    // Check department
    const [departments] = await db.query(
      `
      SELECT id
      FROM departments
      WHERE id = ?
        AND status = 'ACTIVE'
      `,
      [department_id],
    );

    if (departments.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Department not found or inactive",
      });
    }

    const [result] = await db.query(
      `
      INSERT INTO staff
      (
        employee_id,
        full_name,
        department_id,
        designation,
        email,
        phone,
        is_active
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        employee_id.trim(),
        full_name.trim(),
        department_id,
        designation.trim(),
        email.trim(),
        phone?.trim() || null,
        active,
      ],
    );

    const [created] = await db.query(
      `
      SELECT
        s.id,
        s.employee_id,
        s.full_name,
        s.department_id,
        d.department_name,
        s.designation,
        s.email,
        s.phone,
        s.is_active,
        s.created_at,
        s.updated_at
      FROM staff s
      INNER JOIN departments d
        ON d.id = s.department_id
      WHERE s.id = ?
      `,
      [result.insertId],
    );

    return res.status(201).json({
      success: true,
      message: "Staff member created successfully",
      staff: created[0],
    });
  } catch (error) {
    console.error("Create staff error:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "Employee ID or email already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create staff member",
      error: error.message,
    });
  }
};

// ============================================================
// PUT /api/staff/:id
// Update staff member
// ============================================================
const updateStaff = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      employee_id,
      full_name,
      department_id,
      designation,
      email,
      phone,
      is_active,
    } = req.body;

    const [existing] = await db.query(
      `
      SELECT id
      FROM staff
      WHERE id = ?
      `,
      [id],
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Staff member not found",
      });
    }

    if (department_id !== undefined) {
      const [departments] = await db.query(
        `
        SELECT id
        FROM departments
        WHERE id = ?
          AND status = 'ACTIVE'
        `,
        [department_id],
      );

      if (departments.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Department not found or inactive",
        });
      }
    }

    if (
      is_active !== undefined &&
      ![0, 1].includes(Number(is_active))
    ) {
      return res.status(400).json({
        success: false,
        message: "is_active must be 0 or 1",
      });
    }

    await db.query(
      `
      UPDATE staff
      SET
        employee_id = COALESCE(?, employee_id),
        full_name = COALESCE(?, full_name),
        department_id = COALESCE(?, department_id),
        designation = COALESCE(?, designation),
        email = COALESCE(?, email),
        phone = COALESCE(?, phone),
        is_active = COALESCE(?, is_active)
      WHERE id = ?
      `,
      [
        employee_id?.trim() || null,
        full_name?.trim() || null,
        department_id ?? null,
        designation?.trim() || null,
        email?.trim() || null,
        phone?.trim() || null,
        is_active === undefined ? null : Number(is_active),
        id,
      ],
    );

    const [updated] = await db.query(
      `
      SELECT
        s.id,
        s.employee_id,
        s.full_name,
        s.department_id,
        d.department_name,
        s.designation,
        s.email,
        s.phone,
        s.is_active,
        s.created_at,
        s.updated_at
      FROM staff s
      INNER JOIN departments d
        ON d.id = s.department_id
      WHERE s.id = ?
      `,
      [id],
    );

    return res.json({
      success: true,
      message: "Staff member updated successfully",
      staff: updated[0],
    });
  } catch (error) {
    console.error("Update staff error:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "Employee ID or email already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update staff member",
      error: error.message,
    });
  }
};

module.exports = {
  getStaff,
  getStaffById,
  createStaff,
  updateStaff,
  bulkUploadStaff,
};

// ============================================================
// POST /api/staff/bulk-upload
// FR-012: Bulk staff + eligibility upload via CSV
// CSV headers: EmployeeID, FullName, Department, Designation, Email, Phone, CardType, MonthlyQuota
// ============================================================
async function bulkUploadStaff(req, res) {
  if (!req.file) return res.status(400).json({ success: false, message: "CSV file required" });

  const rows = [];
  try {
    await new Promise((resolve, reject) => {
      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on("data", r => rows.push(r))
        .on("end", resolve)
        .on("error", reject);
    });
  } catch (e) {
    fs.unlink(req.file.path, () => {});
    return res.status(400).json({ success: false, message: "Failed to read CSV: " + e.message });
  }
  fs.unlink(req.file.path, () => {});

  if (rows.length === 0) return res.status(400).json({ success: false, message: "CSV is empty" });

  let imported = 0, failed = 0;
  const errors = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const employee_id   = row.EmployeeID?.trim();
      const full_name     = row.FullName?.trim();
      const dept_name     = row.Department?.trim();
      const designation   = row.Designation?.trim() || "Staff";
      const email         = row.Email?.trim().toLowerCase();
      const phone         = row.Phone?.trim() || null;
      const card_type     = (row.CardType?.trim() || "AIRTIME").toUpperCase();
      const monthly_quota = parseInt(row.MonthlyQuota || "1", 10);

      if (!employee_id || !full_name || !dept_name || !email) throw new Error("Missing required field");
      if (!["AIRTIME","DATA","SMS"].includes(card_type)) throw new Error("Invalid CardType");

      // Find or skip department
      const [depts] = await db.query("SELECT id FROM departments WHERE department_name = ? AND status = 'ACTIVE' LIMIT 1", [dept_name]);
      if (depts.length === 0) throw new Error(`Department '${dept_name}' not found`);
      const dept_id = depts[0].id;

      // Upsert staff
      const [existing] = await db.query("SELECT id FROM staff WHERE employee_id = ?", [employee_id]);
      let staffId;
      if (existing.length > 0) {
        staffId = existing[0].id;
        await db.query("UPDATE staff SET full_name=?,department_id=?,designation=?,email=?,phone=?,is_active=1 WHERE id=?",
          [full_name, dept_id, designation, email, phone, staffId]);
      } else {
        const [r] = await db.query("INSERT INTO staff (employee_id,full_name,department_id,designation,email,phone,is_active) VALUES (?,?,?,?,?,?,1)",
          [employee_id, full_name, dept_id, designation, email, phone]);
        staffId = r.insertId;
      }

      // Upsert eligibility rule
      await db.query(
        `INSERT INTO eligibility_rules (staff_id, card_type, monthly_quota, is_active) VALUES (?,?,?,1)
         ON DUPLICATE KEY UPDATE monthly_quota=VALUES(monthly_quota), is_active=1`,
        [staffId, card_type, monthly_quota],
      );

      imported++;
    } catch (e) {
      failed++;
      errors.push({ row: i + 2, message: e.message });
    }
  }

  return res.json({ success: true, message: "Bulk upload complete", total: rows.length, imported, failed, errors });
}