const express = require("express");
const {
  getReportSummary,
  exportDistribution,
  exportInventory,
  exportStaffHistory,
  exportAudit,
  exportDepartment,
  getReconciliation,
  getBudgetCompliance,
} = require("../controllers/reportController");

const { protect }   = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

const router = express.Router();

const reportViewers  = ["SUPER_ADMIN","SYSTEM_ADMIN","STORE_OFFICER","DEPARTMENT_HEAD","AUDITOR"];
const auditExporters = ["SUPER_ADMIN","SYSTEM_ADMIN","AUDITOR"];

// Summary
router.get("/summary",               protect, authorize(...reportViewers), getReportSummary);

// Reconciliation (FR-036)
router.get("/reconciliation",        protect, authorize(...reportViewers), getReconciliation);

// Budget Compliance Report (Section 19 - Actual spend vs allocated budget per dept)
router.get("/budget-compliance",     protect, authorize(...reportViewers), getBudgetCompliance);

// Export endpoints (FR-038 to FR-042)
router.get("/export/distribution",   protect, authorize(...reportViewers),  exportDistribution);
router.get("/export/inventory",      protect, authorize(...reportViewers),  exportInventory);
router.get("/export/staff",          protect, authorize(...reportViewers),  exportStaffHistory);
router.get("/export/department",     protect, authorize(...reportViewers),  exportDepartment);
router.get("/export/audit",          protect, authorize(...auditExporters), exportAudit);

module.exports = router;
