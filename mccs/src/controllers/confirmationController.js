const db = require("../config/db");
const { writeAuditLog } = require("../utils/auditLogger");

// ============================================================
// POST /api/confirmations
// Confirm a delivery using the confirmation token
// ============================================================
const confirmDelivery = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { token } = req.body;
    const confirmedBy = req.user?.id;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Confirmation token is required",
      });
    }

    if (!confirmedBy) {
      return res.status(401).json({
        success: false,
        message: "Authenticated user not found",
      });
    }

    await connection.beginTransaction();

    // ----------------------------------------------------------
    // Find delivery using token
    // ----------------------------------------------------------
    const [deliveries] = await connection.query(
      `
      SELECT
        id,
        distribution_item_id,
        token_expiry,
        status
      FROM deliveries
      WHERE confirmation_token = ?
      FOR UPDATE
      `,
      [token],
    );

    if (deliveries.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        success: false,
        message: "Invalid confirmation token",
      });
    }

    const delivery = deliveries[0];

    // ----------------------------------------------------------
    // Already confirmed
    // ----------------------------------------------------------
    if (delivery.status === "CONFIRMED") {
      await connection.rollback();

      return res.status(409).json({
        success: false,
        message: "Delivery is already confirmed",
      });
    }

    // ----------------------------------------------------------
    // Check expired token
    // ----------------------------------------------------------
    if (delivery.token_expiry && new Date(delivery.token_expiry) < new Date()) {
      await connection.query(
        `
        UPDATE deliveries
        SET status = 'EXPIRED'
        WHERE id = ?
        `,
        [delivery.id],
      );

      await connection.commit();

      return res.status(410).json({
        success: false,
        message: "Confirmation token has expired",
      });
    }

    // ----------------------------------------------------------
    // Create confirmation record
    // ----------------------------------------------------------
    await connection.query(
      `
      INSERT INTO confirmations
      (
        delivery_id,
        confirmed_by,
        ip_address,
        user_agent
      )
      VALUES (?, ?, ?, ?)
      `,
      [delivery.id, confirmedBy, req.ip || null, req.get("user-agent") || null],
    );

    // ----------------------------------------------------------
    // Update delivery status
    // ----------------------------------------------------------
    await connection.query(
      `
      UPDATE deliveries
      SET status = 'CONFIRMED'
      WHERE id = ?
      `,
      [delivery.id],
    );
    await writeAuditLog({
      userId: confirmedBy,
      action: "CONFIRM",
      cardId: null,
      details: {
        delivery_id: delivery.id,
        distribution_item_id: delivery.distribution_item_id,
        message: "Delivery confirmed successfully",
      },
      ip: req.ip || null,
      connection,
    });

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Delivery confirmed successfully",
      delivery: {
        id: delivery.id,
        distribution_item_id: delivery.distribution_item_id,
        status: "CONFIRMED",
        confirmed_by: confirmedBy,
      },
    });
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      console.error("Rollback error:", rollbackError.message);
    }

    console.error("Confirm delivery error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to confirm delivery",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

module.exports = {
  confirmDelivery,
};
