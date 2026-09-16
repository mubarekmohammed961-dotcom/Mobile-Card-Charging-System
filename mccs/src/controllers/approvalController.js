const db = require("../config/db");
const { writeAuditLog } = require("../utils/auditLogger");
const { createNotification } = require("./notificationController");

// ============================================================
// GET /api/approvals/pending
// Department Head sees distributions pending their approval (BR-004)
// ============================================================
const getPendingApprovals = async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    console.log("[APPROVAL] getPendingApprovals called - userId:", userId, "role:", userRole);

    let sql = `
      SELECT
        d.id, d.distribution_uuid, d.month, d.total_cards, d.total_value,
        d.status, d.requires_approval, d.approval_status,
        d.created_at,
        dep.department_name, dep.department_code, dep.budget,
        initiator.full_name AS initiated_by_name,
        initiator.email    AS initiated_by_email,
        d.rejection_reason
      FROM distributions d
      INNER JOIN departments dep ON dep.id = d.department_id
      LEFT JOIN users initiator ON initiator.id = d.initiated_by
      WHERE d.requires_approval = 1
        AND d.approval_status = 'PENDING'
    `;
    const params = [];

    // Department Head only sees their own department
    if (userRole === "DEPARTMENT_HEAD") {
      // Find departments where this user is the head (via staff record or explicit link)
      console.log("[APPROVAL] Looking for department for user:", userId);
      const [staffRows] = await db.query(
        "SELECT department_id FROM staff WHERE email = (SELECT email FROM users WHERE id = ?) AND is_active = 1",
        [userId],
      );
      console.log("[APPROVAL] Staff rows found:", staffRows);
      if (staffRows.length === 0) {
        console.log("[APPROVAL] No staff record found - returning empty");
        return res.json({ success: true, count: 0, approvals: [] });
      }
      const deptId = staffRows[0].department_id;
      console.log("[APPROVAL] Department ID:", deptId);
      sql += " AND d.department_id = ?";
      params.push(deptId);
    }

    sql += " ORDER BY d.created_at DESC";

    console.log("[APPROVAL] Final SQL:", sql);
    console.log("[APPROVAL] Params:", params);
    const [rows] = await db.query(sql, params);
    console.log("[APPROVAL] Rows found:", rows.length);

    return res.json({ success: true, count: rows.length, approvals: rows });
  } catch (error) {
    console.error("Get pending approvals error:", error);
    return res.status(500).json({ success: false, message: "Failed to load approvals", error: error.message });
  }
};

// ============================================================
// GET /api/approvals/all
// All distributions requiring approval (with history)
// ============================================================
const getAllApprovals = async (req, res) => {
  try {
    const userId   = req.user?.id;
    const userRole = req.user?.role;

    console.log("[APPROVAL] getAllApprovals called - userId:", userId, "role:", userRole);

    let sql = `
      SELECT
        d.id, d.distribution_uuid, d.month, d.total_cards, d.total_value,
        d.status, d.requires_approval, d.approval_status,
        d.approved_at, d.rejection_reason, d.created_at,
        dep.department_name, dep.budget,
        initiator.full_name AS initiated_by_name,
        approver.full_name  AS approved_by_name
      FROM distributions d
      INNER JOIN departments dep ON dep.id = d.department_id
      LEFT JOIN users initiator ON initiator.id = d.initiated_by
      LEFT JOIN users approver  ON approver.id  = d.approved_by
      WHERE d.requires_approval = 1
    `;
    const params = [];

    if (userRole === "DEPARTMENT_HEAD") {
      console.log("[APPROVAL-ALL] Looking for department for user:", userId);
      const [staffRows] = await db.query(
        "SELECT department_id FROM staff WHERE email = (SELECT email FROM users WHERE id = ?) AND is_active = 1 LIMIT 1",
        [userId],
      );
      console.log("[APPROVAL-ALL] Staff rows found:", staffRows);
      if (staffRows.length > 0) {
        sql += " AND d.department_id = ?";
        params.push(staffRows[0].department_id);
        console.log("[APPROVAL-ALL] Filtering by department_id:", staffRows[0].department_id);
      }
    }

    sql += " ORDER BY d.created_at DESC";
    console.log("[APPROVAL-ALL] Final SQL:", sql);
    console.log("[APPROVAL-ALL] Params:", params);
    const [rows] = await db.query(sql, params);
    console.log("[APPROVAL-ALL] Rows found:", rows.length);

    return res.json({ success: true, count: rows.length, approvals: rows });
  } catch (error) {
    console.error("[APPROVAL-ALL] Error:", error);
    return res.status(500).json({ success: false, message: "Failed", error: error.message });
  }
};

