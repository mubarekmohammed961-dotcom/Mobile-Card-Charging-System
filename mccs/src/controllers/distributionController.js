const db = require("../config/db");
const crypto = require("crypto");
const { writeAuditLog } = require("../utils/auditLogger");

/* ============================================================
   HELPERS
============================================================ */

const normalizeCardType = (type) => {
  return String(type || "")
    .trim()
    .toUpperCase();
};

const normalizeMonth = (month) => {
  if (!month) {
    const now = new Date();
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(
      2,
      "0",
    )}-01`;
  }

  // Accept YYYY-MM
  if (/^\d{4}-\d{2}$/.test(month)) {
    return `${month}-01`;
  }

  // Accept YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(month)) {
    return `${month.slice(0, 7)}-01`;
  }

  return null;
};

/* ============================================================
   CHECK STAFF ELIGIBILITY
============================================================ */

const getStaffEligibility = async (connection, staffId) => {
  const [rows] = await connection.query(
    `
    SELECT
      er.id,
      er.staff_id,
      er.card_type,
      er.monthly_quota,
      er.is_active
    FROM eligibility_rules er
    WHERE er.staff_id = ?
      AND er.is_active = 1
    ORDER BY er.id ASC
    `,
    [staffId],
  );

  return rows;
};

/* ============================================================
   CHECK CURRENT MONTH CONSUMPTION
============================================================ */

const getMonthlyConsumption = async (connection, staffId, month) => {
  const [rows] = await connection.query(
    `
    SELECT
      UPPER(c.type) AS card_type,
      COUNT(*) AS consumed
    FROM distribution_items di
    INNER JOIN distributions d
      ON d.id = di.distribution_id
    INNER JOIN cards c
      ON c.id = di.card_id
    WHERE di.staff_id = ?
      AND d.month = ?
      AND d.status IN ('CONFIRMED', 'SENT', 'COMPLETED')
    GROUP BY UPPER(c.type)
    `,
    [staffId, month],
  );

  const result = {};

  for (const row of rows) {
    result[normalizeCardType(row.card_type)] = Number(row.consumed || 0);
  }

  return result;
};

/* ============================================================
   CHECK PREVIOUS MONTH PENDING CONFIRMATION
============================================================ */

const hasPendingPreviousMonth = async (connection, staffId, month) => {
  const [rows] = await connection.query(
    `
    SELECT
      di.id,
      di.card_id,
      d.month
    FROM distribution_items di
    INNER JOIN distributions d
      ON d.id = di.distribution_id
    LEFT JOIN deliveries dl
      ON dl.distribution_item_id = di.id
    WHERE di.staff_id = ?
      AND d.month = DATE_SUB(?, INTERVAL 1 MONTH)
      AND NOT EXISTS (
        SELECT 1
        FROM deliveries confirmed_delivery
        WHERE confirmed_delivery.distribution_item_id = di.id
          AND confirmed_delivery.status = 'CONFIRMED'
      )
    LIMIT 1
    `,
    [staffId, month],
  );

  return rows.length > 0;
};

/* ============================================================
   GET AVAILABLE CARDS FOR TYPE
============================================================ */

const getAvailableCards = async (connection, cardType, limit) => {
  const [rows] = await connection.query(
    `
    SELECT
      id,
      card_uuid,
      provider,
      type,
      value,
      expiry_date,
      batch_number,
      status
    FROM cards
    WHERE status = 'AVAILABLE'
      AND UPPER(type) = ?
      AND (
        expiry_date IS NULL
        OR expiry_date >= CURDATE()
      )
    ORDER BY
      expiry_date IS NULL,
      expiry_date ASC,
      id ASC
    LIMIT ?
    `,
    [normalizeCardType(cardType), Number(limit)],
  );

  return rows;
};

/* ============================================================
   BUILD DISTRIBUTION PREVIEW
============================================================ */

const buildDistributionPreview = async (
  connection,
  { departmentId, staffId, month },
) => {
  const normalizedMonth = normalizeMonth(month);

  if (!normalizedMonth) {
    throw new Error("Invalid distribution month");
  }

  /* -----------------------------
     DEPARTMENT
  ----------------------------- */

  const [departments] = await connection.query(
    `
    SELECT
      id,
      department_name
    FROM departments
    WHERE id = ?
      AND status = 'ACTIVE'
    `,
    [departmentId],
  );

  if (departments.length === 0) {
    return {
      valid: false,
      error: "Department not found or inactive",
    };
  }

  /* -----------------------------
     STAFF
  ----------------------------- */

  const [staffRows] = await connection.query(
    `
    SELECT
      id,
      employee_id,
      full_name,
      department_id,
      designation,
      email,
      phone,
      is_active
    FROM staff
    WHERE id = ?
      AND department_id = ?
      AND is_active = 1
    `,
    [staffId, departmentId],
  );

  if (staffRows.length === 0) {
    return {
      valid: false,
      error:
        "Staff member not found, inactive, or does not belong to the selected department",
    };
  }

  const selectedStaff = staffRows[0];

  /* -----------------------------
     ELIGIBILITY
  ----------------------------- */

  const eligibility = await getStaffEligibility(connection, staffId);

  const exceptions = [];

  if (eligibility.length === 0) {
    exceptions.push("Staff member has no active eligibility rules.");
  }

  /* -----------------------------
     PREVIOUS MONTH CHECK
  ----------------------------- */

  const pendingPrevious = await hasPendingPreviousMonth(
    connection,
    staffId,
    normalizedMonth,
  );

  if (pendingPrevious) {
    exceptions.push(
      "Staff has a pending unconfirmed allocation from the previous month.",
    );
  }

  /* -----------------------------
     CURRENT MONTH CHECK
  ----------------------------- */

  const consumption = await getMonthlyConsumption(
    connection,
    staffId,
    normalizedMonth,
  );

  const selectedCards = [];

  /* -----------------------------
     MATCH ELIGIBLE CARD TYPES
  ----------------------------- */

  const groupedRules = {};

  for (const rule of eligibility) {
    const type = normalizeCardType(rule.card_type);

    if (!groupedRules[type]) {
      groupedRules[type] = {
        card_type: type,
        monthly_quota: Number(rule.monthly_quota || 0),
      };
    } else {
      groupedRules[type].monthly_quota += Number(rule.monthly_quota || 0);
    }
  }

  for (const type of Object.keys(groupedRules)) {
    const rule = groupedRules[type];

    const alreadyUsed = Number(consumption[type] || 0);

    const remainingQuota = Math.max(
      Number(rule.monthly_quota) - alreadyUsed,
      0,
    );

    if (remainingQuota <= 0) {
      exceptions.push(`${type}: monthly quota already used.`);

      continue;
    }

    const availableCards = await getAvailableCards(
      connection,
      type,
      remainingQuota,
    );

    if (availableCards.length < remainingQuota) {
      exceptions.push(
        `${type}: ${remainingQuota} card(s) required, but only ${availableCards.length} available.`,
      );
    }

    selectedCards.push(...availableCards);
  }

  const totalValue = selectedCards.reduce(
    (sum, card) => sum + Number(card.value || 0),
    0,
  );

  return {
    valid: exceptions.length === 0 && selectedCards.length > 0,

    month: normalizedMonth,

    department: {
      id: Number(departmentId),
      name: departments[0].department_name,
    },

    staff: {
      id: Number(selectedStaff.id),
      employee_id: selectedStaff.employee_id,
      full_name: selectedStaff.full_name,
      designation: selectedStaff.designation,
      email: selectedStaff.email,
    },

    eligibility: eligibility.map((rule) => ({
      id: rule.id,
      card_type: normalizeCardType(rule.card_type),
      monthly_quota: Number(rule.monthly_quota || 0),
      consumed: Number(consumption[normalizeCardType(rule.card_type)] || 0),
      remaining: Math.max(
        Number(rule.monthly_quota || 0) -
          Number(consumption[normalizeCardType(rule.card_type)] || 0),
        0,
      ),
    })),

    cards: selectedCards.map((card) => ({
      id: Number(card.id),
      card_uuid: card.card_uuid,
      provider: card.provider,
      type: card.type,
      value: Number(card.value || 0),
      expiry_date: card.expiry_date,
      batch_number: card.batch_number,
      status: card.status,
    })),

    total_cards: selectedCards.length,
    total_value: totalValue,

    exceptions,

    can_confirm: exceptions.length === 0 && selectedCards.length > 0,
  };
};

/* ============================================================
   POST /api/distributions/preview
============================================================ */

const previewDistribution = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { department_id, staff_id, month } = req.body;

    if (!department_id) {
      return res.status(400).json({
        success: false,
        message: "department_id is required",
      });
    }

    if (!staff_id) {
      return res.status(400).json({
        success: false,
        message: "staff_id is required",
      });
    }

    const preview = await buildDistributionPreview(connection, {
      departmentId: Number(department_id),
      staffId: Number(staff_id),
      month,
    });

    if (preview.error) {
      return res.status(400).json({
        success: false,
        message: preview.error,
      });
    }

    return res.json({
      success: true,
      preview,
    });
  } catch (error) {
    console.error("Preview distribution error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to generate distribution preview",
      error: error.message,
    });
  } finally {
    connection.release();
  }
};

/* ============================================================
   POST /api/distributions
   CONFIRM distribution
============================================================ */

const createDistribution = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { department_id, staff_id, card_ids, month } = req.body;

    const initiatedBy = req.user?.id;

    if (!initiatedBy) {
      return res.status(401).json({
        success: false,
        message: "Authenticated user not found",
      });
    }

    if (!department_id) {
      return res.status(400).json({
        success: false,
        message: "department_id is required",
      });
    }

    if (!staff_id) {
      return res.status(400).json({
        success: false,
        message: "staff_id is required",
      });
    }

    const normalizedMonth = normalizeMonth(month);

    if (!normalizedMonth) {
      return res.status(400).json({
        success: false,
        message: "Invalid distribution month",
      });
    }

    let uniqueCardIds = [];

    if (Array.isArray(card_ids)) {
      uniqueCardIds = [
        ...new Set(
          card_ids
            .map((id) => Number(id))
            .filter((id) => Number.isInteger(id) && id > 0),
        ),
      ];
    }

    await connection.beginTransaction();

    /* -----------------------------
       LOCK DEPARTMENT
    ----------------------------- */

    const [departments] = await connection.query(
      `
        SELECT id
        FROM departments
        WHERE id = ?
          AND status = 'ACTIVE'
        FOR UPDATE
        `,
      [department_id],
    );

    if (departments.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        success: false,
        message: "Department not found or inactive",
      });
    }

    /* -----------------------------
       LOCK STAFF
    ----------------------------- */

    const [staffRows] = await connection.query(
      `
        SELECT
          id,
          department_id,
          is_active
        FROM staff
        WHERE id = ?
          AND is_active = 1
        FOR UPDATE
        `,
      [staff_id],
    );

    if (staffRows.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        success: false,
        message: "Staff member not found or inactive",
      });
    }

    if (Number(staffRows[0].department_id) !== Number(department_id)) {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        message: "Staff does not belong to the selected department",
      });
    }

    /* -----------------------------
       ELIGIBILITY
    ----------------------------- */

    const eligibility = await getStaffEligibility(connection, staff_id);

    if (eligibility.length === 0) {
      await connection.rollback();

      return res.status(409).json({
        success: false,
        message: "Staff member has no active eligibility rules",
      });
    }

    /* -----------------------------
       PREVIOUS MONTH CHECK
    ----------------------------- */

    const pendingPrevious = await hasPendingPreviousMonth(
      connection,
      staff_id,
      normalizedMonth,
    );

    if (pendingPrevious) {
      await connection.rollback();

      return res.status(409).json({
        success: false,
        message:
          "Staff has a pending unconfirmed allocation from the previous month",
      });
    }

    /* -----------------------------
       IF CARD IDs WERE NOT PROVIDED,
       BUILD AUTOMATIC ALLOCATION
    ----------------------------- */

    if (uniqueCardIds.length === 0) {
      const preview = await buildDistributionPreview(connection, {
        departmentId: Number(department_id),
        staffId: Number(staff_id),
        month: normalizedMonth,
      });

      if (!preview.can_confirm) {
        await connection.rollback();

        return res.status(409).json({
          success: false,
          message: "Distribution cannot be confirmed",
          exceptions: preview.exceptions,
        });
      }

      uniqueCardIds = preview.cards.map((card) => Number(card.id));
    }

    /* -----------------------------
       LOCK CARDS
    ----------------------------- */

    const placeholders = uniqueCardIds.map(() => "?").join(",");

    const [cards] = await connection.query(
      `
        SELECT
          id,
          provider,
          type,
          value,
          status,
          expiry_date
        FROM cards
        WHERE id IN (${placeholders})
        FOR UPDATE
        `,
      uniqueCardIds,
    );

    if (cards.length !== uniqueCardIds.length) {
      await connection.rollback();

      const foundIds = cards.map((card) => Number(card.id));

      const missingIds = uniqueCardIds.filter((id) => !foundIds.includes(id));

      return res.status(404).json({
        success: false,
        message: "One or more cards were not found",
        missing_card_ids: missingIds,
      });
    }

    /* -----------------------------
       CARD STATUS + EXPIRY
    ----------------------------- */

    const unavailableCards = cards.filter(
      (card) =>
        card.status !== "AVAILABLE" ||
        (card.expiry_date && new Date(card.expiry_date) < new Date()),
    );

    if (unavailableCards.length > 0) {
      await connection.rollback();

      return res.status(409).json({
        success: false,
        message: "One or more cards are unavailable or expired",
        cards: unavailableCards.map((card) => ({
          id: card.id,
          status: card.status,
          expiry_date: card.expiry_date,
        })),
      });
    }

    /* -----------------------------
       VALIDATE CARD TYPES AGAINST
       STAFF ELIGIBILITY
    ----------------------------- */

    const allowedTypes = new Map();

    for (const rule of eligibility) {
      const type = normalizeCardType(rule.card_type);

      allowedTypes.set(type, Number(rule.monthly_quota || 0));
    }

    const selectedByType = {};

    for (const card of cards) {
      const type = normalizeCardType(card.type);

      if (!allowedTypes.has(type)) {
        await connection.rollback();

        return res.status(409).json({
          success: false,
          message: `Card type ${type} is not eligible for this staff member`,
        });
      }

      selectedByType[type] = (selectedByType[type] || 0) + 1;
    }

    /* -----------------------------
       CURRENT MONTH CONSUMPTION
    ----------------------------- */

    const consumption = await getMonthlyConsumption(
      connection,
      staff_id,
      normalizedMonth,
    );

    for (const [type, count] of Object.entries(selectedByType)) {
      const quota = Number(allowedTypes.get(type));

      const alreadyUsed = Number(consumption[type] || 0);

      if (alreadyUsed + count > quota) {
        await connection.rollback();

        return res.status(409).json({
          success: false,
          message: `Monthly quota exceeded for ${type}. Quota: ${quota}, already used: ${alreadyUsed}, requested: ${count}.`,
        });
      }
    }

    /* -----------------------------
       TOTAL VALUE
    ----------------------------- */

    const totalValue = cards.reduce(
      (sum, card) => sum + Number(card.value || 0),
      0,
    );

    /* -----------------------------
       BUDGET CHECK (BR-004)
       If total_value > dept budget, requires Dept Head approval
    ----------------------------- */

    const [deptRows] = await connection.query(
      "SELECT budget FROM departments WHERE id = ?",
      [department_id],
    );
    const deptBudget = Number(deptRows[0]?.budget || 0);
    const requiresApproval = deptBudget > 0 && totalValue > deptBudget ? 1 : 0;
    const initialStatus = requiresApproval ? "DRAFT" : "CONFIRMED";
    const approvalStatus = requiresApproval ? "PENDING" : null;

    /* -----------------------------
       CREATE DISTRIBUTION
    ----------------------------- */

    const distributionUuid = crypto.randomUUID();

    const [distributionResult] = await connection.query(
      `
        INSERT INTO distributions
        (
          distribution_uuid,
          month,
          department_id,
          initiated_by,
          total_cards,
          total_value,
          status,
          requires_approval,
          approval_status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      [
        distributionUuid,
        normalizedMonth,
        department_id,
        initiatedBy,
        uniqueCardIds.length,
        totalValue,
        initialStatus,
        requiresApproval,
        approvalStatus,
      ],
    );

    const distributionId = distributionResult.insertId;

    // If requires approval, notify all Department Heads of this department
    if (requiresApproval) {
      try {
        const { createNotification } = require("./notificationController");
        // Notify dept heads linked to this department
        const [deptHeads] = await connection.query(
          `SELECT u.id FROM users u
           INNER JOIN staff s ON s.email = u.email
           WHERE s.department_id = ? AND u.role = 'DEPARTMENT_HEAD' AND u.status = 'ACTIVE'`,
          [department_id],
        );
        const deptName = deptRows[0] ? (await connection.query("SELECT department_name FROM departments WHERE id = ?", [department_id]))[0][0]?.department_name : "";
        for (const dh of deptHeads) {
          await createNotification({
            userId: dh.id,
            type: "DISTRIBUTION",
            title: "⚠️ Budget Approval Required",
            message: `A distribution of ${totalValue.toFixed(2)} ETB exceeds the budget for your department. Please review and approve/reject.`,
            link: "/approvals",
          });
        }
        // Also notify super/system admin
        const [admins] = await connection.query(
          "SELECT id FROM users WHERE role IN ('SUPER_ADMIN','SYSTEM_ADMIN') AND status='ACTIVE'",
        );
        for (const admin of admins) {
          await createNotification({
            userId: admin.id,
            type: "DISTRIBUTION",
            title: "⚠️ Distribution Pending Approval",
            message: `Distribution #${distributionId} (${totalValue.toFixed(2)} ETB) exceeds dept budget and awaits Department Head approval.`,
            link: "/approvals",
          });
        }
      } catch (notifErr) {
        console.error("Approval notification error:", notifErr.message);
      }
    }

    /* -----------------------------
       CREATE ITEMS
    ----------------------------- */

    for (const card of cards) {
      await connection.query(
        `
        INSERT INTO distribution_items
        (
          distribution_id,
          card_id,
          staff_id
        )
        VALUES (?, ?, ?)
        `,
        [distributionId, card.id, staff_id],
      );
    }

    /* -----------------------------
       CHANGE CARD STATUS
    ----------------------------- */

    await connection.query(
      `
      UPDATE cards
      SET status = 'ALLOCATED'
      WHERE id IN (${placeholders})
      `,
      uniqueCardIds,
    );

    /* -----------------------------
       AUDIT
    ----------------------------- */

    await writeAuditLog({
      userId: initiatedBy,
      action: "ALLOCATE",
      cardId: uniqueCardIds[0],
      details: {
        distribution_id: distributionId,
        staff_id: Number(staff_id),
        card_ids: uniqueCardIds,
        total_cards: cards.length,
        total_value: totalValue,
        month: normalizedMonth,
        message: "Monthly distribution confirmed and cards allocated",
      },
      ip: req.ip || null,
      connection,
    });

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: requiresApproval
        ? `Distribution created but requires Department Head approval (value ${totalValue.toFixed(2)} ETB exceeds dept budget). Notifications sent.`
        : "Distribution confirmed and cards allocated successfully",
      requires_approval: requiresApproval === 1,
      approval_status: approvalStatus,
      distribution: {
        id: distributionId,
        distribution_uuid: distributionUuid,
        month: normalizedMonth,
        department_id: Number(department_id),
        initiated_by: initiatedBy,
        staff_id: Number(staff_id),
        total_cards: uniqueCardIds.length,
        total_value: totalValue,
        status: initialStatus,
        requires_approval: requiresApproval === 1,
        card_ids: uniqueCardIds,
      },
    });
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      console.error("Rollback error:", rollbackError.message);
    }

    console.error("Create distribution error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create distribution",
      error: error.message,
      code: error.code || "UNKNOWN",
      sqlMessage: error.sqlMessage || null,
    });
  } finally {
    connection.release();
  }
};

