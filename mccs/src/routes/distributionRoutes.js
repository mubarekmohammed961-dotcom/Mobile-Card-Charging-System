const express = require("express");
const {
  previewDistribution,
  createDistribution,
  getDistributions,
  getDistributionById,
  getDistributionItems,
  scheduleDistribution,
  getSchedules,
  deleteSchedule,
} = require("../controllers/distributionController");
const { protect }   = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

const router = express.Router();
const actors = ["SUPER_ADMIN","SYSTEM_ADMIN","STORE_OFFICER","DEPARTMENT_HEAD"];
const viewers = [...actors,"AUDITOR"];

// POST /api/distributions/preview
router.post("/preview",  protect, authorize(...actors),  previewDistribution);

// POST /api/distributions/schedule — FR-019 create/update scheduled auto-distribution (Section 15)
router.post("/schedule", protect, authorize(...actors),  scheduleDistribution);

// GET /api/distributions/schedules — Get all schedules (FR-019)
router.get("/schedules", protect, authorize(...viewers), getSchedules);

// DELETE /api/distributions/schedules/:id — Delete a schedule
router.delete("/schedules/:id", protect, authorize(...actors), deleteSchedule);

// POST /api/distributions
router.post("/",         protect, authorize(...actors),  createDistribution);

// GET /api/distributions
router.get("/",          protect, authorize(...viewers), getDistributions);

// GET /api/distributions/items
router.get("/items",     protect, authorize(...viewers), getDistributionItems);

// GET /api/distributions/:id
router.get("/:id",       protect, authorize(...viewers), getDistributionById);

module.exports = router;
