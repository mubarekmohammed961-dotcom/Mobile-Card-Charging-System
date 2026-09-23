const express = require("express");

const { getDashboardSummary } = require("../controllers/dashboardController");

const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

const router = express.Router();

router.get(
  "/summary",
  protect,
  authorize(
    "SUPER_ADMIN",
    "SYSTEM_ADMIN",
    "STORE_OFFICER",
    "DEPARTMENT_HEAD",
    "STAFF",
    "AUDITOR",
  ),
  getDashboardSummary,
);

module.exports = router;
