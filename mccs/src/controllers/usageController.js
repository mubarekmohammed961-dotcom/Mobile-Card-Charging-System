const db = require("../config/db");
const { writeAuditLog } = require("../utils/auditLogger");

// ============================================================
// POST /api/usage
// Mark an allocated card as USED
// ============================================================
const markCardAsUsed = async (req, res) => {
  let connection;

  try {
    const { card_id, staff_id, remarks } = req.body;

    // ----------------------------------------------------------
    // Validate input
    // ----------------------------------------------------------
    if (!card_id) {
      return res.status(400).json({
        success: false,
        message: "card_id is required",
      });
    }

    if (!staff_id) {
      return res.status(400).json({
        success: false,
        message: "staff_id is required",
      });
    }

    connection = await db.getConnection();

    await connection.beginTransaction();

    // ----------------------------------------------------------
    // Check staff
    // ----------------------------------------------------------
    const [staffRows] = await connection.query(
      `
      SELECT
        id,
        employee_id,
        full_name,
        is_active
      FROM staff
      WHERE id = ?
      FOR UPDATE
      `,
      [staff_id],
    );

    if (staffRows.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        success: false,
        message: "Staff member not found",
      });
    }

    if (staffRows[0].is_active !== 1) {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        message: "Staff member is inactive",
      });
    }

    // ----------------------------------------------------------
    // Find and lock card
    // ----------------------------------------------------------
    const [cards] = await connection.query(
      `
      SELECT
        id,
        card_uuid,
        provider,
        type,
        value,
        status
      FROM cards
      WHERE id = ?
      FOR UPDATE
      `,
      [card_id],
    );

    if (cards.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        success: false,
        message: "Card not found",
      });
    }

    const card = cards[0];

    // ----------------------------------------------------------
    // Card must be ALLOCATED
    // ----------------------------------------------------------
    if (card.status !== "ALLOCATED") {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        message: "Only an ALLOCATED card can be marked as USED",
        current_status: card.status,
      });
    }

    // ----------------------------------------------------------
    // Verify card is allocated to this staff member
    // ----------------------------------------------------------
    const [allocationRows] = await connection.query(
      `
      SELECT
        id,
        distribution_id,
        staff_id
      FROM distribution_items
      WHERE card_id = ?
        AND staff_id = ?
      ORDER BY id DESC
      LIMIT 1
      FOR UPDATE
      `,
      [card_id, staff_id],
    );

    if (allocationRows.length === 0) {
      await connection.rollback();

      return res.status(403).json({
        success: false,
        message: "This card is not allocated to this staff member",
      });
    }

    // ----------------------------------------------------------
    // Check existing usage
    // ----------------------------------------------------------
    const [existingUsage] = await connection.query(
      `
      SELECT
        id,
        marked_used_at,
        remarks
      FROM usage_logs
      WHERE card_id = ?
      LIMIT 1
      `,
      [card_id],
    );

    if (existingUsage.length > 0) {
      await connection.rollback();

      return res.status(409).json({
        success: false,
        message: "Card usage has already been recorded",
        usage_log_id: existingUsage[0].id,
      });
    }

    // ----------------------------------------------------------
    // Create usage log
    // ----------------------------------------------------------
    const [usageResult] = await connection.query(
      `
      INSERT INTO usage_logs
      (
        card_id,
        staff_id,
        remarks
      )
      VALUES (?, ?, ?)
      `,
      [card_id, staff_id, remarks || null],
    );

    // ----------------------------------------------------------
    // Change card status to USED
    // ----------------------------------------------------------
    await connection.query(
      `
      UPDATE cards
      SET status = 'USED'
      WHERE id = ?
      `,
      [card_id],
    );
    await writeAuditLog({
      userId: req.user.id,
      action: "USE",
      cardId: card_id,
      details: {
        staff_id: staff_id,
        usage_log_id: usageResult.insertId,
        remarks: remarks || null,
        message: "Card marked as USED",
      },
      ip: req.ip || null,
      connection,
    });

    // ----------------------------------------------------------
    // Commit transaction
    // ----------------------------------------------------------
    await connection.commit();

    return res.status(201).json({
      success: true,
      message: "Card marked as USED successfully",
      usage: {
        id: usageResult.insertId,
        card_id: card.id,
        card_uuid: card.card_uuid,
        staff_id: Number(staff_id),
        staff_name: staffRows[0].full_name,
        provider: card.provider,
        type: card.type,
        value: card.value,
        status: "USED",
        remarks: remarks || null,
      },
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Rollback error:", rollbackError.message);
      }
    }

    console.error("Mark card as used error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to mark card as USED",
      error: error.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// ============================================================
// GET /api/usage
// Get usage history
// ============================================================
const getUsageLogs = async (req, res) => {
  try {
    const [rows] = await db.query(
      `
      SELECT
        ul.id,
        ul.card_id,
        ul.staff_id,
        ul.marked_used_at,
        ul.remarks,

        c.card_uuid,
        c.provider,
        c.type,
        c.value,
        c.status,

        s.employee_id,
        s.full_name AS staff_name

      FROM usage_logs ul

      INNER JOIN cards c
        ON c.id = ul.card_id

      INNER JOIN staff s
        ON s.id = ul.staff_id

      ORDER BY ul.marked_used_at DESC
      `,
    );

    return res.json({
      success: true,
      count: rows.length,
      usage_logs: rows,
    });
  } catch (error) {
    console.error("Get usage logs error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve usage logs",
      error: error.message,
    });
  }
};
// ============================================================
// GET /api/usage/allocated-cards
// Get allocated cards with their assigned staff
// ============================================================
const getAllocatedCards = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        c.id AS card_id,
        c.card_uuid,
        c.provider,
        c.type,
        c.value,
        c.status,

        di.staff_id,

        s.employee_id,
        s.full_name AS staff_name

      FROM cards c

      INNER JOIN distribution_items di
        ON di.card_id = c.id

      INNER JOIN staff s
        ON s.id = di.staff_id

      WHERE c.status = 'ALLOCATED'
        AND s.is_active = 1

      ORDER BY s.full_name ASC, c.id DESC
    `);

    return res.json({
      success: true,
      count: rows.length,
      allocated_cards: rows,
    });
  } catch (error) {
    console.error(
      "Get allocated cards error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve allocated cards",
      error: error.message,
    });
  }
};


// ============================================================
// EXPORT
// ============================================================
module.exports = {
  markCardAsUsed,
  getUsageLogs,
  getAllocatedCards,
};