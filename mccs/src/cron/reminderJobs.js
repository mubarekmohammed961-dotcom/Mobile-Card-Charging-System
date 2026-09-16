const cron = require("node-cron");
const db   = require("../config/db");
const { sendReminderEmail, sendLowInventoryAlert } = require("../services/emailService");
const { createNotification } = require("../controllers/notificationController");

// ============================================================
// DAILY REMINDER + ADMIN ESCALATION
// Runs every day at 9:00 AM
// FR-028: Day 3, Day 5, Day 7 staff reminders
// FR-028: After Day 7 → escalate to Admin (US-04)
// ============================================================
const startReminderJob = () => {
  cron.schedule("0 9 * * *", async () => {
    console.log("[CRON] Running daily reminder job...");
    try {
      const [pendingDeliveries] = await db.query(`
        SELECT
          dl.id AS delivery_id,
          dl.distribution_item_id,
          dl.confirmation_token,
          dl.token_expiry,
          dl.sent_at,
          dl.status,
          DATEDIFF(CURDATE(), DATE(dl.sent_at)) AS days_since_sent,
          s.id   AS staff_id,
          s.full_name,
          s.email,
          di.card_id,
          c.provider,
          c.type,
          c.value
        FROM deliveries dl
        INNER JOIN distribution_items di ON di.id = dl.distribution_item_id
        INNER JOIN staff s  ON s.id  = di.staff_id
        INNER JOIN cards c  ON c.id  = di.card_id
        WHERE dl.status = 'SENT'
          AND dl.sent_at IS NOT NULL
          AND DATEDIFF(CURDATE(), DATE(dl.sent_at)) IN (3, 5, 7)
      `);

      let emailSent = 0, emailFailed = 0;

      for (const d of pendingDeliveries) {
        // Send reminder email to staff
        if (d.email) {
          try {
            await sendReminderEmail({
              toEmail: d.email, toName: d.full_name,
              confirmationToken: d.confirmation_token,
              dayNumber: d.days_since_sent,
            });
            emailSent++;
          } catch (e) {
            emailFailed++;
            console.error(`[CRON] Reminder email failed for ${d.email}:`, e.message);
          }
        }

        // In-app notification for staff
        try {
          const [userRows] = await db.query(
            "SELECT id FROM users WHERE email = ? AND status = 'ACTIVE' LIMIT 1",
            [d.email],
          );
          if (userRows.length > 0) {
            await createNotification({
              userId: userRows[0].id,
              type: "REMINDER",
              title: `⏰ Reminder Day ${d.days_since_sent}: Confirm Your Card`,
              message: `Your ${d.provider} ${d.type} card ($${Number(d.value||0).toFixed(2)}) is still pending confirmation. Please confirm within 7 days.`,
              link: `/confirm?token=${d.confirmation_token}`,
            });
          }
        } catch (e) { console.error("[CRON] Staff notif error:", e.message); }

        // Day 7 → Admin escalation (FR-028, US-04)
        if (Number(d.days_since_sent) >= 7) {
          try {
            const [admins] = await db.query(
              "SELECT id FROM users WHERE role IN ('SUPER_ADMIN','SYSTEM_ADMIN') AND status='ACTIVE'",
            );
            for (const admin of admins) {
              await createNotification({
                userId: admin.id,
                type: "REMINDER",
                title: "⚠️ Manual Follow-up Required",
                message: `${d.full_name} has not confirmed their ${d.provider} ${d.type} card for 7+ days (Delivery #${d.delivery_id}). Manual follow-up required per BR-005.`,
                link: "/deliveries",
              });
            }
          } catch (e) { console.error("[CRON] Admin escalation error:", e.message); }
        }
      }

      console.log(`[CRON] Reminders done. Emails sent: ${emailSent}, failed: ${emailFailed}`);
    } catch (err) {
      console.error("[CRON] Reminder job error:", err.message);
    }
  });
  console.log("[CRON] Daily reminder job scheduled (09:00 daily)");
};

