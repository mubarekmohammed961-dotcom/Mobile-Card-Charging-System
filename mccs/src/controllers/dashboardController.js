const db = require("../config/db");

// ============================================================
// GET /api/dashboard/summary
// Dashboard summary
// ============================================================
const getDashboardSummary = async (req, res) => {
  try {
    // ----------------------------------------------------------
    // Card status summary
    // ----------------------------------------------------------
    const [cardStatusRows] = await db.query(`
      SELECT
        status,
        COUNT(*) AS total_cards,
        COALESCE(SUM(value), 0) AS total_value
      FROM cards
      GROUP BY status
    `);

    const summary = {
      total_cards: 0,
      total_value: 0,

      available_cards: 0,
      available_value: 0,

      allocated_cards: 0,
      allocated_value: 0,

      used_cards: 0,
      used_value: 0,
    };

    for (const row of cardStatusRows) {
      const count = Number(row.total_cards);
      const value = Number(row.total_value);

      summary.total_cards += count;
      summary.total_value += value;

      if (row.status === "AVAILABLE") {
        summary.available_cards = count;
        summary.available_value = value;
      }

      if (row.status === "ALLOCATED") {
        summary.allocated_cards = count;
        summary.allocated_value = value;
      }

      if (row.status === "USED") {
        summary.used_cards = count;
        summary.used_value = value;
      }
    }

    // ----------------------------------------------------------
    // Distribution summary
    // ----------------------------------------------------------
    const [distributionRows] = await db.query(`
      SELECT
        COUNT(*) AS total_distributions,
        COALESCE(SUM(total_cards), 0) AS distributed_cards,
        COALESCE(SUM(total_value), 0) AS distributed_value
      FROM distributions
    `);

    // ----------------------------------------------------------
    // Delivery summary
    // ----------------------------------------------------------
    const [deliveryRows] = await db.query(`
      SELECT
        status,
        COUNT(*) AS total
      FROM deliveries
      GROUP BY status
    `);

    const deliveries = {
      pending: 0,
      sent: 0,
      delivered: 0,
      confirmed: 0,
      expired: 0,
    };

    for (const row of deliveryRows) {
      const count = Number(row.total);

      if (row.status === "PENDING") {
        deliveries.pending = count;
      }

      if (row.status === "SENT") {
        deliveries.sent = count;
      }

      if (row.status === "DELIVERED") {
        deliveries.delivered = count;
      }

      if (row.status === "CONFIRMED") {
        deliveries.confirmed = count;
      }

      if (row.status === "EXPIRED") {
        deliveries.expired = count;
      }
    }

    // ----------------------------------------------------------
    // Usage summary
    // ----------------------------------------------------------
    const [usageRows] = await db.query(`
      SELECT
        COUNT(*) AS total_used_cards,
        COALESCE(SUM(c.value), 0) AS used_value
      FROM usage_logs ul
      INNER JOIN cards c
        ON c.id = ul.card_id
    `);

    // ----------------------------------------------------------
    // Department summary
    // ----------------------------------------------------------
    const [departmentRows] = await db.query(`
      SELECT
        d.id,
        d.department_name,
        COUNT(di.id) AS allocated_cards,
        COALESCE(SUM(c.value), 0) AS allocated_value
      FROM departments d
      LEFT JOIN distributions dist
        ON dist.department_id = d.id
      LEFT JOIN distribution_items di
        ON di.distribution_id = dist.id
      LEFT JOIN cards c
        ON c.id = di.card_id
      GROUP BY d.id, d.department_name
      ORDER BY allocated_cards DESC
    `);

    // ----------------------------------------------------------
    // Recent audit activity
    // ----------------------------------------------------------
    const [recentActivity] = await db.query(`
      SELECT
        al.id,
        al.action,
        al.card_id,
        al.details,
        al.ip,
        al.created_at,
        u.full_name AS user_name
      FROM audit_logs al
      LEFT JOIN users u
        ON u.id = al.user_id
      ORDER BY al.created_at DESC
      LIMIT 10
    `);

    return res.json({
      success: true,

      summary,

      distributions: {
        total_distributions: Number(
          distributionRows[0]?.total_distributions || 0,
        ),
        distributed_cards: Number(distributionRows[0]?.distributed_cards || 0),
        distributed_value: Number(distributionRows[0]?.distributed_value || 0),
      },

      deliveries,

      usage: {
        total_used_cards: Number(usageRows[0]?.total_used_cards || 0),
        used_value: Number(usageRows[0]?.used_value || 0),
      },

      departments: departmentRows,

      recent_activity: recentActivity,
    });
  } catch (error) {
    console.error("Dashboard summary error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve dashboard summary",
      error: error.message,
    });
  }
};

module.exports = {
  getDashboardSummary,
};
