const db = require("../config/db");

// ============================================================
// Helper: convert array to CSV string
// ============================================================
const toCSV = (rows, columns) => {
  if (!rows || rows.length === 0) return columns.join(",") + "\n(No data)\n";
  const header = columns.join(",");
  const body = rows.map(row =>
    columns.map(col => {
      const val = row[col] !== null && row[col] !== undefined ? String(row[col]) : "";
      return val.includes(",") || val.includes('"') || val.includes("\n")
        ? `"${val.replace(/"/g, '""')}"`
        : val;
    }).join(",")
  ).join("\n");
  return header + "\n" + body + "\n";
};

// ============================================================
// Helper: simple HTML→PDF-ready HTML template
// ============================================================
const toHTMLReport = (title, subtitle, tableHTML) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>${title}</title>
<style>
  body{font-family:Arial,sans-serif;margin:32px;color:#0f172a;font-size:13px;}
  h1{font-size:22px;margin-bottom:4px;color:#1e3a8a;}
  .subtitle{color:#64748b;font-size:13px;margin-bottom:24px;}
  .meta{display:flex;gap:32px;margin-bottom:20px;padding:12px 16px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;}
  .meta div{display:flex;flex-direction:column;gap:2px;}
  .meta span{font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.5px;}
  .meta strong{font-size:14px;}
  table{width:100%;border-collapse:collapse;margin-top:8px;}
  th{background:#1e3a8a;color:white;padding:9px 12px;text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:.4px;}
  td{padding:9px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;}
  tr:nth-child(even){background:#f8fafc;}
  tr:hover{background:#eff6ff;}
  .footer{margin-top:24px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center;}
  .badge{display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;}
  .green{background:#dcfce7;color:#15803d;}
  .blue{background:#dbeafe;color:#1d4ed8;}
  .orange{background:#fed7aa;color:#c2410c;}
  .red{background:#fee2e2;color:#b91c1c;}
  @media print{body{margin:16px;} .no-print{display:none;}}
</style>
</head>
<body>
  <h1>📊 ${title}</h1>
  <div class="subtitle">${subtitle}</div>
  <div class="meta">
    <div><span>Generated</span><strong>${new Date().toLocaleString()}</strong></div>
    <div><span>System</span><strong>MCCS v1.0 — Mobile Card Charging System</strong></div>
    <div><span>Project ID</span><strong>1226</strong></div>
  </div>
  ${tableHTML}
  <div class="footer">Mobile Card Charging System — Confidential Report — Generated ${new Date().toISOString()}</div>
</body>
</html>`;

// ============================================================
// GET /api/reports/summary
// ============================================================
const getReportSummary = async (req, res) => {
  try {
    const [inventoryRows] = await db.query(`SELECT status, COUNT(*) AS total_cards, COALESCE(SUM(value),0) AS total_value FROM cards GROUP BY status`);
    const inventory = { total_cards:0, total_value:0, available_cards:0, available_value:0, allocated_cards:0, allocated_value:0, used_cards:0, used_value:0 };
    for (const row of inventoryRows) {
      inventory.total_cards += Number(row.total_cards);
      inventory.total_value += Number(row.total_value);
      if (row.status === "AVAILABLE") { inventory.available_cards = Number(row.total_cards); inventory.available_value = Number(row.total_value); }
      if (row.status === "ALLOCATED") { inventory.allocated_cards = Number(row.total_cards); inventory.allocated_value = Number(row.total_value); }
      if (row.status === "USED")      { inventory.used_cards = Number(row.total_cards);      inventory.used_value = Number(row.total_value); }
    }

    const [allocationRows] = await db.query(`SELECT COUNT(*) AS total_distributions, COALESCE(SUM(total_cards),0) AS total_cards, COALESCE(SUM(total_value),0) AS total_value FROM distributions`);
    const allocations = { total_distributions: Number(allocationRows[0]?.total_distributions||0), total_cards: Number(allocationRows[0]?.total_cards||0), total_value: Number(allocationRows[0]?.total_value||0) };

    const [deliveryRows] = await db.query(`SELECT status, COUNT(*) AS total FROM deliveries GROUP BY status`);
    const deliveries = { pending:0, sent:0, delivered:0, confirmed:0, expired:0 };
    for (const row of deliveryRows) {
      if (row.status === "PENDING")   deliveries.pending   = Number(row.total);
      if (row.status === "SENT")      deliveries.sent      = Number(row.total);
      if (row.status === "DELIVERED") deliveries.delivered = Number(row.total);
      if (row.status === "CONFIRMED") deliveries.confirmed = Number(row.total);
      if (row.status === "EXPIRED")   deliveries.expired   = Number(row.total);
    }

    const [usageRows] = await db.query(`SELECT COUNT(*) AS total_used_cards, COALESCE(SUM(c.value),0) AS used_value FROM usage_logs ul INNER JOIN cards c ON c.id=ul.card_id`);
    const usage = { total_used_cards: Number(usageRows[0]?.total_used_cards||0), used_value: Number(usageRows[0]?.used_value||0) };

    const [departmentRows] = await db.query(`
      SELECT d.id, d.department_name, d.department_code, d.status,
             COUNT(DISTINCT di.id) AS allocated_cards, COALESCE(SUM(c.value),0) AS allocated_value
      FROM departments d
      LEFT JOIN distributions dist ON dist.department_id=d.id
      LEFT JOIN distribution_items di ON di.distribution_id=dist.id
      LEFT JOIN cards c ON c.id=di.card_id
      GROUP BY d.id, d.department_name, d.department_code, d.status
      ORDER BY allocated_cards DESC, d.department_name ASC`);

    const [staffUsageRows] = await db.query(`
      SELECT s.id AS staff_id, s.employee_id, s.full_name,
             COUNT(ul.id) AS used_cards, COALESCE(SUM(c.value),0) AS used_value
      FROM staff s
      LEFT JOIN usage_logs ul ON ul.staff_id=s.id
      LEFT JOIN cards c ON c.id=ul.card_id
      GROUP BY s.id, s.employee_id, s.full_name
      ORDER BY used_cards DESC, s.full_name ASC`);

    const [auditActionRows] = await db.query(`SELECT action, COUNT(*) AS total FROM audit_logs GROUP BY action ORDER BY total DESC`);

    const [recentDistributionRows] = await db.query(`
      SELECT d.id, d.distribution_uuid, dep.department_name, s.full_name AS staff_name,
             d.total_cards, d.total_value, d.status, d.month, d.created_at
      FROM distributions d
      LEFT JOIN departments dep ON dep.id=d.department_id
      LEFT JOIN staff s ON s.id=d.initiated_by
      ORDER BY d.created_at DESC LIMIT 10`);

    const [recentDeliveryRows] = await db.query(`
      SELECT de.id, de.distribution_item_id, de.delivery_method, de.status, de.sent_at, de.created_at, s.full_name AS staff_name
      FROM deliveries de
      LEFT JOIN distribution_items di ON di.id=de.distribution_item_id
      LEFT JOIN staff s ON s.id=di.staff_id
      ORDER BY de.created_at DESC LIMIT 10`);

    return res.json({ success:true, inventory, allocations, deliveries, usage, departments:departmentRows, staff_usage:staffUsageRows, audit_actions:auditActionRows, recent_distributions:recentDistributionRows, recent_deliveries:recentDeliveryRows });
  } catch (error) {
    console.error("Report summary error:", error);
    return res.status(500).json({ success:false, message:"Failed to retrieve report summary", error:error.message });
  }
};

// ============================================================
// GET /api/reports/export/distribution
// Export monthly distribution report as CSV or HTML (FR-040)
// Roles: SUPER_ADMIN, SYSTEM_ADMIN, STORE_OFFICER, DEPARTMENT_HEAD, AUDITOR
// ============================================================
const exportDistribution = async (req, res) => {
  try {
    const { format = "csv", from, to, department_id } = req.query;

    let sql = `
      SELECT
        d.id,
        d.distribution_uuid,
        dep.department_name,
        dep.department_code,
        s.full_name AS initiated_by,
        d.total_cards,
        d.total_value,
        d.status,
        DATE_FORMAT(d.month,'%Y-%m') AS month,
        DATE_FORMAT(d.created_at,'%Y-%m-%d %H:%i') AS created_at
      FROM distributions d
      LEFT JOIN departments dep ON dep.id = d.department_id
      LEFT JOIN staff s ON s.id = d.initiated_by
      WHERE 1=1
    `;
    const params = [];
    if (from) { sql += " AND d.created_at >= ?"; params.push(from); }
    if (to)   { sql += " AND d.created_at <= ?"; params.push(to + " 23:59:59"); }
    if (department_id) { sql += " AND d.department_id = ?"; params.push(department_id); }
    sql += " ORDER BY d.created_at DESC";

    const [rows] = await db.query(sql, params);
    const cols = ["id","distribution_uuid","department_name","department_code","initiated_by","total_cards","total_value","status","month","created_at"];

    if (format === "html") {
      const tableHTML = `<table><thead><tr>${cols.map(c=>`<th>${c.replace(/_/g," ").toUpperCase()}</th>`).join("")}</tr></thead><tbody>
        ${rows.map(r=>`<tr>${cols.map(c=>`<td>${r[c]??""}</td>`).join("")}</tr>`).join("")}
      </tbody></table><p style="margin-top:12px;font-size:12px;color:#64748b;">Total records: ${rows.length}</p>`;
      res.setHeader("Content-Type","text/html");
      res.setHeader("Content-Disposition",`attachment; filename="distribution_report_${Date.now()}.html"`);
      return res.send(toHTMLReport("Monthly Distribution Report", `${rows.length} distribution records`, tableHTML));
    }

    res.setHeader("Content-Type","text/csv");
    res.setHeader("Content-Disposition",`attachment; filename="distribution_report_${Date.now()}.csv"`);
    return res.send(toCSV(rows, cols));
  } catch (error) {
    return res.status(500).json({ success:false, message:"Export failed", error:error.message });
  }
};

// ============================================================
// GET /api/reports/export/inventory
// Export inventory valuation report (FR-041)
// ============================================================
const exportInventory = async (req, res) => {
  try {
    const { format = "csv", status, type, provider } = req.query;

    let sql = `
      SELECT id, card_uuid, provider, type, value, expiry_date, batch_number, status,
             DATE_FORMAT(created_at,'%Y-%m-%d') AS created_at
      FROM cards WHERE 1=1
    `;
    const params = [];
    if (status)   { sql += " AND status = ?";   params.push(status); }
    if (type)     { sql += " AND type = ?";     params.push(type); }
    if (provider) { sql += " AND provider = ?"; params.push(provider); }
    sql += " ORDER BY status, provider, type";

    const [rows] = await db.query(sql, params);
    const cols = ["id","card_uuid","provider","type","value","expiry_date","batch_number","status","created_at"];

    if (format === "html") {
      const tableHTML = `<table><thead><tr>${cols.map(c=>`<th>${c.replace(/_/g," ").toUpperCase()}</th>`).join("")}</tr></thead><tbody>
        ${rows.map(r=>`<tr>${cols.map(c=>`<td>${r[c]??""}</td>`).join("")}</tr>`).join("")}
      </tbody></table><p style="margin-top:12px;font-size:12px;color:#64748b;">Total: ${rows.length} cards</p>`;
      res.setHeader("Content-Type","text/html");
      res.setHeader("Content-Disposition",`attachment; filename="inventory_report_${Date.now()}.html"`);
      return res.send(toHTMLReport("Inventory Valuation Report", `${rows.length} card records`, tableHTML));
    }

    res.setHeader("Content-Type","text/csv");
    res.setHeader("Content-Disposition",`attachment; filename="inventory_report_${Date.now()}.csv"`);
    return res.send(toCSV(rows, cols));
  } catch (error) {
    return res.status(500).json({ success:false, message:"Export failed", error:error.message });
  }
};

// ============================================================
// GET /api/reports/export/staff
// Export staff distribution history (FR-040)
// ============================================================
const exportStaffHistory = async (req, res) => {
  try {
    const { format = "csv", staff_id, department_id } = req.query;

    let sql = `
      SELECT
        s.employee_id, s.full_name, dep.department_name,
        c.provider, c.type, c.value AS card_value, c.status AS card_status,
        DATE_FORMAT(d.month,'%Y-%m') AS month,
        dl.status AS delivery_status,
        DATE_FORMAT(dl.sent_at,'%Y-%m-%d') AS sent_at,
        DATE_FORMAT(conf.confirmed_at,'%Y-%m-%d %H:%i') AS confirmed_at,
        DATE_FORMAT(ul.marked_used_at,'%Y-%m-%d') AS used_at,
        ul.remarks
      FROM distribution_items di
      INNER JOIN staff s ON s.id = di.staff_id
      INNER JOIN cards c ON c.id = di.card_id
      INNER JOIN distributions d ON d.id = di.distribution_id
      INNER JOIN departments dep ON dep.id = s.department_id
      LEFT JOIN deliveries dl ON dl.distribution_item_id = di.id
      LEFT JOIN confirmations conf ON conf.delivery_id = dl.id
      LEFT JOIN usage_logs ul ON ul.card_id = c.id AND ul.staff_id = s.id
      WHERE 1=1
    `;
    const params = [];
    if (staff_id)     { sql += " AND s.id = ?";          params.push(staff_id); }
    if (department_id){ sql += " AND s.department_id = ?"; params.push(department_id); }
    sql += " ORDER BY s.full_name ASC, d.month DESC";

    const [rows] = await db.query(sql, params);
    const cols = ["employee_id","full_name","department_name","provider","type","card_value","card_status","month","delivery_status","sent_at","confirmed_at","used_at","remarks"];

    if (format === "html") {
      const tableHTML = `<table><thead><tr>${cols.map(c=>`<th>${c.replace(/_/g," ").toUpperCase()}</th>`).join("")}</tr></thead><tbody>
        ${rows.map(r=>`<tr>${cols.map(c=>`<td>${r[c]??""}</td>`).join("")}</tr>`).join("")}
      </tbody></table><p style="margin-top:12px;font-size:12px;color:#64748b;">Total: ${rows.length} records</p>`;
      res.setHeader("Content-Type","text/html");
      res.setHeader("Content-Disposition",`attachment; filename="staff_history_${Date.now()}.html"`);
      return res.send(toHTMLReport("Staff Distribution History", `${rows.length} records`, tableHTML));
    }

    res.setHeader("Content-Type","text/csv");
    res.setHeader("Content-Disposition",`attachment; filename="staff_history_${Date.now()}.csv"`);
    return res.send(toCSV(rows, cols));
  } catch (error) {
    return res.status(500).json({ success:false, message:"Export failed", error:error.message });
  }
};

// ============================================================
// GET /api/reports/export/audit
// Export full audit log (FR-042) — SUPER_ADMIN, SYSTEM_ADMIN, AUDITOR only
// ============================================================
const exportAudit = async (req, res) => {
  try {
    const { format = "csv", from, to, action } = req.query;

    let sql = `
      SELECT
        al.id, u.full_name AS user_name, u.email, al.action,
        al.card_id, al.ip,
        DATE_FORMAT(al.created_at,'%Y-%m-%d %H:%i:%s') AS timestamp
      FROM audit_logs al
      LEFT JOIN users u ON u.id = al.user_id
      WHERE 1=1
    `;
    const params = [];
    if (from)   { sql += " AND al.created_at >= ?"; params.push(from); }
    if (to)     { sql += " AND al.created_at <= ?"; params.push(to + " 23:59:59"); }
    if (action) { sql += " AND al.action = ?";      params.push(action); }
    sql += " ORDER BY al.created_at DESC";

    const [rows] = await db.query(sql, params);
    const cols = ["id","user_name","email","action","card_id","ip","timestamp"];

    if (format === "html") {
      const tableHTML = `<table><thead><tr>${cols.map(c=>`<th>${c.replace(/_/g," ").toUpperCase()}</th>`).join("")}</tr></thead><tbody>
        ${rows.map(r=>`<tr>${cols.map(c=>`<td>${r[c]??""}</td>`).join("")}</tr>`).join("")}
      </tbody></table><p style="margin-top:12px;font-size:12px;color:#64748b;">Total: ${rows.length} audit entries</p>`;
      res.setHeader("Content-Type","text/html");
      res.setHeader("Content-Disposition",`attachment; filename="audit_report_${Date.now()}.html"`);
      return res.send(toHTMLReport("Audit Trail Report", `${rows.length} audit log entries`, tableHTML));
    }

    res.setHeader("Content-Type","text/csv");
    res.setHeader("Content-Disposition",`attachment; filename="audit_report_${Date.now()}.csv"`);
    return res.send(toCSV(rows, cols));
  } catch (error) {
    return res.status(500).json({ success:false, message:"Export failed", error:error.message });
  }
};

// ============================================================
// GET /api/reports/export/department
// Department-wise distribution summary (FR-039)
// ============================================================
const exportDepartment = async (req, res) => {
  try {
    const { format = "csv" } = req.query;

    const [rows] = await db.query(`
      SELECT
        dep.department_name, dep.department_code, dep.status,
        COUNT(DISTINCT d.id)  AS total_distributions,
        COUNT(DISTINCT di.id) AS total_cards_issued,
        COALESCE(SUM(c.value),0) AS total_value,
        SUM(CASE WHEN dl.status='CONFIRMED' THEN 1 ELSE 0 END) AS confirmed,
        SUM(CASE WHEN dl.status IN ('PENDING','SENT') THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN ul.id IS NOT NULL THEN 1 ELSE 0 END) AS cards_used
      FROM departments dep
      LEFT JOIN distributions d ON d.department_id = dep.id
      LEFT JOIN distribution_items di ON di.distribution_id = d.id
      LEFT JOIN cards c ON c.id = di.card_id
      LEFT JOIN deliveries dl ON dl.distribution_item_id = di.id
      LEFT JOIN usage_logs ul ON ul.card_id = c.id
      GROUP BY dep.id, dep.department_name, dep.department_code, dep.status
      ORDER BY total_value DESC
    `);

    const cols = ["department_name","department_code","status","total_distributions","total_cards_issued","total_value","confirmed","pending","cards_used"];

    if (format === "html") {
      const tableHTML = `<table><thead><tr>${cols.map(c=>`<th>${c.replace(/_/g," ").toUpperCase()}</th>`).join("")}</tr></thead><tbody>
        ${rows.map(r=>`<tr>${cols.map(c=>`<td>${r[c]??""}</td>`).join("")}</tr>`).join("")}
      </tbody></table>`;
      res.setHeader("Content-Type","text/html");
      res.setHeader("Content-Disposition",`attachment; filename="department_report_${Date.now()}.html"`);
      return res.send(toHTMLReport("Department Distribution Report", `${rows.length} departments`, tableHTML));
    }

    res.setHeader("Content-Type","text/csv");
    res.setHeader("Content-Disposition",`attachment; filename="department_report_${Date.now()}.csv"`);
    return res.send(toCSV(rows, cols));
  } catch (error) {
    return res.status(500).json({ success:false, message:"Export failed", error:error.message });
  }
};

// ============================================================
// GET /api/reports/reconciliation
// FR-036: Cards Issued vs Confirmed vs Used vs Expired
// ============================================================
const getReconciliation = async (req, res) => {
  try {
    const { from, to, department_id } = req.query;

    let sql = `
      SELECT
        di.id AS distribution_item_id,
        s.employee_id, s.full_name AS staff_name,
        dep.department_name,
        c.provider, c.type, c.value AS card_value,
        c.status AS card_status,
        DATE_FORMAT(d.month,'%Y-%m') AS month,
        dl.status AS delivery_status,
        DATE_FORMAT(dl.sent_at,'%Y-%m-%d')         AS sent_at,
        DATE_FORMAT(conf.confirmed_at,'%Y-%m-%d')  AS confirmed_at,
        DATE_FORMAT(ul.marked_used_at,'%Y-%m-%d')  AS used_at,
        CASE
          WHEN ul.id IS NOT NULL                    THEN 'USED'
          WHEN conf.id IS NOT NULL                  THEN 'CONFIRMED'
          WHEN dl.status = 'EXPIRED'                THEN 'EXPIRED'
          WHEN dl.status IN ('SENT','DELIVERED')    THEN 'PENDING_CONFIRMATION'
          WHEN dl.status = 'PENDING'                THEN 'DELIVERY_PENDING'
          ELSE 'ALLOCATED_NO_DELIVERY'
        END AS reconciliation_status
      FROM distribution_items di
      INNER JOIN cards c      ON c.id  = di.card_id
      INNER JOIN staff s      ON s.id  = di.staff_id
      INNER JOIN departments dep ON dep.id = s.department_id
      INNER JOIN distributions d ON d.id = di.distribution_id
      LEFT JOIN deliveries dl     ON dl.distribution_item_id = di.id
      LEFT JOIN confirmations conf ON conf.delivery_id = dl.id
      LEFT JOIN usage_logs ul     ON ul.card_id = c.id AND ul.staff_id = s.id
      WHERE 1=1
    `;
    const params = [];
    if (from)          { sql += " AND d.month >= ?";         params.push(from); }
    if (to)            { sql += " AND d.month <= ?";         params.push(to);   }
    if (department_id) { sql += " AND s.department_id = ?";  params.push(department_id); }
    sql += " ORDER BY d.month DESC, s.full_name ASC";

    const [rows] = await db.query(sql, params);

    // Summary counts
    const summary = {
      total_issued:             rows.length,
      confirmed:                rows.filter(r => ["CONFIRMED","USED"].includes(r.reconciliation_status)).length,
      used:                     rows.filter(r => r.reconciliation_status === "USED").length,
      pending_confirmation:     rows.filter(r => r.reconciliation_status === "PENDING_CONFIRMATION").length,
      expired:                  rows.filter(r => r.reconciliation_status === "EXPIRED").length,
      delivery_pending:         rows.filter(r => r.reconciliation_status === "DELIVERY_PENDING").length,
      allocated_no_delivery:    rows.filter(r => r.reconciliation_status === "ALLOCATED_NO_DELIVERY").length,
    };
    summary.confirmation_rate = summary.total_issued > 0
      ? Math.round((summary.confirmed / summary.total_issued) * 100) : 0;

    return res.json({ success: true, summary, count: rows.length, reconciliation: rows });
  } catch (error) {
    console.error("Reconciliation error:", error);
    return res.status(500).json({ success: false, message: "Failed to get reconciliation", error: error.message });
  }
};

module.exports = {
  getReportSummary,
  exportDistribution,
  exportInventory,
  exportStaffHistory,
  exportAudit,
  exportDepartment,
  getReconciliation,
  getBudgetCompliance,
};

// ============================================================
// GET /api/reports/budget-compliance
// Section 19: Actual spend vs allocated budget per department
// ============================================================
async function getBudgetCompliance(req, res) {
  try {
    const [rows] = await db.query(`
      SELECT
        dep.id,
        dep.department_name,
        dep.department_code,
        dep.budget AS allocated_budget,
        COALESCE(SUM(d.total_value), 0) AS actual_spend,
        COUNT(DISTINCT d.id) AS total_distributions,
        CASE
          WHEN dep.budget > 0 THEN ROUND((COALESCE(SUM(d.total_value),0) / dep.budget) * 100, 1)
          ELSE 0
        END AS budget_utilization_pct,
        CASE
          WHEN dep.budget > 0 AND COALESCE(SUM(d.total_value),0) > dep.budget THEN 'OVER_BUDGET'
          WHEN dep.budget > 0 AND COALESCE(SUM(d.total_value),0) >= dep.budget * 0.9 THEN 'NEAR_LIMIT'
          ELSE 'WITHIN_BUDGET'
        END AS compliance_status
      FROM departments dep
      LEFT JOIN distributions d ON d.department_id = dep.id
        AND d.status IN ('CONFIRMED','SENT','COMPLETED')
      GROUP BY dep.id, dep.department_name, dep.department_code, dep.budget
      ORDER BY budget_utilization_pct DESC
    `);

    const summary = {
      over_budget:    rows.filter(r => r.compliance_status === "OVER_BUDGET").length,
      near_limit:     rows.filter(r => r.compliance_status === "NEAR_LIMIT").length,
      within_budget:  rows.filter(r => r.compliance_status === "WITHIN_BUDGET").length,
      total_budget:   rows.reduce((s, r) => s + Number(r.allocated_budget || 0), 0),
      total_spend:    rows.reduce((s, r) => s + Number(r.actual_spend || 0), 0),
    };

    return res.json({ success: true, summary, departments: rows });
  } catch (error) {
    console.error("Budget compliance error:", error);
    return res.status(500).json({ success: false, message: "Failed", error: error.message });
  }
}
