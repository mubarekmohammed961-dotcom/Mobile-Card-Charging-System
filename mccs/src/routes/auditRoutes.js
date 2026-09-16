const express = require("express");

const {
  createAuditLog,
  getAuditLogs,
} = require("../controllers/auditController");

const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

const router = express.Router();

// Create audit log
router.post(
  "/",
  protect,
  authorize("SUPER_ADMIN", "SYSTEM_ADMIN", "STORE_OFFICER", "DEPARTMENT_HEAD"),
  createAuditLog,
);

// Get audit logs
router.get(
  "/",
  protect,
  authorize(
    "SUPER_ADMIN",
    "SYSTEM_ADMIN",
    "STORE_OFFICER",
    "DEPARTMENT_HEAD",
    "AUDITOR",
  ),
  getAuditLogs,
);

module.exports = router;
