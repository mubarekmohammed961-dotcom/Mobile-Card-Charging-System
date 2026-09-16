const express = require("express");

const {
  getEligibility,
  getAllEligibility,
  createEligibility,
  deleteEligibility,
} = require("../controllers/eligibilityController");

const { protect } = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

const router = express.Router();

// GET /api/eligibility - all rules (admin)
router.get(
  "/",
  protect,
  authorize("SUPER_ADMIN", "SYSTEM_ADMIN", "DEPARTMENT_HEAD", "AUDITOR"),
  getAllEligibility,
);

// POST /api/eligibility - create/update rule
router.post(
  "/",
  protect,
  authorize("SUPER_ADMIN", "SYSTEM_ADMIN"),
  createEligibility,
);

// GET /api/staff/:staffId/eligibility - rules for one staff
router.get(
  "/staff/:staffId",
  protect,
  authorize("SUPER_ADMIN", "SYSTEM_ADMIN", "DEPARTMENT_HEAD", "AUDITOR"),
  getEligibility,
);

// DELETE /api/eligibility/:id - delete a rule
router.delete(
  "/:id",
  protect,
  authorize("SUPER_ADMIN", "SYSTEM_ADMIN"),
  deleteEligibility,
);

module.exports = router;