/* ============================================================
   GET /api/distributions
============================================================ */

const getDistributions = async (req, res) => {
  try {
    const [rows] = await db.query(
      `
        SELECT
          d.id,
          d.distribution_uuid,
          d.month,
          d.department_id,
          dep.department_name,
          d.initiated_by,
          d.total_cards,
          d.total_value,
          d.status,
          d.created_at,
          d.updated_at
        FROM distributions d
        LEFT JOIN departments dep
          ON dep.id = d.department_id
        ORDER BY d.created_at DESC
        `,
    );

    return res.json({
      success: true,
      count: rows.length,
      distributions: rows,
    });
  } catch (error) {
    console.error("Get distributions error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve distributions",
      error: error.message,
    });
  }
};

/* ============================================================
   GET /api/distributions/:id
============================================================ */

const getDistributionById = async (req, res) => {
  try {
    const { id } = req.params;

    const [distributions] = await db.query(
      `
        SELECT
          d.id,
          d.distribution_uuid,
          d.month,
          d.department_id,
          dep.department_name,
          d.initiated_by,
          d.total_cards,
          d.total_value,
          d.status,
          d.created_at,
          d.updated_at
        FROM distributions d
        LEFT JOIN departments dep
          ON dep.id = d.department_id
        WHERE d.id = ?
        `,
      [id],
    );

    if (distributions.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Distribution not found",
      });
    }

    const [items] = await db.query(
      `
        SELECT
          di.id,
          di.distribution_id,
          di.card_id,
          di.staff_id,
          s.employee_id,
          s.full_name,
          s.designation,
          c.card_uuid,
          c.provider,
          c.type,
          c.value,
          c.status,
          di.allocated_at
        FROM distribution_items di
        LEFT JOIN staff s
          ON s.id = di.staff_id
        LEFT JOIN cards c
          ON c.id = di.card_id
        WHERE di.distribution_id = ?
        ORDER BY di.id ASC
        `,
      [id],
    );

    return res.json({
      success: true,
      distribution: distributions[0],
      items,
    });
  } catch (error) {
    console.error("Get distribution error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve distribution",
      error: error.message,
    });
  }
};

