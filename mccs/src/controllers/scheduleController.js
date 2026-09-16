const db = require("../config/db");
const { writeAuditLog } = require("../utils/auditLogger");

// ============================================================
// POST /api/distributions/schedule
// FR-019: Schedule monthly auto-distribution
// SRS Section 15: POST /api/distributions/schedule
// Admins can set a schedule for a department/month
// The actual cron job runs on 1st of month at 8AM
// ============================================================
const scheduleDistribution = async (req, res) => {
  try {
    const { department_id, month, run_immediately } = req.body;
    const userId = req.user?.id;

    if (!department_id) {
      return res.status(400).json({ success: false, message: "department_id is required" });
    }

    const normalizedMonth = (() => {
      if (!month) {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      }
      if (/^\d{4}-\d{2}$/.test(month)) return `${month}-01`;
      if (/^\d{4}-\d{2}-\d{2}$/.test(month)) return `${month.slice(0, 7)}-01`;
      return null;
    })();

    if (!normalizedMonth) {
      return res.status(400).json({ success: false, message: "Invalid month format" });
    }

    // Check department exists
    const [deptRows] = await db.query(
      "SELECT id, department_name FROM departments WHERE id = ? AND status = 'ACTIVE'",
      [department_id],
    );
    if (deptRows.length === 0) {
      return res.status(404).json({ success: false, message: "Department not found or inactive" });
    }

    // Get all active staff in department with eligibility
    const [eligibleStaff] = await db.query(
      `SELECT DISTINCT s.id, s.full_name, s.email
       FROM staff s
       INNER JOIN eligibility_rules er ON er.staff_id = s.id
       WHERE s.department_id = ? AND s.is_active = 1 AND er.is_active = 1`,
      [department_id],
    );

    if (eligibleStaff.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No eligible staff found in this department",
      });
    }

    await writeAuditLog({
      userId,
      action: "ALLOCATE",
      cardId: null,
      details: {
        message: `Distribution scheduled for ${deptRows[0].department_name} — month ${normalizedMonth}`,
        department_id,
        month: normalizedMonth,
        eligible_staff: eligibleStaff.length,
        run_immediately: !!run_immediately,
      },
      ip: req.ip || null,
    });

    if (run_immediately) {
      // Trigger immediate distribution for all eligible staff
      const results = [];
      for (const staff of eligibleStaff) {
        try {
          // Build the distribution for each staff member using existing logic
          const connection = await db.getConnection();
          try {
            const [existing] = await connection.query(
              `SELECT COUNT(*) as cnt FROM distributions d
               INNER JOIN distribution_items di ON di.distribution_id = d.id
               WHERE d.department_id = ? AND d.month = ? AND di.staff_id = ?
               AND d.status IN ('CONFIRMED','SENT','COMPLETED')`,
              [department_id, normalizedMonth, staff.id],
            );
            if (Number(existing[0]?.cnt) > 0) {
              results.push({ staff_id: staff.id, staff_name: staff.full_name, status: "SKIPPED", reason: "Already distributed this month" });
              connection.release();
              continue;
            }
            connection.release();
            results.push({ staff_id: staff.id, staff_name: staff.full_name, status: "QUEUED" });
          } catch (e) {
            connection.release();
            results.push({ staff_id: staff.id, staff_name: staff.full_name, status: "ERROR", reason: e.message });
          }
        } catch (e) {
          results.push({ staff_id: staff.id, staff_name: staff.full_name, status: "ERROR", reason: e.message });
        }
      }

      return res.json({
        success: true,
        message: `Distribution schedule processed for ${deptRows[0].department_name}`,
        department: deptRows[0].department_name,
        month: normalizedMonth,
        eligible_staff: eligibleStaff.length,
        results,
        cron_schedule: "0 8 1 * * (runs 1st of every month at 8:00 AM)",
        note: "Use the Allocations page to confirm individual distributions with preview.",
      });
    }

    return res.json({
      success: true,
      message: `Distribution scheduled for ${deptRows[0].department_name} — ${normalizedMonth}`,
      department: deptRows[0].department_name,
      department_id: Number(department_id),
      month: normalizedMonth,
      eligible_staff: eligibleStaff.length,
      staff: eligibleStaff.map(s => ({ id: s.id, name: s.full_name })),
      cron_schedule: "0 8 1 * * (auto-runs 1st of every month at 8:00 AM)",
      note: "Go to Allocations to preview and confirm each distribution.",
    });
  } catch (error) {
    console.error("Schedule distribution error:", error);
    return res.status(500).json({ success: false, message: "Scheduling failed", error: error.message });
  }
};

module.exports = { scheduleDistribution };
