const express = require("express");
const { getPendingApprovals, getAllApprovals, approveDistribution, rejectDistribution } = require("../controllers/approvalController");
const { protect }   = require("../middleware/authMiddleware");
const { authorize } = require("../middleware/roleMiddleware");

const router = express.Router();

// BR-004: Budget approval - ONLY Department Head can view and approve/reject
const approvers = ["DEPARTMENT_HEAD"]; // Only Dept Head can approve/reject budget
const viewers   = ["DEPARTMENT_HEAD"]; // Only Dept Head can view approval page

router.get("/pending",         protect, authorize(...viewers),   getPendingApprovals);
router.get("/",                protect, authorize(...viewers),   getAllApprovals);
router.post("/:id/approve",    protect, authorize(...approvers), approveDistribution);
router.post("/:id/reject",     protect, authorize(...approvers), rejectDistribution);

module.exports = router;
