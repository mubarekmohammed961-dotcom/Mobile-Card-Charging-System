const db = require("../config/db");
const crypto = require("crypto");
const { writeAuditLog } = require("../utils/auditLogger");
const { sendCardDeliveryEmail, generateQRCode } = require("../services/emailService");
const { createNotification } = require("./notificationController");

// ============================================================
// POST /api/deliveries
// Create a delivery for an allocated distribution item
// ============================================================
const createDelivery = async (req, res) => {
  try {
    const { distribution_item_id, delivery_method } = req.body;

    // ----------------------------------------------------------
    // Validate input
    // ----------------------------------------------------------
    if (!distribution_item_id) {
      return res.status(400).json({
        success: false,
        message: "distribution_item_id is required",
      });
    }

    if (!["EMAIL", "SMS"].includes(delivery_method)) {
      return res.status(400).json({
        success: false,
        message: "delivery_method must be EMAIL or SMS",
      });
    }

    // ----------------------------------------------------------
    // Check distribution item and staff/card
    // ----------------------------------------------------------
    const [items] = await db.query(
      `
      SELECT
        di.id,
        di.card_id,
        di.staff_id,
        c.status AS card_status,
        s.full_name,
        s.email,
        s.phone
      FROM distribution_items di
      INNER JOIN cards c
        ON c.id = di.card_id
      INNER JOIN staff s
        ON s.id = di.staff_id
      WHERE di.id = ?
      `,
      [distribution_item_id],
    );

    if (items.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Distribution item not found",
      });
    }

    const item = items[0];

    // ----------------------------------------------------------
    // Card must already be allocated
    // ----------------------------------------------------------
    if (item.card_status !== "ALLOCATED") {
      return res.status(400).json({
        success: false,
        message: "Card is not allocated",
      });
    }

    // ----------------------------------------------------------
    // Prevent duplicate active delivery
    // ----------------------------------------------------------
    const [existing] = await db.query(
      `
      SELECT
        id,
        status
      FROM deliveries
      WHERE distribution_item_id = ?
        AND status IN ('PENDING', 'SENT', 'DELIVERED')
      LIMIT 1
      `,
      [distribution_item_id],
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: "An active delivery already exists for this item",
        delivery_id: existing[0].id,
        status: existing[0].status,
      });
    }

    // ----------------------------------------------------------
    // Generate secure confirmation token
    // ----------------------------------------------------------
    const confirmationToken = crypto.randomBytes(32).toString("hex");

    // Token valid for 24 hours
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // ----------------------------------------------------------
    // Create delivery
    // ----------------------------------------------------------
    const [result] = await db.query(
      `
      INSERT INTO deliveries
      (
        distribution_item_id,
        delivery_method,
        confirmation_token,
        token_expiry,
        status
      )
      VALUES (?, ?, ?, ?, 'PENDING')
      `,
      [distribution_item_id, delivery_method, confirmationToken, tokenExpiry],
    );

    return res.status(201).json({
      success: true,
      message: "Delivery created successfully",
      delivery: {
        id: result.insertId,
        distribution_item_id,
        delivery_method,
        status: "PENDING",
        token_expiry: tokenExpiry,
        recipient: {
          staff_id: item.staff_id,
          name: item.full_name,
          email: item.email,
          phone: item.phone,
        },
      },
    });
  } catch (error) {
    console.error("Create delivery error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create delivery",
      error: error.message,
    });
  }
};