// ============================================================
// WEEKLY LOW INVENTORY CHECK + NOTIFICATIONS
// Runs every Sunday at 2:00 AM
// FR-006: Low inventory alert to admin
// FR-007: Expiry alert
// ============================================================
const startInventoryCheckJob = () => {
  cron.schedule("0 2 * * 0", async () => {
    console.log("[CRON] Running weekly inventory check...");
    try {
      const LOW_THRESHOLD = parseInt(process.env.LOW_INVENTORY_THRESHOLD || "50", 10);

      const [inventoryRows] = await db.query(`
        SELECT type, COUNT(*) AS available
        FROM cards
        WHERE status = 'AVAILABLE'
          AND (expiry_date IS NULL OR expiry_date >= CURDATE())
        GROUP BY type
      `);

      const adminEmail = process.env.ADMIN_EMAIL;

      for (const row of inventoryRows) {
        if (Number(row.available) < LOW_THRESHOLD) {
          console.log(`[CRON] Low inventory: ${row.type} = ${row.available} cards`);
          if (adminEmail) {
            try {
              await sendLowInventoryAlert({ toEmail: adminEmail, cardType: row.type, count: row.available, threshold: LOW_THRESHOLD });
            } catch (e) { console.error(`[CRON] Alert email failed for ${row.type}:`, e.message); }
          }
          // In-app notification for admins
          try {
            const [admins] = await db.query("SELECT id FROM users WHERE role IN ('SUPER_ADMIN','SYSTEM_ADMIN') AND status='ACTIVE'");
            for (const admin of admins) {
              await createNotification({
                userId: admin.id,
                type: "LOW_INVENTORY",
                title: `⚠️ Low Inventory: ${row.type}`,
                message: `Only ${row.available} ${row.type} cards remaining (threshold: ${LOW_THRESHOLD}). Please upload more inventory.`,
                link: "/inventory",
              });
            }
          } catch (e) { console.error("[CRON] Low inventory notif error:", e.message); }
        }
      }

      // FR-007: Flag expiring cards (7 days) — notify admins
      const [expiringCards] = await db.query(`
        SELECT type, COUNT(*) AS cnt
        FROM cards
        WHERE status = 'AVAILABLE'
          AND expiry_date IS NOT NULL
          AND expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
        GROUP BY type
      `);
      for (const row of expiringCards) {
        try {
          const [admins] = await db.query("SELECT id FROM users WHERE role IN ('SUPER_ADMIN','SYSTEM_ADMIN') AND status='ACTIVE'");
          for (const admin of admins) {
            await createNotification({
              userId: admin.id,
              type: "LOW_INVENTORY",
              title: `⏰ Cards Expiring Soon: ${row.type}`,
              message: `${row.cnt} ${row.type} card(s) expire within 7 days. Reallocate or remove them to prevent waste.`,
              link: "/inventory",
            });
          }
        } catch (e) { console.error("[CRON] Expiry notif error:", e.message); }
      }

      // Auto-flag expired AVAILABLE cards
      const [flagged] = await db.query(`
        UPDATE cards SET status = 'EXPIRED'
        WHERE status = 'AVAILABLE' AND expiry_date IS NOT NULL AND expiry_date < CURDATE()
      `);

      console.log(`[CRON] Inventory check done. Expired cards flagged: ${flagged.affectedRows || 0}`);
    } catch (err) {
      console.error("[CRON] Inventory check error:", err.message);
    }
  });
  console.log("[CRON] Weekly inventory check scheduled (02:00 Sundays)");
};

