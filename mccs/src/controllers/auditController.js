const db = require("../config/db");

// ============================================================
// POST /api/audit-logs
// Create an audit log
// ============================================================
const createAuditLog = async (req, res) => {
  try {
    const userId = req.user?.id;

    const { action, card_id, details } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authenticated user not found",
      });
    }

    const allowedActions = [
      "UPLOAD",
      "ALLOCATE",
      "SEND",
      "CONFIRM",
      "USE",
      "EXPIRE",
      "LOGIN",
      "LOGOUT",
      "DELETE",
      "UPDATE",
    ];

    if (!allowedActions.includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Invalid audit action",
      });
    }

    const [result] = await db.query(
      `
      INSERT INTO audit_logs
      (
        user_id,
        action,
        card_id,
        details,
        ip
      )
      VALUES (?, ?, ?, ?, ?)
      `,
      [
        userId,
        action,
        card_id || null,
        details
          ? typeof details === "string"
            ? details
            : JSON.stringify(details)
          : null,
        req.ip || null,
      ],
    );

    return res.status(201).json({
      success: true,
      message: "Audit log created successfully",
      audit_log_id: result.insertId,
    });
  } catch (error) {
    console.error("Create audit log error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create audit log",
      error: error.message,
    });
  }
};

// ============================================================
// GET /api/audit-logs
// List audit logs
// ============================================================
const getAuditLogs = async (req, res) => {
  try {
    const [rows] = await db.query(
      `
      SELECT
        al.id,
        al.user_id,
        u.full_name AS user_name,
        u.email,
        al.action,
        al.card_id,
        al.details,
        al.ip,
        al.created_at
      FROM audit_logs al
      LEFT JOIN users u
        ON u.id = al.user_id
      ORDER BY al.created_at DESC
      `,
    );

    return res.json({
      success: true,
      count: rows.length,
      audit_logs: rows,
    });
  } catch (error) {
    console.error("Get audit logs error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve audit logs",
      error: error.message,
    });
  }
};

module.exports = {
  createAuditLog,
  getAuditLogs,
};