/* ============================================================
   GET /api/distributions/items
============================================================ */

const getDistributionItems = async (req, res) => {
  try {
    // Return only ALLOCATED items that do NOT already have an active (PENDING/SENT/DELIVERED) delivery
    const [rows] = await db.query(`
        SELECT
          di.id AS distribution_item_id,
          di.distribution_id,
          di.card_id,
          di.staff_id,
          s.employee_id,
          s.full_name,
          s.designation,
          c.card_uuid,
          c.provider,
          c.type,
          c.value,
          c.status,
          di.allocated_at,
          d.month,
          dep.department_name
        FROM distribution_items di
        INNER JOIN distributions d
          ON d.id = di.distribution_id
        INNER JOIN departments dep
          ON dep.id = d.department_id
        INNER JOIN staff s
          ON s.id = di.staff_id
        INNER JOIN cards c
          ON c.id = di.card_id
        WHERE c.status = 'ALLOCATED'
          AND NOT EXISTS (
            SELECT 1 FROM deliveries dv
            WHERE dv.distribution_item_id = di.id
              AND dv.status IN ('PENDING', 'SENT', 'DELIVERED')
          )
        ORDER BY di.id DESC
      `);

    return res.json({
      success: true,
      count: rows.length,
      items: rows,
    });
  } catch (error) {
    console.error("Get distribution items error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve distribution items",
      error: error.message,
    });
  }
};