// ============================================================
// DAILY: Auto-flag expired tokens + FR-037 re-allocation check
// Runs every day at 8:00 AM
// BR-005: Flag expired tokens
// FR-037: Flag unconfirmed cards after 30 days for re-allocation
// ============================================================
const startExpiredDeliveryJob = () => {
  cron.schedule("0 8 * * *", async () => {
    console.log("[CRON] Running expired delivery token job...");
    try {
      // Flag expired tokens
      const [expired] = await db.query(`
        UPDATE deliveries SET status = 'EXPIRED'
        WHERE status IN ('PENDING','SENT') AND token_expiry < NOW()
      `);
      console.log(`[CRON] Expired tokens flagged: ${expired.affectedRows || 0}`);

      // FR-037: Flag unconfirmed/unused cards after 30 days for review
      const [flagged] = await db.query(`
        SELECT
          di.id AS distribution_item_id,
          di.card_id,
          di.staff_id,
          s.full_name,
          c.provider, c.type, c.value,
          dl.status AS delivery_status,
          DATEDIFF(CURDATE(), DATE(di.allocated_at)) AS days_allocated
        FROM distribution_items di
        INNER JOIN cards c  ON c.id  = di.card_id
        INNER JOIN staff s  ON s.id  = di.staff_id
        LEFT JOIN deliveries dl ON dl.distribution_item_id = di.id
        WHERE c.status = 'ALLOCATED'
          AND DATEDIFF(CURDATE(), DATE(di.allocated_at)) >= 30
          AND NOT EXISTS (
            SELECT 1 FROM deliveries dl2
            WHERE dl2.distribution_item_id = di.id
              AND dl2.status = 'CONFIRMED'
          )
      `);

      if (flagged.length > 0) {
        // Notify admins about cards needing review
        const [admins] = await db.query("SELECT id FROM users WHERE role IN ('SUPER_ADMIN','SYSTEM_ADMIN') AND status='ACTIVE'");
        for (const admin of admins) {
          await createNotification({
            userId: admin.id,
            type: "SYSTEM",
            title: `📋 ${flagged.length} Card(s) Pending Review (30+ Days)`,
            message: `${flagged.length} allocated card(s) have been unconfirmed for 30+ days and are eligible for re-allocation per FR-037.`,
            link: "/deliveries",
          });
        }
        console.log(`[CRON] FR-037: ${flagged.length} cards flagged for admin review (30+ days unconfirmed)`);
      }
    } catch (err) {
      console.error("[CRON] Expired delivery job error:", err.message);
    }
  });
  console.log("[CRON] Expired delivery job scheduled (08:00 daily)");
};

// ============================================================
// START ALL CRON JOBS
// ============================================================
const startAllJobs = () => {
  startReminderJob();
  startInventoryCheckJob();
  startExpiredDeliveryJob();
  startAuditArchiveJob();
  startMonthlyDeptSummaryJob();
  startSessionCleanupJob();
  console.log("[CRON] All scheduled jobs started.");
};

// ============================================================
// MONTHLY: Department Allocation Summary to Dept Heads (Section 18)
// Runs on 1st of month at 7:00 AM
// ============================================================
function startMonthlyDeptSummaryJob() {
  cron.schedule("0 7 1 * *", async () => {
    console.log("[CRON] Running monthly dept summary job...");
    try {
      const [deptHeads] = await db.query(`
        SELECT u.id, u.email, u.full_name, s.department_id, dep.department_name
        FROM users u
        INNER JOIN staff s ON s.email = u.email
        INNER JOIN departments dep ON dep.id = s.department_id
        WHERE u.role = 'DEPARTMENT_HEAD' AND u.status = 'ACTIVE'
      `);

      for (const dh of deptHeads) {
        try {
          const [summary] = await db.query(`
            SELECT
              COUNT(DISTINCT d.id) AS total_distributions,
              COUNT(DISTINCT di.id) AS total_cards,
              COALESCE(SUM(d.total_value),0) AS total_value,
              SUM(CASE WHEN dl.status='CONFIRMED' THEN 1 ELSE 0 END) AS confirmed
            FROM distributions d
            LEFT JOIN distribution_items di ON di.distribution_id = d.id
            LEFT JOIN deliveries dl ON dl.distribution_item_id = di.id
            WHERE d.department_id = ?
              AND d.month = DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 1 MONTH), '%Y-%m-01')
          `, [dh.department_id]);

          const s = summary[0];
          const { sendReminderEmail } = require("../services/emailService");

          // Send summary notification (reuse email or just in-app)
          await createNotification({
            userId: dh.id,
            type: "DISTRIBUTION",
            title: `Monthly Summary: ${dh.department_name}`,
            message: `Last month: ${s.total_distributions} distributions, ${s.total_cards} cards issued ($${Number(s.total_value).toFixed(2)}), ${s.confirmed} confirmed.`,
            link: "/reports",
          });
        } catch (e) {
          console.error(`[CRON] Dept summary notif failed for ${dh.email}:`, e.message);
        }
      }
      console.log(`[CRON] Monthly dept summary sent to ${deptHeads.length} dept heads`);
    } catch (err) {
      console.error("[CRON] Monthly dept summary error:", err.message);
    }
  });
  console.log("[CRON] Monthly dept summary scheduled (07:00 on 1st of month)");
}