// ============================================================
// POST /api/deliveries/:id/send
// Mark a pending delivery as SENT
// ============================================================
const sendDelivery = async (req, res) => {
  let connection;

  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // ----------------------------------------------------------
    // Validate authenticated user
    // ----------------------------------------------------------
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authenticated user not found",
      });
    }

    connection = await db.getConnection();

    await connection.beginTransaction();

    // ----------------------------------------------------------
    // Find and lock delivery
    // ----------------------------------------------------------
    const [deliveries] = await connection.query(
      `
      SELECT
        d.id,
        d.distribution_item_id,
        d.delivery_method,
        d.confirmation_token,
        d.token_expiry,
        d.status,

        di.card_id,
        di.staff_id,

        s.full_name,
        s.email,
        s.phone

      FROM deliveries d

      INNER JOIN distribution_items di
        ON di.id = d.distribution_item_id

      INNER JOIN staff s
        ON s.id = di.staff_id

      WHERE d.id = ?

      FOR UPDATE
      `,
      [id],
    );

    if (deliveries.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        success: false,
        message: "Delivery not found",
      });
    }

    const delivery = deliveries[0];

    // ----------------------------------------------------------
    // Only PENDING deliveries can be sent
    // ----------------------------------------------------------
    if (delivery.status !== "PENDING") {
      await connection.rollback();

      return res.status(409).json({
        success: false,
        message: "Only PENDING deliveries can be sent",
        current_status: delivery.status,
      });
    }

    // ----------------------------------------------------------
    // Check confirmation token expiry
    // ----------------------------------------------------------
    if (
      delivery.token_expiry &&
      new Date(delivery.token_expiry).getTime() < Date.now()
    ) {
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
        message: "Delivery confirmation token has expired",
      });
    }

    // ----------------------------------------------------------
    // Update delivery status to SENT
    // ----------------------------------------------------------
    await connection.query(
      `
      UPDATE deliveries
      SET
        status = 'SENT',
        sent_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [delivery.id],
    );

    // ----------------------------------------------------------
    // Automatic audit log
    // ----------------------------------------------------------
    await writeAuditLog({
      userId,
      action: "SEND",
      cardId: delivery.card_id,
      details: {
        delivery_id: delivery.id,
        distribution_item_id: delivery.distribution_item_id,
        staff_id: delivery.staff_id,
        delivery_method: delivery.delivery_method,
        message: "Delivery marked as SENT",
      },
      ip: req.ip || null,
      connection,
    });

    // ----------------------------------------------------------
    // Commit transaction
    // ----------------------------------------------------------
    await connection.commit();

    // ----------------------------------------------------------
    // Send email notification (non-blocking)
    // FR-024: Send email with PIN and confirmation link
    // ----------------------------------------------------------
    if (delivery.delivery_method === "EMAIL" && delivery.email) {
      // Fetch card PIN details for email
      try {
        const [cardRows] = await db.query(
          `SELECT c.provider, c.type, c.value, c.expiry_date,
                  c.pin_encrypted, c.pin_iv, c.pin_auth_tag,
                  d.month
           FROM distribution_items di
           INNER JOIN cards c ON c.id = di.card_id
           INNER JOIN distributions d ON d.id = di.distribution_id
           WHERE di.id = ?`,
          [delivery.distribution_item_id],
        );

        if (cardRows.length > 0) {
          const card = cardRows[0];
          sendCardDeliveryEmail({
            toEmail: delivery.email,
            toName: delivery.full_name,
            card,
            confirmationToken: delivery.confirmation_token,
            month: card.month
              ? new Date(card.month).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                })
              : null,
          }).then(async ({ qrDataUrl }) => {
            // Store QR code in DB
            if (qrDataUrl) {
              try {
                await db.query(
                  `INSERT INTO qr_codes (delivery_id, qr_data, qr_image_base64)
                   VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE qr_image_base64 = VALUES(qr_image_base64)`,
                  [delivery.id, `${process.env.FRONTEND_URL || "http://localhost:5173"}/confirm?token=${delivery.confirmation_token}`, qrDataUrl],
                );
              } catch (qrErr) {
                console.error("QR save error:", qrErr.message);
              }
            }
            // Create in-app notification for the staff user
            try {
              // Find user by staff email
              const [userRows] = await db.query(
                "SELECT id FROM users WHERE email = ? LIMIT 1",
                [delivery.email],
              );
              if (userRows.length > 0) {
                await createNotification({
                  userId: userRows[0].id,
                  type: "CARD_READY",
                  title: "📱 Your Monthly Card is Ready",
                  message: `Your ${card.category || card.type} ${card.package_value || card.value + ' ETB'} card from ${card.provider} is ready. Please confirm receipt.`,
                  link: `/confirm?token=${delivery.confirmation_token}`,
                });
              }
            } catch (notifErr) {
              console.error("Notification error:", notifErr.message);
            }
          }).catch((emailErr) => {
            console.error("Email send error:", emailErr.message);
          });
        }
      } catch (emailFetchErr) {
        console.error("Email data fetch error:", emailFetchErr.message);
      }
    }

    return res.json({
      success: true,
      message: "Delivery marked as SENT successfully",
      delivery: {
        id: delivery.id,
        distribution_item_id: delivery.distribution_item_id,
        delivery_method: delivery.delivery_method,
        status: "SENT",
        sent_at: new Date(),
        recipient: {
          staff_id: delivery.staff_id,
          name: delivery.full_name,
          email: delivery.email,
          phone: delivery.phone,
        },
      },
    });
  } catch (error) {
    // ----------------------------------------------------------
    // Rollback
    // ----------------------------------------------------------
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Rollback error:", rollbackError.message);
      }
    }

    console.error("Send delivery error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to send delivery",
      error: error.message,
    });
  } finally {
    // ----------------------------------------------------------
    // Release connection
    // ----------------------------------------------------------
    if (connection) {
      connection.release();
    }
  }
};

// ============================================================
// GET /api/deliveries
// List deliveries
// ============================================================
const getDeliveries = async (req, res) => {
  try {
    const [rows] = await db.query(
      `
      SELECT
        d.id,
        d.distribution_item_id,
        d.delivery_method,
        d.sent_at,
        d.token_expiry,
        d.status,
        d.created_at,
        d.updated_at,

        di.card_id,
        di.staff_id,

        s.full_name AS staff_name,
        s.email,
        s.phone,

        c.card_uuid,
        c.provider,
        c.type,
        c.value

      FROM deliveries d

      INNER JOIN distribution_items di
        ON di.id = d.distribution_item_id

      INNER JOIN staff s
        ON s.id = di.staff_id

      INNER JOIN cards c
        ON c.id = di.card_id

      ORDER BY d.created_at DESC
      `,
    );

    return res.json({
      success: true,
      count: rows.length,
      deliveries: rows,
    });
  } catch (error) {
    console.error("Get deliveries error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve deliveries",
      error: error.message,
    });
  }
};

// ============================================================
// POST /api/deliveries/:id/resend
// Resend a delivery notification (FR-028 - manual resend)
// ============================================================
const resendDelivery = async (req, res) => {
  let connection;
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    connection = await db.getConnection();
    await connection.beginTransaction();

    const [deliveries] = await connection.query(
      `SELECT d.id, d.distribution_item_id, d.delivery_method,
              d.confirmation_token, d.token_expiry, d.status,
              di.card_id, di.staff_id,
              s.full_name, s.email, s.phone
       FROM deliveries d
       INNER JOIN distribution_items di ON di.id = d.distribution_item_id
       INNER JOIN staff s ON s.id = di.staff_id
       WHERE d.id = ? FOR UPDATE`,
      [id],
    );

    if (deliveries.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, message: "Delivery not found" });
    }

    const delivery = deliveries[0];

    if (!["SENT", "PENDING", "EXPIRED"].includes(delivery.status)) {
      await connection.rollback();
      return res.status(409).json({ success: false, message: `Cannot resend a ${delivery.status} delivery` });
    }

    // Generate new token and extend expiry
    const newToken  = crypto.randomBytes(32).toString("hex");
    const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await connection.query(
      `UPDATE deliveries SET
        confirmation_token = ?, token_expiry = ?, status = 'SENT', sent_at = NOW()
       WHERE id = ?`,
      [newToken, newExpiry, id],
    );

    await writeAuditLog({
      userId, action: "SEND", cardId: delivery.card_id,
      details: { message: `Delivery #${id} resent to ${delivery.email}`, delivery_id: id },
      ip: req.ip || null, connection,
    });

    await connection.commit();

    // Send email (non-blocking)
    if (delivery.delivery_method === "EMAIL" && delivery.email) {
      try {
        const [cardRows] = await db.query(
          `SELECT c.provider, c.type, c.value, c.expiry_date, c.pin_encrypted, c.pin_iv, c.pin_auth_tag, d.month
           FROM distribution_items di
           INNER JOIN cards c ON c.id = di.card_id
           INNER JOIN distributions d ON d.id = di.distribution_id
           WHERE di.id = ?`,
          [delivery.distribution_item_id],
        );
        if (cardRows.length > 0) {
          const { sendCardDeliveryEmail } = require("../services/emailService");
          sendCardDeliveryEmail({
            toEmail: delivery.email, toName: delivery.full_name,
            card: cardRows[0], confirmationToken: newToken,
            month: cardRows[0].month ? new Date(cardRows[0].month).toLocaleDateString("en-US",{year:"numeric",month:"long"}) : null,
          }).catch(e => console.error("Resend email error:", e.message));
        }
      } catch (e) { console.error("Resend fetch error:", e.message); }
    }

    return res.json({
      success: true,
      message: `Delivery resent to ${delivery.email || delivery.phone}`,
      delivery: { id: delivery.id, status: "SENT", new_expiry: newExpiry },
    });
  } catch (error) {
    if (connection) { try { await connection.rollback(); } catch (_) {} }
    console.error("Resend delivery error:", error);
    return res.status(500).json({ success: false, message: "Resend failed", error: error.message });
  } finally {
    if (connection) connection.release();
  }
};

// ============================================================
// EXPORT
// ============================================================
module.exports = {
  createDelivery,
  sendDelivery,
  getDeliveries,
  resendDelivery,
};
