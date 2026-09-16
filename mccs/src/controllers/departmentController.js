const db = require("../config/db");

// ============================================================
// GET /api/departments
// Get all departments
// ============================================================
const getDepartments = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        id,
        department_name,
        department_code,
        budget,
        description,
        status,
        created_at,
        updated_at
      FROM departments
      ORDER BY department_name ASC
    `);

    return res.json({
      success: true,
      count: rows.length,
      departments: rows,
    });
  } catch (error) {
    console.error("Get departments error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve departments",
      error: error.message,
    });
  }
};

// ============================================================
// GET /api/departments/:id
// Get one department
// ============================================================
const getDepartmentById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.query(
      `
      SELECT
        id,
        department_name,
        department_code,
        budget,
        description,
        status,
        created_at,
        updated_at
      FROM departments
      WHERE id = ?
      `,
      [id],
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    return res.json({
      success: true,
      department: rows[0],
    });
  } catch (error) {
    console.error("Get department error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve department",
      error: error.message,
    });
  }
};

// ============================================================
// POST /api/departments
// Create department
// ============================================================
const createDepartment = async (req, res) => {
  try {
    const {
      department_name,
      department_code,
      budget,
      description,
      status,
    } = req.body;

    if (!department_name || !department_code) {
      return res.status(400).json({
        success: false,
        message:
          "department_name and department_code are required",
      });
    }

    const departmentStatus = status || "ACTIVE";
    const departmentBudget =
      budget === undefined || budget === null || budget === ""
        ? 0
        : Number(budget);

    if (!["ACTIVE", "INACTIVE"].includes(departmentStatus)) {
      return res.status(400).json({
        success: false,
        message: "status must be ACTIVE or INACTIVE",
      });
    }

    if (Number.isNaN(departmentBudget) || departmentBudget < 0) {
      return res.status(400).json({
        success: false,
        message: "budget must be a valid non-negative number",
      });
    }

    const [result] = await db.query(
      `
      INSERT INTO departments
      (
        department_name,
        department_code,
        budget,
        description,
        status
      )
      VALUES (?, ?, ?, ?, ?)
      `,
      [
        department_name.trim(),
        department_code.trim(),
        departmentBudget,
        description?.trim() || null,
        departmentStatus,
      ],
    );

    return res.status(201).json({
      success: true,
      message: "Department created successfully",
      department: {
        id: result.insertId,
        department_name: department_name.trim(),
        department_code: department_code.trim(),
        budget: departmentBudget,
        description: description?.trim() || null,
        status: departmentStatus,
      },
    });
  } catch (error) {
    console.error("Create department error:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message:
          "Department name or department code already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create department",
      error: error.message,
    });
  }
};

// ============================================================
// PUT /api/departments/:id
// Update department
// ============================================================
const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      department_name,
      department_code,
      budget,
      description,
      status,
    } = req.body;

    const [existing] = await db.query(
      `
      SELECT id
      FROM departments
      WHERE id = ?
      `,
      [id],
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    if (status && !["ACTIVE", "INACTIVE"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "status must be ACTIVE or INACTIVE",
      });
    }

    const numericBudget =
      budget === undefined || budget === null || budget === ""
        ? null
        : Number(budget);

    if (
      numericBudget !== null &&
      (Number.isNaN(numericBudget) || numericBudget < 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "budget must be a valid non-negative number",
      });
    }

    await db.query(
      `
      UPDATE departments
      SET
        department_name = COALESCE(?, department_name),
        department_code = COALESCE(?, department_code),
        budget = COALESCE(?, budget),
        description = COALESCE(?, description),
        status = COALESCE(?, status)
      WHERE id = ?
      `,
      [
        department_name?.trim() || null,
        department_code?.trim() || null,
        numericBudget,
        description?.trim() || null,
        status || null,
        id,
      ],
    );

    const [updated] = await db.query(
      `
      SELECT
        id,
        department_name,
        department_code,
        budget,
        description,
        status,
        created_at,
        updated_at
      FROM departments
      WHERE id = ?
      `,
      [id],
    );

    return res.json({
      success: true,
      message: "Department updated successfully",
      department: updated[0],
    });
  } catch (error) {
    console.error("Update department error:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message:
          "Department name or department code already exists",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update department",
      error: error.message,
    });
  }
};

module.exports = {
  getDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
};