// ============================================================
// ANNUAL: Archive audit logs older than 1 year (Section 20)
// Runs on Jan 1st at 3:00 AM — 7-year retention
// ============================================================
function startAuditArchiveJob() {
  cron.schedule("0 3 1 1 *", async () => {
    console.log("[CRON] Running annual audit archive job...");
    try {
      // Archive records older than 1 year
      const [rows] = await db.query(
        "SELECT id, user_id, action, card_id, details, ip, created_at FROM audit_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 1 YEAR)"
      );

      if (rows.length > 0) {
        // Insert into archive
        for (const row of rows) {
          await db.query(
            "INSERT IGNORE INTO audit_archive (original_id, user_id, action, card_id, details, ip, created_at) VALUES (?,?,?,?,?,?,?)",
            [row.id, row.user_id, row.action, row.card_id, row.details, row.ip, row.created_at],
          );
        }

        // Delete from main table only records older than 7 years (financial compliance)
        const [deleted] = await db.query(
          "DELETE FROM audit_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 7 YEAR)"
        );

        console.log(`[CRON] Audit archive: ${rows.length} archived, ${deleted.affectedRows} deleted (>7 years)`);

        // Notify admins
        const [admins] = await db.query(
          "SELECT id FROM users WHERE role IN ('SUPER_ADMIN','SYSTEM_ADMIN') AND status='ACTIVE'"
        );
        for (const admin of admins) {
          await createNotification({
            userId: admin.id,
            type: "SYSTEM",
            title: "Audit Log Annual Archive Complete",
            message: `${rows.length} audit log entries archived. Logs older than 7 years deleted per financial compliance (Section 20).`,
            link: "/audit-logs",
          });
        }
      } else {
        console.log("[CRON] Audit archive: no records to archive");
      }
    } catch (err) {
      console.error("[CRON] Audit archive error:", err.message);
    }
  });
  console.log("[CRON] Annual audit archive scheduled (03:00 Jan 1st)");
}

module.exports = { startAllJobs };


// ============================================================
// DAILY: Cleanup Expired Sessions
// Runs every day at 4:00 AM
// Removes sessions older than 24 hours
// ============================================================
function startSessionCleanupJob() {
  cron.schedule("0 4 * * *", async () => {
    console.log("[CRON] Running session cleanup job...");
    try {
      const { cleanupExpiredSessions } = require("../middleware/sessionMiddleware");
      const removedCount = await cleanupExpiredSessions();
      console.log(`[CRON] Session cleanup done. Removed ${removedCount} expired sessions.`);
    } catch (err) {
      console.error("[CRON] Session cleanup error:", err.message);
    }
  });
  console.log("[CRON] Session cleanup scheduled (04:00 daily)");
}
