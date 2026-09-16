const express = require("express");
const {
  getProfile,
  getPendingAllocations,
  getHistory,
  getCardByToken,
  getMonthlyStatus,
} = require("../controllers/staffDashboardController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// All authenticated users can access their own staff dashboard
router.get("/profile",        protect, getProfile);
router.get("/pending",        protect, getPendingAllocations);
router.get("/history",        protect, getHistory);
router.get("/monthly-status", protect, getMonthlyStatus);
router.get("/card/:token",    protect, getCardByToken);

module.exports = router;