// ============================================================
// POST /api/approvals/:id/approve
// Department Head approves a distribution (BR-004, US-02)
// ============================================================
const approveDistribution = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { id } = req.params;
    const userId   = req.user?.id;
    const userRole = req.user?.role;

    await connection.beginTransaction();

    // Get distribution
    const [rows] = await connection.query(
      `SELECT d.*, dep.budget, dep.department_name, dep.id AS dept_id
       FROM distributions d
       INNER JOIN departments dep ON dep.id = d.department_id
       WHERE d.id = ? FOR UPDATE`,
      [id],
    );
    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: "Distribution not found" });
    }

    const dist = rows[0];

    if (dist.approval_status !== "PENDING") {
      await connection.rollback();
      return res.status(409).json({ success: false, message: `Distribution already ${dist.approval_status}` });
    }

    // Dept Head can only approve their own department
    if (userRole === "DEPARTMENT_HEAD") {
      const [staffRows] = await connection.query(
        "SELECT department_id FROM staff WHERE email = (SELECT email FROM users WHERE id = ?) AND is_active = 1 LIMIT 1",
        [userId],
      );
      if (staffRows.length === 0 || Number(staffRows[0].department_id) !== Number(dist.department_id)) {
        await connection.rollback();
        return res.status(403).json({ success: false, message: "You can only approve distributions for your own department" });
      }
    }

    // Approve
    await connection.query(
      `UPDATE distributions SET
        approval_status = 'APPROVED', approved_by = ?, approved_at = NOW(), status = 'CONFIRMED'
       WHERE id = ?`,
      [userId, id],
    );

    await writeAuditLog({
      userId,
      action: "UPDATE",
      cardId: null,
      details: {
        message: `Distribution #${id} approved by ${req.user?.email}`,
        distribution_id: id,
        department: dist.department_name,
        total_value: dist.total_value,
      },
      ip: req.ip || null,
      connection,
    });

    // Notify initiator
    if (dist.initiated_by) {
      await createNotification({
        userId: dist.initiated_by,
        type: "DISTRIBUTION",
        title: "✅ Distribution Budget Approved",
        message: `Your ${dist.department_name} distribution of ${Number(dist.total_value).toFixed(2)} ETB has been approved by the Department Head.`,
        link: "/allocations",
      });
    }

    // Notify all admins
    const [admins] = await connection.query(
      "SELECT id FROM users WHERE role IN ('SUPER_ADMIN','SYSTEM_ADMIN') AND status='ACTIVE'",
    );
    for (const admin of admins) {
      await createNotification({
        userId: admin.id,
        type: "DISTRIBUTION",
        title: "✅ Budget Approved — Ready to Send",
        message: `${dist.department_name} distribution #${id} (${Number(dist.total_value).toFixed(2)} ETB) has been approved.`,
        link: "/allocations",
      });
    }

    await connection.commit();

    return res.json({
      success: true,
      message: `Distribution #${id} approved successfully`,
      distribution: { id: Number(id), approval_status: "APPROVED", status: "CONFIRMED" },
    });
  } catch (error) {
    try { await connection.rollback(); } catch (_) {}
    console.error("Approve error:", error);
    return res.status(500).json({ success: false, message: "Approval failed", error: error.message });
  } finally {
    connection.release();
  }
};

// ============================================================
// POST /api/approvals/:id/reject
// Department Head rejects a distribution
// ============================================================
const rejectDistribution = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId   = req.user?.id;
    const userRole = req.user?.role;

    await connection.beginTransaction();

    const [rows] = await connection.query(
      "SELECT * FROM distributions WHERE id = ? FOR UPDATE", [id],
    );
    if (rows.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: "Not found" });
    }
    const dist = rows[0];

    if (dist.approval_status !== "PENDING") {
      await connection.rollback();
      return res.status(409).json({ success: false, message: `Already ${dist.approval_status}` });
    }

    // Dept Head only their dept
    if (userRole === "DEPARTMENT_HEAD") {
      const [staffRows] = await connection.query(
        "SELECT department_id FROM staff WHERE email = (SELECT email FROM users WHERE id = ?) AND is_active = 1 LIMIT 1",
        [userId],
      );
      if (staffRows.length === 0 || Number(staffRows[0].department_id) !== Number(dist.department_id)) {
        await connection.rollback();
        return res.status(403).json({ success: false, message: "Not your department" });
      }
    }

    // Revert cards to AVAILABLE
    await connection.query(
      `UPDATE cards c
       INNER JOIN distribution_items di ON di.card_id = c.id
       SET c.status = 'AVAILABLE'
       WHERE di.distribution_id = ? AND c.status = 'ALLOCATED'`,
      [id],
    );

    await connection.query(
      `UPDATE distributions SET
        approval_status = 'REJECTED', approved_by = ?, approved_at = NOW(),
        status = 'DRAFT', rejection_reason = ?
       WHERE id = ?`,
      [userId, reason || "Rejected by Department Head", id],
    );

    await writeAuditLog({
      userId, action: "UPDATE", cardId: null,
      details: { message: `Distribution #${id} rejected. Reason: ${reason}` },
      ip: req.ip || null, connection,
    });

    // Notify initiator
    if (dist.initiated_by) {
      await createNotification({
        userId: dist.initiated_by,
        type: "DISTRIBUTION",
        title: "❌ Distribution Budget Rejected",
        message: `Your distribution #${id} was rejected. Reason: ${reason || "Budget not approved by Department Head."}`,
        link: "/allocations",
      });
    }

    await connection.commit();
    return res.json({ success: true, message: `Distribution #${id} rejected`, distribution: { id: Number(id), approval_status: "REJECTED", status: "DRAFT" } });
  } catch (error) {
    try { await connection.rollback(); } catch (_) {}
    return res.status(500).json({ success: false, message: "Rejection failed", error: error.message });
  } finally {
    connection.release();
  }
};

module.exports = { getPendingApprovals, getAllApprovals, approveDistribution, rejectDistribution };