/* ============================================================
   POST /api/distributions/schedule
   Schedule automated monthly distribution (FR-019, Section 15)
   Stores schedule configuration in database
============================================================ */

const scheduleDistribution = async (req, res) => {
  try {
    const { department_id, cron_expression, is_active, schedule_name } = req.body;
    const createdBy = req.user?.id;

    if (!createdBy) {
      return res.status(401).json({
        success: false,
        message: "Authenticated user not found",
      });
    }

    if (!department_id) {
      return res.status(400).json({
        success: false,
        message: "department_id is required",
      });
    }

    // Default to 1st of month at 8:00 AM if not specified
    const cronExpr = cron_expression || "0 8 1 * *";
    const scheduleName = schedule_name || `Auto Distribution - Department ${department_id}`;
    const isActive = is_active === false ? 0 : 1;

    // Validate cron expression format (basic validation)
    const cronParts = cronExpr.trim().split(/\s+/);
    if (cronParts.length !== 5) {
      return res.status(400).json({
        success: false,
        message: "Invalid cron expression. Must be in format: 'minute hour day month day-of-week' (e.g., '0 8 1 * *')",
      });
    }

    // Check if department exists
    const [deptCheck] = await db.query(
      "SELECT id, department_name FROM departments WHERE id = ? AND status = 'ACTIVE'",
      [department_id]
    );

    if (deptCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Department not found or inactive",
      });
    }

    // Check if schedule already exists for this department
    const [existing] = await db.query(
      "SELECT id FROM distribution_schedules WHERE department_id = ?",
      [department_id]
    );

    let scheduleId;

    if (existing.length > 0) {
      // Update existing schedule
      await db.query(
        `UPDATE distribution_schedules 
         SET cron_expression = ?, is_active = ?, schedule_name = ?, updated_by = ?, updated_at = NOW()
         WHERE department_id = ?`,
        [cronExpr, isActive, scheduleName, createdBy, department_id]
      );
      scheduleId = existing[0].id;
    } else {
      // Create new schedule
      const [result] = await db.query(
        `INSERT INTO distribution_schedules 
         (department_id, cron_expression, is_active, schedule_name, created_by, updated_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [department_id, cronExpr, isActive, scheduleName, createdBy, createdBy]
      );
      scheduleId = result.insertId;
    }

    await writeAuditLog({
      userId: createdBy,
      action: "UPDATE",
      cardId: null,
      details: {
        message: existing.length > 0 ? "Distribution schedule updated" : "Distribution schedule created",
        schedule_id: scheduleId,
        department_id: Number(department_id),
        cron_expression: cronExpr,
        is_active: isActive === 1,
      },
      ip: req.ip || null,
    });

    return res.json({
      success: true,
      message: existing.length > 0 
        ? "Distribution schedule updated successfully" 
        : "Distribution schedule created successfully",
      schedule: {
        id: scheduleId,
        department_id: Number(department_id),
        department_name: deptCheck[0].department_name,
        cron_expression: cronExpr,
        schedule_name: scheduleName,
        is_active: isActive === 1,
        next_info: "Schedule will be processed by the cron job according to the cron expression",
      },
    });
  } catch (error) {
    console.error("Schedule distribution error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to schedule distribution",
      error: error.message,
    });
  }
};

/* ============================================================
   GET /api/distributions/schedules
   Get all distribution schedules (FR-019)
============================================================ */

const getSchedules = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        ds.id,
        ds.department_id,
        dep.department_name,
        ds.cron_expression,
        ds.schedule_name,
        ds.is_active,
        ds.created_by,
        ds.updated_by,
        ds.created_at,
        ds.updated_at,
        u1.full_name AS created_by_name,
        u2.full_name AS updated_by_name
      FROM distribution_schedules ds
      LEFT JOIN departments dep ON dep.id = ds.department_id
      LEFT JOIN users u1 ON u1.id = ds.created_by
      LEFT JOIN users u2 ON u2.id = ds.updated_by
      ORDER BY ds.created_at DESC
    `);

    return res.json({
      success: true,
      count: rows.length,
      schedules: rows,
    });
  } catch (error) {
    console.error("Get schedules error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve schedules",
      error: error.message,
    });
  }
};

/* ============================================================
   DELETE /api/distributions/schedules/:id
   Delete a distribution schedule
============================================================ */

const deleteSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const [existing] = await db.query(
      "SELECT id, department_id FROM distribution_schedules WHERE id = ?",
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Schedule not found",
      });
    }

    await db.query("DELETE FROM distribution_schedules WHERE id = ?", [id]);

    await writeAuditLog({
      userId,
      action: "DELETE",
      cardId: null,
      details: {
        message: "Distribution schedule deleted",
        schedule_id: Number(id),
        department_id: existing[0].department_id,
      },
      ip: req.ip || null,
    });

    return res.json({
      success: true,
      message: "Distribution schedule deleted successfully",
    });
  } catch (error) {
    console.error("Delete schedule error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete schedule",
      error: error.message,
    });
  }
};

module.exports = {
  previewDistribution,
  createDistribution,
  getDistributions,
  getDistributionById,
  getDistributionItems,
  scheduleDistribution,
  getSchedules,
  deleteSchedule,
};
